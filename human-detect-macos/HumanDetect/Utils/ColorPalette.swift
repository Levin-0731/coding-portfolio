import SwiftUI

enum ColorPalette {
    static func color(for category: JointCategory) -> Color {
        switch category {
        case .body: return Color(red: 0.15, green: 0.75, blue: 1.00)   // 青蓝
        case .leftHand: return Color(red: 1.00, green: 0.55, blue: 0.20) // 橙
        case .rightHand: return Color(red: 1.00, green: 0.85, blue: 0.25) // 黄
        case .face: return Color(red: 0.70, green: 0.45, blue: 1.00)   // 紫
        }
    }

    static func edgeColor(for category: JointCategory) -> Color {
        color(for: category).opacity(0.85)
    }
}
