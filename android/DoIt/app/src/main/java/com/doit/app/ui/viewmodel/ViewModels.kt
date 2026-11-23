package com.doit.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doit.app.data.repository.BadgeCalculator
import com.doit.app.data.repository.DuelRepository
import com.doit.app.data.repository.ScoreCalculator
import com.doit.app.data.repository.StreakCalculator
import com.doit.app.model.*
import com.doit.app.ui.components.NavTab
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate

class MainViewModel(
    val repository: DuelRepository
) : ViewModel() {
    val selectedTab = MutableStateFlow(NavTab.TODAY)
    val activePlayerId = repository.activePlayerId
    val selectedDate = repository.selectedDate
    val activeDuel = repository.activeDuelFlow.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    fun selectTab(tab: NavTab) { selectedTab.value = tab }
    fun selectPlayer(id: PlayerId) { repository.activePlayerId.value = id }
    fun selectDate(date: String) { repository.selectedDate.value = date }
}

class TodayViewModel(
    private val repository: DuelRepository
) : ViewModel() {
    val activePlayerId = repository.activePlayerId
    val selectedDate = repository.selectedDate
    val activeDuel = repository.activeDuelFlow

    private val allHabits = activeDuel.flatMapLatest { duel ->
        if (duel != null) repository.getHabitsFlow(duel.id) else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allCheckIns = activeDuel.flatMapLatest { duel ->
        if (duel != null) repository.getCheckInsFlow(duel.id) else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allRestDays = activeDuel.flatMapLatest { duel ->
        if (duel != null) repository.getRestDaysFlow(duel.id) else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val playerHabits = combine(allHabits, activePlayerId) { habits, player ->
        habits.filter { it.playerId == player && it.isActive }.sortedBy { it.order }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val dailyScore = combine(allCheckIns, activePlayerId, selectedDate) { checkIns, player, date ->
        ScoreCalculator.calculateDailyPoints(player, date, checkIns)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val isRestDay = combine(allRestDays, activePlayerId, selectedDate) { restDays, player, date ->
        restDays.any { it.playerId == player && it.date == date }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    // Build index once per checkIns update, avoiding O(H * N) repeated passes & parsing
    val habitStreaks = combine(allHabits, allCheckIns, allRestDays, selectedDate) { habits, checkIns, restDays, date ->
        val refDate = LocalDate.parse(date)
        val index = StreakCalculator.buildIndex(checkIns)
        habits.associate { habit ->
            habit.id to StreakCalculator.calculateHabitStreak(habit, checkIns, restDays, refDate, index)
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    fun toggleCheckIn(habit: Habit, quantity: Int? = null, proofUrl: String? = null, note: String? = null) {
        viewModelScope.launch {
            repository.toggleCheckIn(habit, selectedDate.value, quantity, proofUrl, note)
        }
    }

    fun toggleRestDay() {
        viewModelScope.launch {
            repository.toggleRestDay(selectedDate.value)
        }
    }

    fun syncHealthConnect() {
        viewModelScope.launch {
            repository.syncHealthConnectForDate(selectedDate.value)
        }
    }
}

class DuelViewModel(
    private val repository: DuelRepository
) : ViewModel() {
    val activeDuel = repository.activeDuelFlow
    val selectedDate = repository.selectedDate

    private val allHabits = activeDuel.flatMapLatest { duel ->
        if (duel != null) repository.getHabitsFlow(duel.id) else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val allCheckIns = activeDuel.flatMapLatest { duel ->
        if (duel != null) repository.getCheckInsFlow(duel.id) else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val stakes = activeDuel.flatMapLatest { duel ->
        if (duel != null) repository.getStakesFlow(duel.id) else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val reactions = activeDuel.flatMapLatest { duel ->
        if (duel != null) repository.getReactionsFlow(duel.id) else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val duelSummary = combine(allCheckIns, selectedDate) { checkIns, date ->
        ScoreCalculator.calculateDuelSummary(checkIns, LeaderboardScope.WEEKLY, LocalDate.parse(date))
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DuelScoreSummary(0, 0, "tie", 0, 0.5f, 0.5f))

    val dailyBattlePoints = combine(allCheckIns, selectedDate) { checkIns, date ->
        ScoreCalculator.getWeeklyDailyDuelPoints(checkIns, LocalDate.parse(date))
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val categoryDominance = combine(allCheckIns, allHabits, selectedDate) { checkIns, habits, date ->
        ScoreCalculator.getCategoryBreakdown(checkIns, habits, LeaderboardScope.WEEKLY, LocalDate.parse(date))
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun sendReaction(emoji: String, message: String) {
        viewModelScope.launch {
            repository.sendReaction(emoji, message)
        }
    }
}

class ProgressViewModel(
    private val repository: DuelRepository
) : ViewModel() {
    val activePlayerId = repository.activePlayerId
    val activeDuel = repository.activeDuelFlow
    val selectedScope = MutableStateFlow(LeaderboardScope.WEEKLY)

    private val allHabits = activeDuel.flatMapLatest { duel ->
        if (duel != null) repository.getHabitsFlow(duel.id) else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allCheckIns = activeDuel.flatMapLatest { duel ->
        if (duel != null) repository.getCheckInsFlow(duel.id) else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val allRestDays = activeDuel.flatMapLatest { duel ->
        if (duel != null) repository.getRestDaysFlow(duel.id) else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val allStakes = activeDuel.flatMapLatest { duel ->
        if (duel != null) repository.getStakesFlow(duel.id) else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val currentStreak = combine(activePlayerId, allCheckIns, allRestDays) { player, checkIns, restDays ->
        val index = StreakCalculator.buildIndex(checkIns)
        StreakCalculator.calculateOverallPlayerStreak(player, checkIns, restDays, LocalDate.now(), index)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val lifetimeKarma = combine(activePlayerId, allCheckIns) { player, checkIns ->
        ScoreCalculator.calculateKarma(player, checkIns)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val badges = combine(activePlayerId, allCheckIns, allHabits, allStakes, currentStreak) { player, checkIns, habits, stakes, streak ->
        BadgeCalculator.calculateBadges(player, checkIns, habits, stakes, streak)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val leaderboardStandings = combine(allCheckIns, selectedScope, activeDuel) { checkIns, scope, duel ->
        val maciekKarma = if (scope == LeaderboardScope.LIFETIME_KARMA) {
            ScoreCalculator.calculateKarma(PlayerId.MACIEK, checkIns)
        } else {
            val s = ScoreCalculator.calculateDuelSummary(checkIns, scope)
            s.maciekScore
        }

        val myrnaKarma = if (scope == LeaderboardScope.LIFETIME_KARMA) {
            ScoreCalculator.calculateKarma(PlayerId.MYRNA, checkIns)
        } else {
            val s = ScoreCalculator.calculateDuelSummary(checkIns, scope)
            s.myrnaScore
        }

        val ownerName = duel?.ownerName ?: "Maciek"
        val guestName = duel?.guestName ?: "Myrna"
        val ownerColor = PlayerColorId.fromId(duel?.ownerColor)
        val guestColor = PlayerColorId.fromId(duel?.guestColor)

        listOf(
            Standing(
                playerId = PlayerId.MACIEK,
                name = ownerName,
                avatar = "⚡",
                score = maciekKarma,
                color = ownerColor
            ),
            Standing(
                playerId = PlayerId.MYRNA,
                name = guestName,
                avatar = "✨",
                score = myrnaKarma,
                color = guestColor
            )
        ).sortedByDescending { it.score }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    data class Standing(
        val playerId: PlayerId,
        val name: String,
        val avatar: String,
        val score: Int,
        val color: PlayerColorId
    )
}

class SettingsViewModel(
    private val repository: DuelRepository
) : ViewModel() {
    val activeDuel = repository.activeDuelFlow
    val activePlayerId = repository.activePlayerId

    fun switchPlayer(id: PlayerId) {
        repository.activePlayerId.value = id
    }

    fun updatePlayerColor(color: PlayerColorId) {
        viewModelScope.launch {
            repository.updatePlayerColor(color)
        }
    }

    fun updatePlayerName(name: String) {
        viewModelScope.launch {
            repository.updatePlayerName(name)
        }
    }

    fun joinDuel(inviteCode: String) {
        viewModelScope.launch {
            repository.joinDuelByInviteCode(inviteCode)
        }
    }
}
