import Foundation
import SwiftUI

public enum PlayerId: String, Codable, CaseIterable, Identifiable {
    case maciek
    case myrna

    public var id: String { rawValue }

    public var opponent: PlayerId {
        switch self {
        case .maciek: return .myrna
        case .myrna: return .maciek
        }
    }

    public var defaultName: String {
        switch self {
        case .maciek: return "Maciek"
        case .myrna: return "Myrna"
        }
    }

    public var defaultAvatar: String {
        switch self {
        case .maciek: return "⚡"
        case .myrna: return "✨"
        }
    }
}

public enum PlayerColorId: String, Codable, CaseIterable, Identifiable {
    case blue
    case purple
    case teal
    case orange
    case pink
    case green
    case rainbow
    case gold

    public var id: String { rawValue }

    public var name: String {
        rawValue.capitalized
    }

    public var hex: String {
        switch self {
        case .blue: return "#60a5fa"
        case .purple: return "#c084fc"
        case .teal: return "#2dd4bf"
        case .orange: return "#fb923c"
        case .pink: return "#f472b6"
        case .green: return "#4ade80"
        case .rainbow: return "#f0abfc"
        case .gold: return "#eab308"
        }
    }

    public var color: Color {
        Color(hex: hex)
    }

    public var accentBg: Color {
        color.opacity(0.12)
    }

    public var accentBorder: Color {
        color.opacity(0.3)
    }

    public var unlockAtKarma: Int {
        switch self {
        case .blue, .purple: return 0
        case .teal: return 250
        case .orange: return 500
        case .pink: return 1000
        case .green: return 2500
        case .rainbow: return 10000
        case .gold: return 0
        }
    }

    public var requiredInvites: Int {
        switch self {
        case .gold: return 1
        default: return 0
        }
    }

    public func isUnlocked(karma: Int, invites: Int) -> Bool {
        if self == .gold {
            return invites >= requiredInvites
        }
        return karma >= unlockAtKarma
    }
}

public struct Player: Codable, Identifiable, Equatable {
    public let id: PlayerId
    public var name: String
    public var avatar: String
    public var colorId: PlayerColorId
    public var inviteCount: Int

    public init(
        id: PlayerId,
        name: String,
        avatar: String,
        colorId: PlayerColorId = .blue,
        inviteCount: Int = 0
    ) {
        self.id = id
        self.name = name
        self.avatar = avatar
        self.colorId = colorId
        self.inviteCount = inviteCount
    }

    public var color: Color {
        colorId.color
    }

    public var accentBg: Color {
        colorId.accentBg
    }

    public var accentBorder: Color {
        colorId.accentBorder
    }

    public static let defaultMaciek = Player(
        id: .maciek,
        name: "Maciek",
        avatar: "⚡",
        colorId: .blue,
        inviteCount: 0
    )

    public static let defaultMyrna = Player(
        id: .myrna,
        name: "Myrna",
        avatar: "✨",
        colorId: .purple,
        inviteCount: 0
    )
}
