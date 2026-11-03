import Foundation

struct PersonPose: Codable {
    let bodyConfidence: Float?
    let body: [JointPoint]
    let leftHand: [JointPoint]
    let rightHand: [JointPoint]
    let face: [JointPoint]

    var allPoints: [JointPoint] {
        body + leftHand + rightHand + face
    }

    var hasAny: Bool { !allPoints.isEmpty }
}
