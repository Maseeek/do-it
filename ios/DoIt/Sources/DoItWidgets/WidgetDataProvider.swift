import Foundation
import WidgetKit

public struct WidgetDuelData {
    public let maciekTodayScore: Int
    public let myrnaTodayScore: Int
    public let maciekWeeklyScore: Int
    public let myrnaWeeklyScore: Int
    public let maciekStreak: Int
    public let myrnaStreak: Int
    public let weeklyDelta: Int
    public let maciekPct: Int
    public let myrnaPct: Int

    public static let placeholder = WidgetDuelData(
        maciekTodayScore: 195,
        myrnaTodayScore: 210,
        maciekWeeklyScore: 920,
        myrnaWeeklyScore: 880,
        maciekStreak: 8,
        myrnaStreak: 6,
        weeklyDelta: 40,
        maciekPct: 51,
        myrnaPct: 49
    )
}

public enum WidgetDataProvider {
    public static func loadData() -> WidgetDuelData {
        let defaults = UserDefaults(suiteName: "group.com.doit.app") ?? UserDefaults.standard
        let maciekToday = defaults.integer(forKey: "maciek_today_score")
        let myrnaToday = defaults.integer(forKey: "myrna_today_score")
        let maciekWeekly = defaults.integer(forKey: "maciek_weekly_score")
        let myrnaWeekly = defaults.integer(forKey: "myrna_weekly_score")
        let maciekStreak = max(1, defaults.integer(forKey: "maciek_streak"))
        let myrnaStreak = max(1, defaults.integer(forKey: "myrna_streak"))
        let delta = defaults.integer(forKey: "weekly_delta")
        var maciekPct = defaults.integer(forKey: "weekly_maciek_pct")
        var myrnaPct = defaults.integer(forKey: "weekly_myrna_pct")

        if maciekPct == 0 && myrnaPct == 0 {
            maciekPct = 50
            myrnaPct = 50
        }

        return WidgetDuelData(
            maciekTodayScore: maciekToday > 0 ? maciekToday : 195,
            myrnaTodayScore: myrnaToday > 0 ? myrnaToday : 210,
            maciekWeeklyScore: maciekWeekly > 0 ? maciekWeekly : 920,
            myrnaWeeklyScore: myrnaWeekly > 0 ? myrnaWeekly : 880,
            maciekStreak: maciekStreak,
            myrnaStreak: myrnaStreak,
            weeklyDelta: delta > 0 ? delta : 40,
            maciekPct: maciekPct,
            myrnaPct: myrnaPct
        )
    }
}
