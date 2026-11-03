import CoreGraphics
import Foundation

/// Vision 用左下原点的归一化坐标,SwiftUI/CG 用左上原点的视图坐标。
/// 本工具负责两者之间的映射(AspectFit 场景)。
enum CoordinateMapper {

    /// 图片在以 `viewSize` 为容器、AspectFit 模式下的实际显示 rect。
    static func aspectFitRect(imagePixelSize: CGSize, in viewSize: CGSize) -> CGRect {
        guard imagePixelSize.width > 0, imagePixelSize.height > 0,
              viewSize.width > 0, viewSize.height > 0 else {
            return .zero
        }
        let scale = min(viewSize.width / imagePixelSize.width,
                        viewSize.height / imagePixelSize.height)
        let w = imagePixelSize.width * scale
        let h = imagePixelSize.height * scale
        let x = (viewSize.width - w) / 2
        let y = (viewSize.height - h) / 2
        return CGRect(x: x, y: y, width: w, height: h)
    }

    /// 归一化坐标(左下原点,相对整图)→ 视图坐标(左上原点)。
    static func viewPoint(fromNormalized p: CGPoint,
                          imagePixelSize: CGSize,
                          in viewSize: CGSize) -> CGPoint {
        let rect = aspectFitRect(imagePixelSize: imagePixelSize, in: viewSize)
        let x = rect.origin.x + p.x * rect.width
        let y = rect.origin.y + (1 - p.y) * rect.height
        return CGPoint(x: x, y: y)
    }

    /// 归一化坐标 → 图片像素坐标(左上原点),用于导出时在原图上重绘。
    static func imagePixelPoint(fromNormalized p: CGPoint,
                                imagePixelSize: CGSize) -> CGPoint {
        CGPoint(x: p.x * imagePixelSize.width,
                y: (1 - p.y) * imagePixelSize.height)
    }
}
