import AppKit
import CoreGraphics
import CoreImage
import ImageIO
import UniformTypeIdentifiers
import Foundation

/// 加载后的图片(已将 EXIF 方向烘焙进像素,对外统一为 .up 方向的直立图)。
struct LoadedImage {
    let cgImage: CGImage
    let pixelSize: CGSize
    let sourceFileName: String?
    /// 原始 EXIF 方向(仅用于记录,检测与显示已统一为 .up)
    let originalOrientation: CGImagePropertyOrientation
}

enum ImageLoaderError: LocalizedError {
    case unsupportedFormat
    case decodeFailed
    case emptyPasteboard

    var errorDescription: String? {
        switch self {
        case .unsupportedFormat: return "不支持的图片格式"
        case .decodeFailed: return "图片解码失败"
        case .emptyPasteboard: return "粘贴板里没有图片"
        }
    }
}

enum ImageLoader {

    static let supportedTypes: [UTType] = [
        .jpeg, .png, .heic, .heif, .tiff, .bmp, .gif, .webP, .image
    ]

    // MARK: - Public API

    static func load(url: URL) throws -> LoadedImage {
        guard let src = CGImageSourceCreateWithURL(url as CFURL, nil) else {
            throw ImageLoaderError.decodeFailed
        }
        return try load(source: src, fileName: url.lastPathComponent)
    }

    static func load(data: Data, fileName: String? = nil) throws -> LoadedImage {
        guard let src = CGImageSourceCreateWithData(data as CFData, nil) else {
            throw ImageLoaderError.decodeFailed
        }
        return try load(source: src, fileName: fileName)
    }

    static func loadFromPasteboard() throws -> LoadedImage {
        let pb = NSPasteboard.general
        // 1. file url
        if let urls = pb.readObjects(forClasses: [NSURL.self]) as? [URL],
           let url = urls.first {
            return try load(url: url)
        }
        // 2. tiff / png data
        if let data = pb.data(forType: .tiff) {
            return try load(data: data)
        }
        if let data = pb.data(forType: .png) {
            return try load(data: data)
        }
        // 3. NSImage fallback
        if let img = NSImage(pasteboard: pb),
           let tiff = img.tiffRepresentation {
            return try load(data: tiff)
        }
        throw ImageLoaderError.emptyPasteboard
    }

    // MARK: - Internal

    private static func load(source: CGImageSource, fileName: String?) throws -> LoadedImage {
        guard let raw = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
            throw ImageLoaderError.decodeFailed
        }
        let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
        let exifRaw = (props?[kCGImagePropertyOrientation] as? UInt32) ?? 1
        let orientation = CGImagePropertyOrientation(exif: exifRaw)

        let upright = bakeOrientation(raw, orientation: orientation) ?? raw
        let size = CGSize(width: upright.width, height: upright.height)

        return LoadedImage(
            cgImage: upright,
            pixelSize: size,
            sourceFileName: fileName,
            originalOrientation: orientation
        )
    }

    /// 将 EXIF 方向烘焙进像素,输出直立 CGImage。
    private static func bakeOrientation(_ image: CGImage,
                                        orientation: CGImagePropertyOrientation) -> CGImage? {
        if orientation == .up { return image }
        let ci = CIImage(cgImage: image).oriented(orientation)
        let ctx = CIContext(options: nil)
        return ctx.createCGImage(ci, from: ci.extent)
    }
}
