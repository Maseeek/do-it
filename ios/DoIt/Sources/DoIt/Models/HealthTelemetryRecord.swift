import Foundation

public struct HealthTelemetryRecord: Codable, Identifiable, Equatable {
    public var id: String { "\(habitId)-\(date)-\(metric.rawValue)" }
    public var habitId: String
    public var playerId: PlayerId
    public var date: String // YYYY-MM-DD
    public var metric: HealthMetric
    public var value: Double
    public var target: Double
    public var unit: String
    public var recordedAt: String
    public var source: String // "apple_health", "google_health", "simulated"

    public init(
        habitId: String,
        playerId: PlayerId,
        date: String,
        metric: HealthMetric,
        value: Double,
        target: Double,
        unit: String,
        recordedAt: String = ISO8601DateFormatter().string(from: Date()),
        source: String = "apple_health"
    ) {
        self.habitId = habitId
        self.playerId = playerId
        self.date = date
        self.metric = metric
        self.value = value
        self.target = target
        self.unit = unit
        self.recordedAt = recordedAt
        self.source = source
    }
}
