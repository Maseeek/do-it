import Foundation

public enum StakePeriod: String, Codable, CaseIterable {
    case weekly
    case monthly
    case yearly

    public var title: String {
        switch self {
        case .weekly: return "Weekly Duel"
        case .monthly: return "Monthly Cup"
        case .yearly: return "Annual Dynasty"
        }
    }
}

public enum StakeStatus: String, Codable {
    case active
    case completed
    case rolled_over
}

public enum StakeWinner: Codable, Equatable {
    case player(PlayerId)
    case tie

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let val = try container.decode(String.self)
        if val == "tie" {
            self = .tie
        } else if let p = PlayerId(rawValue: val) {
            self = .player(p)
        } else {
            self = .tie
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .player(let pid):
            try container.encode(pid.rawValue)
        case .tie:
            try container.encode("tie")
        }
    }
}

public struct Stake: Codable, Identifiable, Equatable {
    public let id: String
    public var period: StakePeriod
    public var periodKey: String // e.g. "2026-W41" or "2026-10"
    public var title: String
    public var description: String
    public var status: StakeStatus
    public var winnerId: StakeWinner?
    public var dueDate: String // YYYY-MM-DD
    public var acknowledged: Bool

    public init(
        id: String = UUID().uuidString,
        period: StakePeriod,
        periodKey: String,
        title: String,
        description: String,
        status: StakeStatus = .active,
        winnerId: StakeWinner? = nil,
        dueDate: String,
        acknowledged: Bool = false
    ) {
        self.id = id
        self.period = period
        self.periodKey = periodKey
        self.title = title
        self.description = description
        self.status = status
        self.winnerId = winnerId
        self.dueDate = dueDate
        self.acknowledged = acknowledged
    }
}
