import Foundation
import SwiftUI

public enum BadgeCategory: String, Codable, CaseIterable {
    case streak
    case parity
    case reading
    case proof
    case competition
    case mastery

    public var title: String {
        rawValue.capitalized
    }
}

public struct BadgeDefinition: Codable, Identifiable, Equatable {
    public let id: String
    public let title: String
    public let description: String
    public let systemIcon: String
    public let targetCount: Int
    public let category: BadgeCategory

    public init(
        id: String,
        title: String,
        description: String,
        systemIcon: String,
        targetCount: Int,
        category: BadgeCategory
    ) {
        self.id = id
        self.title = title
        self.description = description
        self.systemIcon = systemIcon
        self.targetCount = targetCount
        self.category = category
    }

    public static let allBadges: [BadgeDefinition] = [
        BadgeDefinition(
            id: "first_checkin",
            title: "First Flame",
            description: "Complete your first habit check-in",
            systemIcon: "bolt.fill",
            targetCount: 1,
            category: .streak
        ),
        BadgeDefinition(
            id: "perfect_par",
            title: "Daily Par Master",
            description: "Score 240+ points in a single day",
            systemIcon: "trophy.fill",
            targetCount: 240,
            category: .parity
        ),
        BadgeDefinition(
            id: "streak_3",
            title: "Three-Day Spark",
            description: "Maintain a 3-day active habit streak",
            systemIcon: "flame.fill",
            targetCount: 3,
            category: .streak
        ),
        BadgeDefinition(
            id: "streak_7",
            title: "Weekly Inferno",
            description: "Maintain a 7-day uninterrupted streak",
            systemIcon: "flame.fill",
            targetCount: 7,
            category: .streak
        ),
        BadgeDefinition(
            id: "streak_14",
            title: "Fortnight Titan",
            description: "Reach a legendary 14-day streak",
            systemIcon: "sparkles",
            targetCount: 14,
            category: .streak
        ),
        BadgeDefinition(
            id: "reading_100",
            title: "Centurion Reader",
            description: "Read 100 cumulative book pages",
            systemIcon: "book.fill",
            targetCount: 100,
            category: .reading
        ),
        BadgeDefinition(
            id: "clean_space_sentinel",
            title: "Clean Space Sentinel",
            description: "Submit 5 Clean Space check-ins with photo proof",
            systemIcon: "camera.fill",
            targetCount: 5,
            category: .proof
        ),
        BadgeDefinition(
            id: "gym_par",
            title: "Iron Discipline",
            description: "Hit 4 gym workouts in a single calendar week",
            systemIcon: "dumbbell.fill",
            targetCount: 4,
            category: .mastery
        ),
        BadgeDefinition(
            id: "polyglot",
            title: "Polyglot Duelist",
            description: "Log 7 language learning sessions (Swedish / Polish)",
            systemIcon: "globe.europe.africa.fill",
            targetCount: 7,
            category: .mastery
        ),
        BadgeDefinition(
            id: "deep_worker",
            title: "Deep Work Architect",
            description: "Complete 7 Personal Project deep work sessions",
            systemIcon: "chevron.left.forwardslash.chevron.right",
            targetCount: 7,
            category: .mastery
        ),
        BadgeDefinition(
            id: "iron_couple",
            title: "Iron Couple Synergy",
            description: "Both Maciek & Myrna score 240 Par on the exact same day",
            systemIcon: "heart.circle.fill",
            targetCount: 1,
            category: .competition
        ),
        BadgeDefinition(
            id: "stake_champion",
            title: "Stake Champion",
            description: "Win a weekly or monthly duel wager",
            systemIcon: "crown.fill",
            targetCount: 1,
            category: .competition
        ),
    ]
}

public struct PlayerBadgeStatus: Codable, Identifiable, Equatable {
    public var id: String { badge.id }
    public let badge: BadgeDefinition
    public var isUnlocked: Bool
    public var progress: Double // 0.0 to 100.0
    public var currentValue: Int
    public var unlockedAt: String?

    public init(
        badge: BadgeDefinition,
        isUnlocked: Bool,
        progress: Double,
        currentValue: Int,
        unlockedAt: String? = nil
    ) {
        self.badge = badge
        self.isUnlocked = isUnlocked
        self.progress = progress
        self.currentValue = currentValue
        self.unlockedAt = unlockedAt
    }
}
