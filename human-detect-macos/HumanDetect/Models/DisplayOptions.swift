import CoreGraphics
import Foundation

struct DisplayOptions: Equatable {
    var showBody: Bool = true
    var showHands: Bool = true
    var showFace: Bool = true
    var showSkeleton: Bool = true
    var showLabels: Bool = false
    var confidenceThreshold: Float = 0.3
    var pointRadius: CGFloat = 4
    var lineWidth: CGFloat = 2
}
