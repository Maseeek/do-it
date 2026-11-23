package com.doit.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doit.app.model.LeaderboardScope
import com.doit.app.model.LeaderboardStanding
import com.doit.app.model.PlayerColorId
import com.doit.app.model.PlayerId
import com.doit.app.ui.components.HeatmapGrid
import com.doit.app.ui.components.TrophyCabinet
import com.doit.app.ui.theme.*
import com.doit.app.ui.viewmodel.ProgressViewModel

@Composable
fun ProgressScreen(
    viewModel: ProgressViewModel,
    ownerColor: Color = PlayerBlue,
    guestColor: Color = PlayerPurple,
    modifier: Modifier = Modifier
) {
    val activePlayerId by viewModel.activePlayerId.collectAsState()
    val checkIns by viewModel.allCheckIns.collectAsState()
    val badges by viewModel.badges.collectAsState()
    val standings by viewModel.leaderboardStandings.collectAsState()
    val selectedScope by viewModel.selectedScope.collectAsState()
    val streak by viewModel.currentStreak.collectAsState()
    val karma by viewModel.lifetimeKarma.collectAsState()

    val playerAccent = if (activePlayerId == PlayerId.MACIEK) ownerColor else guestColor

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(LinearBg)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(4.dp))
            // Quick Stat Banner (Streak & Lifetime Karma)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Streak Card
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(LinearSurface)
                        .border(1.dp, LinearBorder, RoundedCornerShape(12.dp))
                        .padding(14.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocalFireDepartment, contentDescription = "Streak", tint = PlayerOrange, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Active Streak", fontSize = 12.sp, color = TextSecondary)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "$streak Days",
                        style = Typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )
                }

                // Lifetime Karma Card
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(LinearSurface)
                        .border(1.dp, LinearBorder, RoundedCornerShape(12.dp))
                        .padding(14.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.EmojiEvents, contentDescription = "Karma", tint = PlayerGold, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Lifetime Karma", fontSize = 12.sp, color = TextSecondary)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "$karma pts",
                        style = Typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )
                }
            }
        }

        // Leaderboard Scope Selector
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(LinearSurfaceElevated)
                    .border(1.dp, LinearBorder, RoundedCornerShape(10.dp))
                    .padding(3.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                LeaderboardScope.entries.forEach { scope ->
                    val isSelected = (scope == selectedScope)
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSelected) LinearSurface else Color.Transparent)
                            .clickable { viewModel.selectScope(scope) }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = when (scope) {
                                LeaderboardScope.WEEKLY -> "Weekly"
                                LeaderboardScope.MONTHLY -> "Monthly"
                                LeaderboardScope.YEARLY -> "Yearly"
                                LeaderboardScope.LIFETIME_KARMA -> "Karma"
                            },
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) TextPrimary else TextMuted
                        )
                    }
                }
            }
        }

        // Leaderboard Standings Card
        item {
            StandingsCard(
                standings = standings,
                scopeTitle = selectedScope.title
            )
        }

        // 12-Week Heatmap Matrix
        item {
            HeatmapGrid(
                playerId = activePlayerId,
                checkIns = checkIns,
                playerColor = playerAccent
            )
        }

        // Trophy Cabinet (12 badges)
        item {
            TrophyCabinet(
                badges = badges,
                accentColor = PlayerGold
            )
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun StandingsCard(
    standings: List<LeaderboardStanding>,
    scopeTitle: String
) {
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
                text = "Leaderboard: $scopeTitle",
                style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = TextPrimary
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        standings.forEach { standing ->
            val pColor = Color(android.graphics.Color.parseColor(standing.player.colorId.hexColor))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 5.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(LinearSurfaceElevated)
                    .border(
                        1.dp,
                        if (standing.isAhead) pColor.copy(alpha = 0.5f) else LinearBorderSubtle,
                        RoundedCornerShape(8.dp)
                    )
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Rank Pill
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (standing.rank == 1) PlayerGold.copy(alpha = 0.2f) else Color(0xFF222328)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (standing.rank == 1) "👑" else "#${standing.rank}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (standing.rank == 1) PlayerGold else TextMuted
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Text(
                    text = standing.player.name,
                    style = Typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                    color = TextPrimary,
                    modifier = Modifier.weight(1f)
                )

                Text(
                    text = "${standing.score} pts",
                    style = Typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = pColor
                )
            }
        }
    }
}
