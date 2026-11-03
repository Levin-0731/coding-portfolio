import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @StateObject private var viewModel = AppViewModel()
    @State private var showInspector: Bool = true
    @State private var showList: Bool = false
    @State private var showBatchExport: Bool = false

    var body: some View {
        HSplitView {
            if showList {
                ImageListView(viewModel: viewModel)
                    .frame(minWidth: 220, idealWidth: 260, maxWidth: 360)
            }

            mainArea
                .frame(minWidth: 420, minHeight: 360)

            if showInspector {
                InspectorView(viewModel: viewModel)
                    .frame(minWidth: 280, idealWidth: 300, maxWidth: 380)
            }
        }
        .frame(minWidth: 960, minHeight: 560)
        .toolbar { toolbarContent }
        .sheet(isPresented: $showBatchExport) {
            BatchExportSheet(viewModel: viewModel, isPresented: $showBatchExport)
        }
        .alert("错误", isPresented: Binding(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button("确定", role: .cancel) { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .onDrop(of: [.fileURL, .image], isTargeted: nil) { providers in
            handleDrop(providers: providers)
        }
        .background(
            KeyboardShortcutsHandler(
                onOpen: viewModel.openViaPanel,
                onPaste: viewModel.pasteImage
            )
        )
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup(placement: .primaryAction) {
            Button {
                viewModel.openViaPanel()
            } label: {
                Label("添加", systemImage: "folder.badge.plus")
            }
            .help("添加图片 / 文件夹 (⌘O),支持多选")

            Button {
                viewModel.pasteImage()
            } label: {
                Label("粘贴", systemImage: "doc.on.clipboard")
            }
            .help("从粘贴板粘贴 (⌘V)")

            Button {
                viewModel.redetect()
            } label: {
                Label("重新检测", systemImage: "arrow.clockwise")
            }
            .disabled(viewModel.selectedItem == nil || viewModel.isDetecting)

            Divider()

            Button {
                viewModel.exportAnnotatedImage()
            } label: {
                Label("导出图片", systemImage: "square.and.arrow.down")
            }
            .disabled(viewModel.result?.person == nil)

            Button {
                viewModel.exportJSON()
            } label: {
                Label("导出 JSON", systemImage: "curlybraces")
            }
            .disabled(viewModel.result == nil)

            Button {
                showBatchExport = true
            } label: {
                Label("批量导出", systemImage: "square.and.arrow.down.on.square")
            }
            .disabled(viewModel.exportableCount == 0 || viewModel.isExporting)
            .help("把队列里已完成的图片批量导出为 PNG / JSON")

            Divider()

            Button {
                showList.toggle()
            } label: {
                Label("队列", systemImage: "list.bullet.rectangle")
            }

            Button {
                showInspector.toggle()
            } label: {
                Label("面板", systemImage: "sidebar.right")
            }
        }
    }

    @ViewBuilder
    private var mainArea: some View {
        if let img = viewModel.loadedImage {
            ImageCanvasView(
                image: img,
                result: viewModel.result,
                options: viewModel.displayOptions
            )
            .overlay(alignment: .topLeading) {
                if viewModel.isDetecting {
                    HStack(spacing: 6) {
                        ProgressView().controlSize(.small)
                        Text("检测中…").font(.caption)
                    }
                    .padding(8)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
                    .padding(12)
                }
            }
            .overlay(alignment: .topTrailing) {
                if viewModel.isExporting {
                    HStack(spacing: 6) {
                        ProgressView().controlSize(.small)
                        Text("批量导出中…").font(.caption)
                    }
                    .padding(8)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
                    .padding(12)
                }
            }
        } else {
            EmptyStateView(onOpen: viewModel.openViaPanel)
        }
    }

    // MARK: - Drop

    private func handleDrop(providers: [NSItemProvider]) -> Bool {
        var accepted = false
        let group = DispatchGroup()
        var droppedURLs: [URL] = []
        let urlLock = NSLock()

        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
                accepted = true
                group.enter()
                _ = provider.loadObject(ofClass: URL.self) { url, _ in
                    if let url = url {
                        urlLock.lock()
                        droppedURLs.append(url)
                        urlLock.unlock()
                    }
                    group.leave()
                }
            } else if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                accepted = true
                provider.loadDataRepresentation(forTypeIdentifier: UTType.image.identifier) { data, _ in
                    guard let data = data else { return }
                    DispatchQueue.main.async {
                        viewModel.openImage(data: data, fileName: nil)
                    }
                }
            }
        }

        group.notify(queue: .main) {
            if !droppedURLs.isEmpty {
                viewModel.addURLs(droppedURLs)
            }
        }
        return accepted
    }
}

private struct KeyboardShortcutsHandler: View {
    let onOpen: () -> Void
    let onPaste: () -> Void
    var body: some View {
        ZStack {
            Button("") { onOpen() }
                .keyboardShortcut("o", modifiers: .command)
            Button("") { onPaste() }
                .keyboardShortcut("v", modifiers: .command)
        }
        .opacity(0)
        .allowsHitTesting(false)
        .frame(width: 0, height: 0)
    }
}
