import Foundation

public struct RestDay: Codable, Identifiable, Equatable {
    public let id: String
    public var playerId: PlayerId
    public var date: String // YYYY-MM-DD
    public var reason: String?
    public var createdAt: String

    public init(
        id: String = UUID().uuidString,
        playerId: PlayerId,
        date: String,
        reason: String? = nil,
        createdAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.playerId = playerId
        self.date = date
        self.reason = reason
        self.createdAt = createdAt
    }
}
