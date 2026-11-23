import Foundation

public struct HabitCatalogSection: Identifiable {
    public var id: String { title }
    public let title: String
    public let categories: [HabitCategory]
}

public enum HabitCatalog {
    public static let sections: [HabitCatalogSection] = [
        HabitCatalogSection(title: "Health", categories: [.foundation, .physical, .cardio, .nutrition]),
        HabitCatalogSection(title: "Education", categories: [.intellect, .language]),
        HabitCatalogSection(title: "Studying", categories: [.skills, .deep_work]),
        HabitCatalogSection(title: "Self-improvement", categories: [.mind, .environment]),
        HabitCatalogSection(title: "Finance", categories: [.finance])
    ]

    public static let defaultMaciekHabits: [Habit] = [
        Habit(
            id: "maciek-sleep",
            playerId: .maciek,
            title: "Sleep 8.5+ Hours",
            description: "Rest & recovery tracked via Apple Health / Wearable",
            category: .foundation,
            points: 50,
            iconName: "moon.fill",
            order: 1,
            isActive: true,
            automation: HabitAutomation(metric: .sleep, target: 8.5)
        ),
        Habit(
            id: "maciek-gym",
            playerId: .maciek,
            title: "Gym & Strength",
            description: "Heavy lifting or strength workout",
            category: .physical,
            points: 40,
            iconName: "dumbbell.fill",
            frequency: .weekly,
            weeklyTargetDays: 4,
            order: 2,
            isActive: true,
            automation: HabitAutomation(metric: .workout, target: 20)
        ),
        Habit(
            id: "maciek-sport",
            playerId: .maciek,
            title: "Basketball or Run",
            description: "High intensity cardio or basketball",
            category: .cardio,
            points: 30,
            iconName: "flame.fill",
            frequency: .weekly,
            weeklyTargetDays: 3,
            order: 3,
            isActive: true,
            automation: HabitAutomation(metric: .cardio, target: 20)
        ),
        Habit(
            id: "maciek-reading",
            playerId: .maciek,
            title: "Read Books",
            description: "1 point per page read (up to 25 pts maximum)",
            category: .intellect,
            points: 25,
            iconName: "book.fill",
            isQuantitative: true,
            quantityUnit: "pages",
            maxQuantity: 25,
            pointsPerUnit: 1,
            order: 4,
            isActive: true
        ),
        Habit(
            id: "maciek-project",
            playerId: .maciek,
            title: "Personal Project",
            description: "Deep work building tangible product / code",
            category: .deep_work,
            points: 25,
            iconName: "chevron.left.forwardslash.chevron.right",
            order: 5,
            isActive: true
        ),
        Habit(
            id: "maciek-skills",
            playerId: .maciek,
            title: "Skills (Design / Code / Maths)",
            description: "30m deliberate craft practice",
            category: .skills,
            points: 25,
            iconName: "scope",
            order: 6,
            isActive: true
        ),
        Habit(
            id: "maciek-nutrition",
            playerId: .maciek,
            title: "Eat Healthy",
            description: "Whole foods, balanced nutrition, zero junk",
            category: .nutrition,
            points: 15,
            iconName: "fork.knife",
            order: 7,
            isActive: true
        ),
        Habit(
            id: "maciek-clean",
            playerId: .maciek,
            title: "Clean Space",
            description: "Organized and clean living/working environment",
            category: .environment,
            points: 15,
            iconName: "sparkles",
            requiresProof: true,
            order: 8,
            isActive: true
        ),
        Habit(
            id: "maciek-mind",
            playerId: .maciek,
            title: "Prayer & Meditation",
            description: "Spiritual stillness and mental grounding",
            category: .mind,
            points: 10,
            iconName: "brain.head.profile",
            order: 9,
            isActive: true
        ),
        Habit(
            id: "maciek-language",
            playerId: .maciek,
            title: "Swedish (Duolingo / Speaking)",
            description: "Duolingo lesson or conversational practice with Myrna",
            category: .language,
            points: 5,
            iconName: "globe.europe.africa.fill",
            order: 10,
            isActive: true
        )
    ]

    public static let defaultMyrnaHabits: [Habit] = [
        Habit(
            id: "myrna-sleep",
            playerId: .myrna,
            title: "Sleep 8.5+ Hours",
            description: "Rest & recovery tracked via Apple Health / Wearable",
            category: .foundation,
            points: 50,
            iconName: "moon.fill",
            order: 1,
            isActive: true,
            automation: HabitAutomation(metric: .sleep, target: 8.5)
        ),
        Habit(
            id: "myrna-gym",
            playerId: .myrna,
            title: "Gym & Strength",
            description: "Strength workout at The Gym Group / session",
            category: .physical,
            points: 40,
            iconName: "dumbbell.fill",
            frequency: .weekly,
            weeklyTargetDays: 4,
            order: 2,
            isActive: true,
            automation: HabitAutomation(metric: .workout, target: 20)
        ),
        Habit(
            id: "myrna-sport",
            playerId: .myrna,
            title: "Running",
            description: "Outdoor or treadmill run",
            category: .cardio,
            points: 30,
            iconName: "figure.run",
            frequency: .weekly,
            weeklyTargetDays: 3,
            order: 3,
            isActive: true,
            automation: HabitAutomation(metric: .cardio, target: 20)
        ),
        Habit(
            id: "myrna-reading",
            playerId: .myrna,
            title: "Read Books",
            description: "1 point per page read (up to 25 pts maximum)",
            category: .intellect,
            points: 25,
            iconName: "book.fill",
            isQuantitative: true,
            quantityUnit: "pages",
            maxQuantity: 25,
            pointsPerUnit: 1,
            order: 4,
            isActive: true
        ),
        Habit(
            id: "myrna-project",
            playerId: .myrna,
            title: "Personal Project",
            description: "Dedicated progress on personal creative project",
            category: .deep_work,
            points: 25,
            iconName: "briefcase.fill",
            order: 5,
            isActive: true
        ),
        Habit(
            id: "myrna-skills",
            playerId: .myrna,
            title: "Skills (Design / Craft / Learning)",
            description: "30m focused practice expanding skill set",
            category: .skills,
            points: 25,
            iconName: "scope",
            order: 6,
            isActive: true
        ),
        Habit(
            id: "myrna-nutrition",
            playerId: .myrna,
            title: "Eat Healthy",
            description: "Clean whole nutrition and fueling well",
            category: .nutrition,
            points: 15,
            iconName: "fork.knife",
            order: 7,
            isActive: true
        ),
        Habit(
            id: "myrna-clean",
            playerId: .myrna,
            title: "Clean Space",
            description: "Tidy, organized personal space & bedroom",
            category: .environment,
            points: 15,
            iconName: "sparkles",
            requiresProof: true,
            order: 8,
            isActive: true
        ),
        Habit(
            id: "myrna-mind",
            playerId: .myrna,
            title: "Meditate & Red Light",
            description: "Mindfulness session and rejuvenation",
            category: .mind,
            points: 10,
            iconName: "sun.max.fill",
            order: 9,
            isActive: true
        ),
        Habit(
            id: "myrna-language",
            playerId: .myrna,
            title: "Polish (Duolingo / Speaking)",
            description: "Duolingo lesson or conversational practice with Maciek",
            category: .language,
            points: 5,
            iconName: "globe.europe.africa.fill",
            order: 10,
            isActive: true
        )
    ]

    public static func defaultStakes() -> [Stake] {
        let today = DateUtils.todayDateString()
        let currentWeek = DateUtils.getWeekKey(for: today)
        let currentMonth = DateUtils.getMonthKey(for: today)

        return [
            Stake(
                id: "stake-week-current",
                period: .weekly,
                periodKey: currentWeek,
                title: "Sunday Dinner Date 🍕",
                description: "Winner chooses restaurant, loser picks up the tab!",
                status: .active,
                dueDate: today
            ),
            Stake(
                id: "stake-month-current",
                period: .monthly,
                periodKey: currentMonth,
                title: "Full Day Spa & Thermal Bath 🧖‍♀️",
                description: "Grand monthly reward: Luxury relaxation day funded by loser.",
                status: .active,
                dueDate: today
            )
        ]
    }

    public static func weeklySessions(for habit: Habit) -> Int {
        if habit.frequency == .weekly || habit.weeklyTargetDays != nil {
            return min(7, max(1, habit.weeklyTargetDays ?? 1))
        }
        return 7
    }

    public static func maximumHabitPoints(for habit: Habit) -> Int {
        if habit.isQuantitative {
            let maxQty = habit.maxQuantity ?? 25
            let ppu = habit.pointsPerUnit ?? 1
            return min(100, maxQty * ppu)
        }
        return min(100, habit.points)
    }

    public static func weeklyPointPotential(habits: [Habit]) -> Int {
        habits
            .filter { $0.isActive }
            .reduce(0) { sum, habit in
                sum + (habit.points * weeklySessions(for: habit))
            }
    }

    public static func dailyParPoints(habits: [Habit]) -> Int {
        habits
            .filter { $0.isActive }
            .reduce(0) { sum, habit in
                sum + habit.points
            }
    }

    /// Asymmetric Habit Parity Balancer:
    /// Adjusts active habit points to exactly equal a target (e.g. 240 Daily Par)
    /// while minimizing deviation from original weights.
    public static func balanceHabitPlan(habits: [Habit], target: Int = 240) -> [Habit]? {
        let active = habits.filter { $0.isActive }
        guard !active.isEmpty, target > 0 else { return nil }

        let n = active.count
        let minPoints = 5
        let maxPoints = 50

        if target < n * minPoints || target > n * maxPoints {
            return nil
        }

        // Proportional distribution with integer rounding
        let currentSum = active.reduce(0) { $0 + $1.points }
        if currentSum == 0 { return nil }

        var newPoints = active.map { habit -> Int in
            let scaled = Double(habit.points) / Double(currentSum) * Double(target)
            return max(minPoints, min(maxPoints, Int(round(scaled))))
        }

        var diff = target - newPoints.reduce(0, +)
        var i = 0
        while diff != 0 && i < 1000 {
            let idx = i % n
            if diff > 0 && newPoints[idx] < maxPoints {
                newPoints[idx] += 1
                diff -= 1
            } else if diff < 0 && newPoints[idx] > minPoints {
                newPoints[idx] -= 1
                diff += 1
            }
            i += 1
        }

        var activeIdx = 0
        return habits.map { habit in
            if habit.isActive {
                var copy = habit
                copy.points = newPoints[activeIdx]
                activeIdx += 1
                return copy
            }
            return habit
        }
    }
}
