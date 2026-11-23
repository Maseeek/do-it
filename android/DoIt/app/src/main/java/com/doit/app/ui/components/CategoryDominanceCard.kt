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
import com.doit.app.model.CategoryComparison
import com.doit.app.ui.theme.*
import kotlin.math.max

@Composable
fun CategoryDominanceCard(
    comparisons: List<CategoryComparison>,
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
        Text(
            text = "Category Dominance",
            style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
            color = TextPrimary
        )

        Spacer(modifier = Modifier.height(14.dp))

        comparisons.forEach { item ->
            val total = max(1, item.maciekPoints + item.myrnaPoints).toFloat()
            val maciekRatio = if (total > 0) (item.maciekPoints / total).coerceIn(0.05f, 0.95f) else 0.5f

            Column(modifier = Modifier.padding(vertical = 5.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = item.label,
                        style = Typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                        color = TextPrimary
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "${item.maciekPoints}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = ownerColor
                        )
                        Text(
                            text = " vs ",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                        Text(
                            text = "${item.myrnaPoints}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = guestColor
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Progress split
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(LinearSurfaceElevated)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .weight(maciekRatio)
                            .background(if (item.maciekPoints > 0) ownerColor else LinearBorderSubtle)
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .width(1.dp)
                            .background(LinearBg)
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .weight(1f - maciekRatio)
                            .background(if (item.myrnaPoints > 0) guestColor else LinearBorderSubtle)
                    )
                }
            }
        }
    }
}
