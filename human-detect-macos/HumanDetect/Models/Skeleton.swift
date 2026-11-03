import Foundation
import Vision

/// 关键点之间的连接定义(用于画骨架线)
enum Skeleton {

    // MARK: - Body

    static let bodyEdges: [(VNHumanBodyPoseObservation.JointName,
                            VNHumanBodyPoseObservation.JointName)] = [
        // 头颈
        (.nose, .neck),
        (.leftEye, .nose), (.rightEye, .nose),
        (.leftEar, .leftEye), (.rightEar, .rightEye),
        // 肩 + 躯干
        (.neck, .leftShoulder), (.neck, .rightShoulder),
        (.leftShoulder, .rightShoulder),
        (.leftShoulder, .leftHip), (.rightShoulder, .rightHip),
        (.leftHip, .rightHip),
        (.neck, .root),
        // 左臂
        (.leftShoulder, .leftElbow), (.leftElbow, .leftWrist),
        // 右臂
        (.rightShoulder, .rightElbow), (.rightElbow, .rightWrist),
        // 左腿
        (.leftHip, .leftKnee), (.leftKnee, .leftAnkle),
        // 右腿
        (.rightHip, .rightKnee), (.rightKnee, .rightAnkle),
    ]

    // MARK: - Hand

    /// 单只手的 21 点连接(手腕 → 5 指,每指 4 段)
    static let handEdges: [(VNHumanHandPoseObservation.JointName,
                            VNHumanHandPoseObservation.JointName)] = [
        // 拇指
        (.wrist, .thumbCMC), (.thumbCMC, .thumbMP),
        (.thumbMP, .thumbIP), (.thumbIP, .thumbTip),
        // 食指
        (.wrist, .indexMCP), (.indexMCP, .indexPIP),
        (.indexPIP, .indexDIP), (.indexDIP, .indexTip),
        // 中指
        (.wrist, .middleMCP), (.middleMCP, .middlePIP),
        (.middlePIP, .middleDIP), (.middleDIP, .middleTip),
        // 无名指
        (.wrist, .ringMCP), (.ringMCP, .ringPIP),
        (.ringPIP, .ringDIP), (.ringDIP, .ringTip),
        // 小指
        (.wrist, .littleMCP), (.littleMCP, .littlePIP),
        (.littlePIP, .littleDIP), (.littleDIP, .littleTip),
    ]

    // MARK: - Face region polylines

    /// 面部 landmark 按区域的折线顺序(是否闭合)
    struct FaceRegionStyle {
        let region: FaceRegion
        let closed: Bool
    }

    static let faceRegionStyles: [FaceRegionStyle] = [
        .init(region: .faceContour, closed: false),
        .init(region: .leftEye, closed: true),
        .init(region: .rightEye, closed: true),
        .init(region: .leftEyebrow, closed: false),
        .init(region: .rightEyebrow, closed: false),
        .init(region: .nose, closed: false),
        .init(region: .noseCrest, closed: false),
        .init(region: .medianLine, closed: false),
        .init(region: .outerLips, closed: true),
        .init(region: .innerLips, closed: true),
    ]
}
