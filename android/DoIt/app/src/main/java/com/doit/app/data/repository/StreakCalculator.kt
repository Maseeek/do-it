package com.doit.app.data.repository

import com.doit.app.model.CheckIn
import com.doit.app.model.Habit
import com.doit.app.model.PlayerId
import com.doit.app.model.RestDay
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

/**
 * Pre-indexed check-in structure to avoid O(H * N) repeated passes and LocalDate parsing.
 */
data class CheckInIndex(
    val datesByHabit: Map<String, Set<String>>,
    val weeklyCompletionsByHabit: Map<String, Map<String, Int>>,
    val datesByPlayer: Map<PlayerId, Set<String>>
)

object StreakCalculator {

    fun buildIndex(checkIns: List<CheckIn>): CheckInIndex {
        val datesByHabit = mutableMapOf<String, MutableSet<String>>()
        val weeklyCompletionsByHabit = mutableMapOf<String, MutableMap<String, MutableSet<String>>>()
        val datesByPlayer = mutableMapOf<PlayerId, MutableSet<String>>()

        // Cache parsed week mondays to avoid duplicate LocalDate parsing
        val dateToMondayMap = mutableMapOf<String, String>()

        for (checkIn in checkIns) {
            datesByHabit.getOrPut(checkIn.habitId) { mutableSetOf() }.add(checkIn.date)
            datesByPlayer.getOrPut(checkIn.playerId) { mutableSetOf() }.add(checkIn.date)

            val weekMondayStr = dateToMondayMap.getOrPut(checkIn.date) {
                try {
                    val d = LocalDate.parse(checkIn.date)
                    d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString()
                } catch (e: Exception) {
                    checkIn.date
                }
            }

            val habitWeeks = weeklyCompletionsByHabit.getOrPut(checkIn.habitId) { mutableMapOf() }
            habitWeeks.getOrPut(weekMondayStr) { mutableSetOf() }.add(checkIn.date)
        }

        val simplifiedWeekly = weeklyCompletionsByHabit.mapValues { entry ->
            entry.value.mapValues { it.value.size }
        }

        return CheckInIndex(datesByHabit, simplifiedWeekly, datesByPlayer)
    }

    fun calculateHabitStreak(
        habit: Habit,
        checkIns: List<CheckIn>,
        restDays: List<RestDay> = emptyList(),
        today: LocalDate = LocalDate.now(),
        index: CheckInIndex? = null
    ): Int {
        val target = habit.weeklyTargetDays
        if (target != null && target > 0) {
            return calculateWeeklyHabitStreak(habit, checkIns, today, index)
        }

        val completedDates = index?.datesByHabit?.get(habit.id) ?: checkIns
            .filter { it.habitId == habit.id }
            .map { it.date }
            .toSet()

        if (completedDates.isEmpty()) return 0

        val playerRestDates = restDays
            .filter { it.playerId == habit.playerId }
            .map { it.date }
            .toSet()

        val todayStr = today.toString()
        var checkDate = today

        // If today is neither completed nor a rest day, start checking from yesterday
        val todayCovered = completedDates.contains(todayStr) || playerRestDates.contains(todayStr)
        if (!todayCovered) {
            checkDate = today.minusDays(1)
        }

        var streak = 0
        for (i in 0 until 365) {
            val dateStr = checkDate.toString()
            if (completedDates.contains(dateStr)) {
                streak++
                checkDate = checkDate.minusDays(1)
            } else if (playerRestDates.contains(dateStr)) {
                // Rest day preserves the habit streak without penalty
                checkDate = checkDate.minusDays(1)
            } else {
                break
            }
        }
        return streak
    }

    fun calculateWeeklyHabitStreak(
        habit: Habit,
        checkIns: List<CheckIn>,
        today: LocalDate = LocalDate.now(),
        index: CheckInIndex? = null
    ): Int {
        val target = habit.weeklyTargetDays ?: return 0
        if (target <= 0) return 0

        val currentMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val currentMondayStr = currentMonday.toString()

        val weeklyCounts = index?.weeklyCompletionsByHabit?.get(habit.id)
            ?: run {
                val completionsByWeek = mutableMapOf<String, MutableSet<String>>()
                for (checkIn in checkIns) {
                    if (checkIn.habitId != habit.id) continue
                    val date = LocalDate.parse(checkIn.date)
                    val weekMonday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString()
                    completionsByWeek.getOrPut(weekMonday) { mutableSetOf() }.add(checkIn.date)
                }
                completionsByWeek.mapValues { it.value.size }
            }

        var streak = 0
        val currentWeekCompletions = weeklyCounts[currentMondayStr] ?: 0
        if (currentWeekCompletions >= target) {
            streak++
        }

        for (i in 1..52) {
            val prevMondayStr = currentMonday.minusWeeks(i.toLong()).toString()
            val prevCompletions = weeklyCounts[prevMondayStr] ?: 0
            if (prevCompletions >= target) {
                streak++
            } else {
                break
            }
        }

        return streak
    }

    fun calculateOverallPlayerStreak(
        playerId: PlayerId,
        checkIns: List<CheckIn>,
        restDays: List<RestDay> = emptyList(),
        today: LocalDate = LocalDate.now(),
        index: CheckInIndex? = null
    ): Int {
        val activeDates = index?.datesByPlayer?.get(playerId) ?: checkIns
            .filter { it.playerId == playerId }
            .map { it.date }
            .toSet()

        if (activeDates.isEmpty()) return 0

        val playerRestDates = restDays
            .filter { it.playerId == playerId }
            .map { it.date }
            .toSet()

        val todayStr = today.toString()
        var checkDate = today
        val todayCovered = activeDates.contains(todayStr) || playerRestDates.contains(todayStr)
        if (!todayCovered) {
            checkDate = today.minusDays(1)
        }

        var streak = 0
        for (i in 0 until 365) {
            val dateStr = checkDate.toString()
            if (activeDates.contains(dateStr)) {
                streak++
                checkDate = checkDate.minusDays(1)
            } else if (playerRestDates.contains(dateStr)) {
                // Rest day preserves active streak
                checkDate = checkDate.minusDays(1)
            } else {
                break
            }
        }
        return streak
    }
}
