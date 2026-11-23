import XCTest
@testable import DoItKit

final class ScoreCalculatorTests: XCTestCase {
    private var maciekHabits: [Habit] = []
    private var myrnaHabits: [Habit] = []

    override func setUp() {
        super.setUp()
        maciekHabits = HabitCatalog.defaultMaciekHabits
        myrnaHabits = HabitCatalog.defaultMyrnaHabits
    }

    func testDailyParCeilingConstant() {
        XCTAssertEqual(ScoreCalculator.dailyParCeiling, 240)
    }

    func testInitialScoresAreZero() {
        let summary = ScoreCalculator.calculatePlayerScores(
            playerId: .maciek,
            checkIns: [],
            habits: maciekHabits,
            restDays: [],
            today: "2026-10-12"
        )

        XCTAssertEqual(summary.today, 0)
        XCTAssertEqual(summary.weekly, 0)
        XCTAssertEqual(summary.monthly, 0)
        XCTAssertEqual(summary.yearly, 0)
        XCTAssertEqual(summary.karma, 0)
        XCTAssertEqual(summary.currentStreak, 0)
    }

    func testScoringSumsAcrossTiers() {
        let checkIns = [
            CheckIn(id: "1", habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-12", pointsEarned: 50),
            CheckIn(id: "2", habitId: "maciek-gym", playerId: .maciek, date: "2026-10-12", pointsEarned: 40),
            CheckIn(id: "3", habitId: "maciek-reading", playerId: .maciek, date: "2026-10-11", pointsEarned: 25), // Previous day, same month
            CheckIn(id: "4", habitId: "maciek-project", playerId: .maciek, date: "2026-09-15", pointsEarned: 25), // Previous month, same year
            CheckIn(id: "5", habitId: "maciek-skills", playerId: .maciek, date: "2025-10-12", pointsEarned: 25), // Previous year
        ]

        let summary = ScoreCalculator.calculatePlayerScores(
            playerId: .maciek,
            checkIns: checkIns,
            habits: maciekHabits,
            restDays: [],
            today: "2026-10-12"
        )

        XCTAssertEqual(summary.today, 90) // 50 + 40
        XCTAssertEqual(summary.karma, 165) // 50 + 40 + 25 + 25 + 25
        XCTAssertEqual(summary.monthly, 115) // 50 + 40 + 25
        XCTAssertEqual(summary.yearly, 140) // 50 + 40 + 25 + 25
    }

    func testStreakCalculationWithContinuousDays() {
        let checkIns = [
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-10", pointsEarned: 50),
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-11", pointsEarned: 50),
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-12", pointsEarned: 50),
        ]

        let summary = ScoreCalculator.calculatePlayerScores(
            playerId: .maciek,
            checkIns: checkIns,
            habits: maciekHabits,
            restDays: [],
            today: "2026-10-12"
        )

        XCTAssertEqual(summary.currentStreak, 3)
    }

    func testStreakChecksFromYesterdayWhenTodayIncomplete() {
        let checkIns = [
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-09", pointsEarned: 50),
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-10", pointsEarned: 50),
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-11", pointsEarned: 50),
        ]

        // Today is 2026-10-12 and has no check-in yet, but yesterday (11th) does
        let summary = ScoreCalculator.calculatePlayerScores(
            playerId: .maciek,
            checkIns: checkIns,
            habits: maciekHabits,
            restDays: [],
            today: "2026-10-12"
        )

        XCTAssertEqual(summary.currentStreak, 3)
    }

    func testStreakBreaksWhenMissedDay() {
        let checkIns = [
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-08", pointsEarned: 50),
            // Missed 2026-10-09
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-10", pointsEarned: 50),
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-11", pointsEarned: 50),
        ]

        let summary = ScoreCalculator.calculatePlayerScores(
            playerId: .maciek,
            checkIns: checkIns,
            habits: maciekHabits,
            restDays: [],
            today: "2026-10-12"
        )

        XCTAssertEqual(summary.currentStreak, 2)
    }

    func testRestDayPreservesStreakWithoutPoints() {
        let checkIns = [
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-08", pointsEarned: 50),
            // 2026-10-09 was a declared Rest Day!
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-10", pointsEarned: 50),
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-11", pointsEarned: 50),
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-12", pointsEarned: 50),
        ]

        let restDays = [
            RestDay(playerId: .maciek, date: "2026-10-09", reason: "Recovery day")
        ]

        let summary = ScoreCalculator.calculatePlayerScores(
            playerId: .maciek,
            checkIns: checkIns,
            habits: maciekHabits,
            restDays: restDays,
            today: "2026-10-12"
        )

        // 4 active check-in days + 1 rest day bridging it = 4-day streak preserved!
        XCTAssertEqual(summary.currentStreak, 4)
        XCTAssertEqual(summary.restDaysUsed, 1)
    }

    func testVersusComparisonLeaderAndPercentages() {
        let maciekSummary = PlayerScoreSummary(weekly: 600)
        let myrnaSummary = PlayerScoreSummary(weekly: 400)

        let versus = ScoreCalculator.getVersusComparison(
            maciekSummary: maciekSummary,
            myrnaSummary: myrnaSummary,
            tier: .weekly
        )

        XCTAssertEqual(versus.leader, .player(.maciek))
        XCTAssertEqual(versus.delta, 200)
        XCTAssertEqual(versus.maciekPct, 60)
        XCTAssertEqual(versus.myrnaPct, 40)
    }

    func testVersusComparisonTie() {
        let maciekSummary = PlayerScoreSummary(weekly: 500)
        let myrnaSummary = PlayerScoreSummary(weekly: 500)

        let versus = ScoreCalculator.getVersusComparison(
            maciekSummary: maciekSummary,
            myrnaSummary: myrnaSummary,
            tier: .weekly
        )

        XCTAssertEqual(versus.leader, .tie)
        XCTAssertEqual(versus.delta, 0)
        XCTAssertEqual(versus.maciekPct, 50)
        XCTAssertEqual(versus.myrnaPct, 50)
    }

    func testWeeklyHabitStreak() {
        let gymHabit = Habit(
            id: "maciek-gym",
            playerId: .maciek,
            title: "Gym",
            description: "",
            category: .physical,
            points: 40,
            iconName: "dumbbell.fill",
            frequency: .weekly,
            weeklyTargetDays: 4
        )

        // 4 check-ins for the current week (e.g. week of 2026-10-12, Monday)
        let checkIns = [
            CheckIn(habitId: "maciek-gym", playerId: .maciek, date: "2026-10-12", pointsEarned: 40),
            CheckIn(habitId: "maciek-gym", playerId: .maciek, date: "2026-10-13", pointsEarned: 40),
            CheckIn(habitId: "maciek-gym", playerId: .maciek, date: "2026-10-14", pointsEarned: 40),
            CheckIn(habitId: "maciek-gym", playerId: .maciek, date: "2026-10-15", pointsEarned: 40),
        ]

        let streak = ScoreCalculator.calculateWeeklyHabitStreak(
            habit: gymHabit,
            checkIns: checkIns,
            today: "2026-10-15"
        )

        XCTAssertEqual(streak, 1)
    }
}
