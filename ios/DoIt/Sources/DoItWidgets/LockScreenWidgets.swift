import WidgetKit
import SwiftUI

public struct LockScreenDuelWidgetView: View {
    @Environment(\.widgetFamily) var family
    public let entry: DuelTimelineEntry

    public var body: some View {
        switch family {
        case .accessoryCircular:
            circularView
        case .accessoryRectangular:
            rectangularView
        case .accessoryInline:
            inlineView
        default:
            circularView
        }
    }

    private var circularView: some View {
        let progress = min(1.0, Double(entry.data.maciekTodayScore) / 240.0)
        return ZStack {
            AccessoryWidgetBackground()
            Gauge(value: progress) {
                Text("PAR")
            } currentValueLabel: {
                Text("\(entry.data.maciekTodayScore)")
                    .font(.system(size: 13, weight: .bold))
            }
            .gaugeStyle(.accessoryCircular)
        }
    }

    private var rectangularView: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Text("DO IT")
                    .font(.system(size: 10, weight: .bold))
                Spacer()
                Text("+\(entry.data.weeklyDelta) Lead")
                    .font(.system(size: 10, weight: .semibold))
            }

            Text("\(entry.data.maciekTodayScore) / 240 PAR")
                .font(.system(size: 14, weight: .bold))

            Text("Streak: \(entry.data.maciekStreak)d • Opponent: \(entry.data.myrnaTodayScore)")
                .font(.system(size: 10))
                .foregroundColor(.secondary)
        }
    }

    private var inlineView: some View {
        Text("⚡ \(entry.data.maciekTodayScore)/240 Par • \(entry.data.maciekStreak)d Streak")
    }
}

public struct LockScreenDuelWidget: Widget {
    public let kind: String = "LockScreenDuelWidget"

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DuelTimelineProvider()) { entry in
            LockScreenDuelWidgetView(entry: entry)
        }
        .configurationDisplayName("Do It — Lock Screen")
        .description("Glanceable daily par and duel streak on your Lock Screen.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}
