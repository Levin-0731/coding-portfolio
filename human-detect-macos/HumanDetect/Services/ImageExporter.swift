import AppKit
import CoreGraphics
import Foundation
import UniformTypeIdentifiers
import Vision

enum ImageFormat {
    case png
    case jpeg(quality: CGFloat)

    var utType: UTType {
        switch self {
        case .png: return .png
        case .jpeg: return .jpeg
        }
    }
}

enum ImageExporter {

    /// 在原图尺寸上重绘关键点与骨架,输出为文件。
    static func exportAnnotated(image: CGImage,
                                result: DetectionResult,
                                options: DisplayOptions,
                                to url: URL,
                                format: ImageFormat) throws {
        let w = image.width
        let h = image.height

        let colorSpace = image.colorSpace ?? CGColorSpaceCreateDeviceRGB()
        guard let ctx = CGContext(
            data: nil,
            width: w, height: h,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            throw ExportError.contextCreateFailed
        }

        ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))

        // 坐标系:我们要以左上为原点计算点,但 CGContext 默认 y 向上。
        // 采用一个转换:把坐标翻转,使 (0,0) 在左上。
        ctx.translateBy(x: 0, y: CGFloat(h))
        ctx.scaleBy(x: 1, y: -1)

        let scale = max(CGFloat(w), CGFloat(h)) / 1000.0
        let pointR = options.pointRadius * scale
        let lineW = options.lineWidth * scale

        if let person = result.person {
            let imgSize = CGSize(width: w, height: h)
            drawPose(person: person,
                     imageSize: imgSize,
                     pointRadius: pointR,
                     lineWidth: lineW,
                     options: options,
                     in: ctx)
        }

        guard let annotated = ctx.makeImage() else {
            throw ExportError.contextCreateFailed
        }
        try write(cgImage: annotated, to: url, format: format)
    }

    /// 导出 JSON
    static func exportJSON(result: DetectionResult, to url: URL) throws {
        let enc = JSONEncoder()
        enc.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try enc.encode(result)
        try data.write(to: url, options: .atomic)
    }

    // MARK: - Private drawing

    private static func drawPose(person: PersonPose,
                                 imageSize: CGSize,
                                 pointRadius: CGFloat,
                                 lineWidth: CGFloat,
                                 options: DisplayOptions,
                                 in ctx: CGContext) {

        func pt(_ jp: JointPoint) -> CGPoint {
            CoordinateMapper.imagePixelPoint(fromNormalized: jp.normalized,
                                             imagePixelSize: imageSize)
        }

        let thresh = options.confidenceThreshold

        // ---- 骨架 ----
        if options.showSkeleton {
            ctx.setLineWidth(lineWidth)
            ctx.setLineCap(.round)

            if options.showBody {
                let bodyMap = Dictionary(uniqueKeysWithValues: person.body.map { ($0.name, $0) })
                ctx.setStrokeColor(nsColor(for: .body).cgColor)
                for (a, b) in Skeleton.bodyEdges {
                    if let pa = bodyMap[a.rawValue.rawValue],
                       let pb = bodyMap[b.rawValue.rawValue],
                       pa.confidence >= thresh, pb.confidence >= thresh {
                        ctx.move(to: pt(pa))
                        ctx.addLine(to: pt(pb))
                    }
                }
                ctx.strokePath()
            }

            if options.showHands {
                for (points, category) in [(person.leftHand, JointCategory.leftHand),
                                           (person.rightHand, JointCategory.rightHand)] {
                    let map = Dictionary(uniqueKeysWithValues: points.map { ($0.name, $0) })
                    ctx.setStrokeColor(nsColor(for: category).cgColor)
                    for (a, b) in Skeleton.handEdges {
                        if let pa = map[a.rawValue.rawValue],
                           let pb = map[b.rawValue.rawValue],
                           pa.confidence >= thresh, pb.confidence >= thresh {
                            ctx.move(to: pt(pa))
                            ctx.addLine(to: pt(pb))
                        }
                    }
                    ctx.strokePath()
                }
            }

            if options.showFace {
                ctx.setStrokeColor(nsColor(for: .face).cgColor)
                for style in Skeleton.faceRegionStyles {
                    let regionPoints = person.face
                        .filter { $0.faceRegion == style.region && $0.confidence >= thresh }
                        .sorted { a, b in
                            let ai = Int(a.name.split(separator: "_").last ?? "0") ?? 0
                            let bi = Int(b.name.split(separator: "_").last ?? "0") ?? 0
                            return ai < bi
                        }
                    guard regionPoints.count >= 2 else { continue }
                    ctx.move(to: pt(regionPoints[0]))
                    for p in regionPoints.dropFirst() {
                        ctx.addLine(to: pt(p))
                    }
                    if style.closed, let first = regionPoints.first {
                        ctx.addLine(to: pt(first))
                    }
                }
                ctx.strokePath()
            }
        }

        // ---- 点 ----
        let groups: [(Bool, [JointPoint], JointCategory)] = [
            (options.showBody, person.body, .body),
            (options.showHands, person.leftHand, .leftHand),
            (options.showHands, person.rightHand, .rightHand),
            (options.showFace, person.face, .face),
        ]
        for (show, pts, category) in groups where show {
            ctx.setFillColor(nsColor(for: category).cgColor)
            for jp in pts where jp.confidence >= thresh {
                let p = pt(jp)
                let r = category == .face ? pointRadius * 0.55 : pointRadius
                ctx.fillEllipse(in: CGRect(x: p.x - r, y: p.y - r,
                                           width: r * 2, height: r * 2))
            }
        }
    }

    private static func nsColor(for category: JointCategory) -> NSColor {
        switch category {
        case .body: return NSColor(red: 0.15, green: 0.75, blue: 1.00, alpha: 1)
        case .leftHand: return NSColor(red: 1.00, green: 0.55, blue: 0.20, alpha: 1)
        case .rightHand: return NSColor(red: 1.00, green: 0.85, blue: 0.25, alpha: 1)
        case .face: return NSColor(red: 0.70, green: 0.45, blue: 1.00, alpha: 1)
        }
    }

    private static func write(cgImage: CGImage, to url: URL, format: ImageFormat) throws {
        let rep = NSBitmapImageRep(cgImage: cgImage)
        let data: Data?
        switch format {
        case .png:
            data = rep.representation(using: .png, properties: [:])
        case .jpeg(let q):
            data = rep.representation(using: .jpeg,
                                      properties: [.compressionFactor: q])
        }
        guard let d = data else { throw ExportError.encodeFailed }
        try d.write(to: url, options: .atomic)
    }

    enum ExportError: LocalizedError {
        case contextCreateFailed
        case encodeFailed
        var errorDescription: String? {
            switch self {
            case .contextCreateFailed: return "创建绘图上下文失败"
            case .encodeFailed: return "编码图片失败"
            }
        }
    }
}
