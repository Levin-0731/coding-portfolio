import SwiftUI

struct ImageListView: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        VStack(spacing: 0) {
            header

            List(selection: Binding(
                get: { viewModel.selectedItemID },
                set: { viewModel.select($0) }
            )) {
                ForEach(viewModel.items) { item in
                    ImageListRow(item: item)
                        .tag(item.id)
                        .contextMenu {
                            Button("移除") {
                                viewModel.remove(ids: [item.id])
                            }
                            if item.status != .pending {
                                Button("重新检测") {
                                    if let idx = viewModel.items.firstIndex(where: { $0.id == item.id }) {
                                        viewModel.items[idx].status = .pending
                                        viewModel.items[idx].result = nil
                                        viewModel.processPending()
                                    }
                                }
                            }
                        }
                }
                .onDelete { viewModel.remove(at: $0) }
            }
            .listStyle(.sidebar)

            footer
        }
    }

    private var header: some View {
        HStack(spacing: 6) {
            Text("队列")
                .font(.headline)
            Text("\(viewModel.items.count)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 6).padding(.vertical, 2)
                .background(Color.secondary.opacity(0.15), in: Capsule())
            Spacer()
            Button {
                viewModel.openViaPanel()
            } label: {
                Image(systemName: "plus")
            }
            .buttonStyle(.borderless)
            .help("添加图片或文件夹")
            Button {
                viewModel.clearAll()
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.borderless)
            .disabled(viewModel.items.isEmpty)
            .help("清空队列")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
    }

    @ViewBuilder
    private var footer: some View {
        if viewModel.isBatchProcessing {
            let (cur, total) = viewModel.batchProgress
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("处理中")
                        .font(.caption)
                    Spacer()
                    Text("\(cur)/\(max(total, 1))")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
                ProgressView(value: Double(cur), total: Double(max(total, 1)))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(.bar)
        } else if !viewModel.items.isEmpty {
            HStack(spacing: 10) {
                Label("\(viewModel.doneCount)", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                let noPerson = viewModel.items.filter { $0.status == .noPerson }.count
                if noPerson > 0 {
                    Label("\(noPerson)", systemImage: "person.slash")
                        .foregroundStyle(.orange)
                }
                let failed = viewModel.items.reduce(0) { acc, i in
                    if case .failed = i.status { return acc + 1 }
                    return acc
                }
                if failed > 0 {
                    Label("\(failed)", systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                }
                let scaCount = viewModel.items.filter {
                    $0.result?.sensitivity?.isSensitive == true
                }.count
                if scaCount > 0 {
                    Label("\(scaCount)", systemImage: "eye.trianglebadge.exclamationmark.fill")
                        .foregroundStyle(.red)
                        .help("SCA 检测到裸露内容")
                }
                let nsfwCount = viewModel.items.filter {
                    $0.result?.nsfw?.isNSFW == true
                }.count
                if nsfwCount > 0 {
                    Label("\(nsfwCount)", systemImage: "brain.head.profile")
                        .foregroundStyle(.orange)
                        .help("Core ML 检测到黄图")
                }
                Spacer()
            }
            .font(.caption)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.bar)
        }
    }
}

private struct ImageListRow: View {
    let item: ImageItem

    var body: some View {
        HStack(spacing: 10) {
            thumbnail
                .frame(width: 44, height: 44)
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(alignment: .topTrailing) {
                    let scaSensitive = item.result?.sensitivity?.isSensitive == true
                    let nsfwFlagged  = item.result?.nsfw?.isNSFW == true
                    if scaSensitive || nsfwFlagged {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(3)
                            .background(Circle().fill(Color.red))
                            .offset(x: 4, y: -4)
                            .help(scaSensitive && nsfwFlagged ? "SCA + Core ML 均检测到问题内容"
                                  : scaSensitive ? "含裸露内容 (SCA)"
                                  : "含黄图内容 (Core ML NSFW)")
                    }
                }

            VStack(alignment: .leading, spacing: 2) {
                Text(item.fileName)
                    .lineLimit(1)
                    .truncationMode(.middle)
                    .font(.body)
                statusLabel
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 2)
    }

    @ViewBuilder
    private var thumbnail: some View {
        if let thumb = item.thumbnail {
            Image(nsImage: thumb)
                .resizable()
                .scaledToFill()
        } else {
            ZStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.secondary.opacity(0.15))
                Image(systemName: "photo")
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private var statusLabel: some View {
        switch item.status {
        case .pending:
            Label("等待", systemImage: "clock")
                .foregroundStyle(.secondary)
                .font(.caption)
        case .detecting:
            HStack(spacing: 4) {
                ProgressView().controlSize(.mini)
                Text("检测中").font(.caption).foregroundStyle(.secondary)
            }
        case .done:
            HStack(spacing: 4) {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                if let person = item.result?.person {
                    let count = person.body.count + person.leftHand.count
                        + person.rightHand.count + person.face.count
                    Text("\(count) 点").foregroundStyle(.secondary)
                }
            }
            .font(.caption)
        case .noPerson:
            Label("未检到人", systemImage: "person.slash")
                .foregroundStyle(.orange)
                .font(.caption)
        case .failed(let msg):
            Label(msg, systemImage: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
                .font(.caption)
                .lineLimit(1)
                .truncationMode(.tail)
        }
    }
}
