import Foundation

public struct CouplesReaction: Codable, Identifiable, Equatable {
    public let id: String
    public var fromPlayerId: PlayerId
    public var toPlayerId: PlayerId
    public var emoji: String
    public var message: String
    public var timestamp: String

    public init(
        id: String = UUID().uuidString,
        fromPlayerId: PlayerId,
        toPlayerId: PlayerId,
        emoji: String,
        message: String,
        timestamp: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.fromPlayerId = fromPlayerId
        self.toPlayerId = toPlayerId
        self.emoji = emoji
        self.message = message
        self.timestamp = timestamp
    }
}
