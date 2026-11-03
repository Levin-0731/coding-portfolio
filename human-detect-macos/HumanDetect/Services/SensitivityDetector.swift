import CoreGraphics
import Foundation
import os.log
#if canImport(SensitiveContentAnalysis)
import SensitiveContentAnalysis
#endif

private let log = Logger(subsystem: "com.local.HumanDetect", category: "Sensitivity")

/// 敏感内容(裸露)分析 policy 的跨版本镜像,方便 UI 展示。
enum SensitivityPolicy: String, Codable {
    /// 系统未开启"敏感内容警告",或当前 App 没有 SCA entitlement。
    case disabled
    /// 仅对 UI 做简单干预(默认)。
    case simpleInterventions
    /// 详细干预(需要用户在系统设置中进一步开启)。
    case descriptiveInterventions
    /// 当前系统版本不支持(< macOS 14)。
    case unsupported

    var displayName: String {
        switch self {
        case .disabled: return "未启用"
        case .simpleInterventions: return "简单干预"
        case .descriptiveInterventions: return "详细干预"
        case .unsupported: return "不支持(需 macOS 14+)"
        }
    }
}

/// 单张图的敏感内容判定结果。
struct SensitivityResult: Codable {
    let isSensitive: Bool
    let policy: SensitivityPolicy
    let elapsedMs: Double
    let errorMessage: String?
}

enum SensitivityDetector {

    /// 启动时调一次,把当前环境信息写进 Unified Log(Console.app 按 subsystem `com.local.HumanDetect` 过滤)。
    static func logEnvironment() {
        let bundleID = Bundle.main.bundleIdentifier ?? "<unknown>"
        let os = ProcessInfo.processInfo.operatingSystemVersionString

        var policyStr = "unsupported(macOS < 14)"
        #if canImport(SensitiveContentAnalysis)
        if #available(macOS 14.0, *) {
            let p = SCSensitivityAnalyzer().analysisPolicy
            policyStr = "raw=\(p.rawValue) mapped=\(map(p).rawValue)"
        }
        #endif

        log.log("[SCA] bundleID=\(bundleID, privacy: .public) os=\(os, privacy: .public) policy=\(policyStr, privacy: .public)")
    }

    /// 系统是否可用敏感内容分析(macOS 14+ 且系统层开关开启 + 本 App 被授权)。
    static var isAvailable: Bool {
        #if canImport(SensitiveContentAnalysis)
        if #available(macOS 14.0, *) {
            return SCSensitivityAnalyzer().analysisPolicy != .disabled
        }
        #endif
        return false
    }

    /// 当前 policy(不触发分析,只读取系统状态)。
    static var currentPolicy: SensitivityPolicy {
        #if canImport(SensitiveContentAnalysis)
        if #available(macOS 14.0, *) {
            return map(SCSensitivityAnalyzer().analysisPolicy)
        }
        #endif
        return .unsupported
    }

    /// 分析一张 CGImage,返回是否含裸露。
    static func analyze(image: CGImage) async -> SensitivityResult {
        let start = Date()

        #if canImport(SensitiveContentAnalysis)
        if #available(macOS 14.0, *) {
            let analyzer = SCSensitivityAnalyzer()
            let policy = map(analyzer.analysisPolicy)

            guard policy != .disabled else {
                return SensitivityResult(
                    isSensitive: false,
                    policy: .disabled,
                    elapsedMs: Date().timeIntervalSince(start) * 1000,
                    errorMessage: disabledHint()
                )
            }

            do {
                let response = try await analyzer.analyzeImage(image)
                let ms = Date().timeIntervalSince(start) * 1000
                log.log("[SCA] analyze isSensitive=\(response.isSensitive, privacy: .public) elapsed=\(String(format: "%.1f", ms), privacy: .public)ms")
                return SensitivityResult(
                    isSensitive: response.isSensitive,
                    policy: policy,
                    elapsedMs: ms,
                    errorMessage: nil
                )
            } catch {
                log.error("[SCA] analyze failed: \(error.localizedDescription, privacy: .public)")
                return SensitivityResult(
                    isSensitive: false,
                    policy: policy,
                    elapsedMs: Date().timeIntervalSince(start) * 1000,
                    errorMessage: friendlyError(error)
                )
            }
        }
        #endif

        return SensitivityResult(
            isSensitive: false,
            policy: .unsupported,
            elapsedMs: Date().timeIntervalSince(start) * 1000,
            errorMessage: "当前系统不支持敏感内容分析(需要 macOS 14+)。"
        )
    }

    #if canImport(SensitiveContentAnalysis)
    @available(macOS 14.0, *)
    private static func map(_ p: SCSensitivityAnalysisPolicy) -> SensitivityPolicy {
        switch p {
        case .disabled: return .disabled
        case .simpleInterventions: return .simpleInterventions
        case .descriptiveInterventions: return .descriptiveInterventions
        @unknown default: return .simpleInterventions
        }
    }
    #endif

    /// 当 policy = .disabled 时给用户的可读解释。
    private static func disabledHint() -> String {
        """
        系统拒绝了敏感内容分析请求。常见原因:
        1) 系统设置 → 隐私与安全 → 敏感内容警告 未开启;
        2) 当前 App 未声明 `com.apple.developer.sensitivecontentanalysis.client` entitlement;
           该 entitlement 仅对【付费 Apple Developer Program 帐号】开放,Personal Team(免费 Apple ID)不支持。
        """
    }

    /// 从底层 NSError 提取更友好的错误描述。
    private static func friendlyError(_ error: Error) -> String {
        let ns = error as NSError
        let underlying = (ns.userInfo[NSUnderlyingErrorKey] as? NSError)?.localizedDescription ?? ""
        let joined = [ns.localizedDescription, underlying]
            .filter { !$0.isEmpty }.joined(separator: " / ")
        if joined.lowercased().contains("not entitled") {
            return "分析被拒:本 App 未获得 Sensitive Content Analysis entitlement,需付费开发者帐号才能使用。"
        }
        return joined.isEmpty ? ns.localizedDescription : joined
    }
}
