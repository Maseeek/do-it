package com.doit.app.data.repository

import com.doit.app.model.*
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters
import kotlin.math.abs

object HabitCatalog {

    val INITIAL_PLAYERS: Map<PlayerId, Player> = mapOf(
        PlayerId.MACIEK to Player(
            id = PlayerId.MACIEK,
            name = "Maciek",
            avatar = "⚡",
            colorId = PlayerColorId.BLUE,
            inviteCount = 0
        ),
        PlayerId.MYRNA to Player(
            id = PlayerId.MYRNA,
            name = "Myrna",
            avatar = "✨",
            colorId = PlayerColorId.PURPLE,
            inviteCount = 0
        )
    )

    fun getInitialHabits(duelId: String = "local-duel-1"): List<Habit> {
        return listOf(
            // --- Maciek's 10 Calibrated Habits ---
            Habit(
                id = "maciek-sleep",
                playerId = PlayerId.MACIEK,
                title = "Sleep 8.5+ Hours",
                description = "Rest & recovery tracked via Health Connect / Wearable",
                category = HabitCategory.FOUNDATION,
                points = 50,
                iconName = "Moon",
                order = 1,
                isActive = true,
                automation = HabitAutomation(HealthMetric.SLEEP, 8.5)
            ),
            Habit(
                id = "maciek-gym",
                playerId = PlayerId.MACIEK,
                title = "Gym & Strength",
                description = "Heavy lifting or strength workout",
                category = HabitCategory.PHYSICAL,
                points = 40,
                iconName = "Dumbbell",
                frequency = HabitFrequency.WEEKLY,
                weeklyTargetDays = 4,
                order = 2,
                isActive = true,
                automation = HabitAutomation(HealthMetric.WORKOUT, 20.0)
            ),
            Habit(
                id = "maciek-sport",
                playerId = PlayerId.MACIEK,
                title = "Basketball or Run",
                description = "High intensity cardio or basketball match",
                category = HabitCategory.CARDIO,
                points = 30,
                iconName = "Flame",
                frequency = HabitFrequency.WEEKLY,
                weeklyTargetDays = 3,
                order = 3,
                isActive = true,
                automation = HabitAutomation(HealthMetric.CARDIO, 20.0)
            ),
            Habit(
                id = "maciek-reading",
                playerId = PlayerId.MACIEK,
                title = "Read Books",
                description = "1 point per page read (up to 25 pts max)",
                category = HabitCategory.INTELLECT,
                points = 25,
                iconName = "BookOpen",
                isQuantitative = true,
                quantityUnit = "pages",
                maxQuantity = 25,
                pointsPerUnit = 1,
                order = 4,
                isActive = true
            ),
            Habit(
                id = "maciek-project",
                playerId = PlayerId.MACIEK,
                title = "Personal Project",
                description = "Deep work building tangible product / code",
                category = HabitCategory.DEEP_WORK,
                points = 25,
                iconName = "Code",
                order = 5,
                isActive = true
            ),
            Habit(
                id = "maciek-skills",
                playerId = PlayerId.MACIEK,
                title = "Skills (Design / Code / Maths)",
                description = "30m deliberate craft practice",
                category = HabitCategory.SKILLS,
                points = 25,
                iconName = "Target",
                order = 6,
                isActive = true
            ),
            Habit(
                id = "maciek-nutrition",
                playerId = PlayerId.MACIEK,
                title = "Eat Healthy",
                description = "Whole foods, balanced nutrition, zero junk snacking",
                category = HabitCategory.NUTRITION,
                points = 15,
                iconName = "Apple",
                order = 7,
                isActive = true
            ),
            Habit(
                id = "maciek-clean",
                playerId = PlayerId.MACIEK,
                title = "Clean Space",
                description = "Organized and clean living/working environment",
                category = HabitCategory.ENVIRONMENT,
                points = 15,
                iconName = "CheckCircle2",
                requiresProof = true,
                order = 8,
                isActive = true
            ),
            Habit(
                id = "maciek-mind",
                playerId = PlayerId.MACIEK,
                title = "Prayer & Meditation",
                description = "Spiritual stillness and mental grounding",
                category = HabitCategory.MIND,
                points = 10,
                iconName = "Sparkles",
                order = 9,
                isActive = true
            ),
            Habit(
                id = "maciek-language",
                playerId = PlayerId.MACIEK,
                title = "Swedish (Duolingo / Speaking)",
                description = "Duolingo lesson or conversational practice with Myrna",
                category = HabitCategory.LANGUAGE,
                points = 5,
                iconName = "Globe",
                order = 10,
                isActive = true
            ),

            // --- Myrna's 10 Calibrated Habits ---
            Habit(
                id = "myrna-sleep",
                playerId = PlayerId.MYRNA,
                title = "Sleep 8.5+ Hours",
                description = "Rest & recovery tracked via Health Connect / Wearable",
                category = HabitCategory.FOUNDATION,
                points = 50,
                iconName = "Moon",
                order = 1,
                isActive = true,
                automation = HabitAutomation(HealthMetric.SLEEP, 8.5)
            ),
            Habit(
                id = "myrna-gym",
                playerId = PlayerId.MYRNA,
                title = "Gym & Strength",
                description = "Workout at The Gym Group / strength training",
                category = HabitCategory.PHYSICAL,
                points = 40,
                iconName = "Dumbbell",
                frequency = HabitFrequency.WEEKLY,
                weeklyTargetDays = 4,
                order = 2,
                isActive = true,
                automation = HabitAutomation(HealthMetric.WORKOUT, 20.0)
            ),
            Habit(
                id = "myrna-sport",
                playerId = PlayerId.MYRNA,
                title = "Running",
                description = "Outdoor or treadmill run",
                category = HabitCategory.CARDIO,
                points = 30,
                iconName = "Footprints",
                frequency = HabitFrequency.WEEKLY,
                weeklyTargetDays = 3,
                order = 3,
                isActive = true,
                automation = HabitAutomation(HealthMetric.CARDIO, 20.0)
            ),
            Habit(
                id = "myrna-reading",
                playerId = PlayerId.MYRNA,
                title = "Read Books",
                description = "1 point per page read (up to 25 pts max)",
                category = HabitCategory.INTELLECT,
                points = 25,
                iconName = "BookOpen",
                isQuantitative = true,
                quantityUnit = "pages",
                maxQuantity = 25,
                pointsPerUnit = 1,
                order = 4,
                isActive = true
            ),
            Habit(
                id = "myrna-project",
                playerId = PlayerId.MYRNA,
                title = "Personal Project",
                description = "Dedicated progress on personal creative/work project",
                category = HabitCategory.DEEP_WORK,
                points = 25,
                iconName = "Briefcase",
                order = 5,
                isActive = true
            ),
            Habit(
                id = "myrna-skills",
                playerId = PlayerId.MYRNA,
                title = "Skills (Design / Craft / Learning)",
                description = "30m focused practice expanding skill set",
                category = HabitCategory.SKILLS,
                points = 25,
                iconName = "Target",
                order = 6,
                isActive = true
            ),
            Habit(
                id = "myrna-nutrition",
                playerId = PlayerId.MYRNA,
                title = "Eat Healthy",
                description = "Clean whole nutrition and fueling the body well",
                category = HabitCategory.NUTRITION,
                points = 15,
                iconName = "Apple",
                order = 7,
                isActive = true
            ),
            Habit(
                id = "myrna-clean",
                playerId = PlayerId.MYRNA,
                title = "Clean Space",
                description = "Tidy, organized personal space & bedroom",
                category = HabitCategory.ENVIRONMENT,
                points = 15,
                iconName = "CheckCircle2",
                requiresProof = true,
                order = 8,
                isActive = true
            ),
            Habit(
                id = "myrna-mind",
                playerId = PlayerId.MYRNA,
                title = "Meditate & Red Light",
                description = "Mindfulness session and red light rejuvenation",
                category = HabitCategory.MIND,
                points = 10,
                iconName = "Sun",
                order = 9,
                isActive = true
            ),
            Habit(
                id = "myrna-language",
                playerId = PlayerId.MYRNA,
                title = "Polish (Duolingo / Speaking)",
                description = "Duolingo lesson or conversational practice with Maciek",
                category = HabitCategory.LANGUAGE,
                points = 5,
                iconName = "Globe",
                order = 10,
                isActive = true
            )
        )
    }

    fun getInitialStakes(): List<Stake> {
        val today = LocalDate.now().toString()
        return listOf(
            Stake(
                id = "stake-week-current",
                period = StakePeriod.WEEKLY,
                periodKey = "current-week",
                title = "Sunday Dinner Date 🍕",
                description = "Winner chooses favorite restaurant, loser picks up the tab!",
                status = StakeStatus.ACTIVE,
                dueDate = today
            ),
            Stake(
                id = "stake-month-current",
                period = StakePeriod.MONTHLY,
                periodKey = "current-month",
                title = "Full Day Spa & Thermal Bath 🧖‍♀️",
                description = "Grand monthly reward: Luxury relaxation day funded by the loser.",
                status = StakeStatus.ACTIVE,
                dueDate = today
            ),
            Stake(
                id = "stake-week-prev-1",
                period = StakePeriod.WEEKLY,
                periodKey = "prev-week-1",
                title = "Coffee & Cinnamon Buns ☕",
                description = "Winner gets freshly brewed flat white and bakery treats delivered in bed.",
                status = StakeStatus.COMPLETED,
                winnerId = "myrna",
                dueDate = today
            ),
            Stake(
                id = "stake-week-prev-2",
                period = StakePeriod.WEEKLY,
                periodKey = "prev-week-2",
                title = "Gourmet Ramen Night 🍜",
                description = "Loser books table and covers dinner at the top ramen spot in town.",
                status = StakeStatus.COMPLETED,
                winnerId = "maciek",
                dueDate = today
            )
        )
    }

    fun weeklySessions(habit: Habit): Int {
        return if (habit.frequency == HabitFrequency.WEEKLY || habit.weeklyTargetDays != null) {
            (habit.weeklyTargetDays ?: 1).coerceIn(1, 7)
        } else {
            7
        }
    }

    fun weeklyPointPotential(habits: List<Habit>): Int {
        return habits.filter { it.isActive }.sumOf { it.points * weeklySessions(it) }
    }

    /**
     * Balances habit plan weights using dynamic programming to hit exact target weekly point potential.
     */
    fun balanceHabitPlan(habits: List<Habit>, target: Int): List<Habit>? {
        val active = habits.filter { it.isActive }
        if (active.isEmpty() || target <= 0) return null

        val sessions = active.map { weeklySessions(it) }
        val minimums = active.map { 5 * weeklySessions(it) }
        val maximums = active.map { 100 * weeklySessions(it) }

        val totalMin = minimums.sum()
        val totalMax = maximums.sum()
        if (target < totalMin || target > totalMax) return null

        data class Candidate(val cost: Int, val weights: List<Int>)
        var reachable = mutableMapOf<Int, Candidate>()
        reachable[0] = Candidate(0, emptyList())

        active.forEachIndexed { index, habit ->
            val next = mutableMapOf<Int, Candidate>()
            val remainingMin = minimums.drop(index + 1).sum()
            val remainingMax = maximums.drop(index + 1).sum()
            val sess = sessions[index]

            for ((sum, candidate) in reachable) {
                for (points in 5..100) {
                    val nextSum = sum + points * sess
                    if (nextSum + remainingMin > target || nextSum + remainingMax < target) continue
                    val cost = candidate.cost + abs(points - habit.points)
                    val existing = next[nextSum]
                    if (existing == null || cost < existing.cost) {
                        next[nextSum] = Candidate(cost, candidate.weights + points)
                    }
                }
            }
            reachable = next
        }

        val bestWeights = reachable[target]?.weights ?: return null
        var weightIndex = 0
        return habits.map { habit ->
            if (habit.isActive) {
                habit.copy(points = bestWeights[weightIndex++])
            } else {
                habit
            }
        }
    }
}
