import XCTest
@testable import DoItKit

final class BadgeCalculatorTests: XCTestCase {
    private var maciekHabits: [Habit] = []

    override func setUp() {
        super.setUp()
        maciekHabits = HabitCatalog.defaultMaciekHabits
    }

    func testFirstCheckinBadge() {
        let checkIns = [
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-12", pointsEarned: 50)
        ]

        let badges = BadgeCalculator.calculatePlayerBadges(
            playerId: .maciek,
            checkIns: checkIns,
            habits: maciekHabits,
            stakes: [],
            currentStreak: 1
        )

        let first = badges.first { $0.badge.id == "first_checkin" }
        XCTAssertNotNil(first)
        XCTAssertTrue(first?.isUnlocked == true)
        XCTAssertEqual(first?.currentValue, 1)
        XCTAssertEqual(first?.progress, 100.0)
    }

    func testDailyParMasterBadgeAt240Points() {
        // Log 240 points on a single day
        let checkIns = [
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-12", pointsEarned: 50),
            CheckIn(habitId: "maciek-gym", playerId: .maciek, date: "2026-10-12", pointsEarned: 40),
            CheckIn(habitId: "maciek-sport", playerId: .maciek, date: "2026-10-12", pointsEarned: 30),
            CheckIn(habitId: "maciek-reading", playerId: .maciek, date: "2026-10-12", pointsEarned: 25),
            CheckIn(habitId: "maciek-project", playerId: .maciek, date: "2026-10-12", pointsEarned: 25),
            CheckIn(habitId: "maciek-skills", playerId: .maciek, date: "2026-10-12", pointsEarned: 25),
            CheckIn(habitId: "maciek-nutrition", playerId: .maciek, date: "2026-10-12", pointsEarned: 15),
            CheckIn(habitId: "maciek-clean", playerId: .maciek, date: "2026-10-12", pointsEarned: 15),
            CheckIn(habitId: "maciek-mind", playerId: .maciek, date: "2026-10-12", pointsEarned: 10),
            CheckIn(habitId: "maciek-language", playerId: .maciek, date: "2026-10-12", pointsEarned: 5),
        ] // Total = 240 pts!

        let badges = BadgeCalculator.calculatePlayerBadges(
            playerId: .maciek,
            checkIns: checkIns,
            habits: maciekHabits,
            stakes: [],
            currentStreak: 1
        )

        let parMaster = badges.first { $0.badge.id == "perfect_par" }
        XCTAssertNotNil(parMaster)
        XCTAssertTrue(parMaster?.isUnlocked == true)
        XCTAssertEqual(parMaster?.currentValue, 240)
        XCTAssertEqual(parMaster?.progress, 100.0)
    }

    func testStreakBadges() {
        let badgesAt3 = BadgeCalculator.calculatePlayerBadges(
            playerId: .maciek,
            checkIns: [],
            habits: maciekHabits,
            stakes: [],
            currentStreak: 3
        )
        XCTAssertTrue(badgesAt3.first { $0.badge.id == "streak_3" }?.isUnlocked == true)
        XCTAssertFalse(badgesAt3.first { $0.badge.id == "streak_7" }?.isUnlocked == true)

        let badgesAt7 = BadgeCalculator.calculatePlayerBadges(
            playerId: .maciek,
            checkIns: [],
            habits: maciekHabits,
            stakes: [],
            currentStreak: 7
        )
        XCTAssertTrue(badgesAt7.first { $0.badge.id == "streak_7" }?.isUnlocked == true)
        XCTAssertFalse(badgesAt7.first { $0.badge.id == "streak_14" }?.isUnlocked == true)

        let badgesAt14 = BadgeCalculator.calculatePlayerBadges(
            playerId: .maciek,
            checkIns: [],
            habits: maciekHabits,
            stakes: [],
            currentStreak: 14
        )
        XCTAssertTrue(badgesAt14.first { $0.badge.id == "streak_14" }?.isUnlocked == true)
    }

    func testCenturionReaderBadge() {
        // Read 4 days x 25 pages = 100 pages
        let checkIns = [
            CheckIn(habitId: "maciek-reading", playerId: .maciek, date: "2026-10-09", pointsEarned: 25, quantity: 25),
            CheckIn(habitId: "maciek-reading", playerId: .maciek, date: "2026-10-10", pointsEarned: 25, quantity: 25),
            CheckIn(habitId: "maciek-reading", playerId: .maciek, date: "2026-10-11", pointsEarned: 25, quantity: 25),
            CheckIn(habitId: "maciek-reading", playerId: .maciek, date: "2026-10-12", pointsEarned: 25, quantity: 25),
        ]

        let badges = BadgeCalculator.calculatePlayerBadges(
            playerId: .maciek,
            checkIns: checkIns,
            habits: maciekHabits,
            stakes: [],
            currentStreak: 4
        )

        let reader = badges.first { $0.badge.id == "reading_100" }
        XCTAssertNotNil(reader)
        XCTAssertTrue(reader?.isUnlocked == true)
        XCTAssertEqual(reader?.currentValue, 100)
    }

    func testCleanSpaceSentinelRequiresPhotos() {
        // 5 clean space check-ins, but only 4 have photos
        let checkIns = [
            CheckIn(habitId: "maciek-clean", playerId: .maciek, date: "2026-10-08", pointsEarned: 15, proofUrl: "photo1.jpg"),
            CheckIn(habitId: "maciek-clean", playerId: .maciek, date: "2026-10-09", pointsEarned: 15, proofUrl: "photo2.jpg"),
            CheckIn(habitId: "maciek-clean", playerId: .maciek, date: "2026-10-10", pointsEarned: 15, proofUrl: "photo3.jpg"),
            CheckIn(habitId: "maciek-clean", playerId: .maciek, date: "2026-10-11", pointsEarned: 15, proofUrl: "photo4.jpg"),
            CheckIn(habitId: "maciek-clean", playerId: .maciek, date: "2026-10-12", pointsEarned: 15, proofUrl: nil), // No photo!
        ]

        let badges = BadgeCalculator.calculatePlayerBadges(
            playerId: .maciek,
            checkIns: checkIns,
            habits: maciekHabits,
            stakes: [],
            currentStreak: 5
        )

        let cleanBadge = badges.first { $0.badge.id == "clean_space_sentinel" }
        XCTAssertEqual(cleanBadge?.currentValue, 4)
        XCTAssertFalse(cleanBadge?.isUnlocked == true)
    }

    func testIronCoupleSynergyBothHit240OnSameDay() {
        // Both Maciek and Myrna hit 240 Par on 2026-10-12
        let checkIns = [
            CheckIn(habitId: "maciek-sleep", playerId: .maciek, date: "2026-10-12", pointsEarned: 240),
            CheckIn(habitId: "myrna-sleep", playerId: .myrna, date: "2026-10-12", pointsEarned: 240),
        ]

        let badges = BadgeCalculator.calculatePlayerBadges(
            playerId: .maciek,
            checkIns: checkIns,
            habits: maciekHabits,
            stakes: [],
            currentStreak: 1
        )

        let ironCouple = badges.first { $0.badge.id == "iron_couple" }
        XCTAssertNotNil(ironCouple)
        XCTAssertTrue(ironCouple?.isUnlocked == true)
        XCTAssertEqual(ironCouple?.currentValue, 1)
    }

    func testStakeChampionBadge() {
        let stakes = [
            Stake(
                id: "stake-1",
                period: .weekly,
                periodKey: "2026-W40",
                title: "Dinner",
                description: "",
                status: .completed,
                winnerId: .player(.maciek),
                dueDate: "2026-10-11"
            )
        ]

        let badges = BadgeCalculator.calculatePlayerBadges(
            playerId: .maciek,
            checkIns: [],
            habits: maciekHabits,
            stakes: stakes,
            currentStreak: 0
        )

        let champion = badges.first { $0.badge.id == "stake_champion" }
        XCTAssertNotNil(champion)
        XCTAssertTrue(champion?.isUnlocked == true)
    }
}
