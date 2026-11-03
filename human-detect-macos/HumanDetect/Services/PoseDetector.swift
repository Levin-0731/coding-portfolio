import CoreGraphics
import Foundation
import Vision

struct DetectionOptions {
    var detectBody: Bool = true
    var detectHands: Bool = true
    var detectFace: Bool = true
    /// 是否同时做敏感内容(裸露)分析。macOS 14+ 且系统层开启时才会真正返回结果。
    var detectSensitivity: Bool = true
    /// 是否启用本地 Core ML 模型做 NSFW(黄图)分类。
    /// 仅当 `Models/CoreML/` 中放置了可识别的 `.mlmodel/.mlpackage` 时才会真正出结果。
    var detectNSFW: Bool = true
    /// NSFW 概率阈值,`>= threshold` 视为含黄图。0~1。
    var nsfwThreshold: Float = 0.8
    /// 手部最大数量(我们按与身体 wrist 距离挑两只)
    var maxHands: Int = 4
}

enum PoseDetectorError: LocalizedError {
    case requestFailed(Error)

    var errorDescription: String? {
        switch self {
        case .requestFailed(let e): return "关键点检测失败:\(e.localizedDescription)"
        }
    }
}

enum PoseDetector {

    /// 主入口:对一张直立 CGImage 执行身体/手/脸检测,返回单人结果。
    static func detect(image: CGImage,
                       fileName: String?,
                       originalOrientationRaw: UInt32,
                       options: DetectionOptions = .init()) async throws -> DetectionResult {
        try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let result = try performDetection(image: image,
                                                      fileName: fileName,
                                                      originalOrientationRaw: originalOrientationRaw,
                                                      options: options)
                    continuation.resume(returning: result)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    private static func performDetection(image: CGImage,
                                         fileName: String?,
                                         originalOrientationRaw: UInt32,
                                         options: DetectionOptions) throws -> DetectionResult {
        let start = Date()

        var requests: [VNRequest] = []

        let bodyReq = VNDetectHumanBodyPoseRequest()
        let handReq = VNDetectHumanHandPoseRequest()
        handReq.maximumHandCount = options.maxHands
        let faceReq = VNDetectFaceLandmarksRequest()

        if options.detectBody { requests.append(bodyReq) }
        if options.detectHands { requests.append(handReq) }
        if options.detectFace { requests.append(faceReq) }

        // 输入图片已直立,使用 .up
        let handler = VNImageRequestHandler(cgImage: image, orientation: .up, options: [:])
        do {
            try handler.perform(requests)
        } catch {
            throw PoseDetectorError.requestFailed(error)
        }

        // --- body: 选最高 confidence ---
        let bodyObservation: VNHumanBodyPoseObservation? =
            options.detectBody
            ? (bodyReq.results ?? []).max(by: { $0.confidence < $1.confidence })
            : nil

        let bodyPoints = bodyObservation.map { extractBodyPoints(from: $0) } ?? []

        // --- hands: 最多两只,按与身体 wrist 距离分配到左/右 ---
        var leftHand: [JointPoint] = []
        var rightHand: [JointPoint] = []
        if options.detectHands, let handObservations = handReq.results {
            (leftHand, rightHand) = assignHands(
                observations: handObservations,
                bodyPoints: bodyPoints
            )
        }

        // --- face: 取与 body 头部最近的一张脸(没有 body 则取最大那张) ---
        var facePoints: [JointPoint] = []
        if options.detectFace, let faceObservations = faceReq.results, !faceObservations.isEmpty {
            let picked = pickFace(observations: faceObservations, bodyPoints: bodyPoints)
            if let f = picked {
                facePoints = extractFacePoints(from: f)
            }
        }

        let person: PersonPose?
        if bodyPoints.isEmpty && leftHand.isEmpty && rightHand.isEmpty && facePoints.isEmpty {
            person = nil
        } else {
            person = PersonPose(
                bodyConfidence: bodyObservation?.confidence,
                body: bodyPoints,
                leftHand: leftHand,
                rightHand: rightHand,
                face: facePoints
            )
        }

        let elapsedMs = Date().timeIntervalSince(start) * 1000
        return DetectionResult(
            sourceFileName: fileName,
            imagePixelSize: CodableSize(CGSize(width: image.width, height: image.height)),
            orientationRawValue: originalOrientationRaw,
            elapsedMs: elapsedMs,
            person: person
        )
    }

    // MARK: - Body

    private static func extractBodyPoints(from obs: VNHumanBodyPoseObservation) -> [JointPoint] {
        var out: [JointPoint] = []
        let all = (try? obs.recognizedPoints(.all)) ?? [:]
        for (name, p) in all {
            // VNRecognizedPoint.location: 归一化,左下原点(对整图)
            guard p.confidence > 0 else { continue }
            out.append(JointPoint(
                name: name.rawValue.rawValue,
                category: .body,
                normalized: p.location,
                confidence: p.confidence
            ))
        }
        return out
    }

    // MARK: - Hand

    private static func assignHands(observations: [VNHumanHandPoseObservation],
                                    bodyPoints: [JointPoint]) -> ([JointPoint], [JointPoint]) {
        // 取每只手的 wrist 作为定位点
        struct HandInfo { let obs: VNHumanHandPoseObservation; let wrist: CGPoint? }
        let infos: [HandInfo] = observations.map {
            let wristPt = try? $0.recognizedPoint(.wrist)
            let loc = (wristPt?.confidence ?? 0) > 0 ? wristPt?.location : nil
            return HandInfo(obs: $0, wrist: loc)
        }

        let leftBodyWrist = bodyPoints.first { $0.name == "left_wrist_joint" || $0.name == "leftWrist" }
        let rightBodyWrist = bodyPoints.first { $0.name == "right_wrist_joint" || $0.name == "rightWrist" }

        // 若没有 body 信息,直接按 x 坐标分左右(图像坐标:x 小为左)
        if leftBodyWrist == nil && rightBodyWrist == nil {
            let sorted = infos.sorted { (a, b) -> Bool in
                (a.wrist?.x ?? 0.5) < (b.wrist?.x ?? 0.5)
            }
            var left: [JointPoint] = [], right: [JointPoint] = []
            if let first = sorted.first {
                left = extractHandPoints(from: first.obs, category: .leftHand)
            }
            if sorted.count >= 2 {
                right = extractHandPoints(from: sorted[1].obs, category: .rightHand)
            }
            return (left, right)
        }

        // 否则用匈牙利式贪心:对每个 body wrist 找最近的手
        var remaining = infos
        var result: [JointCategory: [JointPoint]] = [.leftHand: [], .rightHand: []]

        for (category, target): (JointCategory, JointPoint?) in [
            (.leftHand, leftBodyWrist),
            (.rightHand, rightBodyWrist)
        ] {
            guard let target = target else { continue }
            let targetLoc = target.normalized
            var bestIdx: Int? = nil
            var bestDist = CGFloat.infinity
            for (i, info) in remaining.enumerated() {
                guard let w = info.wrist else { continue }
                let d = hypot(w.x - targetLoc.x, w.y - targetLoc.y)
                if d < bestDist {
                    bestDist = d
                    bestIdx = i
                }
            }
            // 距离阈值:0.25(归一化)内才认
            if let i = bestIdx, bestDist < 0.25 {
                result[category] = extractHandPoints(from: remaining[i].obs, category: category)
                remaining.remove(at: i)
            }
        }

        return (result[.leftHand] ?? [], result[.rightHand] ?? [])
    }

    private static func extractHandPoints(from obs: VNHumanHandPoseObservation,
                                          category: JointCategory) -> [JointPoint] {
        var out: [JointPoint] = []
        let all = (try? obs.recognizedPoints(.all)) ?? [:]
        for (name, p) in all {
            guard p.confidence > 0 else { continue }
            out.append(JointPoint(
                name: name.rawValue.rawValue,
                category: category,
                normalized: p.location,
                confidence: p.confidence
            ))
        }
        return out
    }

    // MARK: - Face

    private static func pickFace(observations: [VNFaceObservation],
                                 bodyPoints: [JointPoint]) -> VNFaceObservation? {
        // 找 body 的 nose(归一化坐标)
        let bodyNose = bodyPoints.first {
            $0.name == "head_joint" || $0.name == "nose" || $0.name == "neck_1_joint"
        }
        if let nose = bodyNose {
            return observations.min { a, b in
                let ca = CGPoint(x: a.boundingBox.midX, y: a.boundingBox.midY)
                let cb = CGPoint(x: b.boundingBox.midX, y: b.boundingBox.midY)
                return hypot(ca.x - nose.normalized.x, ca.y - nose.normalized.y)
                     < hypot(cb.x - nose.normalized.x, cb.y - nose.normalized.y)
            }
        }
        // 没有 body,取面积最大的那张脸
        return observations.max { a, b in
            (a.boundingBox.width * a.boundingBox.height)
                < (b.boundingBox.width * b.boundingBox.height)
        }
    }

    private static func extractFacePoints(from obs: VNFaceObservation) -> [JointPoint] {
        guard let lm = obs.landmarks else { return [] }
        var out: [JointPoint] = []

        let regions: [(FaceRegion, VNFaceLandmarkRegion2D?)] = [
            (.faceContour, lm.faceContour),
            (.leftEye, lm.leftEye),
            (.rightEye, lm.rightEye),
            (.leftEyebrow, lm.leftEyebrow),
            (.rightEyebrow, lm.rightEyebrow),
            (.nose, lm.nose),
            (.noseCrest, lm.noseCrest),
            (.medianLine, lm.medianLine),
            (.outerLips, lm.outerLips),
            (.innerLips, lm.innerLips),
            (.leftPupil, lm.leftPupil),
            (.rightPupil, lm.rightPupil),
        ]

        let bbox = obs.boundingBox   // 归一化,左下原点,相对整图
        let conf = obs.confidence

        for (region, r2d) in regions {
            guard let r2d = r2d else { continue }
            let pts = r2d.normalizedPoints
            for (i, p) in pts.enumerated() {
                // landmark 点是相对 boundingBox 的归一化坐标,需要映射到整图
                let x = bbox.origin.x + p.x * bbox.width
                let y = bbox.origin.y + p.y * bbox.height
                out.append(JointPoint(
                    name: "\(region.rawValue)_\(i)",
                    category: .face,
                    normalized: CGPoint(x: x, y: y),
                    confidence: conf,
                    faceRegion: region
                ))
            }
        }
        return out
    }
}
