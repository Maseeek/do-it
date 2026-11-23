import Foundation

public struct Duel: Codable, Identifiable, Equatable {
    public let id: String
    public var ownerId: String
    public var guestId: String?
    public var ownerName: String
    public var guestName: String?
    public var inviteCode: String
    public var ownerColor: PlayerColorId
    public var guestColor: PlayerColorId
    public var ownerInvites: Int
    public var guestInvites: Int
    public var createdAt: String

    public init(
        id: String = UUID().uuidString,
        ownerId: String = "local-maciek",
        guestId: String? = "local-myrna",
        ownerName: String = "Maciek",
        guestName: String? = "Myrna",
        inviteCode: String = UUID().uuidString,
        ownerColor: PlayerColorId = .blue,
        guestColor: PlayerColorId = .purple,
        ownerInvites: Int = 0,
        guestInvites: Int = 0,
        createdAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.ownerId = ownerId
        self.guestId = guestId
        self.ownerName = ownerName
        self.guestName = guestName
        self.inviteCode = inviteCode
        self.ownerColor = ownerColor
        self.guestColor = guestColor
        self.ownerInvites = ownerInvites
        self.guestInvites = guestInvites
        self.createdAt = createdAt
    }

    public var isPaired: Bool {
        guestId != nil
    }

    public func slot(for userId: String) -> PlayerId? {
        if userId == ownerId { return .maciek }
        if userId == guestId { return .myrna }
        return nil
    }

    public func name(for slot: PlayerId) -> String {
        switch slot {
        case .maciek: return ownerName
        case .myrna: return guestName ?? "Opponent"
        }
    }

    public func color(for slot: PlayerId) -> PlayerColorId {
        switch slot {
        case .maciek: return ownerColor
        case .myrna: return guestColor
        }
    }

    public func invites(for slot: PlayerId) -> Int {
        switch slot {
        case .maciek: return ownerInvites
        case .myrna: return guestInvites
        }
    }
}
