import Foundation

public struct CheckIn: Codable, Identifiable, Equatable {
    public let id: String
    public var habitId: String
    public var playerId: PlayerId
    public var date: String // YYYY-MM-DD
    public var pointsEarned: Int
    public var quantity: Int?
    public var proofUrl: String?
    public var proofUrls: [String]?
    public var completedAt: String
    public var note: String?
    public var isRetroactive: Bool?
    public var loggedAt: String?
    public var source: String? // "manual", "apple_health", "google_health"
    public var healthValue: Double?

    public init(
        id: String = UUID().uuidString,
        habitId: String,
        playerId: PlayerId,
        date: String,
        pointsEarned: Int,
        quantity: Int? = nil,
        proofUrl: String? = nil,
        proofUrls: [String]? = nil,
        completedAt: String = ISO8601DateFormatter().string(from: Date()),
        note: String? = nil,
        isRetroactive: Bool? = nil,
        loggedAt: String? = nil,
        source: String? = "manual",
        healthValue: Double? = nil
    ) {
        self.id = id
        self.habitId = habitId
        self.playerId = playerId
        self.date = date
        self.pointsEarned = pointsEarned
        self.quantity = quantity
        self.proofUrl = proofUrl
        self.proofUrls = proofUrls
        self.completedAt = completedAt
        self.note = note
        self.isRetroactive = isRetroactive
        self.loggedAt = loggedAt
        self.source = source
        self.healthValue = healthValue
    }

    public var allProofUrls: [String] {
        var list = proofUrls ?? []
        if let single = proofUrl, !list.contains(single) {
            list.insert(single, at: 0)
        }
        return list
    }

    public var hasProof: Bool {
        !allProofUrls.isEmpty
    }
}
