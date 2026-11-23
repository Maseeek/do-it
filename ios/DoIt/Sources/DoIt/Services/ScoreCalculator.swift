import Foundation

public enum ScoreCalculator {
    public static let dailyParCeiling: Int = 240

    public static func calculatePlayerScores(
        playerId: PlayerId,
        checkIns: [CheckIn],
        habits: [Habit],
        restDays: [RestDay] = [],
        today: String = DateUtils.todayDateString()
    ) -> PlayerScoreSummary {
        let playerLogs = checkIns.filter { $0.playerId == playerId }
        var playerRestDays = Set<String>()
        var restDaysUsed = 0

        for restDay in restDays where restDay.playerId == playerId {
            playerRestDays.insert(restDay.date)
            restDaysUsed += 1
        }

        var todayPoints = 0
        var weeklyPoints = 0
        var monthlyPoints = 0
        var yearlyPoints = 0
        var karmaPoints = 0

        let weekDays = DateUtils.getCurrentWeekDays(today: today)
        guard let weekStart = weekDays.first?.dateStr,
              let weekEnd = weekDays.last?.dateStr else {
            return PlayerScoreSummary()
        }

        let monthPrefix = String(today.prefix(7))
        let yearPrefix = String(today.prefix(4))
        var weeklyHabitCounts: [String: Int] = [:]

        for log in playerLogs {
            karmaPoints += log.pointsEarned
            if log.date == today {
                todayPoints += log.pointsEarned
            }
            if log.date >= weekStart && log.date <= weekEnd {
                weeklyPoints += log.pointsEarned
                weeklyHabitCounts[log.habitId, default: 0] += 1
            }
            if log.date.hasPrefix(monthPrefix) {
                monthlyPoints += log.pointsEarned
            }
            if log.date.hasPrefix(yearPrefix) {
                yearlyPoints += log.pointsEarned
            }
        }

        // Calculate active streak with rest-day protection
        var uniqueCompletedDates = Set<String>()
        for log in playerLogs {
            uniqueCompletedDates.insert(log.date)
        }

        var currentStreak = 0
        var checkDate = DateUtils.parseDate(today)

        let todayCovered = uniqueCompletedDates.contains(today) || playerRestDays.contains(today)
        if !todayCovered {
            var cal = Calendar.current
            cal.timeZone = TimeZone.current
            if let yesterday = cal.date(byAdding: .day, value: -1, to: checkDate) {
                checkDate = yesterday
            }
        }

        var cal = Calendar.current
        cal.timeZone = TimeZone.current

        for _ in 0..<365 {
            let dateStr = DateUtils.formatDate(checkDate)
            let isCheckIn = uniqueCompletedDates.contains(dateStr)
            let isRest = playerRestDays.contains(dateStr)

            if isCheckIn {
                currentStreak += 1
                if let prev = cal.date(byAdding: .day, value: -1, to: checkDate) {
                    checkDate = prev
                } else {
                    break
                }
            } else if isRest {
                // Rest day preserves the streak without penalizing
                if let prev = cal.date(byAdding: .day, value: -1, to: checkDate) {
                    checkDate = prev
                } else {
                    break
                }
            } else {
                break
            }
        }

        // Weekly completion rate calculation
        let playerHabits = habits.filter { $0.playerId == playerId && $0.isActive }
        let now = DateUtils.parseDate(today)
        let weekday = cal.component(.weekday, from: now)
        let dayOfWeek = (weekday + 5) % 7 + 1 // 1 = Mon ... 7 = Sun

        var maxPossibleSoFar = 0
        var validWeeklyLogs = 0

        for habit in playerHabits {
            let habitWeekCount = weeklyHabitCounts[habit.id] ?? 0
            if let targetDays = habit.weeklyTargetDays, targetDays > 0 {
                let targetSoFar = min(dayOfWeek, targetDays)
                maxPossibleSoFar += targetSoFar
                validWeeklyLogs += min(habitWeekCount, targetDays)
            } else {
                maxPossibleSoFar += dayOfWeek
                validWeeklyLogs += min(habitWeekCount, dayOfWeek)
            }
        }

        maxPossibleSoFar = max(1, maxPossibleSoFar)
        let completionRateWeekly = min(100, Int(round((Double(validWeeklyLogs) / Double(maxPossibleSoFar)) * 100.0)))

        return PlayerScoreSummary(
            today: todayPoints,
            weekly: weeklyPoints,
            monthly: monthlyPoints,
            yearly: yearlyPoints,
            karma: karmaPoints,
            currentStreak: currentStreak,
            completionRateWeekly: completionRateWeekly,
            restDaysUsed: restDaysUsed
        )
    }

    public static func getTierScore(summary: PlayerScoreSummary, tier: LeaderboardTier) -> Int {
        switch tier {
        case .weekly: return summary.weekly
        case .monthly: return summary.monthly
        case .yearly: return summary.yearly
        case .karma: return summary.karma
        }
    }

    public static func getVersusComparison(
        maciekSummary: PlayerScoreSummary,
        myrnaSummary: PlayerScoreSummary,
        tier: LeaderboardTier
    ) -> VersusComparison {
        let maciekScore = getTierScore(summary: maciekSummary, tier: tier)
        let myrnaScore = getTierScore(summary: myrnaSummary, tier: tier)
        let delta = abs(maciekScore - myrnaScore)

        let leader: VersusLeader
        if maciekScore > myrnaScore {
            leader = .player(.maciek)
        } else if myrnaScore > maciekScore {
            leader = .player(.myrna)
        } else {
            leader = .tie
        }

        let total = maciekScore + myrnaScore
        let maciekPct: Int
        let myrnaPct: Int

        if total == 0 {
            maciekPct = 50
            myrnaPct = 50
        } else {
            maciekPct = Int(round((Double(maciekScore) / Double(total)) * 100.0))
            myrnaPct = 100 - maciekPct
        }

        return VersusComparison(
            maciekScore: maciekScore,
            myrnaScore: myrnaScore,
            leader: leader,
            delta: delta,
            maciekPct: maciekPct,
            myrnaPct: myrnaPct
        )
    }

    public static func getCategoryBreakdown(
        checkIns: [CheckIn],
        habits: [Habit],
        scope: LeaderboardTier = .weekly,
        today: String = DateUtils.todayDateString()
    ) -> [CategoryComparison] {
        var habitMap: [String: Habit] = [:]
        for h in habits {
            habitMap[h.id] = h
        }

        let weekDays = DateUtils.getCurrentWeekDays(today: today)
        guard let weekStart = weekDays.first?.dateStr,
              let weekEnd = weekDays.last?.dateStr else {
            return []
        }

        var points: [HabitCategory: (maciek: Int, myrna: Int)] = [:]

        for log in checkIns {
            if scope == .weekly && (log.date < weekStart || log.date > weekEnd) {
                continue
            }
            guard let habit = habitMap[log.habitId] else { continue }
            var current = points[habit.category] ?? (maciek: 0, myrna: 0)
            if log.playerId == .maciek {
                current.maciek += log.pointsEarned
            } else if log.playerId == .myrna {
                current.myrna += log.pointsEarned
            }
            points[habit.category] = current
        }

        let categories: [HabitCategory] = [
            .foundation,
            .physical,
            .cardio,
            .intellect,
            .deep_work,
            .skills,
            .nutrition,
            .environment,
            .mind,
            .language,
            .finance
        ]

        return categories.map { cat in
            let maciekPts = points[cat]?.maciek ?? 0
            let myrnaPts = points[cat]?.myrna ?? 0

            let leader: VersusLeader
            if maciekPts > myrnaPts {
                leader = .player(.maciek)
            } else if myrnaPts > maciekPts {
                leader = .player(.myrna)
            } else {
                leader = .tie
            }

            return CategoryComparison(
                category: cat,
                label: cat.title,
                maciekPoints: maciekPts,
                myrnaPoints: myrnaPts,
                leader: leader
            )
        }
    }

    public static func getWeeklyDailyDuelPoints(
        checkIns: [CheckIn],
        today: String = DateUtils.todayDateString()
    ) -> [DailyDuelPoint] {
        let days = DateUtils.getCurrentWeekDays(today: today)
        guard let weekStart = days.first?.dateStr,
              let weekEnd = days.last?.dateStr else {
            return []
        }

        var pointsMap: [String: (maciek: Int, myrna: Int)] = [:]
        for day in days {
            pointsMap[day.dateStr] = (maciek: 0, myrna: 0)
        }

        for c in checkIns where c.date >= weekStart && c.date <= weekEnd {
            var entry = pointsMap[c.date] ?? (maciek: 0, myrna: 0)
            if c.playerId == .maciek {
                entry.maciek += c.pointsEarned
            } else if c.playerId == .myrna {
                entry.myrna += c.pointsEarned
            }
            pointsMap[c.date] = entry
        }

        return days.map { day in
            let entry = pointsMap[day.dateStr] ?? (maciek: 0, myrna: 0)
            return DailyDuelPoint(
                dayName: day.dayName,
                dateStr: day.dateStr,
                maciekPoints: entry.maciek,
                myrnaPoints: entry.myrna,
                isToday: day.isToday,
                isFuture: day.isFuture
            )
        }
    }

    public static func getStakesRecord(stakes: [Stake]) -> StakesRecord {
        let completed = stakes.filter { $0.status == .completed && $0.winnerId != nil }
        let maciekWins = completed.filter { $0.winnerId == .player(.maciek) }.count
        let myrnaWins = completed.filter { $0.winnerId == .player(.myrna) }.count
        let ties = completed.filter { $0.winnerId == .tie }.count

        return StakesRecord(
            maciekWins: maciekWins,
            myrnaWins: myrnaWins,
            ties: ties,
            totalCompleted: completed.count,
            history: completed
        )
    }

    public static func calculateWeeklyHabitStreak(
        habit: Habit,
        checkIns: [CheckIn],
        today: String = DateUtils.todayDateString()
    ) -> Int {
        guard let target = habit.weeklyTargetDays, target > 0 else { return 0 }

        let todayDays = DateUtils.getCurrentWeekDays(today: today)
        guard let currentWeekMondayStr = todayDays.first?.dateStr else { return 0 }

        var weekCompletions: [String: Set<String>] = [:]
        for checkIn in checkIns where checkIn.habitId == habit.id {
            let weekKey = DateUtils.getWeekKey(for: checkIn.date)
            weekCompletions[weekKey, default: Set<String>()].insert(checkIn.date)
        }

        if weekCompletions.isEmpty { return 0 }

        var streak = 0
        let currentWeekKey = DateUtils.getWeekKey(for: currentWeekMondayStr)
        let currentWeekCount = weekCompletions[currentWeekKey]?.count ?? 0
        if currentWeekCount >= target {
            streak += 1
        }

        for i in 1...52 {
            let prevMondayStr = DateUtils.addDays(to: currentWeekMondayStr, days: -7 * i)
            let prevWeekKey = DateUtils.getWeekKey(for: prevMondayStr)
            let prevCount = weekCompletions[prevWeekKey]?.count ?? 0
            if prevCount >= target {
                streak += 1
            } else {
                break
            }
        }

        return streak
    }

    public static func calculateHabitStreak(
        habit: Habit,
        checkIns: [CheckIn],
        restDays: [RestDay] = [],
        today: String = DateUtils.todayDateString()
    ) -> Int {
        if habit.isWeekly {
            return calculateWeeklyHabitStreak(habit: habit, checkIns: checkIns, today: today)
        }

        var uniqueDates = Set<String>()
        for checkIn in checkIns where checkIn.habitId == habit.id {
            uniqueDates.insert(checkIn.date)
        }

        if uniqueDates.isEmpty { return 0 }

        let playerRestDays = Set(restDays.filter { $0.playerId == habit.playerId }.map { $0.date })

        var streak = 0
        var checkDate = DateUtils.parseDate(today)

        let todayCovered = uniqueDates.contains(today) || playerRestDays.contains(today)
        var cal = Calendar.current
        cal.timeZone = TimeZone.current

        if !todayCovered {
            if let yesterday = cal.date(byAdding: .day, value: -1, to: checkDate) {
                checkDate = yesterday
            }
        }

        for _ in 0..<365 {
            let dateStr = DateUtils.formatDate(checkDate)
            if uniqueDates.contains(dateStr) {
                streak += 1
                if let prev = cal.date(byAdding: .day, value: -1, to: checkDate) {
                    checkDate = prev
                } else {
                    break
                }
            } else if playerRestDays.contains(dateStr) {
                // Rest day preserves the habit streak
                if let prev = cal.date(byAdding: .day, value: -1, to: checkDate) {
                    checkDate = prev
                } else {
                    break
                }
            } else {
                break
            }
        }

        return streak
    }
}
