import SwiftUI

/// 图片画布:显示图片 + 叠加层(PoseOverlayView),并支持适应窗口。
/// MVP 不实现手动缩放/平移,始终 AspectFit。
struct ImageCanvasView: View {
    let image: LoadedImage
    let result: DetectionResult?
    let options: DisplayOptions

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Color.black.opacity(0.03)
                Image(decorative: image.cgImage, scale: 1.0, orientation: .up)
                    .resizable()
                    .interpolation(.high)
                    .aspectRatio(contentMode: .fit)
                    .frame(width: geo.size.width, height: geo.size.height)

                if let person = result?.person {
                    PoseOverlayView(
                        person: person,
                        imagePixelSize: image.pixelSize,
                        options: options
                    )
                    .frame(width: geo.size.width, height: geo.size.height)
                }
            }
        }
    }
}
