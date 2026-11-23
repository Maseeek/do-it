package com.doit.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doit.app.model.CheckIn
import com.doit.app.model.PlayerId
import com.doit.app.ui.theme.*
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

@Composable
fun HeatmapGrid(
    playerId: PlayerId,
    checkIns: List<CheckIn>,
    playerColor: Color = PlayerBlue,
    modifier: Modifier = Modifier
) {
    val today = remember { LocalDate.now() }
    val currentMonday = remember(today) { today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) }
    val startMonday = remember(currentMonday) { currentMonday.minusWeeks(11) }

    // Precalculate points per date efficiently with single pass and memoization
    val pointsMap = remember(checkIns, playerId) {
        val map = mutableMapOf<String, Int>()
        for (checkIn in checkIns) {
            if (checkIn.playerId == playerId) {
                map[checkIn.date] = (map[checkIn.date] ?: 0) + checkIn.pointsEarned
            }
        }
        map
    }

    Column(
        modifier = modifier
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
                text = "12-Week Consistency Matrix",
                style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = TextPrimary
            )
            Text(
                text = "84 Days",
                style = Typography.bodySmall,
                color = TextMuted
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Grid: 7 rows (Mon..Sun) by 12 columns (weeks)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            for (weekOffset in 0..11) {
                val weekMonday = startMonday.plusWeeks(weekOffset.toLong())
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    for (dayOffset in 0..6) {
                        val cellDate = weekMonday.plusDays(dayOffset.toLong())
                        val dateStr = cellDate.toString()
                        val points = pointsMap[dateStr] ?: 0
                        val isFuture = cellDate.isAfter(today)

                        val cellAlpha = when {
                            isFuture -> 0.05f
                            points == 0 -> 0.1f
                            points < 60 -> 0.35f
                            points < 120 -> 0.6f
                            points < 200 -> 0.85f
                            else -> 1f
                        }

                        val cellColor = if (isFuture) TextMuted else playerColor

                        Box(
                            modifier = Modifier
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(2.dp))
                                .background(cellColor.copy(alpha = cellAlpha))
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Legend
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = "Less", style = Typography.bodySmall.copy(fontSize = 10.sp), color = TextMuted)
            Spacer(modifier = Modifier.width(6.dp))
            listOf(0.1f, 0.35f, 0.6f, 0.85f, 1f).forEach { alpha ->
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(playerColor.copy(alpha = alpha))
                )
                Spacer(modifier = Modifier.width(3.dp))
            }
            Text(text = "240 Par", style = Typography.bodySmall.copy(fontSize = 10.sp), color = TextMuted)
        }
    }
}
