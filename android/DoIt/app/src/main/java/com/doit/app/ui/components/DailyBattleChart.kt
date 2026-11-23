package com.doit.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doit.app.data.repository.ScoreCalculator
import com.doit.app.model.DailyDuelPoint
import com.doit.app.ui.theme.*
import kotlin.math.max

@Composable
fun DailyBattleChart(
    points: List<DailyDuelPoint>,
    ownerColor: Color = PlayerBlue,
    guestColor: Color = PlayerPurple,
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
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Daily Duel Battle",
                style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = TextPrimary
            )
            Text(
                text = "240 Par Ceiling",
                fontSize = 12.sp,
                color = TextSecondary
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        val maxDaily = ScoreCalculator.DAILY_PAR_CEILING.toFloat()

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            points.forEach { pt ->
                val maciekHeightRatio = (pt.maciekPoints / maxDaily).coerceIn(0.04f, 1f)
                val myrnaHeightRatio = (pt.myrnaPoints / maxDaily).coerceIn(0.04f, 1f)

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.weight(1f)
                ) {
                    // Bars container
                    Row(
                        modifier = Modifier
                            .height(110.dp)
                            .fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        // Maciek bar
                        Box(
                            modifier = Modifier
                                .width(8.dp)
                                .fillMaxHeight(maciekHeightRatio)
                                .clip(RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp))
                                .background(if (pt.isFuture) LinearBorderSubtle else ownerColor)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        // Myrna bar
                        Box(
                            modifier = Modifier
                                .width(8.dp)
                                .fillMaxHeight(myrnaHeightRatio)
                                .clip(RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp))
                                .background(if (pt.isFuture) LinearBorderSubtle else guestColor)
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Day label
                    Text(
                        text = pt.dayName,
                        fontSize = 11.sp,
                        fontWeight = if (pt.isToday) FontWeight.Bold else FontWeight.Normal,
                        color = if (pt.isToday) TextPrimary else TextSecondary
                    )
                }
            }
        }
    }
}
