import SwiftUI

public struct TodayDuelView: View {
    @ObservedObject public var viewModel: DuelViewModel

    @State private var showingQuantitativeSheetFor: Habit? = nil
    @State private var showingProofSheetFor: Habit? = nil
    @State private var showingReactionSheet: Bool = false
    @State private var showingRestDaySheet: Bool = false

    public init(viewModel: DuelViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                ScrollView {
                    VStack(spacing: 16) {
                        // Header: Player Switcher & Date
                        playerSwitcherHeader

                        // Rest Day Banner if active
                        if viewModel.isRestDayDeclaredForSelectedDate {
                            restDayActiveBanner
                        }

                        // Hero: Daily Par Ring & Versus Tug of War
                        heroScoreSection

                        // Quick Stats: Streak, Parity Rate, Rest Days
                        quickStatsBar

                        // Habits Checklist Section
                        habitsListSection
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 80)
                }
                .refreshable {
                    await viewModel.syncHealthKit()
                    await viewModel.refreshFromCloud()
                }

                // Cheer Reaction Floating Toast
                if let reaction = viewModel.activeReactionToast {
                    reactionToast(reaction)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                        .padding(.bottom, 20)
                }
            }
            .background(Color.linearDarkBg.ignoresSafeArea())
            .navigationTitle("Daily Duel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(viewModel.isOffline ? Color.linearRed : Color.linearGreen)
                            .frame(width: 8, height: 8)
                        Text(viewModel.isOffline ? "Offline" : "Synced")
                            .font(.captionMuted)
                            .foregroundColor(.linearTextMuted)
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingReactionSheet = true }) {
                        HStack(spacing: 4) {
                            Text("Cheer")
                                .font(.bodyEmphasized)
                            Text("💬")
                        }
                        .foregroundColor(viewModel.activePlayerColor)
                    }
                }
            }
            .sheet(item: $showingQuantitativeSheetFor) { habit in
                let currentQty = viewModel.checkInForToday(habit.id)?.quantity ?? 0
                QuantitativeInputSheet(
                    habit: habit,
                    currentQuantity: currentQty,
                    playerColor: viewModel.activePlayerColor,
                    onSave: { qty in
                        viewModel.logQuantitativeCheckIn(habit: habit, quantity: qty)
                    }
                )
            }
            .sheet(item: $showingProofSheetFor) { habit in
                let currentProof = viewModel.checkInForToday(habit.id)?.proofUrl
                PhotoProofSheet(
                    habit: habit,
                    currentProofUrl: currentProof,
                    playerColor: viewModel.activePlayerColor,
                    onSave: { proofUrl, note in
                        viewModel.logCheckInWithProof(habit: habit, proofUrl: proofUrl, note: note)
                    }
                )
            }
            .sheet(isPresented: $showingReactionSheet) {
                SendReactionSheet(
                    partnerName: viewModel.opponentName,
                    playerColor: viewModel.activePlayerColor,
                    onSend: { emoji, msg in
                        viewModel.sendReaction(emoji: emoji, message: msg)
                    }
                )
            }
            .sheet(isPresented: $showingRestDaySheet) {
                RestDaySheet(
                    dateStr: viewModel.selectedDate,
                    isCurrentlyRestDay: viewModel.isRestDayDeclaredForSelectedDate,
                    playerColor: viewModel.activePlayerColor,
                    onDeclare: { reason in
                        viewModel.declareRestDay(reason: reason)
                    },
                    onCancel: {
                        viewModel.cancelRestDay()
                    }
                )
            }
        }
    }

    // MARK: - Subviews

    private var playerSwitcherHeader: some View {
        HStack {
            // Player Toggle Pill
            HStack(spacing: 0) {
                Button(action: { viewModel.switchActivePlayer(to: .maciek) }) {
                    HStack(spacing: 4) {
                        Text(viewModel.duel.ownerName)
                            .font(.captionMuted)
                        Text("⚡")
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(viewModel.activePlayerId == .maciek ? viewModel.duel.ownerColor.accentBg : Color.clear)
                    .foregroundColor(viewModel.activePlayerId == .maciek ? viewModel.duel.ownerColor.color : .linearTextMuted)
                    .cornerRadius(8)
                }

                Button(action: { viewModel.switchActivePlayer(to: .myrna) }) {
                    HStack(spacing: 4) {
                        Text(viewModel.duel.guestName ?? "Myrna")
                            .font(.captionMuted)
                        Text("✨")
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(viewModel.activePlayerId == .myrna ? viewModel.duel.guestColor.accentBg : Color.clear)
                    .foregroundColor(viewModel.activePlayerId == .myrna ? viewModel.duel.guestColor.color : .linearTextMuted)
                    .cornerRadius(8)
                }
            }
            .padding(3)
            .background(Color.linearCardBg)
            .cornerRadius(10)
            .hairlineBorder()

            Spacer()

            // Date & Rest Day Trigger
            Button(action: { showingRestDaySheet = true }) {
                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.system(size: 12))
                    Text(DateUtils.formatDisplayHeader(viewModel.selectedDate))
                        .font(.captionMuted)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.linearCardBg)
                .foregroundColor(.linearTextSecondary)
                .cornerRadius(8)
                .hairlineBorder()
            }
        }
        .padding(.top, 4)
    }

    private var restDayActiveBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "bed.double.fill")
                .foregroundColor(viewModel.activePlayerColor)
            VStack(alignment: .leading, spacing: 2) {
                Text("REST DAY ACTIVE")
                    .font(.badgeLabel)
                    .foregroundColor(viewModel.activePlayerColor)
                Text("Streak preserved. Take time to recharge and restore.")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
            }
            Spacer()
            Button("Edit") { showingRestDaySheet = true }
                .font(.captionMuted)
                .foregroundColor(viewModel.activePlayerColor)
        }
        .padding(12)
        .background(viewModel.activePlayerColor.opacity(0.1))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(viewModel.activePlayerColor.opacity(0.3), lineWidth: 0.5)
        )
    }

    private var heroScoreSection: some View {
        VStack(spacing: 16) {
            HStack(spacing: 24) {
                // Par Ring
                DailyParRing(
                    currentScore: viewModel.activePlayerSummary.today,
                    parCeiling: ScoreCalculator.dailyParCeiling,
                    playerColor: viewModel.activePlayerColor,
                    size: 130
                )

                // Quick Breakdown
                VStack(alignment: .leading, spacing: 10) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("DAILY TARGET")
                            .font(.badgeLabel)
                            .foregroundColor(.linearTextMuted)
                        Text("240 Par Ceiling")
                            .font(.bodyEmphasized)
                            .foregroundColor(.linearTextPrimary)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("POINTS REMAINING")
                            .font(.badgeLabel)
                            .foregroundColor(.linearTextMuted)
                        let remaining = max(0, ScoreCalculator.dailyParCeiling - viewModel.activePlayerSummary.today)
                        Text(remaining == 0 ? "Goal Met! 🔥" : "\(remaining) pts to go")
                            .font(.bodyEmphasized)
                            .foregroundColor(remaining == 0 ? .linearGold : viewModel.activePlayerColor)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("OPPONENT TODAY")
                            .font(.badgeLabel)
                            .foregroundColor(.linearTextMuted)
                        Text("\(viewModel.opponentSummary.today) pts (\(viewModel.opponentName))")
                            .font(.bodyEmphasized)
                            .foregroundColor(viewModel.opponentColor)
                    }
                }
                Spacer()
            }
            .padding(16)
            .background(Color.linearCardBg)
            .cornerRadius(16)
            .hairlineBorder()

            // Tug of War Bar (Weekly Parity)
            TugOfWarBar(
                maciekScore: viewModel.maciekSummary.weekly,
                myrnaScore: viewModel.myrnaSummary.weekly,
                maciekColor: viewModel.duel.ownerColor.color,
                myrnaColor: viewModel.duel.guestColor.color,
                maciekName: viewModel.duel.ownerName,
                myrnaName: viewModel.duel.guestName ?? "Myrna"
            )
        }
    }

    private var quickStatsBar: some View {
        HStack(spacing: 10) {
            // Streak Pill
            statPill(
                icon: "flame.fill",
                iconColor: .linearRed,
                title: "STREAK",
                value: "\(viewModel.activePlayerSummary.currentStreak)d"
            )

            // Weekly Completion Rate
            statPill(
                icon: "chart.line.uptrend.xyaxis",
                iconColor: .linearGreen,
                title: "WEEKLY RATE",
                value: "\(viewModel.activePlayerSummary.completionRateWeekly)%"
            )

            // Lifetime Karma
            statPill(
                icon: "sparkles",
                iconColor: .linearPurple,
                title: "KARMA",
                value: "\(viewModel.activePlayerSummary.karma)"
            )
        }
    }

    private func statPill(icon: String, iconColor: Color, title: String, value: String) -> some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10))
                    .foregroundColor(iconColor)
                Text(title)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.linearTextMuted)
            }
            Text(value)
                .font(.scoreNumberMedium)
                .foregroundColor(.linearTextPrimary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color.linearCardBg)
        .cornerRadius(12)
        .hairlineBorder()
    }

    private var habitsListSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("HABIT COMMITMENTS")
                    .font(.badgeLabel)
                    .foregroundColor(.linearTextMuted)
                Spacer()
                Text("\(viewModel.activeHabitsForSelectedDate.filter { viewModel.isHabitCompletedToday($0.id) }.count) / \(viewModel.activeHabitsForSelectedDate.count)")
                    .font(.captionMuted)
                    .foregroundColor(viewModel.activePlayerColor)
            }

            LazyVStack(spacing: 8) {
                ForEach(viewModel.activeHabitsForSelectedDate) { habit in
                    let isDone = viewModel.isHabitCompletedToday(habit.id)
                    let checkIn = viewModel.checkInForToday(habit.id)

                    HabitCheckInCard(
                        habit: habit,
                        isCompleted: isDone,
                        checkIn: checkIn,
                        playerColor: viewModel.activePlayerColor,
                        weeklyCompletionsCount: ScoreCalculator.calculateWeeklyHabitStreak(habit: habit, checkIns: viewModel.checkIns),
                        onToggle: {
                            viewModel.toggleCheckIn(habit: habit)
                        },
                        onQuantitativeTap: {
                            showingQuantitativeSheetFor = habit
                        },
                        onProofTap: {
                            showingProofSheetFor = habit
                        }
                    )
                }
            }
        }
    }

    private func reactionToast(_ reaction: CouplesReaction) -> some View {
        HStack(spacing: 12) {
            Text(reaction.emoji)
                .font(.system(size: 32))
            VStack(alignment: .leading, spacing: 2) {
                Text("\(viewModel.opponentName) says:")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
                Text(reaction.message)
                    .font(.bodyEmphasized)
                    .foregroundColor(.linearTextPrimary)
            }
            Spacer()
        }
        .padding(14)
        .background(Color.linearCardElevated)
        .cornerRadius(16)
        .hairlineBorder(color: viewModel.opponentColor.opacity(0.4))
        .shadow(color: Color.black.opacity(0.5), radius: 10)
    }
}
