package com.doit.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doit.app.model.PlayerBadgeStatus
import com.doit.app.ui.theme.*

@Composable
fun TrophyCabinet(
    badges: List<PlayerBadgeStatus>,
    accentColor: Color = PlayerGold,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(LinearSurface)
            .border(1.dp, LinearBorder, RoundedCornerShape(12.dp))
            .padding(16.dp)
    ) {
        val unlockedCount = badges.count { it.isUnlocked }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Trophy Cabinet",
                style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = TextPrimary
            )
            Text(
                text = "$unlockedCount / ${badges.size} Unlocked",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = if (unlockedCount > 0) accentColor else TextSecondary
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Grid of badges (2 columns)
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            badges.chunked(2).forEach { rowBadges ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    rowBadges.forEach { badgeStatus ->
                        BadgeCard(
                            status = badgeStatus,
                            accentColor = accentColor,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    if (rowBadges.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun BadgeCard(
    status: PlayerBadgeStatus,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    val b = status.badge
    val isUnlocked = status.isUnlocked

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (isUnlocked) Color(0xFF16181E) else LinearSurfaceElevated)
            .border(
                1.dp,
                if (isUnlocked) accentColor.copy(alpha = 0.5f) else LinearBorderSubtle,
                RoundedCornerShape(10.dp)
            )
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (isUnlocked) accentColor.copy(alpha = 0.2f) else Color(0xFF222328)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getBadgeIcon(b.icon),
                    contentDescription = b.title,
                    tint = if (isUnlocked) accentColor else TextMuted,
                    modifier = Modifier.size(18.dp)
                )
            }

            if (!isUnlocked) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = "Locked",
                    tint = TextMuted,
                    modifier = Modifier.size(14.dp)
                )
            } else {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "Unlocked",
                    tint = accentColor,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = b.title,
            style = Typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
            color = if (isUnlocked) TextPrimary else TextSecondary,
            maxLines = 1
        )

        Spacer(modifier = Modifier.height(2.dp))

        Text(
            text = b.description,
            fontSize = 11.sp,
            color = TextMuted,
            maxLines = 2,
            lineHeight = 14.sp
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Progress bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(Color(0xFF2A2B30))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(status.progress / 100f)
                    .background(if (isUnlocked) accentColor else PlayerBlue)
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "${status.currentValue} / ${b.targetCount}",
            fontSize = 10.sp,
            color = TextMuted
        )
    }
}

private fun getBadgeIcon(iconName: String): ImageVector {
    return when (iconName) {
        "Zap" -> Icons.Default.FlashOn
        "Trophy" -> Icons.Default.EmojiEvents
        "Flame" -> Icons.Default.LocalFireDepartment
        "Sparkles" -> Icons.Default.AutoAwesome
        "BookOpen" -> Icons.Default.MenuBook
        "Camera" -> Icons.Default.PhotoCamera
        "Dumbbell" -> Icons.Default.FitnessCenter
        "Globe" -> Icons.Default.Language
        "Code" -> Icons.Default.Code
        "HeartHandshake" -> Icons.Default.Favorite
        "Award" -> Icons.Default.MilitaryTech
        else -> Icons.Default.Star
    }
}
