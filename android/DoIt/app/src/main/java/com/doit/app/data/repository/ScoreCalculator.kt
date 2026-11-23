package com.doit.app.data.repository

import com.doit.app.model.*
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import kotlin.math.max
import kotlin.math.min

object ScoreCalculator {

    const val DAILY_PAR_CEILING = 240

    fun calculateDailyPoints(
        playerId: PlayerId,
        dateStr: String,
        checkIns: List<CheckIn>
    ): Int {
        val total = checkIns
            .filter { it.playerId == playerId && it.date == dateStr }
            .sumOf { it.pointsEarned }
        return min(total, DAILY_PAR_CEILING)
    }

    fun calculateRawDailyPoints(
        playerId: PlayerId,
        dateStr: String,
        checkIns: List<CheckIn>
    ): Int {
        return checkIns
            .filter { it.playerId == playerId && it.date == dateStr }
            .sumOf { it.pointsEarned }
    }

    fun calculateDuelSummary(
        checkIns: List<CheckIn>,
        scope: LeaderboardScope = LeaderboardScope.WEEKLY,
        referenceDate: LocalDate = LocalDate.now()
    ): DuelScoreSummary {
        val (startDate, endDate) = getDateRange(scope, referenceDate)

        val filteredCheckIns = if (scope == LeaderboardScope.LIFETIME_KARMA) {
            checkIns
        } else {
            val startStr = startDate.toString()
            val endStr = endDate.toString()
            checkIns.filter { it.date in startStr..endStr }
        }

        var maciekScore = 0
        var myrnaScore = 0
        for (checkIn in filteredCheckIns) {
            if (checkIn.playerId == PlayerId.MACIEK) {
                maciekScore += checkIn.pointsEarned
            } else if (checkIn.playerId == PlayerId.MYRNA) {
                myrnaScore += checkIn.pointsEarned
            }
        }

        val leader = when {
            maciekScore > myrnaScore -> "maciek"
            myrnaScore > maciekScore -> "myrna"
            else -> "tie"
        }
        val delta = kotlin.math.abs(maciekScore - myrnaScore)
        val total = maciekScore + myrnaScore
        val maciekPct = if (total > 0) maciekScore.toFloat() / total.toFloat() else 0.5f
        val myrnaPct = if (total > 0) myrnaScore.toFloat() / total.toFloat() else 0.5f

        return DuelScoreSummary(
            maciekScore = maciekScore,
            myrnaScore = myrnaScore,
            leader = leader,
            delta = delta,
            maciekPct = maciekPct,
            myrnaPct = myrnaPct
        )
    }

    fun getCategoryBreakdown(
        checkIns: List<CheckIn>,
        habits: List<Habit>,
        scope: LeaderboardScope = LeaderboardScope.WEEKLY,
        referenceDate: LocalDate = LocalDate.now()
    ): List<CategoryComparison> {
        val habitMap = habits.associateBy { it.id }
        val (startDate, endDate) = getDateRange(scope, referenceDate)
        val startStr = startDate.toString()
        val endStr = endDate.toString()

        val relevantCheckIns = if (scope == LeaderboardScope.LIFETIME_KARMA) {
            checkIns
        } else {
            checkIns.filter { it.date in startStr..endStr }
        }

        val pointsByCategory = mutableMapOf<HabitCategory, Pair<Int, Int>>() // Cat -> (maciekPts, myrnaPts)

        for (checkIn in relevantCheckIns) {
            val habit = habitMap[checkIn.habitId] ?: continue
            val current = pointsByCategory.getOrDefault(habit.category, Pair(0, 0))
            if (checkIn.playerId == PlayerId.MACIEK) {
                pointsByCategory[habit.category] = current.copy(first = current.first + checkIn.pointsEarned)
            } else {
                pointsByCategory[habit.category] = current.copy(second = current.second + checkIn.pointsEarned)
            }
        }

        return HabitCategory.entries.map { category ->
            val (maciekPts, myrnaPts) = pointsByCategory.getOrDefault(category, Pair(0, 0))
            val leader = when {
                maciekPts > myrnaPts -> "maciek"
                myrnaPts > maciekPts -> "myrna"
                else -> "tie"
            }
            CategoryComparison(
                category = category,
                label = category.label,
                maciekPoints = maciekPts,
                myrnaPoints = myrnaPts,
                leader = leader
            )
        }
    }

    fun getWeeklyDailyDuelPoints(
        checkIns: List<CheckIn>,
        referenceDate: LocalDate = LocalDate.now()
    ): List<DailyDuelPoint> {
        val monday = referenceDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val sunday = referenceDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
        val startStr = monday.toString()
        val endStr = sunday.toString()
        val todayStr = referenceDate.toString()
        val dayFormatter = DateTimeFormatter.ofPattern("EEE")

        // Single O(N) pass to aggregate points per date for this week
        val pointsMap = mutableMapOf<String, Pair<Int, Int>>() // date -> (maciekPts, myrnaPts)
        for (checkIn in checkIns) {
            if (checkIn.date in startStr..endStr) {
                val current = pointsMap.getOrDefault(checkIn.date, Pair(0, 0))
                if (checkIn.playerId == PlayerId.MACIEK) {
                    pointsMap[checkIn.date] = current.copy(first = current.first + checkIn.pointsEarned)
                } else if (checkIn.playerId == PlayerId.MYRNA) {
                    pointsMap[checkIn.date] = current.copy(second = current.second + checkIn.pointsEarned)
                }
            }
        }

        return (0..6).map { dayOffset ->
            val dayDate = monday.plusDays(dayOffset.toLong())
            val dateStr = dayDate.toString()
            val dayName = dayDate.format(dayFormatter)
            val isToday = (dateStr == todayStr)
            val isFuture = dayDate.isAfter(referenceDate)
            val (maciekPts, myrnaPts) = pointsMap.getOrDefault(dateStr, Pair(0, 0))

            DailyDuelPoint(
                dayName = dayName,
                dateStr = dateStr,
                maciekPoints = maciekPts,
                myrnaPoints = myrnaPts,
                isToday = isToday,
                isFuture = isFuture
            )
        }
    }

    fun calculateKarma(playerId: PlayerId, checkIns: List<CheckIn>): Int {
        return checkIns
            .filter { it.playerId == playerId }
            .sumOf { it.pointsEarned }
    }

    private fun getDateRange(scope: LeaderboardScope, ref: LocalDate): Pair<LocalDate, LocalDate> {
        return when (scope) {
            LeaderboardScope.WEEKLY -> {
                val monday = ref.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                val sunday = ref.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
                Pair(monday, sunday)
            }
            LeaderboardScope.MONTHLY -> {
                val firstDay = ref.with(TemporalAdjusters.firstDayOfMonth())
                val lastDay = ref.with(TemporalAdjusters.lastDayOfMonth())
                Pair(firstDay, lastDay)
            }
            LeaderboardScope.YEARLY -> {
                val firstDay = ref.with(TemporalAdjusters.firstDayOfYear())
                val lastDay = ref.with(TemporalAdjusters.lastDayOfYear())
                Pair(firstDay, lastDay)
            }
            LeaderboardScope.LIFETIME_KARMA -> {
                Pair(LocalDate.MIN, LocalDate.MAX)
            }
        }
    }
}
