package com.doit.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.doit.app.MainActivity
import com.doit.app.data.local.DoItDatabase
import com.doit.app.data.repository.ScoreCalculator
import com.doit.app.model.PlayerId
import com.doit.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate

class DoItGlanceWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val (maciekScore, myrnaScore) = withContext(Dispatchers.IO) {
            val db = DoItDatabase.getInstance(context)
            val duel = db.duelDao().getActiveDuel()
            val today = LocalDate.now().toString()
            if (duel != null) {
                val checkIns = db.checkInDao().getCheckInsDirect(duel.id)
                val mScore = checkIns.filter { it.playerId == "maciek" && it.date == today }.sumOf { it.pointsEarned }
                val yScore = checkIns.filter { it.playerId == "myrna" && it.date == today }.sumOf { it.pointsEarned }
                Pair(kotlin.math.min(mScore, 240), kotlin.math.min(yScore, 240))
            } else {
                Pair(0, 0)
            }
        }

        provideContent {
            GlanceContent(maciekScore = maciekScore, myrnaScore = myrnaScore)
        }
    }

    @Composable
    private fun GlanceContent(maciekScore: Int, myrnaScore: Int) {
        val maxPar = ScoreCalculator.DAILY_PAR_CEILING
        val myScore = maciekScore // Primary user
        val progressPct = ((myScore.toFloat() / maxPar) * 100).toInt().coerceIn(0, 100)

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(LinearBg))
                .cornerRadius(16.dp)
                .clickable(actionStartActivity<MainActivity>())
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Header
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "DO IT",
                    style = TextStyle(
                        color = ColorProvider(PlayerBlue),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                )
                Spacer(modifier = GlanceModifier.defaultWeight())
                Text(
                    text = "$progressPct% PAR",
                    style = TextStyle(
                        color = ColorProvider(if (myScore >= maxPar) ParComplete else TextSecondary),
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(10.dp))

            // Score Row
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "$myScore",
                    style = TextStyle(
                        color = ColorProvider(TextPrimary),
                        fontWeight = FontWeight.Bold,
                        fontSize = 28.sp
                    )
                )
                Text(
                    text = " / 240 pts",
                    style = TextStyle(
                        color = ColorProvider(TextMuted),
                        fontSize = 14.sp
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Duel Mini Comparison
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .background(ColorProvider(LinearSurfaceElevated))
                    .cornerRadius(8.dp)
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Maciek: $maciekScore pts",
                    style = TextStyle(
                        color = ColorProvider(PlayerBlue),
                        fontWeight = FontWeight.Medium,
                        fontSize = 11.sp
                    )
                )
                Spacer(modifier = GlanceModifier.defaultWeight())
                Text(
                    text = "Myrna: $myrnaScore pts",
                    style = TextStyle(
                        color = ColorProvider(PlayerPurple),
                        fontWeight = FontWeight.Medium,
                        fontSize = 11.sp
                    )
                )
            }
        }
    }
}

class DoItGlanceReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = DoItGlanceWidget()
}
