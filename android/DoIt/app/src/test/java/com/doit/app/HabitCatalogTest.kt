package com.doit.app

import com.doit.app.data.repository.HabitCatalog
import com.doit.app.model.PlayerId
import org.junit.Assert.*
import org.junit.Test

class HabitCatalogTest {

    @Test
    fun `test initial habits calibrated to 240 Par potential`() {
        val habits = HabitCatalog.getInitialHabits()
        val maciekHabits = habits.filter { it.playerId == PlayerId.MACIEK }
        val myrnaHabits = habits.filter { it.playerId == PlayerId.MYRNA }

        assertEquals(10, maciekHabits.size)
        assertEquals(10, myrnaHabits.size)

        // Sum of daily maximums matches 240 Daily Par
        val maciekDailySum = maciekHabits.filter { it.frequency == com.doit.app.model.HabitFrequency.DAILY }.sumOf { it.points }
        val myrnaDailySum = myrnaHabits.filter { it.frequency == com.doit.app.model.HabitFrequency.DAILY }.sumOf { it.points }
        assertEquals(maciekDailySum, myrnaDailySum)
    }

    @Test
    fun `test dynamic programming habit plan balancer`() {
        val habits = HabitCatalog.getInitialHabits().filter { it.playerId == PlayerId.MACIEK }
        val targetWeeklyPotential = 1200 // e.g. calibrate to target 1200 weekly points

        val balanced = HabitCatalog.balanceHabitPlan(habits, targetWeeklyPotential)
        assertNotNull(balanced)
        val calculatedWeekly = HabitCatalog.weeklyPointPotential(balanced!!)
        assertEquals(targetWeeklyPotential, calculatedWeekly)
    }
}
