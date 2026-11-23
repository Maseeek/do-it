import SwiftUI

public struct BattleAnalyticsView: View {
    @ObservedObject public var viewModel: DuelViewModel
    @State private var selectedTier: LeaderboardTier = .weekly

    public init(viewModel: DuelViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Tier Selector (Weekly, Monthly, Yearly, Karma)
                    tierPicker

                    // Matchup Summary Card for Selected Tier
                    matchupSummaryCard

                    // Daily Battle Chart (Mon - Sun head to head)
                    dailyBattleChart

                    // Category Dominance Breakdown (10 Categories)
                    categoryDominanceSection

                    // 12-Week Consistency Heatmap
                    ConsistencyHeatmapView(
                        checkIns: viewModel.checkIns,
                        playerId: viewModel.activePlayerId,
                        playerColor: viewModel.activePlayerColor,
                        weeksCount: 12
                    )
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 80)
            }
            .background(Color.linearDarkBg.ignoresSafeArea())
            .navigationTitle("Battle Analytics")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    // MARK: - Subviews

    private var tierPicker: some View {
        HStack(spacing: 6) {
            ForEach(LeaderboardTier.allCases) { tier in
                Button(action: { selectedTier = tier }) {
                    Text(tier.shortTitle)
                        .font(.system(size: 13, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(selectedTier == tier ? Color.linearCardElevated : Color.clear)
                        .foregroundColor(selectedTier == tier ? .linearTextPrimary : .linearTextMuted)
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(selectedTier == tier ? Color.linearBorderActive : Color.clear, lineWidth: 0.5)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(Color.linearCardBg)
        .cornerRadius(10)
        .hairlineBorder()
    }

    private var matchupSummaryCard: some View {
        let versus = viewModel.versus(tier: selectedTier)
        let maciekScore = ScoreCalculator.getTierScore(summary: viewModel.maciekSummary, tier: selectedTier)
        let myrnaScore = ScoreCalculator.getTierScore(summary: viewModel.myrnaSummary, tier: selectedTier)

        return VStack(spacing: 14) {
            HStack {
                Text(selectedTier.title.uppercased())
                    .font(.badgeLabel)
                    .foregroundColor(.linearTextMuted)
                Spacer()
                if versus.delta > 0 {
                    let leaderName = (versus.leader == .player(.maciek)) ? viewModel.duel.ownerName : (viewModel.duel.guestName ?? "Myrna")
                    Text("\(leaderName) leads by \(versus.delta) pts")
                        .font(.captionMuted)
                        .foregroundColor(.linearGold)
                } else {
                    Text("Dead Heat (Tie)")
                        .font(.captionMuted)
                        .foregroundColor(.linearTextMuted)
                }
            }

            // Head to Head Tug of War
            TugOfWarBar(
                maciekScore: maciekScore,
                myrnaScore: myrnaScore,
                maciekColor: viewModel.duel.ownerColor.color,
                myrnaColor: viewModel.duel.guestColor.color,
                maciekName: viewModel.duel.ownerName,
                myrnaName: viewModel.duel.guestName ?? "Myrna",
                height: 18
            )

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(viewModel.duel.ownerName)
                        .font(.captionMuted)
                        .foregroundColor(.linearTextMuted)
                    Text("\(maciekScore) pts (\(versus.maciekPct)%)")
                        .font(.bodyEmphasized)
                        .foregroundColor(viewModel.duel.ownerColor.color)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(viewModel.duel.guestName ?? "Myrna")
                        .font(.captionMuted)
                        .foregroundColor(.linearTextMuted)
                    Text("\(myrnaScore) pts (\(versus.myrnaPct)%)")
                        .font(.bodyEmphasized)
                        .foregroundColor(viewModel.duel.guestColor.color)
                }
            }
        }
        .padding(16)
        .background(Color.linearCardBg)
        .cornerRadius(16)
        .hairlineBorder()
    }

    private var dailyBattleChart: some View {
        let points = viewModel.weeklyDuelPoints
        let maxVal = max(60, points.map { max($0.maciekPoints, $0.myrnaPoints) }.max() ?? 60)

        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("DAILY DUEL BATTLE")
                    .font(.badgeLabel)
                    .foregroundColor(.linearTextMuted)
                Spacer()
                Text("Mon - Sun")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
            }

            HStack(alignment: .bottom, spacing: 10) {
                ForEach(points) { pt in
                    VStack(spacing: 6) {
                        // Twin bars for Maciek and Myrna
                        HStack(alignment: .bottom, spacing: 3) {
                            // Maciek bar
                            RoundedRectangle(cornerRadius: 3)
                                .fill(viewModel.duel.ownerColor.color)
                                .frame(width: 14, height: max(4, CGFloat(pt.maciekPoints) / CGFloat(maxVal) * 100))

                            // Myrna bar
                            RoundedRectangle(cornerRadius: 3)
                                .fill(viewModel.duel.guestColor.color)
                                .frame(width: 14, height: max(4, CGFloat(pt.myrnaPoints) / CGFloat(maxVal) * 100))
                        }

                        Text(pt.dayName)
                            .font(.system(size: 11, weight: pt.isToday ? .bold : .medium))
                            .foregroundColor(pt.isToday ? .linearTextPrimary : .linearTextMuted)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 140)
            .padding(.vertical, 8)

            // Legend
            HStack(spacing: 16) {
                HStack(spacing: 6) {
                    Circle().fill(viewModel.duel.ownerColor.color).frame(width: 8, height: 8)
                    Text(viewModel.duel.ownerName).font(.captionMuted).foregroundColor(.linearTextSecondary)
                }
                HStack(spacing: 6) {
                    Circle().fill(viewModel.duel.guestColor.color).frame(width: 8, height: 8)
                    Text(viewModel.duel.guestName ?? "Myrna").font(.captionMuted).foregroundColor(.linearTextSecondary)
                }
                Spacer()
            }
        }
        .padding(16)
        .background(Color.linearCardBg)
        .cornerRadius(16)
        .hairlineBorder()
    }

    private var categoryDominanceSection: some View {
        let comparisons = viewModel.categoryComparisons

        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("CATEGORY DOMINANCE")
                    .font(.badgeLabel)
                    .foregroundColor(.linearTextMuted)
                Spacer()
                Text("Weekly Duel")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
            }

            LazyVStack(spacing: 8) {
                ForEach(comparisons) { cat in
                    HStack(spacing: 12) {
                        Image(systemName: cat.category.systemIcon)
                            .font(.system(size: 16))
                            .foregroundColor(cat.category.badgeColor)
                            .frame(width: 28, height: 28)
                            .background(Color.linearCardElevated)
                            .cornerRadius(6)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(cat.label)
                                .font(.bodyEmphasized)
                                .foregroundColor(.linearTextPrimary)

                            HStack(spacing: 8) {
                                Text("\(viewModel.duel.ownerName): \(cat.maciekPoints) pts")
                                    .font(.captionMuted)
                                    .foregroundColor(viewModel.duel.ownerColor.color)
                                Text("•")
                                    .foregroundColor(.linearTextMuted)
                                Text("\(viewModel.duel.guestName ?? "Myrna"): \(cat.myrnaPoints) pts")
                                    .font(.captionMuted)
                                    .foregroundColor(viewModel.duel.guestColor.color)
                            }
                        }

                        Spacer()

                        // Winner tag
                        if cat.leader != .tie {
                            let winner = (cat.leader == .player(.maciek)) ? viewModel.duel.ownerName : (viewModel.duel.guestName ?? "Myrna")
                            let color = (cat.leader == .player(.maciek)) ? viewModel.duel.ownerColor.color : viewModel.duel.guestColor.color
                            Text("\(winner)")
                                .font(.system(size: 11, weight: .bold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(color.opacity(0.15))
                                .foregroundColor(color)
                                .cornerRadius(6)
                        } else {
                            Text("Tie")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.linearTextMuted)
                        }
                    }
                    .padding(10)
                    .background(Color.linearCardBg)
                    .cornerRadius(10)
                    .hairlineBorder()
                }
            }
        }
    }
}
