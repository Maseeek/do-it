package com.doit.app

import com.doit.app.data.repository.ScoreCalculator
import com.doit.app.model.*
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class ScoreCalculatorTest {

    @Test
    fun `test daily par ceiling caps at 240`() {
        val date = "2026-10-12"
        val checkIns = listOf(
            CheckIn(id = "1", habitId = "h1", playerId = PlayerId.MACIEK, date = date, pointsEarned = 50, completedAt = ""),
            CheckIn(id = "2", habitId = "h2", playerId = PlayerId.MACIEK, date = date, pointsEarned = 100, completedAt = ""),
            CheckIn(id = "3", habitId = "h3", playerId = PlayerId.MACIEK, date = date, pointsEarned = 100, completedAt = "")
        )

        val rawPoints = ScoreCalculator.calculateRawDailyPoints(PlayerId.MACIEK, date, checkIns)
        assertEquals(250, rawPoints)

        val dailyPoints = ScoreCalculator.calculateDailyPoints(PlayerId.MACIEK, date, checkIns)
        assertEquals(240, dailyPoints) // Strictly capped at 240 ceiling!
    }

    @Test
    fun `test daily points under ceiling returns exact score`() {
        val date = "2026-10-12"
        val checkIns = listOf(
            CheckIn(id = "1", habitId = "h1", playerId = PlayerId.MACIEK, date = date, pointsEarned = 50, completedAt = ""),
            CheckIn(id = "2", habitId = "h2", playerId = PlayerId.MACIEK, date = date, pointsEarned = 40, completedAt = "")
        )

        val dailyPoints = ScoreCalculator.calculateDailyPoints(PlayerId.MACIEK, date, checkIns)
        assertEquals(90, dailyPoints)
    }

    @Test
    fun `test calculateDuelSummary tug of war split`() {
        val today = LocalDate.of(2026, 10, 14) // Wednesday
        val checkIns = listOf(
            CheckIn(id = "1", habitId = "h1", playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 150, completedAt = ""),
            CheckIn(id = "2", habitId = "h2", playerId = PlayerId.MYRNA, date = "2026-10-12", pointsEarned = 50, completedAt = "")
        )

        val summary = ScoreCalculator.calculateDuelSummary(
            checkIns = checkIns,
            scope = LeaderboardScope.WEEKLY,
            referenceDate = today
        )

        assertEquals(150, summary.maciekScore)
        assertEquals(50, summary.myrnaScore)
        assertEquals("maciek", summary.leader)
        assertEquals(100, summary.delta)
        assertEquals(0.75f, summary.maciekPct, 0.001f)
        assertEquals(0.25f, summary.myrnaPct, 0.001f)
    }

    @Test
    fun `test category breakdown comparison`() {
        val habits = listOf(
            Habit(id = "h1", playerId = PlayerId.MACIEK, title = "Sleep", category = HabitCategory.FOUNDATION, points = 50),
            Habit(id = "h2", playerId = PlayerId.MYRNA, title = "Sleep", category = HabitCategory.FOUNDATION, points = 50),
            Habit(id = "h3", playerId = PlayerId.MACIEK, title = "Gym", category = HabitCategory.PHYSICAL, points = 40)
        )
        val checkIns = listOf(
            CheckIn(id = "1", habitId = "h1", playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 50, completedAt = ""),
            CheckIn(id = "2", habitId = "h2", playerId = PlayerId.MYRNA, date = "2026-10-12", pointsEarned = 50, completedAt = ""),
            CheckIn(id = "3", habitId = "h3", playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 40, completedAt = "")
        )

        val breakdown = ScoreCalculator.getCategoryBreakdown(
            checkIns = checkIns,
            habits = habits,
            scope = LeaderboardScope.WEEKLY,
            referenceDate = LocalDate.of(2026, 10, 14)
        )

        val foundation = breakdown.first { it.category == HabitCategory.FOUNDATION }
        assertEquals(50, foundation.maciekPoints)
        assertEquals(50, foundation.myrnaPoints)
        assertEquals("tie", foundation.leader)

        val physical = breakdown.first { it.category == HabitCategory.PHYSICAL }
        assertEquals(40, physical.maciekPoints)
        assertEquals(0, physical.myrnaPoints)
        assertEquals("maciek", physical.leader)
    }

    @Test
    fun `test lifetime karma never resets`() {
        val checkIns = listOf(
            CheckIn(id = "1", habitId = "h1", playerId = PlayerId.MACIEK, date = "2025-01-01", pointsEarned = 100, completedAt = ""),
            CheckIn(id = "2", habitId = "h1", playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 150, completedAt = "")
        )

        val karma = ScoreCalculator.calculateKarma(PlayerId.MACIEK, checkIns)
        assertEquals(250, karma)
    }
}
