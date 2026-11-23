import WidgetKit
import SwiftUI

public struct DuelTimelineEntry: TimelineEntry {
    public let date: Date
    public let data: WidgetDuelData
}

public struct DuelTimelineProvider: TimelineProvider {
    public func placeholder(in context: Context) -> DuelTimelineEntry {
        DuelTimelineEntry(date: Date(), data: .placeholder)
    }

    public func getSnapshot(in context: Context, completion: @escaping (DuelTimelineEntry) -> Void) {
        let entry = DuelTimelineEntry(date: Date(), data: WidgetDataProvider.loadData())
        completion(entry)
    }

    public func getTimeline(in context: Context, completion: @escaping (Timeline<DuelTimelineEntry>) -> Void) {
        let entry = DuelTimelineEntry(date: Date(), data: WidgetDataProvider.loadData())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

public struct TodayDuelWidgetView: View {
    @Environment(\.widgetFamily) var family
    public let entry: DuelTimelineEntry

    public var body: some View {
        switch family {
        case .systemSmall:
            smallWidgetView
        case .systemMedium:
            mediumWidgetView
        case .systemLarge:
            largeWidgetView
        default:
            mediumWidgetView
        }
    }

    private var smallWidgetView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("DO IT")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color(hex: "71717a"))
                Spacer()
                Text("\(entry.data.maciekStreak)d 🔥")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color(hex: "f87171"))
            }

            Spacer()

            VStack(alignment: .leading, spacing: 2) {
                Text("\(entry.data.maciekTodayScore)")
                    .font(.system(size: 32, weight: .bold, design: .rounded).monospacedDigit())
                    .foregroundColor(Color(hex: "60a5fa"))
                Text("/ 240 PAR")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color(hex: "71717a"))
            }

            Spacer()

            HStack {
                Text("Opponent: \(entry.data.myrnaTodayScore) pts")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(hex: "c084fc"))
            }
        }
        .padding(12)
        .containerBackground(Color(hex: "08090a"), for: .widget)
    }

    private var mediumWidgetView: some View {
        VStack(spacing: 12) {
            HStack {
                HStack(spacing: 4) {
                    Circle().fill(Color(hex: "60a5fa")).frame(width: 6, height: 6)
                    Text("Maciek")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color(hex: "f4f4f5"))
                    Text("\(entry.data.maciekTodayScore)")
                        .font(.system(size: 14, weight: .bold).monospacedDigit())
                        .foregroundColor(Color(hex: "60a5fa"))
                }

                Spacer()

                Text("+\(entry.data.weeklyDelta) pts")
                    .font(.system(size: 10, weight: .bold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(hex: "151619"))
                    .foregroundColor(Color(hex: "eab308"))
                    .cornerRadius(4)

                Spacer()

                HStack(spacing: 4) {
                    Text("\(entry.data.myrnaTodayScore)")
                        .font(.system(size: 14, weight: .bold).monospacedDigit())
                        .foregroundColor(Color(hex: "c084fc"))
                    Text("Myrna")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color(hex: "f4f4f5"))
                    Circle().fill(Color(hex: "c084fc")).frame(width: 6, height: 6)
                }
            }

            // Tug of war mini bar
            GeometryReader { geo in
                let width = geo.size.width
                let left = width * (CGFloat(entry.data.maciekPct) / 100.0)

                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 5)
                        .fill(Color(hex: "c084fc").opacity(0.8))
                        .frame(width: width, height: 10)

                    RoundedRectangle(cornerRadius: 5)
                        .fill(Color(hex: "60a5fa"))
                        .frame(width: left, height: 10)
                }
            }
            .frame(height: 10)

            HStack {
                Text("Weekly: \(entry.data.maciekWeeklyScore) vs \(entry.data.myrnaWeeklyScore)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color(hex: "a1a1aa"))
                Spacer()
                Text("240 Par Target")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color(hex: "71717a"))
            }
        }
        .padding(14)
        .containerBackground(Color(hex: "08090a"), for: .widget)
    }

    private var largeWidgetView: some View {
        VStack(spacing: 14) {
            mediumWidgetView

            Divider().background(Color(hex: "27272a"))

            VStack(alignment: .leading, spacing: 8) {
                Text("DAILY TARGETS")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color(hex: "71717a"))

                widgetHabitRow(title: "Sleep 8.5+ Hours", points: 50, icon: "moon.fill", done: entry.data.maciekTodayScore >= 50)
                widgetHabitRow(title: "Gym & Strength", points: 40, icon: "dumbbell.fill", done: entry.data.maciekTodayScore >= 90)
                widgetHabitRow(title: "Reading Books", points: 25, icon: "book.fill", done: entry.data.maciekTodayScore >= 115)
                widgetHabitRow(title: "Personal Project", points: 25, icon: "briefcase.fill", done: entry.data.maciekTodayScore >= 140)
            }
        }
        .padding(16)
        .containerBackground(Color(hex: "08090a"), for: .widget)
    }

    private func widgetHabitRow(title: String, points: Int, icon: String, done: Bool) -> some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundColor(done ? Color(hex: "60a5fa") : Color(hex: "71717a"))
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(done ? Color(hex: "71717a") : Color(hex: "f4f4f5"))
                .strikethrough(done)
            Spacer()
            Text("+\(points)")
                .font(.system(size: 11, weight: .bold).monospacedDigit())
                .foregroundColor(done ? Color(hex: "60a5fa") : Color(hex: "71717a"))
        }
    }
}

public struct TodayDuelWidget: Widget {
    public let kind: String = "TodayDuelWidget"

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DuelTimelineProvider()) { entry in
            TodayDuelWidgetView(entry: entry)
        }
        .configurationDisplayName("Do It — Daily Duel")
        .description("Track daily par progress and head-to-head score against your partner.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
