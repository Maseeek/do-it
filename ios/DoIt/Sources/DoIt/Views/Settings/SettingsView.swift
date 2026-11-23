import SwiftUI

public struct SettingsView: View {
    @ObservedObject public var viewModel: DuelViewModel

    @State private var joinInviteCode: String = ""
    @State private var showingJoinAlert = false
    @State private var joinAlertMessage = ""
    @State private var showingEditNameAlert = false
    @State private var tempName = ""

    public init(viewModel: DuelViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Form {
                // Section: Player Identity & Theme
                playerIdentitySection

                // Section: Player Accent Colors (Karma Unlocks)
                playerColorsSection

                // Section: Duel Invitation & Pairing
                duelPairingSection

                // Section: HealthKit Wearable Automation
                healthKitSection

                // Section: Sound & Haptics
                sensorySection

                // Section: Cloud Sync & Outbox
                cloudSyncSection
            }
            .scrollContentBackground(.hidden)
            .background(Color.linearDarkBg.ignoresSafeArea())
            .navigationTitle("Settings & Sync")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Join Duel", isPresented: $showingJoinAlert) {
                Button("OK") {}
            } message: {
                Text(joinAlertMessage)
            }
        }
    }

    // MARK: - Subviews

    private var playerIdentitySection: some View {
        Section("Player Identity") {
            HStack {
                Text("Active Player")
                Spacer()
                Picker("", selection: Binding(
                    get: { viewModel.activePlayerId },
                    set: { viewModel.switchActivePlayer(to: $0) }
                )) {
                    Text("\(viewModel.duel.ownerName) (Maciek)").tag(PlayerId.maciek)
                    Text("\(viewModel.duel.guestName ?? "Opponent") (Myrna)").tag(PlayerId.myrna)
                }
                .pickerStyle(.menu)
            }

            HStack {
                Text("Display Name")
                Spacer()
                TextField("Name", text: Binding(
                    get: { viewModel.activePlayerName },
                    set: { viewModel.updatePlayerName(name: $0) }
                ))
                .multilineTextAlignment(.trailing)
                .foregroundColor(.linearTextPrimary)
            }
        }
    }

    private var playerColorsSection: some View {
        Section("Accent Color Palette") {
            let karma = viewModel.activePlayerSummary.karma
            let invites = viewModel.duel.invites(for: viewModel.activePlayerId)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 42))], spacing: 12) {
                ForEach(PlayerColorId.allCases) { colorId in
                    let unlocked = colorId.isUnlocked(karma: karma, invites: invites)
                    let isSelected = (viewModel.duel.color(for: viewModel.activePlayerId) == colorId)

                    Button(action: {
                        if unlocked {
                            viewModel.setPlayerColor(color: colorId)
                        }
                    }) {
                        ZStack {
                            Circle()
                                .fill(colorId.color)
                                .frame(width: 38, height: 38)
                                .overlay(
                                    Circle()
                                        .stroke(isSelected ? Color.white : Color.clear, lineWidth: 2)
                                )

                            if !unlocked {
                                Image(systemName: "lock.fill")
                                    .font(.system(size: 14))
                                    .foregroundColor(.white.opacity(0.8))
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 8)

            Text("Earn Lifetime Karma to unlock colors: Teal (250), Orange (500), Pink (1k), Green (2.5k), Rainbow (10k), Gold (Invite 1 friend).")
                .font(.captionMuted)
                .foregroundColor(.linearTextMuted)
        }
    }

    private var duelPairingSection: some View {
        Section("Duel Tenancy & Invite") {
            VStack(alignment: .leading, spacing: 6) {
                Text("YOUR DUEL INVITE CODE")
                    .font(.badgeLabel)
                    .foregroundColor(.linearTextMuted)

                HStack {
                    Text(viewModel.duel.inviteCode)
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(.linearTextPrimary)
                        .lineLimit(1)
                    Spacer()
                    Button(action: {
                        UIPasteboard.general.string = viewModel.duel.inviteCode
                    }) {
                        Image(systemName: "doc.on.doc")
                            .foregroundColor(viewModel.activePlayerColor)
                    }
                }
                .padding(10)
                .background(Color.linearCardBg)
                .cornerRadius(8)
                .hairlineBorder()
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("PAIR WITH PARTNER'S CODE")
                    .font(.badgeLabel)
                    .foregroundColor(.linearTextMuted)

                HStack {
                    TextField("Enter 36-char invite code", text: $joinInviteCode)
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundColor(.linearTextPrimary)
                    Button("Join") {
                        Task {
                            do {
                                let duel = try await SupabaseService.shared.acceptDuel(
                                    inviteCode: joinInviteCode,
                                    displayName: viewModel.activePlayerName
                                )
                                viewModel.duel = duel
                                joinAlertMessage = "Successfully joined duel with \(duel.ownerName)!"
                                showingJoinAlert = true
                            } catch {
                                joinAlertMessage = "Failed to join: \(error.localizedDescription)"
                                showingJoinAlert = true
                            }
                        }
                    }
                    .font(.captionMuted)
                    .foregroundColor(viewModel.activePlayerColor)
                }
                .padding(10)
                .background(Color.linearCardBg)
                .cornerRadius(8)
                .hairlineBorder()
            }
        }
    }

    private var healthKitSection: some View {
        Section("Apple Health Telemetry") {
            Toggle("Enable HealthKit Sync", isOn: $viewModel.healthKitEnabled)
                .tint(viewModel.activePlayerColor)

            Button(action: {
                Task {
                    await viewModel.syncHealthKit()
                }
            }) {
                HStack {
                    Image(systemName: "arrow.triangle.2.circlepath")
                    Text("Sync HealthKit Telemetry Now")
                }
                .foregroundColor(viewModel.activePlayerColor)
            }

            Text("Automatically reconciles Sleep (6.5h–8.5h tiered par ratio), Daily Steps, Gym strength sessions (20m+), and Cardio (20m+).")
                .font(.captionMuted)
                .foregroundColor(.linearTextMuted)
        }
    }

    private var sensorySection: some View {
        Section("Tactile & Audio") {
            Toggle("Tactile UI Haptics", isOn: $viewModel.hapticsEnabled)
                .tint(viewModel.activePlayerColor)
            Toggle("Mechanical Sound Effects", isOn: $viewModel.soundEnabled)
                .tint(viewModel.activePlayerColor)
        }
    }

    private var cloudSyncSection: some View {
        Section("Cloud Architecture & RLS") {
            HStack {
                Text("Connection Status")
                Spacer()
                Text(viewModel.isOffline ? "Offline Mode" : "Supabase Realtime Active")
                    .font(.captionMuted)
                    .foregroundColor(viewModel.isOffline ? .linearRed : .linearGreen)
            }

            HStack {
                Text("Pending Sync Outbox")
                Spacer()
                let count = PersistenceService.shared.loadOutbox().count
                Text("\(count) items")
                    .font(.captionMuted)
                    .foregroundColor(.linearTextMuted)
            }
        }
    }
}
