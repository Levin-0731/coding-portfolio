import CoreGraphics
import Foundation

enum JointCategory: String, Codable, Hashable {
    case body
    case leftHand
    case rightHand
    case face
}

/// 面部 landmark 的子区域(用于折线绘制)
enum FaceRegion: String, Codable, Hashable {
    case faceContour
    case leftEye
    case rightEye
    case leftEyebrow
    case rightEyebrow
    case nose
    case noseCrest
    case medianLine
    case outerLips
    case innerLips
    case leftPupil
    case rightPupil
}

struct JointPoint: Codable, Hashable {
    let name: String
    let category: JointCategory
    /// Vision 原始坐标,左下原点,已相对整图归一化到 [0,1]
    let normalized: CGPoint
    let confidence: Float
    /// 仅 face 类别使用,用于按区域画折线
    let faceRegion: FaceRegion?

    init(name: String,
         category: JointCategory,
         normalized: CGPoint,
         confidence: Float,
         faceRegion: FaceRegion? = nil) {
        self.name = name
        self.category = category
        self.normalized = normalized
        self.confidence = confidence
        self.faceRegion = faceRegion
    }
}
