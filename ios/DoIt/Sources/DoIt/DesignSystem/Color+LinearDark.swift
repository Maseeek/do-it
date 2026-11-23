import SwiftUI

public extension Color {
    init(hex: String) {
        let cleanHex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: cleanHex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch cleanHex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255.0,
            green: Double(g) / 255.0,
            blue: Double(b) / 255.0,
            opacity: Double(a) / 255.0
        )
    }

    // Linear Dark Theme Palette
    static let linearDarkBg = Color(hex: "08090a")
    static let linearCardBg = Color(hex: "0f1012")
    static let linearCardElevated = Color(hex: "151619")
    static let linearBorder = Color(hex: "27272a")
    static let linearBorderSubtle = Color(hex: "1c1d20")
    static let linearBorderActive = Color(hex: "3f3f46")
    
    // Text Hierarchy
    static let linearTextPrimary = Color(hex: "f4f4f5")
    static let linearTextSecondary = Color(hex: "a1a1aa")
    static let linearTextMuted = Color(hex: "71717a")

    // Accent Statuses
    static let linearGold = Color(hex: "eab308")
    static let linearGreen = Color(hex: "22c55e")
    static let linearRed = Color(hex: "ef4444")
    static let linearBlue = Color(hex: "60a5fa")
    static let linearPurple = Color(hex: "c084fc")
}

public struct HairlineBorderModifier: ViewModifier {
    var color: Color = .linearBorder
    var cornerRadius: CGFloat = 12

    public func body(content: Content) -> some View {
        content
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(color, lineWidth: 0.5)
            )
    }
}

public extension View {
    func hairlineBorder(color: Color = .linearBorder, cornerRadius: CGFloat = 12) -> some View {
        self.modifier(HairlineBorderModifier(color: color, cornerRadius: cornerRadius))
    }
}
