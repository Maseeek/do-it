import SwiftUI

public struct DailyParRing: View {
    public let currentScore: Int
    public let parCeiling: Int
    public let playerColor: Color
    public var lineWidth: CGFloat = 10
    public var size: CGFloat = 140

    public init(
        currentScore: Int,
        parCeiling: Int = 240,
        playerColor: Color,
        lineWidth: CGFloat = 10,
        size: CGFloat = 140
    ) {
        self.currentScore = currentScore
        self.parCeiling = parCeiling
        self.playerColor = playerColor
        self.lineWidth = lineWidth
        self.size = size
    }

    private var progress: Double {
        min(1.0, Double(currentScore) / Double(max(1, parCeiling)))
    }

    private var isParReached: Bool {
        currentScore >= parCeiling
    }

    public var body: some View {
        ZStack {
            // Background Track
            Circle()
                .stroke(Color.linearBorder, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .frame(width: size, height: size)

            // Progress Arc
            Circle()
                .trim(from: 0, to: CGFloat(progress))
                .stroke(
                    isParReached ? Color.linearGold : playerColor,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .frame(width: size, height: size)
                .animation(.spring(response: 0.5, dampingFraction: 0.7), value: progress)
                .shadow(
                    color: isParReached ? Color.linearGold.opacity(0.4) : playerColor.opacity(0.2),
                    radius: isParReached ? 10 : 4
                )

            // Center Content
            VStack(spacing: 2) {
                Text("\(currentScore)")
                    .font(.scoreNumberLarge)
                    .foregroundColor(isParReached ? .linearGold : .linearTextPrimary)

                Text("/ \(parCeiling) PAR")
                    .font(.badgeLabel)
                    .foregroundColor(.linearTextMuted)

                if isParReached {
                    Text("PAR ACHIEVED")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.linearGold)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.linearGold.opacity(0.15))
                        .cornerRadius(4)
                }
            }
        }
    }
}
