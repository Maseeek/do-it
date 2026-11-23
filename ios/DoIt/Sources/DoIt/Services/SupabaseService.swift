import Foundation

public enum SupabaseError: Error, LocalizedError {
    case invalidConfig
    case networkError(String)
    case serverError(Int, String)
    case decodingError(String)

    public var errorDescription: String? {
        switch self {
        case .invalidConfig: return "Supabase URL or Anon Key is missing."
        case .networkError(let msg): return "Network error: \(msg)"
        case .serverError(let code, let msg): return "Supabase server error (\(code)): \(msg)"
        case .decodingError(let msg): return "Failed to parse Supabase payload: \(msg)"
        }
    }
}

public final class SupabaseService {
    public static let shared = SupabaseService()

    private var config: SupabaseConfig = SupabaseConfig()
    private let session = URLSession.shared
    private let jsonEncoder = JSONEncoder()
    private let jsonDecoder = JSONDecoder()

    private var webSocketTask: URLSessionWebSocketTask?
    public var onRemoteChangeReceived: (() -> Void)?
    public var onRemoteReactionReceived: ((CouplesReaction) -> Void)?

    private init() {}

    public func configure(with config: SupabaseConfig) {
        self.config = config
        if config.isEnabled && !config.url.isEmpty {
            startRealtimeListener()
        } else {
            stopRealtimeListener()
        }
    }

    private var isConfigured: Bool {
        config.isEnabled && !config.url.isEmpty && !config.anonKey.isEmpty
    }

    private func makeRequest(endpoint: String, method: String = "GET", body: Data? = nil, prefer: String? = nil) throws -> URLRequest {
        guard isConfigured, let baseURL = URL(string: config.url) else {
            throw SupabaseError.invalidConfig
        }

        let fullURL = baseURL.appendingPathComponent(endpoint)
        var req = URLRequest(url: fullURL)
        req.httpMethod = method
        req.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let prefer = prefer {
            req.setValue(prefer, forHTTPHeaderField: "Prefer")
        }
        req.httpBody = body
        return req
    }

    // MARK: - RPC Calls

    public func createDuel(displayName: String) async throws -> Duel {
        let payload = try jsonEncoder.encode(["display_name": displayName])
        let req = try makeRequest(endpoint: "rest/v1/rpc/create_duel", method: "POST", body: payload)
        let (data, response) = try await session.data(for: req)
        try validateResponse(response, data: data)
        return try jsonDecoder.decode(Duel.self, from: data)
    }

    public func acceptDuel(inviteCode: String, displayName: String) async throws -> Duel {
        let payload = try jsonEncoder.encode(["code": inviteCode, "display_name": displayName])
        let req = try makeRequest(endpoint: "rest/v1/rpc/accept_duel", method: "POST", body: payload)
        let (data, response) = try await session.data(for: req)
        try validateResponse(response, data: data)
        return try jsonDecoder.decode(Duel.self, from: data)
    }

    public func setPlayerColor(color: PlayerColorId) async throws {
        let payload = try jsonEncoder.encode(["requested_color": color.rawValue])
        let req = try makeRequest(endpoint: "rest/v1/rpc/set_player_color", method: "POST", body: payload)
        let (data, response) = try await session.data(for: req)
        try validateResponse(response, data: data)
    }

    public func updatePlayerName(name: String) async throws {
        let payload = try jsonEncoder.encode(["display_name": name])
        let req = try makeRequest(endpoint: "rest/v1/rpc/update_duel_player_name", method: "POST", body: payload)
        let (data, response) = try await session.data(for: req)
        try validateResponse(response, data: data)
    }

    public func recordAppInvite() async throws {
        let req = try makeRequest(endpoint: "rest/v1/rpc/record_app_invite", method: "POST", body: Data())
        let (data, response) = try await session.data(for: req)
        try validateResponse(response, data: data)
    }

    // MARK: - Check-Ins Sync

    public struct DuelCheckInRow: Codable {
        public let duel_id: String
        public let id: String
        public let habit_id: String
        public let player_slot: String
        public let data: CheckIn
    }

    public func upsertCheckIn(duelId: String, checkIn: CheckIn) async throws {
        let row = DuelCheckInRow(
            duel_id: duelId,
            id: checkIn.id,
            habit_id: checkIn.habitId,
            player_slot: checkIn.playerId.rawValue,
            data: checkIn
        )
        let payload = try jsonEncoder.encode(row)
        let req = try makeRequest(endpoint: "rest/v1/duel_check_ins", method: "POST", body: payload, prefer: "resolution=merge-duplicates")
        let (data, response) = try await session.data(for: req)
        try validateResponse(response, data: data)
    }

    public func deleteCheckIn(duelId: String, checkInId: String) async throws {
        let req = try makeRequest(endpoint: "rest/v1/duel_check_ins?duel_id=eq.\(duelId)&id=eq.\(checkInId)", method: "DELETE")
        let (data, response) = try await session.data(for: req)
        try validateResponse(response, data: data)
    }

    // MARK: - Reactions Sync

    public struct DuelReactionRow: Codable {
        public let duel_id: String
        public let id: String
        public let player_slot: String
        public let data: CouplesReaction
    }

    public func sendReaction(duelId: String, reaction: CouplesReaction) async throws {
        let row = DuelReactionRow(
            duel_id: duelId,
            id: reaction.id,
            player_slot: reaction.fromPlayerId.rawValue,
            data: reaction
        )
        let payload = try jsonEncoder.encode(row)
        let req = try makeRequest(endpoint: "rest/v1/duel_reactions", method: "POST", body: payload)
        let (data, response) = try await session.data(for: req)
        try validateResponse(response, data: data)
    }

    // MARK: - Rest Days Sync

    public struct DuelRestDayRow: Codable {
        public let duel_id: String
        public let id: String
        public let player_slot: String
        public let date: String
        public let data: RestDay
    }

    public func addRestDay(duelId: String, restDay: RestDay) async throws {
        let row = DuelRestDayRow(
            duel_id: duelId,
            id: restDay.id,
            player_slot: restDay.playerId.rawValue,
            date: restDay.date,
            data: restDay
        )
        let payload = try jsonEncoder.encode(row)
        let req = try makeRequest(endpoint: "rest/v1/duel_rest_days", method: "POST", body: payload, prefer: "resolution=merge-duplicates")
        let (data, response) = try await session.data(for: req)
        try validateResponse(response, data: data)
    }

    public func deleteRestDay(duelId: String, restDayId: String) async throws {
        let req = try makeRequest(endpoint: "rest/v1/duel_rest_days?duel_id=eq.\(duelId)&id=eq.\(restDayId)", method: "DELETE")
        let (data, response) = try await session.data(for: req)
        try validateResponse(response, data: data)
    }

    // MARK: - Full Duel Refresh

    public func fetchDuelState(duelId: String) async throws -> (
        checkIns: [CheckIn],
        reactions: [CouplesReaction],
        restDays: [RestDay]
    ) {
        async let checkInsTask: [CheckIn] = {
            let req = try makeRequest(endpoint: "rest/v1/duel_check_ins?duel_id=eq.\(duelId)&select=data")
            let (data, response) = try await session.data(for: req)
            try validateResponse(response, data: data)
            let rows = try jsonDecoder.decode([[String: CheckIn]].self, from: data)
            return rows.compactMap { $0["data"] }
        }()

        async let reactionsTask: [CouplesReaction] = {
            let req = try makeRequest(endpoint: "rest/v1/duel_reactions?duel_id=eq.\(duelId)&select=data&order=id.desc&limit=20")
            let (data, response) = try await session.data(for: req)
            try validateResponse(response, data: data)
            let rows = try jsonDecoder.decode([[String: CouplesReaction]].self, from: data)
            return rows.compactMap { $0["data"] }
        }()

        async let restDaysTask: [RestDay] = {
            let req = try makeRequest(endpoint: "rest/v1/duel_rest_days?duel_id=eq.\(duelId)&select=data")
            let (data, response) = try await session.data(for: req)
            try validateResponse(response, data: data)
            let rows = try jsonDecoder.decode([[String: RestDay]].self, from: data)
            return rows.compactMap { $0["data"] }
        }()

        return try await (checkInsTask, reactionsTask, restDaysTask)
    }

    // MARK: - Realtime WebSockets

    private func startRealtimeListener() {
        guard let url = URL(string: config.url),
              let host = url.host else { return }

        let wsURLString = "wss://\(host)/realtime/v1/websocket?apikey=\(config.anonKey)&vsn=1.0.0"
        guard let wsURL = URL(string: wsURLString) else { return }

        webSocketTask?.cancel()
        webSocketTask = session.webSocketTask(with: wsURL)
        webSocketTask?.resume()

        receiveWebSocketMessage()
    }

    private func stopRealtimeListener() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
    }

    private func receiveWebSocketMessage() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleWebSocketPayload(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleWebSocketPayload(text)
                    }
                @unknown default:
                    break
                }
                self.receiveWebSocketMessage()
            case .failure(let error):
                print("[SupabaseService] Realtime disconnected: \(error.localizedDescription)")
            }
        }
    }

    private func handleWebSocketPayload(_ text: String) {
        if text.contains("duel_check_ins") || text.contains("duel_reactions") || text.contains("duel_rest_days") {
            DispatchQueue.main.async {
                self.onRemoteChangeReceived?()
            }
        }
    }

    private func validateResponse(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { return }
        if !(200...299).contains(http.statusCode) {
            let msg = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw SupabaseError.serverError(http.statusCode, msg)
        }
    }
}
