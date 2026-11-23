import XCTest
@testable import DoItKit

final class HabitCatalogTests: XCTestCase {
    func testMaciekHabitsEqual240DailyPar() {
        let habits = HabitCatalog.defaultMaciekHabits
        let totalDailyPoints = HabitCatalog.dailyParPoints(habits: habits)
        XCTAssertEqual(totalDailyPoints, 240, "Maciek's default habits must sum to exactly 240 Daily Par")
    }

    func testMyrnaHabitsEqual240DailyPar() {
        let habits = HabitCatalog.defaultMyrnaHabits
        let totalDailyPoints = HabitCatalog.dailyParPoints(habits: habits)
        XCTAssertEqual(totalDailyPoints, 240, "Myrna's default habits must sum to exactly 240 Daily Par")
    }

    func testAsymmetricEquivalence() {
        let maciekPoints = HabitCatalog.dailyParPoints(habits: HabitCatalog.defaultMaciekHabits)
        let myrnaPoints = HabitCatalog.dailyParPoints(habits: HabitCatalog.defaultMyrnaHabits)
        XCTAssertEqual(maciekPoints, myrnaPoints, "Both players must have identical Daily Par ceiling despite asymmetric habits")
    }

    func testBalanceHabitPlanTo240Par() {
        // Create an uncalibrated set of 5 habits totaling 150 points
        let rawHabits = [
            Habit(id: "1", playerId: .maciek, title: "H1", description: "", category: .physical, points: 30, iconName: ""),
            Habit(id: "2", playerId: .maciek, title: "H2", description: "", category: .cardio, points: 30, iconName: ""),
            Habit(id: "3", playerId: .maciek, title: "H3", description: "", category: .intellect, points: 30, iconName: ""),
            Habit(id: "4", playerId: .maciek, title: "H4", description: "", category: .mind, points: 30, iconName: ""),
            Habit(id: "5", playerId: .maciek, title: "H5", description: "", category: .nutrition, points: 30, iconName: ""),
        ]

        let balanced = HabitCatalog.balanceHabitPlan(habits: rawHabits, target: 240)
        XCTAssertNotNil(balanced)
        let sum = HabitCatalog.dailyParPoints(habits: balanced!)
        XCTAssertEqual(sum, 240, "Balanced habit plan must equal target 240 points")
    }
}
