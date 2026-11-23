import Foundation
import HealthKit

public enum HealthKitError: Error, LocalizedError {
    case notAvailableOnDevice
    case permissionDenied
    case queryFailed(String)

    public var errorDescription: String? {
        switch self {
        case .notAvailableOnDevice: return "Apple Health is not available on this device."
        case .permissionDenied: return "HealthKit permissions were not granted."
        case .queryFailed(let msg): return "HealthKit query failed: \(msg)"
        }
    }
}

public final class HealthKitService {
    public static let shared = HealthKitService()

    private let healthStore = HKHealthStore()
    public private(set) var isAuthorized = false

    private init() {}

    public var isAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    public func requestAuthorization() async throws {
        guard isAvailable else {
            throw HealthKitError.notAvailableOnDevice
        }

        var readTypes = Set<HKObjectType>()
        if let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            readTypes.insert(sleepType)
        }
        if let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) {
            readTypes.insert(stepType)
        }
        readTypes.insert(HKObjectType.workoutType())
        if let distanceType = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning) {
            readTypes.insert(distanceType)
        }

        try await healthStore.requestAuthorization(toShare: [], read: readTypes)
        isAuthorized = true
    }

    // MARK: - Sleep Calculation (Exact Tiered Formula)

    public static let sleepFullPointsHours: Double = 8.5
    private static let sleepMilestones: [(hours: Double, ratio: Double)] = [
        (6.5, 0.2),
        (7.0, 0.4),
        (7.5, 0.6),
        (8.0, 0.9),
        (8.5, 1.0)
    ]

    public static func calculateSleepRewardRatio(hours: Double) -> Double {
        if !hours.isFinite || hours < 6.5 { return 0.0 }
        if hours >= sleepFullPointsHours { return 1.0 }

        for i in 1..<sleepMilestones.count {
            let lower = sleepMilestones[i - 1]
            let upper = sleepMilestones[i]
            if hours <= upper.hours {
                let fraction = (hours - lower.hours) / (upper.hours - lower.hours)
                return lower.ratio + fraction * (upper.ratio - lower.ratio)
            }
        }
        return 1.0
    }

    public static func calculateHealthPoints(habit: Habit, value: Double) -> Int {
        guard let automation = habit.automation, value.isFinite else { return 0 }
        let ratio: Double
        if automation.metric == .sleep {
            ratio = calculateSleepRewardRatio(hours: value)
        } else {
            ratio = (value >= automation.target) ? 1.0 : 0.0
        }
        return Int(round(Double(habit.points) * ratio))
    }

    // MARK: - Health Queries

    public func fetchSleepDuration(for dateStr: String) async throws -> Double {
        guard isAvailable else { return 0.0 }
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            return 0.0
        }

        let targetDate = DateUtils.parseDate(dateStr)
        var cal = Calendar.current
        cal.timeZone = TimeZone.current

        // Diurnal sleep interval: 6 PM yesterday to 2 PM target day
        guard let prevDayEvening = cal.date(byAdding: .hour, value: -6, to: cal.startOfDay(for: targetDate)),
              let targetDayAfternoon = cal.date(byAdding: .hour, value: 14, to: cal.startOfDay(for: targetDate)) else {
            return 0.0
        }

        let predicate = HKQuery.predicateForSamples(withStart: prevDayEvening, end: targetDayAfternoon, options: [.strictStartDate])

        return try await withCheckedThrowingContinuation { continuation in
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
            let query = HKSampleQuery(
                sampleType: sleepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sort]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: HealthKitError.queryFailed(error.localizedDescription))
                    return
                }

                guard let categorySamples = samples as? [HKCategorySample] else {
                    continuation.resume(returning: 0.0)
                    return
                }

                var asleepSeconds: TimeInterval = 0
                var inBedSeconds: TimeInterval = 0
                var hasAsleepStages = false

                for s in categorySamples {
                    let dur = s.endDate.timeIntervalSince(s.startDate)
                    if #available(iOS 16.0, *) {
                        if s.value == HKCategoryValueSleepAnalysis.asleepCore.rawValue ||
                           s.value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue ||
                           s.value == HKCategoryValueSleepAnalysis.asleepREM.rawValue {
                            asleepSeconds += dur
                            hasAsleepStages = true
                        } else if s.value == HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue {
                            asleepSeconds += dur
                            hasAsleepStages = true
                        } else if s.value == HKCategoryValueSleepAnalysis.inBed.rawValue {
                            inBedSeconds += dur
                        }
                    } else {
                        if s.value == HKCategoryValueSleepAnalysis.asleep.rawValue {
                            asleepSeconds += dur
                            hasAsleepStages = true
                        } else {
                            inBedSeconds += dur
                        }
                    }
                }

                let effectiveSeconds = hasAsleepStages ? asleepSeconds : inBedSeconds
                let hours = effectiveSeconds / 3600.0
                continuation.resume(returning: hours)
            }
            healthStore.execute(query)
        }
    }

    public func fetchStepCount(for dateStr: String) async throws -> Int {
        guard isAvailable else { return 0 }
        guard let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) else { return 0 }

        let targetDate = DateUtils.parseDate(dateStr)
        var cal = Calendar.current
        cal.timeZone = TimeZone.current
        let startOfDay = cal.startOfDay(for: targetDate)
        guard let endOfDay = cal.date(byAdding: .day, value: 1, to: startOfDay) else { return 0 }

        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: endOfDay, options: [.strictStartDate])

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: stepType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, stats, error in
                if let error = error {
                    continuation.resume(throwing: HealthKitError.queryFailed(error.localizedDescription))
                    return
                }

                let count = stats?.sumQuantity()?.doubleValue(for: HKUnit.count()) ?? 0
                continuation.resume(returning: Int(count))
            }
            healthStore.execute(query)
        }
    }

    public struct WorkoutMatch {
        public let minutes: Double
        public let activityName: String
        public let isStrength: Bool
        public let isCardio: Bool
    }

    public func fetchWorkouts(for dateStr: String) async throws -> [WorkoutMatch] {
        guard isAvailable else { return [] }
        let targetDate = DateUtils.parseDate(dateStr)
        var cal = Calendar.current
        cal.timeZone = TimeZone.current
        let startOfDay = cal.startOfDay(for: targetDate)
        guard let endOfDay = cal.date(byAdding: .day, value: 1, to: startOfDay) else { return [] }

        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: endOfDay, options: [.strictStartDate])

        return try await withCheckedThrowingContinuation { continuation in
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
            let query = HKSampleQuery(
                sampleType: HKObjectType.workoutType(),
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sort]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: HealthKitError.queryFailed(error.localizedDescription))
                    return
                }

                guard let workouts = samples as? [HKWorkout] else {
                    continuation.resume(returning: [])
                    return
                }

                var matches: [WorkoutMatch] = []
                for w in workouts {
                    let mins = w.duration / 60.0
                    let type = w.workoutActivityType
                    let isStrength = (type == .traditionalStrengthTraining || type == .functionalStrengthTraining || type == .crossTraining)
                    let isCardio = (type == .running || type == .cycling || type == .swimming || type == .basketball || type == .highIntensityIntervalTraining)
                    let name: String
                    switch type {
                    case .traditionalStrengthTraining, .functionalStrengthTraining: name = "Strength Workout"
                    case .running: name = "Running"
                    case .basketball: name = "Basketball"
                    case .cycling: name = "Cycling"
                    default: name = "Workout"
                    }

                    matches.append(WorkoutMatch(
                        minutes: mins,
                        activityName: name,
                        isStrength: isStrength,
                        isCardio: isCardio
                    ))
                }
                continuation.resume(returning: matches)
            }
            healthStore.execute(query)
        }
    }

    // MARK: - Reconcile Automatic Habits

    public func reconcileAutomaticHabits(
        habits: [Habit],
        player: PlayerId,
        dateStr: String,
        existingCheckIns: [CheckIn]
    ) async -> (checkInsToUpsert: [CheckIn], telemetry: [HealthTelemetryRecord]) {
        var upsertedCheckIns: [CheckIn] = []
        var telemetryRecords: [HealthTelemetryRecord] = []

        let playerHabits = habits.filter { $0.playerId == player && $0.isActive && $0.automation != nil }

        for habit in playerHabits {
            guard let automation = habit.automation else { continue }

            var measuredValue: Double? = nil
            var unit = automation.metric.unit
            var detailText: String? = nil

            switch automation.metric {
            case .sleep:
                if let sleepHours = try? await fetchSleepDuration(for: dateStr), sleepHours > 0 {
                    measuredValue = sleepHours
                    let ratio = Self.calculateSleepRewardRatio(hours: sleepHours)
                    if ratio > 0 {
                        detailText = "\(String(format: "%.1f", sleepHours)) h sleep (Apple Health)"
                    }
                }

            case .steps:
                if let steps = try? await fetchStepCount(for: dateStr), steps > 0 {
                    measuredValue = Double(steps)
                    if measuredValue! >= automation.target {
                        detailText = "\(steps) steps (Apple Health)"
                    }
                }

            case .workout:
                if let workouts = try? await fetchWorkouts(for: dateStr) {
                    let strength = workouts.filter { $0.isStrength }.max(by: { $0.minutes < $1.minutes })
                    if let s = strength {
                        measuredValue = s.minutes
                        if s.minutes >= automation.target {
                            detailText = "\(s.activityName) · \(Int(s.minutes))m (Apple Health)"
                        }
                    }
                }

            case .cardio:
                if let workouts = try? await fetchWorkouts(for: dateStr) {
                    let cardio = workouts.filter { $0.isCardio }.max(by: { $0.minutes < $1.minutes })
                    if let c = cardio {
                        measuredValue = c.minutes
                        if c.minutes >= automation.target {
                            detailText = "\(c.activityName) · \(Int(c.minutes))m (Apple Health)"
                        }
                    }
                }
            }

            if let val = measuredValue {
                telemetryRecords.append(HealthTelemetryRecord(
                    habitId: habit.id,
                    playerId: player,
                    date: dateStr,
                    metric: automation.metric,
                    value: val,
                    target: automation.target,
                    unit: unit,
                    source: "apple_health"
                ))

                if let detail = detailText {
                    let existing = existingCheckIns.first { $0.habitId == habit.id && $0.date == dateStr }
                    let points = Self.calculateHealthPoints(habit: habit, value: val)

                    let checkIn = CheckIn(
                        id: existing?.id ?? "health-\(habit.id)-\(dateStr)",
                        habitId: habit.id,
                        playerId: player,
                        date: dateStr,
                        pointsEarned: points,
                        proofUrl: existing?.proofUrl,
                        proofUrls: existing?.proofUrls,
                        completedAt: existing?.completedAt ?? ISO8601DateFormatter().string(from: Date()),
                        note: detail,
                        source: "apple_health",
                        healthValue: val
                    )
                    upsertedCheckIns.append(checkIn)
                }
            }
        }

        return (upsertedCheckIns, telemetryRecords)
    }
}
