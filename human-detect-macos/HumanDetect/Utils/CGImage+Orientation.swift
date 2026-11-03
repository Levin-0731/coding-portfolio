import CoreGraphics
import ImageIO
import Foundation

extension CGImagePropertyOrientation {
    /// 从 EXIF tagged orientation (1~8) 构造
    init(exif: UInt32) {
        self = CGImagePropertyOrientation(rawValue: exif) ?? .up
    }

    /// 旋转后逻辑尺寸是否与像素尺寸互换宽高
    var swapsDimensions: Bool {
        switch self {
        case .left, .leftMirrored, .right, .rightMirrored: return true
        default: return false
        }
    }
}
