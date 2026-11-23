package com.doit.app.data.repository

import com.doit.app.model.*
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters
import kotlin.math.min

object BadgeCalculator {

    val BADGE_DEFINITIONS: List<BadgeDefinition> = listOf(
        BadgeDefinition(
            id = "first_checkin",
            title = "First Flame",
            description = "Complete your first habit check-in",
            icon = "Zap",
            targetCount = 1,
            category = BadgeTypeCategory.STREAK
        ),
        BadgeDefinition(
            id = "perfect_par",
            title = "Daily Par Master",
            description = "Score 240+ points in a single day",
            icon = "Trophy",
            targetCount = 240,
            category = BadgeTypeCategory.PARITY
        ),
        BadgeDefinition(
            id = "streak_3",
            title = "Three-Day Spark",
            description = "Maintain a 3-day active habit streak",
            icon = "Flame",
            targetCount = 3,
            category = BadgeTypeCategory.STREAK
        ),
        BadgeDefinition(
            id = "streak_7",
            title = "Weekly Inferno",
            description = "Maintain a 7-day uninterrupted streak",
            icon = "Flame",
            targetCount = 7,
            category = BadgeTypeCategory.STREAK
        ),
        BadgeDefinition(
            id = "streak_14",
            title = "Fortnight Titan",
            description = "Reach a legendary 14-day streak",
            icon = "Sparkles",
            targetCount = 14,
            category = BadgeTypeCategory.STREAK
        ),
        BadgeDefinition(
            id = "reading_100",
            title = "Centurion Reader",
            description = "Read 100 cumulative book pages",
            icon = "BookOpen",
            targetCount = 100,
            category = BadgeTypeCategory.READING
        ),
        BadgeDefinition(
            id = "clean_space_sentinel",
            title = "Clean Space Sentinel",
            description = "Submit 5 Clean Space check-ins with photo proof",
            icon = "Camera",
            targetCount = 5,
            category = BadgeTypeCategory.PROOF
        ),
        BadgeDefinition(
            id = "gym_par",
            title = "Iron Discipline",
            description = "Hit 4 gym workouts in a single calendar week",
            icon = "Dumbbell",
            targetCount = 4,
            category = BadgeTypeCategory.MASTERY
        ),
        BadgeDefinition(
            id = "polyglot",
            title = "Polyglot Duelist",
            description = "Log 7 language learning sessions",
            icon = "Globe",
            targetCount = 7,
            category = BadgeTypeCategory.MASTERY
        ),
        BadgeDefinition(
            id = "deep_worker",
            title = "Deep Work Architect",
            description = "Complete 7 Personal Project deep work sessions",
            icon = "Code",
            targetCount = 7,
            category = BadgeTypeCategory.MASTERY
        ),
        BadgeDefinition(
            id = "iron_couple",
            title = "Iron Couple Synergy",
            description = "Both Maciek & Myrna score 240 Par on the exact same day",
            icon = "HeartHandshake",
            targetCount = 1,
            category = BadgeTypeCategory.COMPETITION
        ),
        BadgeDefinition(
            id = "stake_champion",
            title = "Stake Champion",
            description = "Win a weekly or monthly duel wager",
            icon = "Award",
            targetCount = 1,
            category = BadgeTypeCategory.COMPETITION
        )
    )

    fun calculateBadges(
        playerId: PlayerId,
        checkIns: List<CheckIn>,
        habits: List<Habit>,
        stakes: List<Stake>,
        currentStreak: Int
    ): List<PlayerBadgeStatus> {
        val partnerId = playerId.partner
        val readingHabits = habits.filter { it.playerId == playerId && (it.isQuantitative || it.category == HabitCategory.INTELLECT) }.map { it.id }.toSet()
        val cleanHabits = habits.filter { it.playerId == playerId && it.category == HabitCategory.ENVIRONMENT }.map { it.id }.toSet()
        val gymHabits = habits.filter { it.playerId == playerId && it.category == HabitCategory.PHYSICAL }.map { it.id }.toSet()
        val langHabits = habits.filter { it.playerId == playerId && it.category == HabitCategory.LANGUAGE }.map { it.id }.toSet()
        val deepWorkHabits = habits.filter { it.playerId == playerId && it.category == HabitCategory.DEEP_WORK }.map { it.id }.toSet()

        val dailyPlayerPoints = mutableMapOf<String, Int>()
        val dailyPartnerPoints = mutableMapOf<String, Int>()
        val weeklyGymCounts = mutableMapOf<String, Int>()

        var playerLogsCount = 0
        var totalPages = 0
        var cleanWithPhotoCount = 0
        var languageCount = 0
        var deepWorkCount = 0

        for (checkIn in checkIns) {
            if (checkIn.playerId == playerId) {
                playerLogsCount++
                dailyPlayerPoints[checkIn.date] = (dailyPlayerPoints[checkIn.date] ?: 0) + checkIn.pointsEarned

                if (readingHabits.contains(checkIn.habitId)) {
                    totalPages += checkIn.quantity ?: checkIn.pointsEarned
                }
                if (cleanHabits.contains(checkIn.habitId) && (checkIn.proofUrl != null || checkIn.proofUrls.isNotEmpty())) {
                    cleanWithPhotoCount++
                }
                if (gymHabits.contains(checkIn.habitId)) {
                    val date = LocalDate.parse(checkIn.date)
                    val weekMonday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString()
                    weeklyGymCounts[weekMonday] = (weeklyGymCounts[weekMonday] ?: 0) + 1
                }
                if (langHabits.contains(checkIn.habitId)) {
                    languageCount++
                }
                if (deepWorkHabits.contains(checkIn.habitId)) {
                    deepWorkCount++
                }
            } else if (checkIn.playerId == partnerId) {
                dailyPartnerPoints[checkIn.date] = (dailyPartnerPoints[checkIn.date] ?: 0) + checkIn.pointsEarned
            }
        }

        val maxDayPoints = dailyPlayerPoints.values.maxOrNull() ?: 0
        val maxGymInWeek = weeklyGymCounts.values.maxOrNull() ?: 0

        val bothHit240SameDay = dailyPlayerPoints.any { (date, pts) ->
            pts >= 240 && (dailyPartnerPoints[date] ?: 0) >= 240
        }

        val stakesWonCount = stakes.count {
            it.status == StakeStatus.COMPLETED && it.winnerId.equals(playerId.key, ignoreCase = true)
        }

        return BADGE_DEFINITIONS.map { badge ->
            val currentValue = when (badge.id) {
                "first_checkin" -> playerLogsCount
                "perfect_par" -> maxDayPoints
                "streak_3" -> currentStreak
                "streak_7" -> currentStreak
                "streak_14" -> currentStreak
                "reading_100" -> totalPages
                "clean_space_sentinel" -> cleanWithPhotoCount
                "gym_par" -> maxGymInWeek
                "polyglot" -> languageCount
                "deep_worker" -> deepWorkCount
                "iron_couple" -> if (bothHit240SameDay) 1 else 0
                "stake_champion" -> stakesWonCount
                else -> 0
            }

            val isUnlocked = currentValue >= badge.targetCount
            val progress = min(100, ((currentValue.toDouble() / badge.targetCount) * 100).toInt())

            PlayerBadgeStatus(
                badge = badge,
                isUnlocked = isUnlocked,
                progress = progress,
                currentValue = currentValue
            )
        }
    }
}
