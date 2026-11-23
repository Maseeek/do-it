import Foundation
import SwiftUI
import Combine

@MainActor
public final class DuelViewModel: ObservableObject {
    @Published public var activePlayerId: PlayerId = .maciek
    @Published public var duel: Duel = Duel()
    @Published public var habits: [Habit] = []
    @Published public var checkIns: [CheckIn] = []
    @Published public var stakes: [Stake] = []
    @Published public var reactions: [CouplesReaction] = []
    @Published public var restDays: [RestDay] = []
    @Published public var soundEnabled: Bool = true
    @Published public var hapticsEnabled: Bool = true
    @Published public var healthKitEnabled: Bool = true
    @Published public var isSyncing: Bool = false
    @Published public var isOffline: Bool = false
    @Published public var selectedDate: String = DateUtils.todayDateString()
    @Published public var activeReactionToast: CouplesReaction? = nil
    @Published public var toastMessage: String? = nil

    private let persistence = PersistenceService.shared
    private let supabase = SupabaseService.shared
    private let healthKit = HealthKitService.shared
    private let haptics = HapticsService.shared
    private let sound = SoundService.shared

    // Memoization cache for heavy score calculations
    private var cachedMaciekSummary: (key: String, summary: PlayerScoreSummary)?
    private var cachedMyrnaSummary: (key: String, summary: PlayerScoreSummary)?

    private var scoreCacheKey: String {
        "\(checkIns.count)-\(habits.count)-\(restDays.count)-\(selectedDate)"
    }

    public init() {
        loadInitialState()
        setupSupabaseCallbacks()
        Task {
            await initializeHealthKitAndSync()
        }
    }

    // MARK: - Initial State Load

    private func loadInitialState() {
        let state = persistence.loadOrCreateInitialState()
        self.activePlayerId = state.activePlayerId
        self.duel = state.duel
        self.habits = state.habits
        self.checkIns = state.checkIns
        self.stakes = state.stakes
        self.reactions = state.reactions
        self.restDays = state.restDays
        self.soundEnabled = state.soundEnabled
        self.hapticsEnabled = state.hapticsEnabled
        self.healthKitEnabled = state.healthKitEnabled

        supabase.configure(with: state.supabaseConfig)
    }

    private func persistCurrentState() {
        let state = AppState(
            activePlayerId: activePlayerId,
            duel: duel,
            habits: habits,
            checkIns: checkIns,
            stakes: stakes,
            reactions: reactions,
            restDays: restDays,
            soundEnabled: soundEnabled,
            hapticsEnabled: hapticsEnabled,
            healthKitEnabled: healthKitEnabled,
            telemetry: [:]
        )
        persistence.saveState(state)
    }

    private func setupSupabaseCallbacks() {
        supabase.onRemoteChangeReceived = { [weak self] in
            Task { @MainActor [weak self] in
                await self?.refreshFromCloud()
            }
        }
        supabase.onRemoteReactionReceived = { [weak self] reaction in
            Task { @MainActor [weak self] in
                self?.handleIncomingReaction(reaction)
            }
        }
    }

    // MARK: - Computed Scores & Parity (Memoized)

    public var maciekSummary: PlayerScoreSummary {
        let key = scoreCacheKey
        if let cached = cachedMaciekSummary, cached.key == key {
            return cached.summary
        }
        let summary = ScoreCalculator.calculatePlayerScores(
            playerId: .maciek,
            checkIns: checkIns,
            habits: habits,
            restDays: restDays,
            today: selectedDate
        )
        cachedMaciekSummary = (key, summary)
        return summary
    }

    public var myrnaSummary: PlayerScoreSummary {
        let key = scoreCacheKey
        if let cached = cachedMyrnaSummary, cached.key == key {
            return cached.summary
        }
        let summary = ScoreCalculator.calculatePlayerScores(
            playerId: .myrna,
            checkIns: checkIns,
            habits: habits,
            restDays: restDays,
            today: selectedDate
        )
        cachedMyrnaSummary = (key, summary)
        return summary
    }

    public var activePlayerSummary: PlayerScoreSummary {
        activePlayerId == .maciek ? maciekSummary : myrnaSummary
    }

    public var opponentSummary: PlayerScoreSummary {
        activePlayerId == .maciek ? myrnaSummary : maciekSummary
    }

    public var activePlayerName: String {
        duel.name(for: activePlayerId)
    }

    public var opponentName: String {
        duel.name(for: activePlayerId.opponent)
    }

    public var activePlayerColor: Color {
        duel.color(for: activePlayerId).color
    }

    public var opponentColor: Color {
        duel.color(for: activePlayerId.opponent).color
    }

    public func summary(for playerId: PlayerId) -> PlayerScoreSummary {
        playerId == .maciek ? maciekSummary : myrnaSummary
    }

    public func versus(tier: LeaderboardTier) -> VersusComparison {
        ScoreCalculator.getVersusComparison(
            maciekSummary: maciekSummary,
            myrnaSummary: myrnaSummary,
            tier: tier
        )
    }

    public var activeHabitsForSelectedDate: [Habit] {
        habits
            .filter { $0.playerId == activePlayerId && $0.isActive && !$0.isArchived }
            .sorted { $0.order < $1.order }
    }

    public func isHabitCompletedToday(_ habitId: String) -> Bool {
        checkIns.contains { $0.habitId == habitId && $0.date == selectedDate }
    }

    public func checkInForToday(_ habitId: String) -> CheckIn? {
        checkIns.first { $0.habitId == habitId && $0.date == selectedDate }
    }

    public var isRestDayDeclaredForSelectedDate: Bool {
        restDays.contains { $0.playerId == activePlayerId && $0.date == selectedDate }
    }

    public var activePlayerBadges: [PlayerBadgeStatus] {
        BadgeCalculator.calculatePlayerBadges(
            playerId: activePlayerId,
            checkIns: checkIns,
            habits: habits,
            stakes: stakes,
            currentStreak: activePlayerSummary.currentStreak
        )
    }

    public var categoryBreakdown: [CategoryComparison] {
        ScoreCalculator.getCategoryBreakdown(
            checkIns: checkIns,
            habits: habits,
            scope: .weekly,
            today: selectedDate
        )
    }

    public var dailyBattlePoints: [DailyDuelPoint] {
        ScoreCalculator.getWeeklyDailyDuelPoints(
            checkIns: checkIns,
            today: selectedDate
        )
    }

    public var activeWeeklyStake: Stake? {
        let weekKey = DateUtils.getWeekKey(for: selectedDate)
        return stakes.first { $0.period == .weekly && $0.periodKey == weekKey }
    }

    public var activeMonthlyStake: Stake? {
        let monthKey = DateUtils.getMonthKey(for: selectedDate)
        return stakes.first { $0.period == .monthly && $0.periodKey == monthKey }
    }

    // MARK: - User Actions

    public func toggleCheckIn(
        habit: Habit,
        quantity: Int? = nil,
        proofUrl: String? = nil,
        note: String? = nil
    ) {
        let habitId = habit.id
        if let existing = checkInForToday(habitId) {
            checkIns.removeAll { $0.id == existing.id }
            haptics.impactLight()
            sound.playMechanicalClick()
            persistence.enqueueMutation(type: "DELETE", table: "duel_check_ins", payload: ["id": existing.id])
        } else {
            let pts = habit.isQuantitative ? min(habit.points, (quantity ?? 1) * (habit.pointsPerUnit ?? 1)) : habit.points
            let newCheckIn = CheckIn(
                id: UUID().uuidString,
                habitId: habitId,
                playerId: activePlayerId,
                date: selectedDate,
                pointsEarned: pts,
                quantity: quantity,
                proofUrl: proofUrl,
                completedAt: ISO8601DateFormatter().string(from: Date()),
                note: note
            )
            checkIns.append(newCheckIn)

            let todayScore = activePlayerSummary.today
            if todayScore >= 240 {
                haptics.notificationSuccess()
                sound.playParVictory()
            } else {
                haptics.impactMedium()
                sound.playMechanicalClick()
            }

            if let dict = try? newCheckIn.asDictionary() {
                persistence.enqueueMutation(type: "INSERT", table: "duel_check_ins", payload: dict)
            }
        }
        persistCurrentState()
    }

    public func toggleRestDay() {
        if let existing = restDays.first(where: { $0.playerId == activePlayerId && $0.date == selectedDate }) {
            restDays.removeAll { $0.id == existing.id }
            haptics.impactLight()
            persistence.enqueueMutation(type: "DELETE", table: "duel_rest_days", payload: ["id": existing.id])
        } else {
            let rd = RestDay(playerId: activePlayerId, date: selectedDate)
            restDays.append(rd)
            haptics.impactLight()
            if let dict = try? rd.asDictionary() {
                persistence.enqueueMutation(type: "INSERT", table: "duel_rest_days", payload: dict)
            }
        }
        persistCurrentState()
    }

    public func sendReaction(emoji: String, message: String) {
        let r = CouplesReaction(
            fromPlayerId: activePlayerId,
            toPlayerId: activePlayerId.opponent,
            emoji: emoji,
            message: message
        )
        reactions.append(r)
        haptics.impactLight()
        sound.playCheerReaction()
        persistCurrentState()

        Task {
            await supabase.broadcastReaction(r)
        }
    }

    public func switchActivePlayer(_ newPlayerId: PlayerId) {
        guard activePlayerId != newPlayerId else { return }
        activePlayerId = newPlayerId
        haptics.selectionChanged()
        persistCurrentState()
    }

    public func selectDate(_ newDate: String) {
        guard selectedDate != newDate else { return }
        selectedDate = newDate
        haptics.selectionChanged()
    }

    public func updatePlayerColor(_ color: PlayerColorId) {
        if activePlayerId == .maciek {
            duel.ownerColor = color.rawValue
        } else {
            duel.guestColor = color.rawValue
        }
        haptics.impactLight()
        persistCurrentState()
        Task {
            await supabase.setPlayerColor(color: color.rawValue, slot: activePlayerId.rawValue)
        }
    }

    // MARK: - Cloud Synchronization

    public func refreshFromCloud() async {
        guard !isSyncing else { return }
        isSyncing = true
        defer { isSyncing = false }

        do {
            if let duelId = duel.id, !duelId.isEmpty {
                let remoteCheckIns = try await supabase.fetchCheckIns(duelId: duelId)
                if !remoteCheckIns.isEmpty {
                    self.checkIns = remoteCheckIns
                }
                let remoteReactions = try await supabase.fetchReactions(duelId: duelId)
                self.reactions = remoteReactions
            }
            await persistence.drainOutboxQueue(via: supabase)
            isOffline = false
        } catch {
            isOffline = true
        }
    }

    private func handleIncomingReaction(_ reaction: CouplesReaction) {
        guard reaction.toPlayerId == activePlayerId else { return }
        self.activeReactionToast = reaction
        haptics.notificationSuccess()
        sound.playCheerReaction()
    }

    private func initializeHealthKitAndSync() async {
        guard healthKitEnabled else { return }
        let authorized = await healthKit.requestAuthorization()
        if authorized {
            healthKit.enableBackgroundDelivery()
            _ = await healthKit.syncDailyTelemetry(for: selectedDate, playerId: activePlayerId)
        }
    }
}
