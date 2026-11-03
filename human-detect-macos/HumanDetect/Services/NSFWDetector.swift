import CoreGraphics
import CoreML
import Foundation
import Vision
import os.log

private let log = Logger(subsystem: "com.local.HumanDetect", category: "NSFW")

/// 单张图的 NSFW(黄图)判定结果。
/// 由本地 Core ML 模型推理得到,完全离线。
struct NSFWResult: Codable, Hashable {
    /// 综合 NSFW 概率,值域 [0, 1],越大越倾向 NSFW。
    let nsfwScore: Float
    /// 模型给出的每个类别的原始分数(label → score)。
    /// 单 sigmoid 模型可能为 `["nsfw": 0.92]`,五分类模型则会有 5 项。
    let classScores: [String: Float]
    /// 用于判定 isNSFW 的阈值(从 DetectionOptions 透传)。
    let threshold: Float
    /// `nsfwScore >= threshold`。
    let isNSFW: Bool
    /// 推理耗时(ms)。
    let elapsedMs: Double
    /// 实际加载到的模型名(bundle 资源名,无后缀)。
    let modelName: String?
    /// 出错或模型不可用时给用户的友好提示。
    let errorMessage: String?
}

/// 基于本地 Core ML 模型的 NSFW(黄图)分类器。
///
/// 用法:
/// 1. 把任意一份 NSFW 分类 `.mlmodel` 或 `.mlpackage` 拖进 `HumanDetect/Models/CoreML/`,
///    Xcode 16 的 file-system synchronized group 会自动把它加入工程并编译为 `.mlmodelc`。
/// 2. 文件主名建议是下面候选之一(命中其一即可):
///    `NSFWDetector` / `NSFW` / `OpenNSFW` / `Nudity`。
/// 3. 模型本身只要满足以下任一接口即可被自动适配:
///    - 输出 `VNClassificationObservation`(常见的 5 分类:porn/sexy/hentai/drawings/neutral)
///    - 输出 1 或 2 维 `MLMultiArray`(Yahoo OpenNSFW 的 sigmoid / softmax)
///    - 输出 `[String: NSNumber]` 字典
enum NSFWDetector {

    /// 在 main bundle 中按顺序尝试这些资源名。
    /// 注意：不能用 "NSFWDetector"，因为 Xcode 会把 .mlmodel 自动生成同名 Swift 类，与本 enum 冲突。
    private static let candidates = ["NSFWModel", "NSFW", "OpenNSFW", "Nudity"]

    /// 模型一次性懒加载(`static let` 是线程安全的)。
    private static let cached: Loaded? = loadModelOnce()

    private struct Loaded {
        let vnModel: VNCoreMLModel
        let name: String
    }

    /// 启动时调一次,把模型加载状态写进 Unified Log。
    static func logEnvironment() {
        if let l = cached {
            log.log("[NSFW] model loaded: \(l.name, privacy: .public)")
        } else {
            log.log("[NSFW] no model bundled. tried: \(candidates.joined(separator: ", "), privacy: .public)")
        }
    }

    /// 模型是否就绪(被打包进 app)。
    static var isModelAvailable: Bool { cached != nil }

    /// 当前加载到的模型名,用于 UI 展示。
    static var modelName: String? { cached?.name }

    /// 给定一张直立 `CGImage`,跑一次 NSFW 分类。
    static func analyze(image: CGImage, threshold: Float) async -> NSFWResult {
        let start = Date()

        guard let entry = cached else {
            return NSFWResult(
                nsfwScore: 0,
                classScores: [:],
                threshold: threshold,
                isNSFW: false,
                elapsedMs: Date().timeIntervalSince(start) * 1000,
                modelName: nil,
                errorMessage: missingModelHint()
            )
        }

        return await withCheckedContinuation { (cont: CheckedContinuation<NSFWResult, Never>) in
            DispatchQueue.global(qos: .userInitiated).async {
                let request = VNCoreMLRequest(model: entry.vnModel)
                // OpenNSFW 等模型期望 224×224 中心裁剪;.centerCrop 是最稳的默认。
                request.imageCropAndScaleOption = .centerCrop

                let handler = VNImageRequestHandler(cgImage: image, orientation: .up, options: [:])
                do {
                    try handler.perform([request])
                } catch {
                    let ms = Date().timeIntervalSince(start) * 1000
                    log.error("[NSFW] perform failed: \(error.localizedDescription, privacy: .public)")
                    cont.resume(returning: NSFWResult(
                        nsfwScore: 0,
                        classScores: [:],
                        threshold: threshold,
                        isNSFW: false,
                        elapsedMs: ms,
                        modelName: entry.name,
                        errorMessage: "Vision 推理失败:\(error.localizedDescription)"
                    ))
                    return
                }

                let (score, dict) = parseResults(request.results ?? [])
                let ms = Date().timeIntervalSince(start) * 1000
                log.log("[NSFW] score=\(String(format: "%.3f", score), privacy: .public) elapsed=\(String(format: "%.1f", ms), privacy: .public)ms")
                cont.resume(returning: NSFWResult(
                    nsfwScore: score,
                    classScores: dict,
                    threshold: threshold,
                    isNSFW: score >= threshold,
                    elapsedMs: ms,
                    modelName: entry.name,
                    errorMessage: nil
                ))
            }
        }
    }

    // MARK: - Loading

    private static func loadModelOnce() -> Loaded? {
        let bundle = Bundle.main
        for name in candidates {
            // 优先找编译产物 .mlmodelc(`.mlmodel`/`.mlpackage` 都会被 Xcode 编译为它)。
            guard let url = bundle.url(forResource: name, withExtension: "mlmodelc") else {
                continue
            }
            do {
                let cfg = MLModelConfiguration()
                cfg.computeUnits = .all   // CPU + GPU + Neural Engine 自动调度
                let mlModel = try MLModel(contentsOf: url, configuration: cfg)
                let vn = try VNCoreMLModel(for: mlModel)
                log.log("[NSFW] loaded \(name, privacy: .public) at \(url.path, privacy: .public)")
                return Loaded(vnModel: vn, name: name)
            } catch {
                log.error("[NSFW] load \(name, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
            }
        }
        return nil
    }

    // MARK: - Output parsing

    /// 类别名包含这些关键词 → 视为 NSFW 类。
    private static let nsfwKeywords: [String] = [
        "porn", "nsfw", "sexy", "hentai", "explicit",
        "nude", "nudity", "erotic", "adult", "xxx"
    ]
    /// 类别名包含这些关键词 → 视为安全类。
    private static let safeKeywords: [String] = [
        "neutral", "safe", "drawings", "drawing", "sfw", "normal", "non_nude", "non-nude"
    ]

    private static func parseResults(_ results: [VNObservation]) -> (Float, [String: Float]) {
        // 形态 A:VNClassificationObservation 列表(最常见)
        let classifications = results.compactMap { $0 as? VNClassificationObservation }
        if !classifications.isEmpty {
            var dict: [String: Float] = [:]
            var nsfw: Float = 0
            var safe: Float = 0
            for c in classifications {
                dict[c.identifier] = c.confidence
                let lower = c.identifier.lowercased()
                if nsfwKeywords.contains(where: { lower.contains($0) }) {
                    nsfw = max(nsfw, c.confidence)
                } else if safeKeywords.contains(where: { lower.contains($0) }) {
                    safe = max(safe, c.confidence)
                }
            }
            // 标签都不在关键词表里时,回退用 top-1:
            // 若 top-1 不像安全类,就把它当成 NSFW 概率。
            if nsfw == 0 && safe == 0, let top = classifications.first {
                let lower = top.identifier.lowercased()
                if !safeKeywords.contains(where: { lower.contains($0) }) {
                    nsfw = top.confidence
                }
            }
            return (nsfw, dict)
        }

        // 形态 B:VNCoreMLFeatureValueObservation(MultiArray / Dictionary)
        for obs in results {
            guard let fv = obs as? VNCoreMLFeatureValueObservation else { continue }
            let value = fv.featureValue

            if let array = value.multiArrayValue, array.count >= 1 {
                if array.count == 1 {
                    let v = Float(truncating: array[0])
                    return (v, [fv.featureName: v])
                } else if array.count == 2 {
                    // Yahoo OpenNSFW 约定:idx 0 = SFW,idx 1 = NSFW
                    let safe = Float(truncating: array[0])
                    let nsfw = Float(truncating: array[1])
                    return (nsfw, ["safe": safe, "nsfw": nsfw])
                } else {
                    // 多类但没有 label,只能放弃
                    return (0, [:])
                }
            }

            if let dictRaw = value.dictionaryValue as? [String: NSNumber] {
                var dict: [String: Float] = [:]
                var nsfw: Float = 0
                var safe: Float = 0
                for (k, v) in dictRaw {
                    let f = v.floatValue
                    dict[k] = f
                    let lower = k.lowercased()
                    if nsfwKeywords.contains(where: { lower.contains($0) }) {
                        nsfw = max(nsfw, f)
                    } else if safeKeywords.contains(where: { lower.contains($0) }) {
                        safe = max(safe, f)
                    }
                }
                return (nsfw, dict)
            }
        }

        return (0, [:])
    }

    private static func missingModelHint() -> String {
        """
        未找到 NSFW Core ML 模型。
        把任意一份 NSFW 分类 .mlmodel / .mlpackage 拖到 \
        HumanDetect/Models/CoreML/ 下，文件名建议为 \
        NSFWModel / NSFW / OpenNSFW / Nudity 之一，Xcode 会自动打包。
        注意：不要用 NSFWDetector 作为文件名（会与工程代码冲突）。
        """
    }
}
