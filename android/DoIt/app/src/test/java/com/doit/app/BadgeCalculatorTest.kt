package com.doit.app

import com.doit.app.data.repository.BadgeCalculator
import com.doit.app.data.repository.HabitCatalog
import com.doit.app.model.*
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BadgeCalculatorTest {

    private val habits = HabitCatalog.getInitialHabits()

    @Test
    fun `test first_checkin badge unlocks on 1st completion`() {
        val checkIns = listOf(
            CheckIn(id = "1", habitId = "maciek-sleep", playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 50, completedAt = "")
        )

        val badges = BadgeCalculator.calculateBadges(
            playerId = PlayerId.MACIEK,
            checkIns = checkIns,
            habits = habits,
            stakes = emptyList(),
            currentStreak = 1
        )

        val firstBadge = badges.first { it.badge.id == "first_checkin" }
        assertTrue(firstBadge.isUnlocked)
        assertEquals(1, firstBadge.currentValue)
        assertEquals(100, firstBadge.progress)
    }

    @Test
    fun `test perfect_par badge unlocks when single day score is 240+`() {
        val checkIns = listOf(
            CheckIn(id = "1", habitId = "h1", playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 100, completedAt = ""),
            CheckIn(id = "2", habitId = "h2", playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 140, completedAt = "")
        )

        val badges = BadgeCalculator.calculateBadges(
            playerId = PlayerId.MACIEK,
            checkIns = checkIns,
            habits = habits,
            stakes = emptyList(),
            currentStreak = 1
        )

        val parBadge = badges.first { it.badge.id == "perfect_par" }
        assertTrue(parBadge.isUnlocked)
        assertEquals(240, parBadge.currentValue)
    }

    @Test
    fun `test streak badges unlock at thresholds`() {
        val badges3 = BadgeCalculator.calculateBadges(
            playerId = PlayerId.MACIEK,
            checkIns = emptyList(),
            habits = habits,
            stakes = emptyList(),
            currentStreak = 3
        )
        assertTrue(badges3.first { it.badge.id == "streak_3" }.isUnlocked)
        assertFalse(badges3.first { it.badge.id == "streak_7" }.isUnlocked)

        val badges7 = BadgeCalculator.calculateBadges(
            playerId = PlayerId.MACIEK,
            checkIns = emptyList(),
            habits = habits,
            stakes = emptyList(),
            currentStreak = 7
        )
        assertTrue(badges7.first { it.badge.id == "streak_7" }.isUnlocked)
        assertFalse(badges7.first { it.badge.id == "streak_14" }.isUnlocked)

        val badges14 = BadgeCalculator.calculateBadges(
            playerId = PlayerId.MACIEK,
            checkIns = emptyList(),
            habits = habits,
            stakes = emptyList(),
            currentStreak = 14
        )
        assertTrue(badges14.first { it.badge.id == "streak_14" }.isUnlocked)
    }

    @Test
    fun `test reading_100 badge unlocks on 100 pages read`() {
        val readingHabit = habits.first { it.playerId == PlayerId.MACIEK && it.isQuantitative }
        val checkIns = listOf(
            CheckIn(id = "1", habitId = readingHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-10", pointsEarned = 25, quantity = 25, completedAt = ""),
            CheckIn(id = "2", habitId = readingHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-11", pointsEarned = 25, quantity = 25, completedAt = ""),
            CheckIn(id = "3", habitId = readingHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-12", pointsEarned = 25, quantity = 25, completedAt = ""),
            CheckIn(id = "4", habitId = readingHabit.id, playerId = PlayerId.MACIEK, date = "2026-10-13", pointsEarned = 25, quantity = 25, completedAt = "")
        )

        val badges = BadgeCalculator.calculateBadges(
            playerId = PlayerId.MACIEK,
            checkIns = checkIns,
            habits = habits,
            stakes = emptyList(),
            currentStreak = 4
        )

        val readBadge = badges.first { it.badge.id == "reading_100" }
        assertTrue(readBadge.isUnlocked)
        assertEquals(100, readBadge.currentValue)
    }

    @Test
    fun `test clean_space_sentinel badge unlocks on 5 photo proofs`() {
        val cleanHabit = habits.first { it.playerId == PlayerId.MACIEK && it.category == HabitCategory.ENVIRONMENT }
        val checkIns = (1..5).map { idx ->
            CheckIn(
                id = "clean-$idx",
                habitId = cleanHabit.id,
                playerId = PlayerId.MACIEK,
                date = "2026-10-0$idx",
                pointsEarned = 15,
                proofUrl = "https://example.com/photo$idx.jpg",
                completedAt = ""
            )
        }

        val badges = BadgeCalculator.calculateBadges(
            playerId = PlayerId.MACIEK,
            checkIns = checkIns,
            habits = habits,
            stakes = emptyList(),
            currentStreak = 5
        )

        val cleanBadge = badges.first { it.badge.id == "clean_space_sentinel" }
        assertTrue(cleanBadge.isUnlocked)
        assertEquals(5, cleanBadge.currentValue)
    }

    @Test
    fun `test iron_couple unlocks when both score 240 Par on same day`() {
        val date = "2026-10-12"
        val checkIns = listOf(
            // Maciek 240 points
            CheckIn(id = "1", habitId = "h1", playerId = PlayerId.MACIEK, date = date, pointsEarned = 240, completedAt = ""),
            // Myrna 240 points on same day!
            CheckIn(id = "2", habitId = "h2", playerId = PlayerId.MYRNA, date = date, pointsEarned = 240, completedAt = "")
        )

        val badgesMaciek = BadgeCalculator.calculateBadges(
            playerId = PlayerId.MACIEK,
            checkIns = checkIns,
            habits = habits,
            stakes = emptyList(),
            currentStreak = 1
        )

        val ironCouple = badgesMaciek.first { it.badge.id == "iron_couple" }
        assertTrue(ironCouple.isUnlocked)
    }

    @Test
    fun `test stake_champion unlocks when player wins a wager`() {
        val stakes = listOf(
            Stake(
                id = "s1",
                period = StakePeriod.WEEKLY,
                periodKey = "2026-W41",
                title = "Dinner Date",
                description = "Winner picks dinner",
                status = StakeStatus.COMPLETED,
                winnerId = "maciek",
                dueDate = "2026-10-12"
            )
        )

        val badges = BadgeCalculator.calculateBadges(
            playerId = PlayerId.MACIEK,
            checkIns = emptyList(),
            habits = habits,
            stakes = stakes,
            currentStreak = 0
        )

        val stakeBadge = badges.first { it.badge.id == "stake_champion" }
        assertTrue(stakeBadge.isUnlocked)
        assertEquals(1, stakeBadge.currentValue)
    }
}
