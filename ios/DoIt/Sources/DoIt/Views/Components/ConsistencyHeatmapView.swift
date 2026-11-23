import SwiftUI

public struct ConsistencyHeatmapView: View {
    public let playerId: PlayerId
    public let playerColor: Color
    public let weeksCount: Int
    private let calendarGrid: [[(dateStr: String, points: Int)]]

    public init(
        checkIns: [CheckIn],
        playerId: PlayerId,
        playerColor: Color,
        weeksCount: Int = 12
    ) {
        self.playerId = playerId
        self.playerColor = playerColor
        self.weeksCount = weeksCount

        // 1. Single O(N) pass to aggregate points for this player
        var scores: [String: Int] = [:]
        for c in checkIns where c.playerId == playerId {
            scores[c.date, default: 0] += c.pointsEarned
        }

        // 2. Precompute calendar grid once during initialization, avoiding 84 DateFormatter passes on every body render
        let today = DateUtils.todayDateString()
        let todayDays = DateUtils.getCurrentWeekDays(today: today)
        let currentMondayStr = todayDays.first?.dateStr ?? today

        var grid: [[(dateStr: String, points: Int)]] = []
        for w in (0..<weeksCount).reversed() {
            let weekMonday = DateUtils.addDays(to: currentMondayStr, days: -7 * w)
            var days: [(dateStr: String, points: Int)] = []
            for d in 0..<7 {
                let dateStr = DateUtils.addDays(to: weekMonday, days: d)
                let pts = scores[dateStr] ?? 0
                days.append((dateStr: dateStr, points: pts))
            }
            grid.append(days)
        }
        self.calendarGrid = grid
    }

    private func cellColor(points: Int) -> Color {
        if points == 0 {
            return Color.linearCardElevated
        } else if points < 60 {
            return playerColor.opacity(0.25)
        } else if points < 120 {
            return playerColor.opacity(0.5)
        } else if points < 240 {
            return playerColor.opacity(0.75)
        } else {
            return playerColor
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("12-WEEK CONSISTENCY")
                    .font(.badgeLabel)
                    .foregroundColor(.linearTextMuted)
                Spacer()
                Text("240 Par Ceiling")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(0..<calendarGrid.count, id: \.self) { weekIdx in
                        VStack(spacing: 4) {
                            ForEach(0..<calendarGrid[weekIdx].count, id: \.self) { dayIdx in
                                let item = calendarGrid[weekIdx][dayIdx]
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(cellColor(points: item.points))
                                    .frame(width: 13, height: 13)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 3)
                                            .stroke(item.points >= 240 ? Color.linearGold : Color.clear, lineWidth: 1)
                                    )
                            }
                        }
                    }
                }
                .padding(.vertical, 4)
            }

            // Legend
            HStack(spacing: 6) {
                Text("Less")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
                RoundedRectangle(cornerRadius: 2).fill(Color.linearCardElevated).frame(width: 10, height: 10)
                RoundedRectangle(cornerRadius: 2).fill(playerColor.opacity(0.25)).frame(width: 10, height: 10)
                RoundedRectangle(cornerRadius: 2).fill(playerColor.opacity(0.5)).frame(width: 10, height: 10)
                RoundedRectangle(cornerRadius: 2).fill(playerColor.opacity(0.75)).frame(width: 10, height: 10)
                RoundedRectangle(cornerRadius: 2).fill(playerColor).frame(width: 10, height: 10)
                Text("240 Par")
                    .font(.captionMuted)
                    .foregroundColor(.linearGold)
                Spacer()
            }
        }
        .padding(14)
        .background(Color.linearCardBg)
        .cornerRadius(14)
        .hairlineBorder()
    }
}
