package com.doit.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doit.app.model.DuelScoreSummary
import com.doit.app.model.PlayerColorId
import com.doit.app.ui.theme.*

@Composable
fun TugOfWarBar(
    summary: DuelScoreSummary,
    ownerName: String = "Maciek",
    guestName: String = "Myrna",
    ownerColor: Color = PlayerBlue,
    guestColor: Color = PlayerPurple,
    modifier: Modifier = Modifier
) {
    val animatedMaciekPct by animateFloatAsState(
        targetValue = summary.maciekPct.coerceIn(0.05f, 0.95f),
        animationSpec = tween(durationMillis = 600),
        label = "tugOfWar"
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(LinearSurface)
            .border(1.dp, LinearBorder, RoundedCornerShape(12.dp))
            .padding(16.dp)
    ) {
        // Names and Points
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(ownerColor)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = ownerName,
                    style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "${summary.maciekScore} pts",
                    style = Typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                    color = ownerColor
                )
            }

            // Lead Badge
            val deltaText = if (summary.leader == "tie") {
                "TIED"
            } else {
                val leadName = if (summary.leader == "maciek") ownerName else guestName
                "+${summary.delta} $leadName"
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(LinearSurfaceElevated)
                    .border(1.dp, LinearBorder, RoundedCornerShape(6.dp))
                    .padding(horizontal = 8.dp, vertical = 3.dp)
            ) {
                Text(
                    text = deltaText,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (summary.leader == "tie") TextSecondary else if (summary.leader == "maciek") ownerColor else guestColor
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${summary.myrnaScore} pts",
                    style = Typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                    color = guestColor
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = guestName,
                    style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.width(6.dp))
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(guestColor)
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Split Bar
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
                    .weight(animatedMaciekPct)
                    .background(ownerColor)
            )
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(2.dp)
                    .background(LinearBg)
            )
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .weight(1f - animatedMaciekPct)
                    .background(guestColor)
            )
        }
    }
}
