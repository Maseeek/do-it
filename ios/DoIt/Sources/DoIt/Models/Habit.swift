import Foundation

public enum HabitFrequency: String, Codable {
    case daily
    case weekly
}

public enum HealthMetric: String, Codable, CaseIterable {
    case sleep
    case workout
    case cardio
    case steps

    public var title: String {
        switch self {
        case .sleep: return "Sleep Duration"
        case .workout: return "Strength Workout"
        case .cardio: return "Cardio Session"
        case .steps: return "Daily Steps"
        }
    }

    public var unit: String {
        switch self {
        case .sleep: return "hrs"
        case .workout: return "min"
        case .cardio: return "min"
        case .steps: return "steps"
        }
    }
}

public struct HabitAutomation: Codable, Equatable {
    public var metric: HealthMetric
    public var target: Double

    public init(metric: HealthMetric, target: Double) {
        self.metric = metric
        self.target = target
    }
}

public struct Habit: Codable, Identifiable, Equatable {
    public let id: String
    public var playerId: PlayerId
    public var title: String
    public var description: String
    public var category: HabitCategory
    public var points: Int
    public var iconName: String
    public var frequency: HabitFrequency
    public var weeklyTargetDays: Int?
    public var isQuantitative: Bool
    public var quantityUnit: String?
    public var maxQuantity: Int?
    public var pointsPerUnit: Int?
    public var requiresProof: Bool
    public var order: Int
    public var isActive: Bool
    public var isArchived: Bool
    public var automation: HabitAutomation?

    public init(
        id: String,
        playerId: PlayerId,
        title: String,
        description: String,
        category: HabitCategory,
        points: Int,
        iconName: String,
        frequency: HabitFrequency = .daily,
        weeklyTargetDays: Int? = nil,
        isQuantitative: Bool = false,
        quantityUnit: String? = nil,
        maxQuantity: Int? = nil,
        pointsPerUnit: Int? = nil,
        requiresProof: Bool = false,
        order: Int = 1,
        isActive: Bool = true,
        isArchived: Bool = false,
        automation: HabitAutomation? = nil
    ) {
        self.id = id
        self.playerId = playerId
        self.title = title
        self.description = description
        self.category = category
        self.points = points
        self.iconName = iconName
        self.frequency = frequency
        self.weeklyTargetDays = weeklyTargetDays
        self.isQuantitative = isQuantitative
        self.quantityUnit = quantityUnit
        self.maxQuantity = maxQuantity
        self.pointsPerUnit = pointsPerUnit
        self.requiresProof = requiresProof
        self.order = order
        self.isActive = isActive
        self.isArchived = isArchived
        self.automation = automation
    }

    public var isWeekly: Bool {
        frequency == .weekly || (weeklyTargetDays != nil && (weeklyTargetDays ?? 0) > 0)
    }

    public var effectiveWeeklyTarget: Int {
        if let target = weeklyTargetDays, target > 0 {
            return min(7, target)
        }
        return frequency == .weekly ? 1 : 7
    }

    public var maxPossiblePointsPerDay: Int {
        if isQuantitative {
            let maxUnits = maxQuantity ?? 25
            let unitPoints = pointsPerUnit ?? 1
            return min(100, maxUnits * unitPoints)
        }
        return min(100, points)
    }
}
