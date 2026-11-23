package com.doit.app

import com.doit.app.data.repository.StreakCalculator
import com.doit.app.model.*
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate

class StreakCalculatorTest {

    private val testHabit = Habit(
        id = "habit-1",
        playerId = PlayerId.MACIEK,
        title = "Meditation",
        category = HabitCategory.MIND,
        points = 10
    )

    @Test
    fun `test consecutive days streak increments`() {
        val today = LocalDate.of(2026, 10, 12)
        val checkIns = listOf(
            CheckIn(id = "1", habitId = testHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 10, completedAt = ""),
            CheckIn(id = "2", habitId = testHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-11", pointsEarned = 10, completedAt = ""),
            CheckIn(id = "3", habitId = testHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-10", pointsEarned = 10, completedAt = "")
        )

        val streak = StreakCalculator.calculateHabitStreak(testHabit, checkIns, emptyList(), today)
        assertEquals(3, streak)
    }

    @Test
    fun `test rest day preserves streak without adding points`() {
        val today = LocalDate.of(2026, 10, 12)
        val checkIns = listOf(
            CheckIn(id = "1", habitId = testHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 10, completedAt = ""),
            // 2026-10-11 was a rest day!
            CheckIn(id = "3", habitId = testHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-10", pointsEarned = 10, completedAt = "")
        )
        val restDays = listOf(
            RestDay(id = "r1", playerId = PlayerId.MACIEK, date = "2026-10-11", createdAt = "")
        )

        val streak = StreakCalculator.calculateHabitStreak(testHabit, checkIns, restDays, today)
        // 2026-10-12 (1) + 2026-10-11 (preserved) + 2026-10-10 (1) = 2 active completions maintained
        assertEquals(2, streak)
    }

    @Test
    fun `test missed day without rest day breaks streak`() {
        val today = LocalDate.of(2026, 10, 12)
        val checkIns = listOf(
            CheckIn(id = "1", habitId = testHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 10, completedAt = ""),
            // 2026-10-11 missed!
            CheckIn(id = "3", habitId = testHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-10", pointsEarned = 10, completedAt = "")
        )

        val streak = StreakCalculator.calculateHabitStreak(testHabit, checkIns, emptyList(), today)
        assertEquals(1, streak)
    }

    @Test
    fun `test weekly target habit streak calculation`() {
        val weeklyHabit = Habit(
            id = "habit-gym",
            playerId = PlayerId.MACIEK,
            title = "Gym",
            category = HabitCategory.PHYSICAL,
            points = 40,
            frequency = HabitFrequency.WEEKLY,
            weeklyTargetDays = 4
        )

        // Today is Sunday 2026-10-18
        val today = LocalDate.of(2026, 10, 18)
        val checkIns = listOf(
            // Week 1: 4 sessions (target met)
            CheckIn(id = "1", habitId = weeklyHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 40, completedAt = ""),
            CheckIn(id = "2", habitId = weeklyHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-14", pointsEarned = 40, completedAt = ""),
            CheckIn(id = "3", habitId = weeklyHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-16", pointsEarned = 40, completedAt = ""),
            CheckIn(id = "4", habitId = weeklyHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-17", pointsEarned = 40, completedAt = ""),
            // Week 0 (prev week): 4 sessions (target met)
            CheckIn(id = "5", habitId = weeklyHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-05", pointsEarned = 40, completedAt = ""),
            CheckIn(id = "6", habitId = weeklyHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-07", pointsEarned = 40, completedAt = ""),
            CheckIn(id = "7", habitId = weeklyHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-09", pointsEarned = 40, completedAt = ""),
            CheckIn(id = "8", habitId = weeklyHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-10", pointsEarned = 40, completedAt = "")
        )

        val streak = StreakCalculator.calculateWeeklyHabitStreak(weeklyHabit, checkIns, today)
        assertEquals(2, streak)
    }
}
