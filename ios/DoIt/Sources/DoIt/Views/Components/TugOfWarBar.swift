import SwiftUI

public struct TugOfWarBar: View {
    public let maciekScore: Int
    public let myrnaScore: Int
    public let maciekColor: Color
    public let myrnaColor: Color
    public let maciekName: String
    public let myrnaName: String
    public var height: CGFloat = 14

    public init(
        maciekScore: Int,
        myrnaScore: Int,
        maciekColor: Color,
        myrnaColor: Color,
        maciekName: String,
        myrnaName: String,
        height: CGFloat = 14
    ) {
        self.maciekScore = maciekScore
        self.myrnaScore = myrnaScore
        self.maciekColor = maciekColor
        self.myrnaColor = myrnaColor
        self.maciekName = maciekName
        self.myrnaName = myrnaName
        self.height = height
    }

    private var total: Int {
        maciekScore + myrnaScore
    }

    private var maciekRatio: CGFloat {
        if total == 0 { return 0.5 }
        return CGFloat(maciekScore) / CGFloat(total)
    }

    private var delta: Int {
        abs(maciekScore - myrnaScore)
    }

    public var body: some View {
        VStack(spacing: 8) {
            // Header: Names, Scores, and Delta
            HStack {
                HStack(spacing: 6) {
                    Circle()
                        .fill(maciekColor)
                        .frame(width: 8, height: 8)
                    Text(maciekName)
                        .font(.bodyEmphasized)
                        .foregroundColor(.linearTextPrimary)
                    Text("\(maciekScore)")
                        .font(.scoreNumberSmall)
                        .foregroundColor(maciekColor)
                }

                Spacer()

                // Delta Badge
                if delta > 0 {
                    Text(maciekScore > myrnaScore ? "+\(delta) \(maciekName)" : "+\(delta) \(myrnaName)")
                        .font(.captionMuted)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.linearCardElevated)
                        .cornerRadius(6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color.linearBorder, lineWidth: 0.5)
                        )
                } else {
                    Text("TIED")
                        .font(.captionMuted)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.linearCardElevated)
                        .cornerRadius(6)
                }

                Spacer()

                HStack(spacing: 6) {
                    Text("\(myrnaScore)")
                        .font(.scoreNumberSmall)
                        .foregroundColor(myrnaColor)
                    Text(myrnaName)
                        .font(.bodyEmphasized)
                        .foregroundColor(.linearTextPrimary)
                    Circle()
                        .fill(myrnaColor)
                        .frame(width: 8, height: 8)
                }
            }

            // Tug of War Bar
            GeometryReader { geo in
                let fullWidth = geo.size.width
                let leftWidth = fullWidth * maciekRatio

                ZStack(alignment: .leading) {
                    // Full track (Myrna background)
                    RoundedRectangle(cornerRadius: height / 2)
                        .fill(myrnaColor.opacity(0.85))
                        .frame(width: fullWidth, height: height)

                    // Maciek fill
                    RoundedRectangle(cornerRadius: height / 2)
                        .fill(maciekColor)
                        .frame(width: max(height, min(fullWidth - height, leftWidth)), height: height)

                    // Center reference hairline notch
                    Rectangle()
                        .fill(Color.white.opacity(0.7))
                        .frame(width: 2, height: height + 4)
                        .position(x: fullWidth * 0.5, y: height / 2)
                }
            }
            .frame(height: height)
        }
        .padding(14)
        .background(Color.linearCardBg)
        .cornerRadius(14)
        .hairlineBorder()
    }
}
