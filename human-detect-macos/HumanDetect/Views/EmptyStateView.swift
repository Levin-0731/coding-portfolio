import SwiftUI

struct EmptyStateView: View {
    let onOpen: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "figure.arms.open")
                .font(.system(size: 64, weight: .light))
                .foregroundStyle(.secondary)
            Text("拖拽图片到这里,或点击打开")
                .font(.title3)
                .foregroundStyle(.secondary)
            Text("支持 JPEG / PNG / HEIC 等格式")
                .font(.callout)
                .foregroundStyle(.tertiary)
            Button(action: onOpen) {
                Label("打开图片", systemImage: "photo")
            }
            .controlSize(.large)
            .keyboardShortcut("o", modifiers: .command)
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
