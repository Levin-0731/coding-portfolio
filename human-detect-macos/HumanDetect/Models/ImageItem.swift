import AppKit
import CoreGraphics
import Foundation

/// 队列里的一张图。既用于批量浏览,也用于批量处理 / 导出。
struct ImageItem: Identifiable {

    enum Status: Equatable {
        case pending
        case detecting
        case done
        case noPerson
        case failed(String)

        var isTerminal: Bool {
            switch self {
            case .done, .noPerson, .failed: return true
            case .pending, .detecting: return false
            }
        }
    }

    let id: UUID = UUID()
    let fileName: String
    /// 源文件 URL。若为 nil,表示来自剪贴板 / 拖入数据,只能使用 `loadedImage` 处理。
    let url: URL?
    var loadedImage: LoadedImage?
    var result: DetectionResult?
    var status: Status = .pending
    var thumbnail: NSImage?

    init(url: URL) {
        self.url = url
        self.fileName = url.lastPathComponent
    }

    init(loaded: LoadedImage) {
        self.url = nil
        self.fileName = loaded.sourceFileName ?? "Pasted \(Int(Date().timeIntervalSince1970))"
        self.loadedImage = loaded
    }
}

extension ImageItem: Equatable {
    static func == (lhs: ImageItem, rhs: ImageItem) -> Bool { lhs.id == rhs.id }
}

extension ImageItem {
    /// 生成缩略图(最长边 maxSide)。
    static func makeThumbnail(cg: CGImage, maxSide: CGFloat = 120) -> NSImage? {
        let w = CGFloat(cg.width), h = CGFloat(cg.height)
        guard w > 0, h > 0 else { return nil }
        let scale = min(maxSide / max(w, h), 1)
        let tw = max(1, Int(w * scale))
        let th = max(1, Int(h * scale))
        let cs = cg.colorSpace ?? CGColorSpaceCreateDeviceRGB()
        guard let ctx = CGContext(
            data: nil,
            width: tw, height: th,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: cs,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { return nil }
        ctx.interpolationQuality = .medium
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: tw, height: th))
        guard let out = ctx.makeImage() else { return nil }
        return NSImage(cgImage: out, size: NSSize(width: tw, height: th))
    }
}
