import SwiftUI

struct InspectorView: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        Form {
            Section("检测信息") {
                if let img = viewModel.loadedImage {
                    LabeledContent("文件", value: img.sourceFileName ?? "-")
                    LabeledContent("尺寸",
                        value: "\(Int(img.pixelSize.width)) × \(Int(img.pixelSize.height))")
                }
                if let res = viewModel.result {
                    LabeledContent("耗时",
                        value: String(format: "%.1f ms", res.elapsedMs))
                    if let conf = res.person?.bodyConfidence {
                        LabeledContent("身体置信度",
                            value: String(format: "%.2f", conf))
                    }
                    if let person = res.person {
                        LabeledContent("身体关键点", value: "\(person.body.count)")
                        LabeledContent("左手", value: "\(person.leftHand.count)")
                        LabeledContent("右手", value: "\(person.rightHand.count)")
                        LabeledContent("面部", value: "\(person.face.count)")
                    } else {
                        Text("未检测到人像").foregroundStyle(.secondary)
                    }
                }
                if viewModel.isDetecting {
                    HStack {
                        ProgressView().controlSize(.small)
                        Text("正在检测…")
                    }
                }
            }

            sensitivitySection
            nsfwSection

            Section("显示开关") {
                Toggle("身体", isOn: $viewModel.displayOptions.showBody)
                Toggle("手部", isOn: $viewModel.displayOptions.showHands)
                Toggle("面部", isOn: $viewModel.displayOptions.showFace)
                Toggle("骨架线", isOn: $viewModel.displayOptions.showSkeleton)
                Toggle("显示标签", isOn: $viewModel.displayOptions.showLabels)
            }

            Section("样式") {
                VStack(alignment: .leading) {
                    Text("置信度阈值: \(String(format: "%.2f", viewModel.displayOptions.confidenceThreshold))")
                    Slider(value: Binding(
                        get: { Double(viewModel.displayOptions.confidenceThreshold) },
                        set: { viewModel.displayOptions.confidenceThreshold = Float($0) }
                    ), in: 0...1)
                }
                VStack(alignment: .leading) {
                    Text("点大小: \(Int(viewModel.displayOptions.pointRadius))")
                    Slider(value: $viewModel.displayOptions.pointRadius, in: 1...12)
                }
                VStack(alignment: .leading) {
                    Text("线宽: \(String(format: "%.1f", viewModel.displayOptions.lineWidth))")
                    Slider(value: $viewModel.displayOptions.lineWidth, in: 0.5...8)
                }
            }

            Section("操作") {
                Button("重新检测") { viewModel.redetect() }
                    .disabled(viewModel.loadedImage == nil || viewModel.isDetecting)
                Button("移除当前") {
                    if let id = viewModel.selectedItemID {
                        viewModel.remove(ids: [id])
                    }
                }
                .disabled(viewModel.selectedItem == nil)
                Button("清空队列") { viewModel.clearAll() }
                    .disabled(viewModel.items.isEmpty)
                Divider()
                Button("导出标注图…") { viewModel.exportAnnotatedImage() }
                    .disabled(viewModel.result?.person == nil)
                Button("导出 JSON…") { viewModel.exportJSON() }
                    .disabled(viewModel.result == nil)
            }
        }
        .formStyle(.grouped)
        .frame(minWidth: 260)
    }

    // MARK: - NSFW Section

    @ViewBuilder
    private var nsfwSection: some View {
        Section("内容安全(Core ML)") {
            Toggle("启用 NSFW 检测", isOn: $viewModel.detectionOptions.detectNSFW)
                .help("基于本地 Core ML 模型推理,完全离线,不联网。")

            if viewModel.isNSFWModelAvailable {
                LabeledContent("模型", value: viewModel.nsfwModelName ?? "-")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Label("未找到模型", systemImage: "exclamationmark.triangle")
                        .font(.caption)
                        .foregroundStyle(.orange)
                    Text("把 .mlmodel / .mlpackage 拖到 Models/CoreML/ 下，文件名用 NSFWDetector / NSFW / OpenNSFW / Nudity 之一。")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            if viewModel.detectionOptions.detectNSFW {
                VStack(alignment: .leading, spacing: 2) {
                    Text("阈值: \(String(format: "%.2f", viewModel.detectionOptions.nsfwThreshold))")
                        .font(.caption)
                    Slider(value: Binding(
                        get: { Double(viewModel.detectionOptions.nsfwThreshold) },
                        set: { viewModel.detectionOptions.nsfwThreshold = Float($0) }
                    ), in: 0.5...1.0, step: 0.01)
                    .help("NSFW 概率 ≥ 阈值时标记为含黄图")
                }
            }

            if let nsfw = viewModel.result?.nsfw {
                nsfwResultRow(nsfw)
            } else if viewModel.detectionOptions.detectNSFW && viewModel.result != nil {
                Text("未分析").foregroundStyle(.secondary).font(.caption)
            }
        }
    }

    @ViewBuilder
    private func nsfwResultRow(_ nsfw: NSFWResult) -> some View {
        if let msg = nsfw.errorMessage, !nsfw.isNSFW {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: "questionmark.circle")
                        .foregroundStyle(.secondary)
                    Text("无法判定")
                        .foregroundStyle(.secondary)
                }
                Text(msg)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        } else {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    if nsfw.isNSFW {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                        Text("含黄图内容")
                            .foregroundStyle(.red)
                            .bold()
                    } else {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundStyle(.green)
                        Text("安全")
                            .foregroundStyle(.green)
                    }
                    Spacer()
                    Text(String(format: "%.0f ms", nsfw.elapsedMs))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }

                // 分数条
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.secondary.opacity(0.15))
                            .frame(height: 6)
                        RoundedRectangle(cornerRadius: 3)
                            .fill(nsfw.nsfwScore >= nsfw.threshold ? Color.red : Color.green)
                            .frame(
                                width: geo.size.width * CGFloat(min(nsfw.nsfwScore, 1)),
                                height: 6
                            )
                    }
                }
                .frame(height: 6)

                Text(String(format: "NSFW 概率: %.1f%%", nsfw.nsfwScore * 100))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)

                if !nsfw.classScores.isEmpty {
                    let sorted = nsfw.classScores.sorted { $0.value > $1.value }
                    ForEach(sorted.prefix(5), id: \.key) { label, score in
                        HStack {
                            Text(label)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(String(format: "%.1f%%", score * 100))
                                .font(.caption2.monospacedDigit())
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Sensitivity Section

    @ViewBuilder
    private var sensitivitySection: some View {
        Section("内容安全(裸露)") {
            Toggle("启用敏感内容分析", isOn: $viewModel.detectionOptions.detectSensitivity)
                .help("基于 Apple SensitiveContentAnalysis,本地推理,不联网。")

            let policy = viewModel.sensitivityPolicy
            LabeledContent("系统策略", value: policy.displayName)

            if policy == .disabled {
                VStack(alignment: .leading, spacing: 6) {
                    Text("系统未授权此 App 使用敏感内容分析。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("该能力需要付费 Apple Developer Program 帐号 + Sensitive Content Analysis entitlement;免费 Personal Team 不支持。同时系统设置里的'敏感内容警告'也必须保持开启。")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Button("打开系统设置") {
                        if let url = URL(string:
                            "x-apple.systempreferences:com.apple.preference.security?Privacy_SensitiveContentAnalysis") {
                            NSWorkspace.shared.open(url)
                        }
                    }
                    .controlSize(.small)
                }
            }

            if let s = viewModel.result?.sensitivity {
                HStack {
                    if s.isSensitive {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                        Text("含裸露内容")
                            .foregroundStyle(.red)
                            .bold()
                    } else if s.policy == .disabled || s.policy == .unsupported {
                        Image(systemName: "questionmark.circle")
                            .foregroundStyle(.secondary)
                        Text("无法判定")
                            .foregroundStyle(.secondary)
                    } else {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundStyle(.green)
                        Text("安全")
                            .foregroundStyle(.green)
                    }
                    Spacer()
                    Text(String(format: "%.0f ms", s.elapsedMs))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
                if let msg = s.errorMessage {
                    Text(msg)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else if viewModel.detectionOptions.detectSensitivity && viewModel.result != nil {
                Text("未分析").foregroundStyle(.secondary).font(.caption)
            }
        }
    }
}
