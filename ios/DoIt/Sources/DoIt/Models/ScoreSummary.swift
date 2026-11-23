import Foundation

public enum LeaderboardTier: String, Codable, CaseIterable, Identifiable {
    case weekly
    case monthly
    case yearly
    case karma

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .weekly: return "Weekly Par"
        case .monthly: return "Monthly Cup"
        case .yearly: return "Annual Dynasty"
        case .karma: return "Lifetime Karma"
        }
    }

    public var shortTitle: String {
        switch self {
        case .weekly: return "Weekly"
        case .monthly: return "Monthly"
        case .yearly: return "Yearly"
        case .karma: return "Karma"
        }
    }
}

public enum VersusLeader: Equatable {
    case player(PlayerId)
    case tie

    public var isTie: Bool {
        self == .tie
    }
}

public struct PlayerScoreSummary: Codable, Equatable {
    public var today: Int
    public var weekly: Int
    public var monthly: Int
    public var yearly: Int
    public var karma: Int
    public var currentStreak: Int
    public var completionRateWeekly: Int
    public var restDaysUsed: Int

    public init(
        today: Int = 0,
        weekly: Int = 0,
        monthly: Int = 0,
        yearly: Int = 0,
        karma: Int = 0,
        currentStreak: Int = 0,
        completionRateWeekly: Int = 0,
        restDaysUsed: Int = 0
    ) {
        self.today = today
        self.weekly = weekly
        self.monthly = monthly
        self.yearly = yearly
        self.karma = karma
        self.currentStreak = currentStreak
        self.completionRateWeekly = completionRateWeekly
        self.restDaysUsed = restDaysUsed
    }
}

public struct VersusComparison: Equatable {
    public let maciekScore: Int
    public let myrnaScore: Int
    public let leader: VersusLeader
    public let delta: Int
    public let maciekPct: Int
    public let myrnaPct: Int

    public init(
        maciekScore: Int,
        myrnaScore: Int,
        leader: VersusLeader,
        delta: Int,
        maciekPct: Int,
        myrnaPct: Int
    ) {
        self.maciekScore = maciekScore
        self.myrnaScore = myrnaScore
        self.leader = leader
        self.delta = delta
        self.maciekPct = maciekPct
        self.myrnaPct = myrnaPct
    }
}

public struct CategoryComparison: Identifiable, Equatable {
    public var id: String { category.rawValue }
    public let category: HabitCategory
    public let label: String
    public let maciekPoints: Int
    public let myrnaPoints: Int
    public let leader: VersusLeader

    public init(
        category: HabitCategory,
        label: String,
        maciekPoints: Int,
        myrnaPoints: Int,
        leader: VersusLeader
    ) {
        self.category = category
        self.label = label
        self.maciekPoints = maciekPoints
        self.myrnaPoints = myrnaPoints
        self.leader = leader
    }
}

public struct DailyDuelPoint: Identifiable, Equatable {
    public var id: String { dateStr }
    public let dayName: String
    public let dateStr: String
    public let maciekPoints: Int
    public let myrnaPoints: Int
    public let isToday: Bool
    public let isFuture: Bool

    public init(
        dayName: String,
        dateStr: String,
        maciekPoints: Int,
        myrnaPoints: Int,
        isToday: Bool,
        isFuture: Bool
    ) {
        self.dayName = dayName
        self.dateStr = dateStr
        self.maciekPoints = maciekPoints
        self.myrnaPoints = myrnaPoints
        self.isToday = isToday
        self.isFuture = isFuture
    }
}

public struct StakesRecord: Equatable {
    public let maciekWins: Int
    public let myrnaWins: Int
    public let ties: Int
    public let totalCompleted: Int
    public let history: [Stake]

    public init(
        maciekWins: Int,
        myrnaWins: Int,
        ties: Int,
        totalCompleted: Int,
        history: [Stake]
    ) {
        self.maciekWins = maciekWins
        self.myrnaWins = myrnaWins
        self.ties = ties
        self.totalCompleted = totalCompleted
        self.history = history
    }
}
