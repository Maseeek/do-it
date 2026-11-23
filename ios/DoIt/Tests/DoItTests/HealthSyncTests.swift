import XCTest
@testable import DoItKit

final class HealthSyncTests: XCTestCase {
    func testSleepRatioMilestones() {
        // Less than 6.5 hours earns 0 ratio
        XCTAssertEqual(HealthKitService.calculateSleepRewardRatio(hours: 6.0), 0.0)
        XCTAssertEqual(HealthKitService.calculateSleepRewardRatio(hours: 6.4), 0.0)

        // Exact milestones
        XCTAssertEqual(HealthKitService.calculateSleepRewardRatio(hours: 6.5), 0.2, accuracy: 0.001)
        XCTAssertEqual(HealthKitService.calculateSleepRewardRatio(hours: 7.0), 0.4, accuracy: 0.001)
        XCTAssertEqual(HealthKitService.calculateSleepRewardRatio(hours: 7.5), 0.6, accuracy: 0.001)
        XCTAssertEqual(HealthKitService.calculateSleepRewardRatio(hours: 8.0), 0.9, accuracy: 0.001)
        XCTAssertEqual(HealthKitService.calculateSleepRewardRatio(hours: 8.5), 1.0, accuracy: 0.001)

        // Above target
        XCTAssertEqual(HealthKitService.calculateSleepRewardRatio(hours: 9.0), 1.0)
    }

    func testSleepRatioLinearInterpolation() {
        // Midway between 6.5 (0.2) and 7.0 (0.4) is 6.75 (0.3)
        let ratio675 = HealthKitService.calculateSleepRewardRatio(hours: 6.75)
        XCTAssertEqual(ratio675, 0.3, accuracy: 0.001)

        // Midway between 7.5 (0.6) and 8.0 (0.9) is 7.75 (0.75)
        let ratio775 = HealthKitService.calculateSleepRewardRatio(hours: 7.75)
        XCTAssertEqual(ratio775, 0.75, accuracy: 0.001)
    }

    func testHealthPointsForSleepHabit() {
        let sleepHabit = Habit(
            id: "maciek-sleep",
            playerId: .maciek,
            title: "Sleep 8.5+ Hours",
            description: "",
            category: .foundation,
            points: 50,
            iconName: "moon.fill",
            automation: HabitAutomation(metric: .sleep, target: 8.5)
        )

        // Full 8.5h sleep -> 50 pts
        XCTAssertEqual(HealthKitService.calculateHealthPoints(habit: sleepHabit, value: 8.5), 50)
        // 6.5h sleep -> 0.2 * 50 = 10 pts
        XCTAssertEqual(HealthKitService.calculateHealthPoints(habit: sleepHabit, value: 6.5), 10)
        // 7.0h sleep -> 0.4 * 50 = 20 pts
        XCTAssertEqual(HealthKitService.calculateHealthPoints(habit: sleepHabit, value: 7.0), 20)
        // 5.5h sleep -> 0 pts
        XCTAssertEqual(HealthKitService.calculateHealthPoints(habit: sleepHabit, value: 5.5), 0)
    }

    func testHealthPointsForWorkoutHabit() {
        let workoutHabit = Habit(
            id: "maciek-gym",
            playerId: .maciek,
            title: "Gym",
            description: "",
            category: .physical,
            points: 40,
            iconName: "dumbbell.fill",
            automation: HabitAutomation(metric: .workout, target: 20)
        )

        // Workout >= 20 mins qualifies for all 40 pts
        XCTAssertEqual(HealthKitService.calculateHealthPoints(habit: workoutHabit, value: 35), 40)
        // Workout < 20 mins does not qualify
        XCTAssertEqual(HealthKitService.calculateHealthPoints(habit: workoutHabit, value: 15), 0)
    }

    func testHealthPointsForStepsHabit() {
        let stepsHabit = Habit(
            id: "maciek-steps",
            playerId: .maciek,
            title: "Step Goal",
            description: "",
            category: .physical,
            points: 20,
            iconName: "figure.walk",
            automation: HabitAutomation(metric: .steps, target: 10000)
        )

        XCTAssertEqual(HealthKitService.calculateHealthPoints(habit: stepsHabit, value: 10500), 20)
        XCTAssertEqual(HealthKitService.calculateHealthPoints(habit: stepsHabit, value: 8200), 0)
    }
}
