import Foundation

public struct PendingMutation: Codable, Identifiable {
    public enum MutationType: String, Codable {
        case upsertCheckIn
        case deleteCheckIn
        case addRestDay
        case deleteRestDay
        case sendReaction
        case upsertStake
        case setPlayerColor
        case updatePlayerName
    }

    public let id: String
    public let type: MutationType
    public let payloadData: Data
    public let createdAt: Date

    public init<T: Encodable>(type: MutationType, payload: T) {
        self.id = UUID().uuidString
        self.type = type
        self.payloadData = (try? JSONEncoder().encode(payload)) ?? Data()
        self.createdAt = Date()
    }

    public func decodePayload<T: Decodable>(as type: T.Type) -> T? {
        try? JSONDecoder().decode(type, from: payloadData)
    }
}

public final class PersistenceService {
    public static let shared = PersistenceService()

    private let appGroupIdentifier = "group.com.doit.app"
    private let stateFileName = "doit_app_state.json"
    private let outboxFileName = "doit_sync_outbox.json"

    private let fileManager = FileManager.default
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    private init() {}

    private var storageDirectory: URL {
        if let container = fileManager.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) {
            return container
        }
        return fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    private var stateFileURL: URL {
        storageDirectory.appendingPathComponent(stateFileName)
    }

    private var outboxFileURL: URL {
        storageDirectory.appendingPathComponent(outboxFileName)
    }

    // MARK: - App State Persistence

    public func saveState(_ state: AppState) {
        do {
            let data = try encoder.encode(state)
            try data.write(to: stateFileURL, options: .atomic)
            
            // Also write simplified payload for WidgetKit fast access
            writeWidgetData(state: state)
        } catch {
            print("[PersistenceService] Failed to save state: \(error)")
        }
    }

    public func loadState() -> AppState? {
        guard fileManager.fileExists(atPath: stateFileURL.path) else {
            return nil
        }
        do {
            let data = try Data(contentsOf: stateFileURL)
            return try decoder.decode(AppState.self, from: data)
        } catch {
            print("[PersistenceService] Failed to decode state: \(error)")
            return nil
        }
    }

    public func loadOrCreateInitialState() -> AppState {
        if let existing = loadState() {
            return existing
        }

        let duel = Duel()
        let habits = HabitCatalog.defaultMaciekHabits + HabitCatalog.defaultMyrnaHabits
        let stakes = HabitCatalog.defaultStakes()

        let freshState = AppState(
            activePlayerId: .maciek,
            duel: duel,
            habits: habits,
            checkIns: [],
            stakes: stakes,
            reactions: [],
            restDays: [],
            soundEnabled: true,
            hapticsEnabled: true,
            healthKitEnabled: true,
            supabaseConfig: SupabaseConfig(),
            telemetry: [:]
        )
        saveState(freshState)
        return freshState
    }

    // MARK: - Outbox Sync Queue

    public func enqueueMutation(_ mutation: PendingMutation) {
        var queue = loadOutbox()
        queue.append(mutation)
        saveOutbox(queue)
    }

    public func loadOutbox() -> [PendingMutation] {
        guard fileManager.fileExists(atPath: outboxFileURL.path) else {
            return []
        }
        do {
            let data = try Data(contentsOf: outboxFileURL)
            return try decoder.decode([PendingMutation].self, from: data)
        } catch {
            return []
        }
    }

    public func removeMutations(ids: Set<String>) {
        var queue = loadOutbox()
        queue.removeAll { ids.contains($0.id) }
        saveOutbox(queue)
    }

    private func saveOutbox(_ queue: [PendingMutation]) {
        do {
            let data = try encoder.encode(queue)
            try data.write(to: outboxFileURL, options: .atomic)
        } catch {
            print("[PersistenceService] Failed to save outbox: \(error)")
        }
    }

    // MARK: - WidgetKit Data Sharing

    private func writeWidgetData(state: AppState) {
        let defaults = UserDefaults(suiteName: appGroupIdentifier) ?? UserDefaults.standard
        let maciekScore = ScoreCalculator.calculatePlayerScores(
            playerId: .maciek,
            checkIns: state.checkIns,
            habits: state.habits,
            restDays: state.restDays
        )
        let myrnaScore = ScoreCalculator.calculatePlayerScores(
            playerId: .myrna,
            checkIns: state.checkIns,
            habits: state.habits,
            restDays: state.restDays
        )

        let versus = ScoreCalculator.getVersusComparison(
            maciekSummary: maciekScore,
            myrnaSummary: myrnaScore,
            tier: .weekly
        )

        defaults.set(maciekScore.today, forKey: "maciek_today_score")
        defaults.set(myrnaScore.today, forKey: "myrna_today_score")
        defaults.set(maciekScore.weekly, forKey: "maciek_weekly_score")
        defaults.set(myrnaScore.weekly, forKey: "myrna_weekly_score")
        defaults.set(maciekScore.currentStreak, forKey: "maciek_streak")
        defaults.set(myrnaScore.currentStreak, forKey: "myrna_streak")
        defaults.set(versus.delta, forKey: "weekly_delta")
        defaults.set(versus.maciekPct, forKey: "weekly_maciek_pct")
        defaults.set(versus.myrnaPct, forKey: "weekly_myrna_pct")
        defaults.set(Date().timeIntervalSince1970, forKey: "last_widget_sync")
    }
}
