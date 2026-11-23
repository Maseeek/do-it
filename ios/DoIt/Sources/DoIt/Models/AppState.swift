import Foundation

public struct SupabaseConfig: Codable, Equatable {
    public var url: String
    public var anonKey: String
    public var isEnabled: Bool

    public init(url: String = "", anonKey: String = "", isEnabled: Bool = false) {
        self.url = url
        self.anonKey = anonKey
        self.isEnabled = isEnabled
    }
}

public struct AppState: Codable, Equatable {
    public var activePlayerId: PlayerId
    public var duel: Duel
    public var habits: [Habit]
    public var checkIns: [CheckIn]
    public var stakes: [Stake]
    public var reactions: [CouplesReaction]
    public var restDays: [RestDay]
    public var soundEnabled: Bool
    public var hapticsEnabled: Bool
    public var healthKitEnabled: Bool
    public var supabaseConfig: SupabaseConfig
    public var telemetry: [String: HealthTelemetryRecord]

    public init(
        activePlayerId: PlayerId = .maciek,
        duel: Duel = Duel(),
        habits: [Habit] = [],
        checkIns: [CheckIn] = [],
        stakes: [Stake] = [],
        reactions: [CouplesReaction] = [],
        restDays: [RestDay] = [],
        soundEnabled: Bool = true,
        hapticsEnabled: Bool = true,
        healthKitEnabled: Bool = true,
        supabaseConfig: SupabaseConfig = SupabaseConfig(),
        telemetry: [String: HealthTelemetryRecord] = [:]
    ) {
        self.activePlayerId = activePlayerId
        self.duel = duel
        self.habits = habits
        self.checkIns = checkIns
        self.stakes = stakes
        self.reactions = reactions
        self.restDays = restDays
        self.soundEnabled = soundEnabled
        self.hapticsEnabled = hapticsEnabled
        self.healthKitEnabled = healthKitEnabled
        self.supabaseConfig = supabaseConfig
        self.telemetry = telemetry
    }
}
