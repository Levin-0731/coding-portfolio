import SwiftUI
import Vision

/// 在给定的图片显示 rect 上叠加关键点与骨架。
/// 使用 SwiftUI Canvas(单次绘制),性能更好。
struct PoseOverlayView: View {
    let person: PersonPose
    let imagePixelSize: CGSize
    let options: DisplayOptions

    var body: some View {
        Canvas { ctx, size in
            let rect = CoordinateMapper.aspectFitRect(imagePixelSize: imagePixelSize, in: size)
            guard !rect.isEmpty else { return }

            func p(_ jp: JointPoint) -> CGPoint {
                CoordinateMapper.viewPoint(fromNormalized: jp.normalized,
                                           imagePixelSize: imagePixelSize,
                                           in: size)
            }

            let threshold = options.confidenceThreshold

            // ---- 骨架 ----
            if options.showSkeleton {
                // body
                if options.showBody {
                    drawBodyEdges(ctx: ctx, person: person,
                                  pointFn: p, threshold: threshold)
                }
                // hands
                if options.showHands {
                    drawHandEdges(ctx: ctx, hand: person.leftHand,
                                  category: .leftHand,
                                  pointFn: p, threshold: threshold)
                    drawHandEdges(ctx: ctx, hand: person.rightHand,
                                  category: .rightHand,
                                  pointFn: p, threshold: threshold)
                }
                // face polylines
                if options.showFace {
                    drawFaceRegions(ctx: ctx, face: person.face,
                                    pointFn: p, threshold: threshold)
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
                let color = ColorPalette.color(for: category)
                let r = category == .face ? options.pointRadius * 0.55 : options.pointRadius
                for jp in pts where jp.confidence >= threshold {
                    let pt = p(jp)
                    let ellipse = Path(ellipseIn: CGRect(
                        x: pt.x - r, y: pt.y - r, width: r * 2, height: r * 2
                    ))
                    ctx.fill(ellipse, with: .color(color))
                }
            }

            // ---- 标签 ----
            if options.showLabels {
                for (show, pts, category) in groups where show {
                    let color = ColorPalette.color(for: category).opacity(0.95)
                    for jp in pts where jp.confidence >= threshold {
                        let pt = p(jp)
                        let text = Text(shortLabel(for: jp))
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(color)
                        ctx.draw(text, at: CGPoint(x: pt.x + 6, y: pt.y - 6), anchor: .topLeading)
                    }
                }
            }
        }
        .allowsHitTesting(false)
    }

    // MARK: - Edge drawing helpers

    private func drawBodyEdges(ctx: GraphicsContext,
                               person: PersonPose,
                               pointFn: (JointPoint) -> CGPoint,
                               threshold: Float) {
        let color = ColorPalette.edgeColor(for: .body)
        let map = Dictionary(uniqueKeysWithValues: person.body.map { ($0.name, $0) })
        var path = Path()
        for (a, b) in Skeleton.bodyEdges {
            guard let pa = map[a.rawValue.rawValue],
                  let pb = map[b.rawValue.rawValue],
                  pa.confidence >= threshold, pb.confidence >= threshold else { continue }
            path.move(to: pointFn(pa))
            path.addLine(to: pointFn(pb))
        }
        ctx.stroke(path, with: .color(color),
                   style: StrokeStyle(lineWidth: options.lineWidth, lineCap: .round))
    }

    private func drawHandEdges(ctx: GraphicsContext,
                               hand: [JointPoint],
                               category: JointCategory,
                               pointFn: (JointPoint) -> CGPoint,
                               threshold: Float) {
        let color = ColorPalette.edgeColor(for: category)
        let map = Dictionary(uniqueKeysWithValues: hand.map { ($0.name, $0) })
        var path = Path()
        for (a, b) in Skeleton.handEdges {
            guard let pa = map[a.rawValue.rawValue],
                  let pb = map[b.rawValue.rawValue],
                  pa.confidence >= threshold, pb.confidence >= threshold else { continue }
            path.move(to: pointFn(pa))
            path.addLine(to: pointFn(pb))
        }
        ctx.stroke(path, with: .color(color),
                   style: StrokeStyle(lineWidth: options.lineWidth, lineCap: .round))
    }

    private func drawFaceRegions(ctx: GraphicsContext,
                                 face: [JointPoint],
                                 pointFn: (JointPoint) -> CGPoint,
                                 threshold: Float) {
        let color = ColorPalette.edgeColor(for: .face)
        var path = Path()
        for style in Skeleton.faceRegionStyles {
            let pts = face
                .filter { $0.faceRegion == style.region && $0.confidence >= threshold }
                .sorted { a, b in
                    let ai = Int(a.name.split(separator: "_").last ?? "0") ?? 0
                    let bi = Int(b.name.split(separator: "_").last ?? "0") ?? 0
                    return ai < bi
                }
            guard pts.count >= 2 else { continue }
            path.move(to: pointFn(pts[0]))
            for p in pts.dropFirst() {
                path.addLine(to: pointFn(p))
            }
            if style.closed, let first = pts.first {
                path.addLine(to: pointFn(first))
            }
        }
        ctx.stroke(path, with: .color(color),
                   style: StrokeStyle(lineWidth: max(1, options.lineWidth * 0.7),
                                      lineCap: .round,
                                      lineJoin: .round))
    }

    private func shortLabel(for jp: JointPoint) -> String {
        // 去掉 _joint 等后缀
        let n = jp.name
            .replacingOccurrences(of: "_joint", with: "")
            .replacingOccurrences(of: "VNBLM", with: "")
        return n
    }
}
