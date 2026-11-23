import SwiftUI

public extension Font {
    static let scoreNumberHuge = Font.system(size: 44, weight: .bold, design: .rounded).monospacedDigit()
    static let scoreNumberLarge = Font.system(size: 32, weight: .bold, design: .rounded).monospacedDigit()
    static let scoreNumberMedium = Font.system(size: 20, weight: .semibold, design: .rounded).monospacedDigit()
    static let scoreNumberSmall = Font.system(size: 15, weight: .medium, design: .rounded).monospacedDigit()

    static let titleLarge = Font.system(size: 24, weight: .bold, design: .default)
    static let titleMedium = Font.system(size: 18, weight: .semibold, design: .default)
    static let bodyRegular = Font.system(size: 15, weight: .regular, design: .default)
    static let bodyEmphasized = Font.system(size: 15, weight: .semibold, design: .default)
    static let captionMuted = Font.system(size: 12, weight: .medium, design: .default)
    static let badgeLabel = Font.system(size: 11, weight: .bold, design: .default)
}
