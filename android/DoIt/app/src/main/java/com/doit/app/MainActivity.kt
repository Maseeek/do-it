package com.doit.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.health.connect.client.PermissionController
import com.doit.app.data.repository.DuelRepository
import com.doit.app.model.Player
import com.doit.app.model.PlayerColorId
import com.doit.app.model.PlayerId
import com.doit.app.ui.components.DoItBottomNav
import com.doit.app.ui.components.DoItTopBar
import com.doit.app.ui.components.NavTab
import com.doit.app.ui.screens.DuelScreen
import com.doit.app.ui.screens.ProgressScreen
import com.doit.app.ui.screens.SettingsScreen
import com.doit.app.ui.screens.TodayScreen
import com.doit.app.ui.theme.DoItTheme
import com.doit.app.ui.theme.LinearBg
import com.doit.app.ui.viewmodel.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var repository: DuelRepository
    private lateinit var mainViewModel: MainViewModel
    private lateinit var todayViewModel: TodayViewModel
    private lateinit var duelViewModel: DuelViewModel
    private lateinit var progressViewModel: ProgressViewModel
    private lateinit var settingsViewModel: SettingsViewModel

    private val requestHealthPermissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { grantedPermissions ->
        if (grantedPermissions.containsAll(repository.healthConnectManager.requiredPermissions)) {
            // Permissions granted - trigger sync
            lifecycleScopeLaunch {
                repository.syncHealthConnectForDate(repository.selectedDate.value)
            }
        }
    }

    private fun lifecycleScopeLaunch(block: suspend () -> Unit) {
        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch {
            block()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        repository = DuelRepository(applicationContext)
        mainViewModel = MainViewModel(repository)
        todayViewModel = TodayViewModel(repository)
        duelViewModel = DuelViewModel(repository)
        progressViewModel = ProgressViewModel(repository)
        settingsViewModel = SettingsViewModel(repository)

        // Check Health Connect permissions on launch
        if (repository.healthConnectManager.isAvailable) {
            lifecycleScopeLaunch {
                if (!repository.healthConnectManager.hasAllPermissions()) {
                    requestHealthPermissionLauncher.launch(repository.healthConnectManager.requiredPermissions)
                }
            }
        }

        setContent {
            DoItTheme {
                MainAppScreen(
                    mainViewModel = mainViewModel,
                    todayViewModel = todayViewModel,
                    duelViewModel = duelViewModel,
                    progressViewModel = progressViewModel,
                    settingsViewModel = settingsViewModel
                )
            }
        }
    }
}

@Composable
fun MainAppScreen(
    mainViewModel: MainViewModel,
    todayViewModel: TodayViewModel,
    duelViewModel: DuelViewModel,
    progressViewModel: ProgressViewModel,
    settingsViewModel: SettingsViewModel
) {
    val selectedTab by mainViewModel.selectedTab.collectAsState()
    val activePlayerId by mainViewModel.activePlayerId.collectAsState()
    val selectedDate by mainViewModel.selectedDate.collectAsState()
    val duel by mainViewModel.activeDuel.collectAsState()

    val ownerColor = Color(android.graphics.Color.parseColor(PlayerColorId.fromId(duel?.ownerColor).hexColor))
    val guestColor = Color(android.graphics.Color.parseColor(PlayerColorId.fromId(duel?.guestColor).hexColor))
    val currentAccentColor = if (activePlayerId == PlayerId.MACIEK) ownerColor else guestColor

    val playersMap = remember(duel) {
        val oName = duel?.ownerName ?: "Maciek"
        val gName = duel?.guestName ?: "Myrna"
        mapOf(
            PlayerId.MACIEK to Player(PlayerId.MACIEK, oName, "⚡", PlayerColorId.fromId(duel?.ownerColor)),
            PlayerId.MYRNA to Player(PlayerId.MYRNA, gName, "✨", PlayerColorId.fromId(duel?.guestColor))
        )
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .background(LinearBg),
        topBar = {
            DoItTopBar(
                selectedDateStr = selectedDate,
                activePlayerId = activePlayerId,
                players = playersMap,
                onDateChange = { mainViewModel.selectDate(it) },
                onPlayerChange = { mainViewModel.selectPlayer(it) }
            )
        },
        bottomBar = {
            DoItBottomNav(
                selectedTab = selectedTab,
                onTabSelected = { mainViewModel.selectTab(it) },
                activePlayerColor = currentAccentColor
            )
        },
        containerColor = LinearBg
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (selectedTab) {
                NavTab.TODAY -> TodayScreen(
                    viewModel = todayViewModel,
                    ownerColor = ownerColor,
                    guestColor = guestColor
                )
                NavTab.DUEL -> DuelScreen(
                    viewModel = duelViewModel,
                    ownerColor = ownerColor,
                    guestColor = guestColor
                )
                NavTab.PROGRESS -> ProgressScreen(
                    viewModel = progressViewModel,
                    ownerColor = ownerColor,
                    guestColor = guestColor
                )
                NavTab.SETTINGS -> SettingsScreen(
                    viewModel = settingsViewModel,
                    ownerColor = ownerColor,
                    guestColor = guestColor
                )
            }
        }
    }
}
