package com.doit.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddComment
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.LocalFireDepartment
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
import com.doit.app.model.PlayerColorId
import com.doit.app.model.Stake
import com.doit.app.model.StakeStatus
import com.doit.app.ui.components.*
import com.doit.app.ui.theme.*
import com.doit.app.ui.util.HapticFeedbackHelper
import com.doit.app.ui.viewmodel.DuelViewModel

@Composable
fun DuelScreen(
    viewModel: DuelViewModel,
    ownerColor: Color = PlayerBlue,
    guestColor: Color = PlayerPurple,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val haptics = remember { HapticFeedbackHelper(context) }

    val duel by viewModel.activeDuel.collectAsState(initial = null)
    val summary by viewModel.duelSummary.collectAsState()
    val dailyPoints by viewModel.dailyBattlePoints.collectAsState()
    val categoryDominance by viewModel.categoryDominance.collectAsState()
    val stakes by viewModel.stakes.collectAsState()
    val reactions by viewModel.reactions.collectAsState()

    var showReactionSheet by remember { mutableStateOf(false) }

    val ownerName = duel?.ownerName ?: "Maciek"
    val guestName = duel?.guestName ?: "Myrna"

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(LinearBg)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(4.dp))
            // Tug-of-war Bar
            TugOfWarBar(
                summary = summary,
                ownerName = ownerName,
                guestName = guestName,
                ownerColor = ownerColor,
                guestColor = guestColor
            )
        }

        // Active Stakes Card
        item {
            val activeStakes = stakes.filter { it.status == StakeStatus.ACTIVE }
            if (activeStakes.isNotEmpty()) {
                StakesCard(stakes = activeStakes)
            }
        }

        // Daily Battle Chart
        item {
            DailyBattleChart(
                points = dailyPoints,
                ownerColor = ownerColor,
                guestColor = guestColor
            )
        }

        // Category Dominance Card
        item {
            CategoryDominanceCard(
                comparisons = categoryDominance,
                ownerColor = ownerColor,
                guestColor = guestColor
            )
        }

        // Reaction / Cheers Section
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Cheer Activity",
                    style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = TextPrimary
                )
                Button(
                    onClick = {
                        haptics.click()
                        showReactionSheet = true
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = LinearSurfaceElevated),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    modifier = Modifier.border(1.dp, LinearBorder, RoundedCornerShape(8.dp))
                ) {
                    Icon(
                        Icons.Default.AddComment,
                        contentDescription = "Send Cheer",
                        tint = PlayerPurple,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Cheer Partner", fontSize = 12.sp, color = TextPrimary)
                }
            }
        }

        if (reactions.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(LinearSurface)
                        .border(1.dp, LinearBorderSubtle, RoundedCornerShape(10.dp))
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No cheers yet today. Send high fives or motivational flame reactions!",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                }
            }
        } else {
            items(reactions.take(10), key = { it.id }) { r ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(LinearSurface)
                        .border(1.dp, LinearBorderSubtle, RoundedCornerShape(8.dp))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(r.emoji, fontSize = 24.sp)
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (r.fromPlayerId.key == "maciek") ownerName else guestName,
                            style = Typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                            color = TextPrimary
                        )
                        if (r.message.isNotBlank()) {
                            Text(r.message, fontSize = 12.sp, color = TextSecondary)
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    if (showReactionSheet) {
        ReactionSheet(
            partnerName = guestName,
            onDismiss = { showReactionSheet = false },
            onSendReaction = { emoji, msg ->
                haptics.heavyClick()
                viewModel.sendReaction(emoji, msg)
            }
        )
    }
}

@Composable
private fun StakesCard(stakes: List<Stake>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(LinearSurface)
            .border(1.dp, LinearBorder, RoundedCornerShape(12.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Active Stakes",
                style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = TextPrimary
            )
            Icon(Icons.Default.EmojiEvents, contentDescription = "Stakes", tint = PlayerGold, modifier = Modifier.size(18.dp))
        }

        Spacer(modifier = Modifier.height(12.dp))

        stakes.forEach { stake ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(LinearSurfaceElevated)
                    .border(1.dp, LinearBorderSubtle, RoundedCornerShape(8.dp))
                    .padding(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stake.title,
                        style = Typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color(0xFF282315))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = stake.period.name,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = PlayerGold
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = stake.description,
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }
        }
    }
}
