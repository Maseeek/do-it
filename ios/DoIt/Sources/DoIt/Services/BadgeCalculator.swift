import Foundation

public enum BadgeCalculator {
    public static func calculatePlayerBadges(
        playerId: PlayerId,
        checkIns: [CheckIn],
        habits: [Habit],
        stakes: [Stake],
        currentStreak: Int
    ) -> [PlayerBadgeStatus] {
        var readingHabitSet = Set<String>()
        var cleanHabitSet = Set<String>()
        var gymHabitSet = Set<String>()
        var langHabitSet = Set<String>()
        var projectHabitSet = Set<String>()

        for h in habits where h.playerId == playerId {
            if h.isQuantitative || h.iconName == "BookOpen" || h.category == .intellect {
                readingHabitSet.insert(h.id)
            }
            if h.category == .environment {
                cleanHabitSet.insert(h.id)
            }
            if h.category == .physical {
                gymHabitSet.insert(h.id)
            }
            if h.category == .language {
                langHabitSet.insert(h.id)
            }
            if h.category == .deep_work {
                projectHabitSet.insert(h.id)
            }
        }

        let partnerId: PlayerId = (playerId == .maciek) ? .myrna : .maciek
        var dailyPointsMap: [String: Int] = [:]
        var partnerDailyPointsMap: [String: Int] = [:]
        var weeklyGymCounts: [String: Int] = [:]

        var playerLogsCount = 0
        var totalPages = 0
        var cleanWithPhotoCount = 0
        var languageCount = 0
        var projectCount = 0

        for l in checkIns {
            if l.playerId == playerId {
                playerLogsCount += 1
                dailyPointsMap[l.date, default: 0] += l.pointsEarned

                if readingHabitSet.contains(l.habitId) {
                    totalPages += (l.quantity ?? l.pointsEarned)
                }

                if cleanHabitSet.contains(l.habitId) && l.hasProof {
                    cleanWithPhotoCount += 1
                }

                if gymHabitSet.contains(l.habitId) {
                    let weekKey = DateUtils.getWeekKey(for: l.date)
                    weeklyGymCounts[weekKey, default: 0] += 1
                }

                if langHabitSet.contains(l.habitId) {
                    languageCount += 1
                }

                if projectHabitSet.contains(l.habitId) {
                    projectCount += 1
                }
            } else if l.playerId == partnerId {
                partnerDailyPointsMap[l.date, default: 0] += l.pointsEarned
            }
        }

        // Calculate maximum single-day points
        var maxDayPoints = 0
        for (_, pts) in dailyPointsMap {
            if pts > maxDayPoints { maxDayPoints = pts }
        }

        // Calculate maximum gym workouts in a single calendar week
        var maxGymInSingleWeek = 0
        for (_, count) in weeklyGymCounts {
            if count > maxGymInSingleWeek { maxGymInSingleWeek = count }
        }

        // Check if both players hit 240+ on the exact same date
        var bothHit240OnSameDay = false
        for (date, pts) in dailyPointsMap {
            if pts >= 240 && (partnerDailyPointsMap[date] ?? 0) >= 240 {
                bothHit240OnSameDay = true
                break
            }
        }

        var stakesWonCount = 0
        for s in stakes {
            if s.winnerId == .player(playerId) {
                stakesWonCount += 1
            }
        }

        return BadgeDefinition.allBadges.map { def in
            let currentVal: Int
            let unlocked: Bool

            switch def.id {
            case "first_checkin":
                currentVal = playerLogsCount
                unlocked = currentVal >= def.targetCount

            case "perfect_par":
                currentVal = maxDayPoints
                unlocked = currentVal >= def.targetCount

            case "streak_3":
                currentVal = currentStreak
                unlocked = currentStreak >= def.targetCount

            case "streak_7":
                currentVal = currentStreak
                unlocked = currentStreak >= def.targetCount

            case "streak_14":
                currentVal = currentStreak
                unlocked = currentStreak >= def.targetCount

            case "reading_100":
                currentVal = totalPages
                unlocked = totalPages >= def.targetCount

            case "clean_space_sentinel":
                currentVal = cleanWithPhotoCount
                unlocked = cleanWithPhotoCount >= def.targetCount

            case "gym_par":
                currentVal = maxGymInSingleWeek
                unlocked = maxGymInSingleWeek >= def.targetCount

            case "polyglot":
                currentVal = languageCount
                unlocked = languageCount >= def.targetCount

            case "deep_worker":
                currentVal = projectCount
                unlocked = projectCount >= def.targetCount

            case "iron_couple":
                currentVal = bothHit240OnSameDay ? 1 : 0
                unlocked = bothHit240OnSameDay

            case "stake_champion":
                currentVal = stakesWonCount
                unlocked = stakesWonCount >= def.targetCount

            default:
                currentVal = 0
                unlocked = false
            }

            let progress = min(100.0, (Double(currentVal) / Double(max(1, def.targetCount))) * 100.0)

            return PlayerBadgeStatus(
                badge: def,
                isUnlocked: unlocked,
                progress: progress,
                currentValue: currentVal,
                unlockedAt: unlocked ? DateUtils.todayDateString() : nil
            )
        }
    }
}
