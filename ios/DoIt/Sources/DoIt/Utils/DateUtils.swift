import Foundation

public struct WeekDayInfo: Identifiable, Equatable {
    public var id: String { dateStr }
    public let dayName: String
    public let dateStr: String
    public let isToday: Bool
    public let isFuture: Bool

    public init(dayName: String, dateStr: String, isToday: Bool, isFuture: Bool) {
        self.dayName = dayName
        self.dateStr = dateStr
        self.isToday = isToday
        self.isFuture = isFuture
    }
}

public enum DateUtils {
    private static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone.current
        return f
    }()

    public static func todayDateString() -> String {
        isoFormatter.string(from: Date())
    }

    public static func formatDate(_ date: Date) -> String {
        isoFormatter.string(from: date)
    }

    public static func parseDate(_ dateStr: String) -> Date {
        isoFormatter.date(from: dateStr) ?? Date()
    }

    public static func addDays(to dateStr: String, days: Int) -> String {
        let d = parseDate(dateStr)
        var cal = Calendar.current
        cal.timeZone = TimeZone.current
        if let next = cal.date(byAdding: .day, value: days, to: d) {
            return formatDate(next)
        }
        return dateStr
    }

    public static func getWeekKey(for dateStr: String) -> String {
        let d = parseDate(dateStr)
        var cal = Calendar(identifier: .iso8601)
        cal.firstWeekday = 2 // Monday
        let week = cal.component(.weekOfYear, from: d)
        let year = cal.component(.yearForWeekOfYear, from: d)
        return String(format: "%04d-W%02d", year, week)
    }

    public static func getMonthKey(for dateStr: String) -> String {
        if dateStr.count >= 7 {
            return String(dateStr.prefix(7))
        }
        let d = parseDate(dateStr)
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM"
        f.timeZone = TimeZone.current
        return f.string(from: d)
    }

    public static func getYearKey(for dateStr: String) -> String {
        if dateStr.count >= 4 {
            return String(dateStr.prefix(4))
        }
        return todayDateString().prefix(4).description
    }

    public static func getCurrentWeekDays(today: String = todayDateString()) -> [WeekDayInfo] {
        let targetDate = parseDate(today)
        var cal = Calendar(identifier: .iso8601)
        cal.firstWeekday = 2 // Monday
        cal.timeZone = TimeZone.current

        // Find Monday of this week
        let weekday = cal.component(.weekday, from: targetDate)
        // In ISO8601: Mon=2, Tue=3, ... Sun=1
        let daysFromMonday = (weekday + 5) % 7 // Mon: (2+5)%7 = 0; Sun: (1+5)%7 = 6
        guard let monday = cal.date(byAdding: .day, value: -daysFromMonday, to: targetDate) else {
            return []
        }

        let dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        var results: [WeekDayInfo] = []

        for i in 0..<7 {
            if let d = cal.date(byAdding: .day, value: i, to: monday) {
                let dStr = formatDate(d)
                let isToday = (dStr == today)
                let isFuture = (dStr > today)
                results.append(
                    WeekDayInfo(
                        dayName: dayNames[i],
                        dateStr: dStr,
                        isToday: isToday,
                        isFuture: isFuture
                    )
                )
            }
        }
        return results
    }

    public static func formatDisplayHeader(_ dateStr: String) -> String {
        let d = parseDate(dateStr)
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d"
        f.timeZone = TimeZone.current
        return f.string(from: d)
    }
}
