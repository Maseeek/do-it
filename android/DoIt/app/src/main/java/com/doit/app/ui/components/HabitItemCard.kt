package com.doit.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doit.app.model.CheckIn
import com.doit.app.model.Habit
import com.doit.app.ui.theme.*

@Composable
fun HabitItemCard(
    habit: Habit,
    checkIn: CheckIn?,
    streak: Int,
    accentColor: Color = PlayerBlue,
    onToggle: (quantity: Int?) -> Unit,
    onProofClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val isCompleted = checkIn != null
    var quantityValue by remember(checkIn) {
        mutableIntStateOf(checkIn?.quantity ?: habit.maxQuantity ?: 25)
    }

    val borderColor by animateColorAsState(
        targetValue = if (isCompleted) accentColor.copy(alpha = 0.5f) else LinearBorder,
        label = "habitBorder"
    )

    val cardBg by animateColorAsState(
        targetValue = if (isCompleted) Color(0xFF14171E) else LinearSurface,
        label = "habitBg"
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(cardBg)
            .border(1.dp, borderColor, RoundedCornerShape(12.dp))
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (isCompleted) accentColor.copy(alpha = 0.2f) else LinearSurfaceElevated)
                    .border(1.dp, if (isCompleted) accentColor.copy(alpha = 0.4f) else LinearBorderSubtle, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getHabitCategoryIcon(habit.iconName),
                    contentDescription = habit.title,
                    tint = if (isCompleted) accentColor else TextSecondary,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Title & Description
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = habit.title,
                        style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = TextPrimary
                    )
                    if (streak > 0) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(Color(0xFF2E1A11))
                                .padding(horizontal = 5.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "🔥 $streak",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = PlayerOrange
                            )
                        }
                    }
                }

                if (habit.description.isNotBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = habit.description,
                        style = Typography.bodyMedium,
                        color = TextMuted,
                        maxLines = 1
                    )
                }
            }

            // Points Pill
            val ptsText = if (habit.isQuantitative && isCompleted) {
                "+${checkIn.pointsEarned} pts"
            } else {
                "+${habit.points} pts"
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(if (isCompleted) accentColor.copy(alpha = 0.15f) else LinearSurfaceElevated)
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = ptsText,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isCompleted) accentColor else TextSecondary
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            // Checkbox
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(if (isCompleted) accentColor else Color.Transparent)
                    .border(2.dp, if (isCompleted) accentColor else TextMuted, CircleShape)
                    .clickable { onToggle(if (habit.isQuantitative) quantityValue else null) },
                contentAlignment = Alignment.Center
            ) {
                if (isCompleted) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Completed",
                        tint = LinearBg,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }

        // Quantitative stepper if applicable and not yet completed
        if (habit.isQuantitative && !isCompleted) {
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(LinearSurfaceElevated)
                    .padding(horizontal = 10.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Pages read: $quantityValue",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { if (quantityValue > 1) quantityValue-- },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Text("-", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                    IconButton(
                        onClick = { if (quantityValue < (habit.maxQuantity ?: 25)) quantityValue++ },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Text("+", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                }
            }
        }

        // Photo Proof pill if required
        if (habit.requiresProof) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .clickable { onProofClick() }
                    .padding(vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.PhotoCamera,
                    contentDescription = "Proof",
                    tint = if (checkIn?.proofUrl != null) ParComplete else TextMuted,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = if (checkIn?.proofUrl != null) "Photo attached" else "Attach photo proof",
                    fontSize = 11.sp,
                    color = if (checkIn?.proofUrl != null) ParComplete else TextMuted
                )
            }
        }
    }
}

private fun getHabitCategoryIcon(iconName: String): ImageVector {
    return when (iconName) {
        "Moon" -> Icons.Default.Bedtime
        "Dumbbell" -> Icons.Default.FitnessCenter
        "Flame" -> Icons.Default.LocalFireDepartment
        "BookOpen" -> Icons.Default.MenuBook
        "Code" -> Icons.Default.Code
        "Target" -> Icons.Default.TrackChanges
        "Apple" -> Icons.Default.Restaurant
        "CheckCircle2" -> Icons.Default.CheckCircle
        "Sparkles" -> Icons.Default.AutoAwesome
        "Globe" -> Icons.Default.Language
        "Footprints" -> Icons.Default.DirectionsWalk
        "Sun" -> Icons.Default.WbSunny
        "Briefcase" -> Icons.Default.Work
        else -> Icons.Default.Star
    }
}
