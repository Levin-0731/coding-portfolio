import AppKit
import CoreGraphics
import Foundation
import SwiftUI
import UniformTypeIdentifiers

@MainActor
final class AppViewModel: ObservableObject {

    // MARK: - Queue

    @Published var items: [ImageItem] = []
    @Published var selectedItemID: UUID?

    // MARK: - UI state

    @Published var displayOptions = DisplayOptions()
    @Published var errorMessage: String?

    /// 正在后台串行处理队列。
    @Published var isBatchProcessing = false
    /// (已完成, 本轮总数)。
    @Published var batchProgress: (Int, Int) = (0, 0)
    /// 正在批量导出。
    @Published var isExporting = false

    @Published var detectionOptions = DetectionOptions()

    /// 系统敏感内容分析当前策略(只读,随着打开设置会变化)。
    var sensitivityPolicy: SensitivityPolicy { SensitivityDetector.currentPolicy }

    /// 本地 NSFW Core ML 模型是否就绪(打包进 app)。
    var isNSFWModelAvailable: Bool { NSFWDetector.isModelAvailable }
    /// 当前加载到的 NSFW 模型名,用于 UI 展示。
    var nsfwModelName: String? { NSFWDetector.modelName }

    private var processingTask: Task<Void, Never>?

    // MARK: - Derived

    var selectedItem: ImageItem? {
        guard let id = selectedItemID else { return nil }
        return items.first(where: { $0.id == id })
    }

    /// 兼容旧视图。
    var loadedImage: LoadedImage? { selectedItem?.loadedImage }
    var result: DetectionResult? { selectedItem?.result }
    var isDetecting: Bool {
        if case .detecting = selectedItem?.status { return true }
        return false
    }

    var doneCount: Int { items.filter { $0.status == .done }.count }
    var exportableCount: Int {
        items.filter { $0.result != nil && $0.loadedImage != nil }.count
    }
    var pendingCount: Int { items.filter { $0.status == .pending }.count }

    // MARK: - Intents (import)

    func openViaPanel() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = true
        panel.allowedContentTypes = ImageLoader.supportedTypes
        if panel.runModal() == .OK {
            addURLs(panel.urls)
        }
    }

    func addURLs(_ urls: [URL]) {
        let expanded = Self.expandImageURLs(urls)
        guard !expanded.isEmpty else {
            if !urls.isEmpty { errorMessage = "没有找到可用的图片文件" }
            return
        }
        let existing = Set(items.compactMap { $0.url?.standardizedFileURL })
        var appended: [ImageItem] = []
        for url in expanded {
            let std = url.standardizedFileURL
            if existing.contains(std) { continue }
            appended.append(ImageItem(url: url))
        }
        guard !appended.isEmpty else { return }
        items.append(contentsOf: appended)
        if selectedItemID == nil { selectedItemID = appended.first?.id }
        processPending()
    }

    func openImage(url: URL) { addURLs([url]) }

    func openImage(data: Data, fileName: String?) {
        do {
            let loaded = try ImageLoader.load(data: data, fileName: fileName)
            appendLoaded(loaded)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func pasteImage() {
        let pb = NSPasteboard.general

        if let urls = pb.readObjects(forClasses: [NSURL.self]) as? [URL], !urls.isEmpty {
            addURLs(urls)
            return
        }

        do {
            let loaded = try ImageLoader.loadFromPasteboard()
            appendLoaded(loaded)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func appendLoaded(_ loaded: LoadedImage) {
        var item = ImageItem(loaded: loaded)
        item.thumbnail = ImageItem.makeThumbnail(cg: loaded.cgImage)
        items.append(item)
        selectedItemID = item.id
        processPending()
    }

    // MARK: - Selection / removal

    func select(_ id: UUID?) { selectedItemID = id }

    func remove(ids: Set<UUID>) {
        items.removeAll { ids.contains($0.id) }
        if let id = selectedItemID, !items.contains(where: { $0.id == id }) {
            selectedItemID = items.first?.id
        }
    }

    func remove(at offsets: IndexSet) {
        let ids = Set(offsets.compactMap { items.indices.contains($0) ? items[$0].id : nil })
        remove(ids: ids)
    }

    func clearAll() {
        processingTask?.cancel()
        processingTask = nil
        items.removeAll()
        selectedItemID = nil
        isBatchProcessing = false
        batchProgress = (0, 0)
    }

    // MARK: - Detection

    func redetect() {
        guard let id = selectedItemID,
              let idx = items.firstIndex(where: { $0.id == id }) else { return }
        items[idx].status = .pending
        items[idx].result = nil
        processPending()
    }

    /// 启动串行处理(只在没有任务运行时)。
    func processPending() {
        guard processingTask == nil else { return }
        guard items.contains(where: { $0.status == .pending }) else { return }

        processingTask = Task { [weak self] in
            await self?.runProcessingLoop()
        }
    }

    private func runProcessingLoop() async {
        isBatchProcessing = true
        var done = 0
        let total = items.filter { $0.status == .pending }.count
        batchProgress = (0, total)

        while !Task.isCancelled {
            guard let nextID = items.first(where: { $0.status == .pending })?.id else { break }
            await processItem(id: nextID)
            done += 1
            batchProgress = (done, total)
        }

        isBatchProcessing = false
        processingTask = nil
    }

    private func processItem(id: UUID) async {
        guard let idx0 = items.firstIndex(where: { $0.id == id }) else { return }
        items[idx0].status = .detecting
        let url = items[idx0].url
        let existing = items[idx0].loadedImage

        do {
            let img: LoadedImage
            if let existing = existing {
                img = existing
            } else if let url = url {
                img = try ImageLoader.load(url: url)
            } else {
                throw NSError(
                    domain: "HumanDetect", code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "图片未加载"]
                )
            }

            var res = try await PoseDetector.detect(
                image: img.cgImage,
                fileName: img.sourceFileName ?? (url?.lastPathComponent),
                originalOrientationRaw: img.originalOrientation.rawValue,
                options: detectionOptions
            )

            if detectionOptions.detectSensitivity {
                res.sensitivity = await SensitivityDetector.analyze(image: img.cgImage)
            }

            if detectionOptions.detectNSFW {
                res.nsfw = await NSFWDetector.analyze(
                    image: img.cgImage,
                    threshold: detectionOptions.nsfwThreshold
                )
            }

            let thumb = items[idx0].thumbnail ?? ImageItem.makeThumbnail(cg: img.cgImage)

            if let i = items.firstIndex(where: { $0.id == id }) {
                items[i].loadedImage = img
                items[i].result = res
                items[i].thumbnail = thumb
                items[i].status = (res.person == nil) ? .noPerson : .done
            }
        } catch {
            if let i = items.firstIndex(where: { $0.id == id }) {
                items[i].status = .failed(error.localizedDescription)
            }
        }
    }

    // MARK: - Export (single)

    func exportAnnotatedImage() {
        guard let item = selectedItem,
              let img = item.loadedImage, let res = item.result else { return }
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.png, .jpeg]
        panel.nameFieldStringValue =
            (item.fileName as NSString).deletingPathExtension + "_annotated.png"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        let ext = url.pathExtension.lowercased()
        let format: ImageFormat = (ext == "jpg" || ext == "jpeg")
            ? .jpeg(quality: 0.92) : .png
        do {
            try ImageExporter.exportAnnotated(
                image: img.cgImage,
                result: res,
                options: displayOptions,
                to: url,
                format: format
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func exportJSON() {
        guard let item = selectedItem, let res = item.result else { return }
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.json]
        panel.nameFieldStringValue =
            (item.fileName as NSString).deletingPathExtension + ".json"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        do {
            try ImageExporter.exportJSON(result: res, to: url)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Batch export

    /// 批量导出:把所有已检测完成的项目写到 `directory`。
    func exportAll(to directory: URL,
                   exportPNG: Bool,
                   exportJSON: Bool,
                   includeNoPerson: Bool) {
        guard exportPNG || exportJSON else { return }
        let snapshot = items.filter { item in
            guard item.loadedImage != nil else { return false }
            switch item.status {
            case .done: return true
            case .noPerson: return includeNoPerson && item.result != nil
            default: return false
            }
        }
        guard !snapshot.isEmpty else {
            errorMessage = "没有可导出的图片"
            return
        }

        Task { [displayOptions] in
            self.isExporting = true
            var failures: [String] = []
            await Task.detached(priority: .userInitiated) {
                for item in snapshot {
                    guard let img = item.loadedImage, let res = item.result else { continue }
                    let base = (item.fileName as NSString).deletingPathExtension
                    if exportPNG {
                        let url = directory.appendingPathComponent(base + "_annotated.png")
                        do {
                            try ImageExporter.exportAnnotated(
                                image: img.cgImage,
                                result: res,
                                options: displayOptions,
                                to: url,
                                format: .png
                            )
                        } catch {
                            await MainActor.run {
                                failures.append("\(item.fileName): \(error.localizedDescription)")
                            }
                        }
                    }
                    if exportJSON {
                        let url = directory.appendingPathComponent(base + ".json")
                        do {
                            try ImageExporter.exportJSON(result: res, to: url)
                        } catch {
                            await MainActor.run {
                                failures.append("\(item.fileName): \(error.localizedDescription)")
                            }
                        }
                    }
                }
            }.value

            self.isExporting = false
            if !failures.isEmpty {
                self.errorMessage = "部分导出失败(\(failures.count) 项):\n"
                    + failures.prefix(5).joined(separator: "\n")
            }
        }
    }

    // MARK: - URL expansion

    private static let imageExtensions: Set<String> = [
        "jpg", "jpeg", "png", "heic", "heif", "tif", "tiff", "bmp", "gif", "webp"
    ]

    static func expandImageURLs(_ urls: [URL]) -> [URL] {
        let fm = FileManager.default
        var out: [URL] = []
        for url in urls {
            var isDir: ObjCBool = false
            guard fm.fileExists(atPath: url.path, isDirectory: &isDir) else { continue }
            if isDir.boolValue {
                guard let enumr = fm.enumerator(
                    at: url,
                    includingPropertiesForKeys: [.isRegularFileKey],
                    options: [.skipsHiddenFiles, .skipsPackageDescendants]
                ) else { continue }
                for case let child as URL in enumr where isImageURL(child) {
                    out.append(child)
                }
            } else if isImageURL(url) {
                out.append(url)
            }
        }
        return out.sorted { $0.path.localizedStandardCompare($1.path) == .orderedAscending }
    }

    static func isImageURL(_ url: URL) -> Bool {
        imageExtensions.contains(url.pathExtension.lowercased())
    }
}
