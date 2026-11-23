import SwiftUI

public struct StakesLedgerView: View {
    @ObservedObject public var viewModel: DuelViewModel

    @State private var showingAddStakeSheet = false
    @State private var settlingStake: Stake? = nil

    public init(viewModel: DuelViewModel) {
        self.viewModel = viewModel
    }

    private var activeStakes: [Stake] {
        viewModel.stakes.filter { $0.status == .active }
    }

    private var completedStakes: [Stake] {
        viewModel.stakes.filter { $0.status == .completed }
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Win/Loss Record Card
                    recordSummaryCard

                    // Active Stakes Section
                    activeStakesSection

                    // Hall of Champions History
                    hallOfChampionsSection
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 80)
            }
            .background(Color.linearDarkBg.ignoresSafeArea())
            .navigationTitle("Stakes & Champions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddStakeSheet = true }) {
                        Image(systemName: "plus")
                            .foregroundColor(viewModel.activePlayerColor)
                    }
                }
            }
            .sheet(isPresented: $showingAddStakeSheet) {
                AddStakeSheet(playerColor: viewModel.activePlayerColor) { title, desc, period, date in
                    viewModel.addStake(title: title, description: desc, period: period, dueDate: date)
                }
            }
            .confirmationDialog(
                "Settle Stake Winner",
                isPresented: Binding(get: { settlingStake != nil }, set: { if !$0 { settlingStake = nil } }),
                titleVisibility: .visible
            ) {
                if let stake = settlingStake {
                    Button("\(viewModel.duel.ownerName) Won") {
                        viewModel.settleStake(stakeId: stake.id, winner: .player(.maciek))
                    }
                    Button("\(viewModel.duel.guestName ?? "Myrna") Won") {
                        viewModel.settleStake(stakeId: stake.id, winner: .player(.myrna))
                    }
                    Button("Declare Tie") {
                        viewModel.settleStake(stakeId: stake.id, winner: .tie)
                    }
                    Button("Cancel", role: .cancel) {}
                }
            }
        }
    }

    // MARK: - Subviews

    private var recordSummaryCard: some View {
        let record = viewModel.stakesRecord
        return VStack(spacing: 12) {
            HStack {
                Text("HALL OF CHAMPIONS RECORD")
                    .font(.badgeLabel)
                    .foregroundColor(.linearTextMuted)
                Spacer()
                Text("\(record.totalCompleted) settled wagers")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
            }

            HStack(spacing: 16) {
                VStack(spacing: 4) {
                    Text("\(record.maciekWins)")
                        .font(.scoreNumberLarge)
                        .foregroundColor(viewModel.duel.ownerColor.color)
                    Text("\(viewModel.duel.ownerName) Wins")
                        .font(.captionMuted)
                        .foregroundColor(.linearTextSecondary)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text("\(record.ties)")
                        .font(.scoreNumberLarge)
                        .foregroundColor(.linearTextMuted)
                    Text("Ties")
                        .font(.captionMuted)
                        .foregroundColor(.linearTextSecondary)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text("\(record.myrnaWins)")
                        .font(.scoreNumberLarge)
                        .foregroundColor(viewModel.duel.guestColor.color)
                    Text("\(viewModel.duel.guestName ?? "Myrna") Wins")
                        .font(.captionMuted)
                        .foregroundColor(.linearTextSecondary)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(16)
        .background(Color.linearCardBg)
        .cornerRadius(16)
        .hairlineBorder()
    }

    private var activeStakesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("ACTIVE WAGERS")
                    .font(.badgeLabel)
                    .foregroundColor(.linearTextMuted)
                Spacer()
                Text("\(activeStakes.count) in play")
                    .font(.captionMuted)
                    .foregroundColor(viewModel.activePlayerColor)
            }

            if activeStakes.isEmpty {
                Text("No active stakes. Tap + to set this week's dinner or reward!")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
                    .padding(20)
                    .frame(maxWidth: .infinity)
                    .background(Color.linearCardBg)
                    .cornerRadius(12)
                    .hairlineBorder()
            } else {
                ForEach(activeStakes) { stake in
                    stakeCard(stake, isActive: true)
                }
            }
        }
    }

    private var hallOfChampionsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("COMPLETED DUELS")
                    .font(.badgeLabel)
                    .foregroundColor(.linearTextMuted)
                Spacer()
            }

            if completedStakes.isEmpty {
                Text("No settled stakes yet. End of week wagers will appear here.")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
                    .padding(20)
                    .frame(maxWidth: .infinity)
                    .background(Color.linearCardBg)
                    .cornerRadius(12)
                    .hairlineBorder()
            } else {
                ForEach(completedStakes) { stake in
                    stakeCard(stake, isActive: false)
                }
            }
        }
    }

    private func stakeCard(_ stake: Stake, isActive: Bool) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(stake.period.title.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.linearCardElevated)
                    .foregroundColor(.linearTextSecondary)
                    .cornerRadius(4)

                Spacer()

                if isActive {
                    Button(action: { settlingStake = stake }) {
                        Text("Settle Winner")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(viewModel.activePlayerColor)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(viewModel.activePlayerColor.opacity(0.12))
                            .cornerRadius(6)
                    }
                } else if let winner = stake.winnerId {
                    switch winner {
                    case .player(let pid):
                        let winnerName = viewModel.duel.name(for: pid)
                        let color = viewModel.duel.color(for: pid).color
                        HStack(spacing: 4) {
                            Image(systemName: "crown.fill")
                                .foregroundColor(Color.linearGold)
                            Text("\(winnerName) Won")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(color)
                        }
                    case .tie:
                        Text("Tie")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.linearTextMuted)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(stake.title)
                    .font(.bodyEmphasized)
                    .foregroundColor(.linearTextPrimary)

                Text(stake.description)
                    .font(.captionMuted)
                    .foregroundColor(.linearTextSecondary)
            }

            HStack {
                Text("Period: \(stake.periodKey)")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
                Spacer()
                Text("Due: \(stake.dueDate)")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
            }
        }
        .padding(14)
        .background(Color.linearCardBg)
        .cornerRadius(12)
        .hairlineBorder()
    }
}

public struct AddStakeSheet: View {
    public let playerColor: Color
    public let onSave: (String, String, StakePeriod, String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title: String = ""
    @State private var description: String = ""
    @State private var period: StakePeriod = .weekly

    private let presetIdeas = [
        ("Sunday Dinner Date 🍕", "Winner chooses favorite spot, loser pays the bill."),
        ("Coffee & Pastries in Bed ☕", "Freshly brewed flat white and bakery treats delivered in bed."),
        ("One Week of Kitchen Duty 🍽️", "Loser does dishes and resets kitchen for 7 straight days."),
        ("Weekend Spa Day 🧖‍♀️", "Full thermal relaxation day funded by the loser.")
    ]

    public var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Form {
                    Section("Stake Wager") {
                        TextField("e.g. Sunday Dinner Date 🍕", text: $title)
                        TextField("e.g. Loser buys pizza and dessert", text: $description)
                    }

                    Section("Period") {
                        Picker("Cadence", selection: $period) {
                            ForEach(StakePeriod.allCases, id: \.self) { p in
                                Text(p.title).tag(p)
                            }
                        }
                    }

                    Section("Inspirations") {
                        ForEach(presetIdeas, id: \.0) { idea in
                            Button(action: {
                                title = idea.0
                                description = idea.1
                            }) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(idea.0).font(.bodyEmphasized).foregroundColor(.linearTextPrimary)
                                    Text(idea.1).font(.captionMuted).foregroundColor(.linearTextMuted)
                                }
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)

                Button(action: {
                    if !title.isEmpty {
                        onSave(title, description, period, DateUtils.todayDateString())
                        dismiss()
                    }
                }) {
                    Text("Create Stake")
                        .font(.bodyEmphasized)
                        .foregroundColor(.linearDarkBg)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(!title.isEmpty ? playerColor : Color.linearBorder)
                        .cornerRadius(12)
                }
                .disabled(title.isEmpty)
                .padding(.horizontal, 20)
                .padding(.bottom, 16)
            }
            .background(Color.linearDarkBg.ignoresSafeArea())
            .navigationTitle("New Duel Stake")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.linearTextMuted)
                }
            }
        }
    }
}
