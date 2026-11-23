import SwiftUI

public struct TrophyCabinetView: View {
    @ObservedObject public var viewModel: DuelViewModel

    @State private var selectedBadge: PlayerBadgeStatus? = nil

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    public init(viewModel: DuelViewModel) {
        self.viewModel = viewModel
    }

    private var unlockedCount: Int {
        viewModel.activePlayerBadges.filter { $0.isUnlocked }.count
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header Stats Banner
                    headerBanner

                    // 12 Badges Grid
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(viewModel.activePlayerBadges) { status in
                            badgeCard(status)
                                .onTapGesture {
                                    selectedBadge = status
                                }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 80)
            }
            .background(Color.linearDarkBg.ignoresSafeArea())
            .navigationTitle("Trophy Cabinet")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(item: $selectedBadge) { status in
                badgeDetailSheet(status)
            }
        }
    }

    // MARK: - Subviews

    private var headerBanner: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color.linearGold.opacity(0.15))
                    .frame(width: 56, height: 56)
                    .overlay(Circle().stroke(Color.linearGold.opacity(0.3), lineWidth: 0.5))
                Image(systemName: "trophy.fill")
                    .font(.system(size: 26))
                    .foregroundColor(.linearGold)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("\(unlockedCount) of 12 Unlocked")
                    .font(.bodyEmphasized)
                    .foregroundColor(.linearTextPrimary)
                Text("Earn achievements across streaks, 240 Par consistency, book reading, and wagers.")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
            }
            Spacer()
        }
        .padding(16)
        .background(Color.linearCardBg)
        .cornerRadius(16)
        .hairlineBorder()
    }

    private func badgeCard(_ status: PlayerBadgeStatus) -> some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(status.isUnlocked ? viewModel.activePlayerColor.opacity(0.18) : Color.linearCardElevated)
                    .frame(width: 48, height: 48)
                    .overlay(
                        Circle().stroke(status.isUnlocked ? viewModel.activePlayerColor.opacity(0.5) : Color.linearBorder, lineWidth: 0.5)
                    )

                Image(systemName: status.badge.systemIcon)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(status.isUnlocked ? viewModel.activePlayerColor : .linearTextMuted)
            }

            VStack(spacing: 3) {
                Text(status.badge.title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(status.isUnlocked ? .linearTextPrimary : .linearTextMuted)
                    .multilineTextAlignment(.center)
                    .lineLimit(1)

                Text(status.isUnlocked ? "UNLOCKED" : "\(status.currentValue) / \(status.badge.targetCount)")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(status.isUnlocked ? .linearGold : .linearTextMuted)
            }

            // Progress Bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.linearBorder)
                        .frame(height: 4)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(status.isUnlocked ? Color.linearGold : viewModel.activePlayerColor)
                        .frame(width: geo.size.width * CGFloat(status.progress / 100.0), height: 4)
                }
            }
            .frame(height: 4)
        }
        .padding(14)
        .background(Color.linearCardBg)
        .cornerRadius(14)
        .hairlineBorder(color: status.isUnlocked ? viewModel.activePlayerColor.opacity(0.3) : Color.linearBorder)
    }

    private func badgeDetailSheet(_ status: PlayerBadgeStatus) -> some View {
        NavigationStack {
            VStack(spacing: 24) {
                ZStack {
                    Circle()
                        .fill(status.isUnlocked ? viewModel.activePlayerColor.opacity(0.2) : Color.linearCardElevated)
                        .frame(width: 80, height: 80)
                        .overlay(Circle().stroke(status.isUnlocked ? viewModel.activePlayerColor : Color.linearBorder, lineWidth: 1))
                    Image(systemName: status.badge.systemIcon)
                        .font(.system(size: 36))
                        .foregroundColor(status.isUnlocked ? viewModel.activePlayerColor : .linearTextMuted)
                }
                .padding(.top, 20)

                VStack(spacing: 6) {
                    Text(status.badge.title)
                        .font(.titleMedium)
                        .foregroundColor(.linearTextPrimary)
                    Text(status.badge.category.title.uppercased())
                        .font(.badgeLabel)
                        .foregroundColor(viewModel.activePlayerColor)
                }

                Text(status.badge.description)
                    .font(.bodyRegular)
                    .foregroundColor(.linearTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                VStack(spacing: 6) {
                    Text("\(status.currentValue) / \(status.badge.targetCount)")
                        .font(.scoreNumberMedium)
                        .foregroundColor(.linearTextPrimary)
                    Text("Target Requirement")
                        .font(.captionMuted)
                        .foregroundColor(.linearTextMuted)
                }
                .padding(16)
                .frame(maxWidth: .infinity)
                .background(Color.linearCardBg)
                .cornerRadius(12)
                .hairlineBorder()
                .padding(.horizontal, 20)

                Spacer()
            }
            .background(Color.linearDarkBg.ignoresSafeArea())
            .navigationTitle("Trophy Detail")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
