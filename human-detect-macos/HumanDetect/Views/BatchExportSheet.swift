import AppKit
import SwiftUI

struct BatchExportSheet: View {
    @ObservedObject var viewModel: AppViewModel
    @Binding var isPresented: Bool

    @State private var exportPNG: Bool = true
    @State private var exportJSON: Bool = true
    @State private var includeNoPerson: Bool = false

    private var doneCount: Int { viewModel.items.filter { $0.status == .done }.count }
    private var noPersonCount: Int { viewModel.items.filter { $0.status == .noPerson }.count }
    private var totalToExport: Int {
        doneCount + (includeNoPerson ? noPersonCount : 0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("批量导出").font(.title3).bold()

            VStack(alignment: .leading, spacing: 4) {
                Text("将导出 \(totalToExport) / \(viewModel.items.count) 张图的标注结果")
                    .foregroundStyle(.secondary)
                Text("输出目录下每张图会生成 `原名_annotated.png` 和/或 `原名.json`")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            GroupBox("内容") {
                VStack(alignment: .leading, spacing: 8) {
                    Toggle("标注 PNG(原分辨率)", isOn: $exportPNG)
                    Toggle("JSON 数据", isOn: $exportJSON)
                }
                .padding(.vertical, 4)
            }

            GroupBox("范围") {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                        Text("已检测到人像:\(doneCount) 张").font(.callout)
                    }
                    Toggle(isOn: $includeNoPerson) {
                        HStack {
                            Image(systemName: "person.slash").foregroundStyle(.orange)
                            Text("包含未检测到人像的图片(\(noPersonCount) 张)")
                        }
                    }
                    .disabled(noPersonCount == 0)
                }
                .padding(.vertical, 4)
            }

            HStack {
                Spacer()
                Button("取消") { isPresented = false }
                    .keyboardShortcut(.cancelAction)
                Button {
                    pickAndExport()
                } label: {
                    Text("选择目录并导出…")
                }
                .keyboardShortcut(.defaultAction)
                .disabled(
                    (!exportPNG && !exportJSON) || totalToExport == 0
                )
            }
        }
        .padding(20)
        .frame(minWidth: 420)
    }

    private func pickAndExport() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.canCreateDirectories = true
        panel.allowsMultipleSelection = false
        panel.prompt = "选择导出目录"
        panel.message = "选择一个目录,将批量写入标注 PNG / JSON"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        viewModel.exportAll(
            to: url,
            exportPNG: exportPNG,
            exportJSON: exportJSON,
            includeNoPerson: includeNoPerson
        )
        isPresented = false
    }
}
