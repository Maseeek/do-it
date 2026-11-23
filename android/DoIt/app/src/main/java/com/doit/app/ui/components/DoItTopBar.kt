package com.doit.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doit.app.model.Player
import com.doit.app.model.PlayerId
import com.doit.app.ui.theme.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun DoItTopBar(
    selectedDateStr: String,
    activePlayerId: PlayerId,
    players: Map<PlayerId, Player>,
    onDateChange: (String) -> Unit,
    onPlayerChange: (PlayerId) -> Unit,
    modifier: Modifier = Modifier
) {
    val currentDate = LocalDate.parse(selectedDateStr)
    val today = LocalDate.now()
    val isToday = (currentDate == today)
    val dateFormatter = DateTimeFormatter.ofPattern("EEE, MMM d")

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(LinearBg)
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        // Row 1: Brand & Player Switcher
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Logo
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(PlayerBlue),
                    contentAlignment = Alignment.Center
                ) {
                    Text("D", fontWeight = FontWeight.Black, fontSize = 14.sp, color = LinearBg)
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "DO IT",
                    style = Typography.titleLarge.copy(fontWeight = FontWeight.Black, letterSpacing = 1.sp),
                    color = TextPrimary
                )
            }

            // Player Switcher Pill
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(LinearSurfaceElevated)
                    .border(1.dp, LinearBorder, RoundedCornerShape(20.dp))
                    .padding(3.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                PlayerId.entries.forEach { pId ->
                    val isSelected = (pId == activePlayerId)
                    val p = players[pId]
                    val pColor = if (pId == PlayerId.MACIEK) PlayerBlue else PlayerPurple

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (isSelected) pColor.copy(alpha = 0.25f) else Color.Transparent)
                            .border(
                                1.dp,
                                if (isSelected) pColor else Color.Transparent,
                                RoundedCornerShape(16.dp)
                            )
                            .clickable { onPlayerChange(pId) }
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = p?.name ?: pId.name,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) pColor else TextSecondary
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Row 2: Date Navigator
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(LinearSurface)
                .border(1.dp, LinearBorder, RoundedCornerShape(8.dp))
                .padding(horizontal = 4.dp, vertical = 2.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = { onDateChange(currentDate.minusDays(1).toString()) },
                modifier = Modifier.size(32.dp)
            ) {
                Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Day", tint = TextSecondary)
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { onDateChange(today.toString()) }
            ) {
                Text(
                    text = if (isToday) "Today, ${currentDate.format(dateFormatter)}" else currentDate.format(dateFormatter),
                    style = Typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = if (isToday) TextPrimary else PlayerOrange
                )
            }

            IconButton(
                onClick = { onDateChange(currentDate.plusDays(1).toString()) },
                modifier = Modifier.size(32.dp)
            ) {
                Icon(Icons.Default.ChevronRight, contentDescription = "Next Day", tint = TextSecondary)
            }
        }
    }
}
