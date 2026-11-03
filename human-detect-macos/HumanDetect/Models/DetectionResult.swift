import CoreGraphics
import Foundation

struct CodableSize: Codable, Hashable {
    let w: CGFloat
    let h: CGFloat
    init(_ size: CGSize) { self.w = size.width; self.h = size.height }
    var cgSize: CGSize { CGSize(width: w, height: h) }
}

struct DetectionResult: Codable {
    let sourceFileName: String?
    let imagePixelSize: CodableSize
    let orientationRawValue: UInt32
    let elapsedMs: Double
    let person: PersonPose?
    var sensitivity: SensitivityResult? = nil
    /// 本地 Core ML 模型对黄图(NSFW)的判定结果。
    var nsfw: NSFWResult? = nil
}
