package com.doit.app.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doit.app.data.repository.ScoreCalculator
import com.doit.app.model.Habit
import com.doit.app.model.PlayerColorId
import com.doit.app.model.PlayerId
import com.doit.app.ui.components.HabitItemCard
import com.doit.app.ui.components.ProofDialog
import com.doit.app.ui.theme.*
import com.doit.app.ui.util.HapticFeedbackHelper
import com.doit.app.ui.viewmodel.TodayViewModel

@Composable
fun TodayScreen(
    viewModel: TodayViewModel,
    ownerColor: Color = PlayerBlue,
    guestColor: Color = PlayerPurple,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val haptics = remember { HapticFeedbackHelper(context) }

    val activePlayer by viewModel.activePlayerId.collectAsState()
    val habits by viewModel.playerHabits.collectAsState()
    val checkIns by viewModel.allCheckIns.collectAsState()
    val dailyScore by viewModel.dailyScore.collectAsState()
    val isRestDay by viewModel.isRestDay.collectAsState()
    val habitStreaks by viewModel.habitStreaks.collectAsState()

    var proofHabitTarget by remember { mutableStateOf<Habit?>(null) }

    val playerColor = if (activePlayer == PlayerId.MACIEK) ownerColor else guestColor
    val progressRatio = (dailyScore.toFloat() / ScoreCalculator.DAILY_PAR_CEILING).coerceIn(0f, 1f)
    val animatedProgress by animateFloatAsState(
        targetValue = progressRatio,
        animationSpec = tween(durationMillis = 500),
        label = "parProgress"
    )

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(LinearBg)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(4.dp))
            // 240 Daily Par Card
            ParMeterCard(
                dailyScore = dailyScore,
                progress = animatedProgress,
                playerColor = playerColor,
                isRestDay = isRestDay,
                onSyncWearable = {
                    haptics.click()
                    viewModel.syncHealthConnect()
                },
                onToggleRestDay = {
                    haptics.tick()
                    viewModel.toggleRestDay()
                }
            )
        }

        if (isRestDay) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFF1E1B15))
                        .border(1.dp, PlayerOrange.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                        .padding(14.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Bedtime, contentDescription = "Rest Day", tint = PlayerOrange)
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Rest Day Active",
                                style = Typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = PlayerOrange
                            )
                            Text(
                                text = "Your habit streaks are safely preserved for today.",
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                        }
                    }
                }
            }
        }

        items(habits, key = { it.id }) { habit ->
            val checkIn = checkIns.find { it.habitId == habit.id && it.date == viewModel.selectedDate.value }
            val streak = habitStreaks[habit.id] ?: 0

            HabitItemCard(
                habit = habit,
                checkIn = checkIn,
                streak = streak,
                accentColor = playerColor,
                onToggle = { qty ->
                    if (checkIn == null) {
                        haptics.click()
                        if (dailyScore + habit.points >= ScoreCalculator.DAILY_PAR_CEILING) {
                            haptics.successPar()
                        }
                    } else {
                        haptics.tick()
                    }
                    viewModel.toggleCheckIn(habit, qty)
                },
                onProofClick = {
                    proofHabitTarget = habit
                }
            )
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    // Proof dialog if triggered
    proofHabitTarget?.let { habit ->
        ProofDialog(
            habit = habit,
            onDismiss = { proofHabitTarget = null },
            onSubmitProof = { url, note ->
                haptics.click()
                viewModel.toggleCheckIn(habit, quantity = null, proofUrl = url.ifEmpty { null }, note = note.ifEmpty { null })
            }
        )
    }
}

@Composable
private fun ParMeterCard(
    dailyScore: Int,
    progress: Float,
    playerColor: Color,
    isRestDay: Boolean,
    onSyncWearable: () -> Unit,
    onToggleRestDay: () -> Unit
) {
    val isParReached = dailyScore >= ScoreCalculator.DAILY_PAR_CEILING

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(LinearSurface)
            .border(
                1.dp,
                if (isParReached) ParComplete.copy(alpha = 0.6f) else LinearBorder,
                RoundedCornerShape(14.dp)
            )
            .padding(18.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Daily 240 Par",
                    style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = TextPrimary
                )
                Text(
                    text = if (isParReached) "Par Completed! Ceiling reached." else "${ScoreCalculator.DAILY_PAR_CEILING - dailyScore} pts to Par",
                    fontSize = 12.sp,
                    color = if (isParReached) ParComplete else TextSecondary
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                // Wearable Sync Icon
                IconButton(
                    onClick = onSyncWearable,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Default.Sync,
                        contentDescription = "Sync Health Connect",
                        tint = PlayerBlue,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(6.dp))

                // Rest Day Toggle Pill
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (isRestDay) PlayerOrange.copy(alpha = 0.2f) else LinearSurfaceElevated)
                        .border(1.dp, if (isRestDay) PlayerOrange else LinearBorderSubtle, RoundedCornerShape(14.dp))
                        .clickable { onToggleRestDay() }
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = if (isRestDay) "Resting" else "Rest Day",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (isRestDay) PlayerOrange else TextSecondary
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Progress Track
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(10.dp)
                .clip(RoundedCornerShape(5.dp))
                .background(LinearSurfaceElevated)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(progress)
                    .clip(RoundedCornerShape(5.dp))
                    .background(if (isParReached) ParComplete else playerColor)
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "$dailyScore pts",
                style = Typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = if (isParReached) ParComplete else playerColor
            )
            Text(
                text = "Target: 240",
                fontSize = 12.sp,
                color = TextMuted
            )
        }
    }
}
