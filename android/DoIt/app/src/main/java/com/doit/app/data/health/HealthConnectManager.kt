package com.doit.app.data.health

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

data class HealthSummary(
    val date: String,
    val sleepHours: Double,
    val totalSteps: Long,
    val workoutMinutes: Long,
    val cardioMinutes: Long,
    val totalCalories: Double
)

class HealthConnectManager(private val context: Context) {
    private val tag = "HealthConnectManager"

    val isAvailable: Boolean
        get() = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    val healthConnectClient: HealthConnectClient? by lazy {
        if (isAvailable) HealthConnectClient.getOrCreate(context) else null
    }

    val requiredPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)
    )

    suspend fun hasAllPermissions(): Boolean = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext false
        try {
            val granted = client.permissionController.getGrantedPermissions()
            granted.containsAll(requiredPermissions)
        } catch (e: Exception) {
            Log.e(tag, "Failed checking permissions", e)
            false
        }
    }

    /**
     * Reads Health records for a given calendar date (YYYY-MM-DD).
     */
    suspend fun readHealthSummaryForDate(dateStr: String): Result<HealthSummary> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext Result.failure(IllegalStateException("Health Connect is unavailable"))

        try {
            val localDate = LocalDate.parse(dateStr)
            val zone = ZoneId.systemDefault()
            val startOfDay = localDate.atStartOfDay(zone).toInstant()
            val endOfDay = localDate.plusDays(1).atStartOfDay(zone).toInstant()
            val timeRange = TimeRangeFilter.between(startOfDay, endOfDay)

            // 1. Steps
            val stepsRequest = ReadRecordsRequest(
                recordType = StepsRecord::class,
                timeRangeFilter = timeRange
            )
            val stepsRecords = client.readRecords(stepsRequest).records
            val totalSteps = stepsRecords.sumOf { it.count }

            // 2. Sleep Sessions (look back to previous evening 18:00 to cover overnight sleep)
            val sleepRange = TimeRangeFilter.between(startOfDay.minus(6, ChronoUnit.HOURS), endOfDay)
            val sleepRequest = ReadRecordsRequest(
                recordType = SleepSessionRecord::class,
                timeRangeFilter = sleepRange
            )
            val sleepRecords = client.readRecords(sleepRequest).records
            var totalSleepSeconds = 0L
            for (session in sleepRecords) {
                val duration = ChronoUnit.SECONDS.between(session.startTime, session.endTime)
                totalSleepSeconds += duration
            }
            val sleepHours = totalSleepSeconds / 3600.0

            // 3. Exercise Sessions (Workouts & Cardio)
            val exerciseRequest = ReadRecordsRequest(
                recordType = ExerciseSessionRecord::class,
                timeRangeFilter = timeRange
            )
            val exerciseRecords = client.readRecords(exerciseRequest).records
            var workoutMinutes = 0L
            var cardioMinutes = 0L

            for (session in exerciseRecords) {
                val minutes = ChronoUnit.MINUTES.between(session.startTime, session.endTime)
                val type = session.exerciseType
                // Check if cardio or gym
                when (type) {
                    ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
                    ExerciseSessionRecord.EXERCISE_TYPE_BIKING,
                    ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING,
                    ExerciseSessionRecord.EXERCISE_TYPE_HIIT -> {
                        cardioMinutes += minutes
                    }
                    ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
                    ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING,
                    ExerciseSessionRecord.EXERCISE_TYPE_CALISTHENICS -> {
                        workoutMinutes += minutes
                    }
                    else -> {
                        workoutMinutes += minutes
                    }
                }
            }

            // 4. Total Calories
            val caloriesRequest = ReadRecordsRequest(
                recordType = TotalCaloriesBurnedRecord::class,
                timeRangeFilter = timeRange
            )
            val caloriesRecords = client.readRecords(caloriesRequest).records
            val totalCalories = caloriesRecords.sumOf { it.energy.inKilocalories }

            val summary = HealthSummary(
                date = dateStr,
                sleepHours = (sleepHours * 10).toLong() / 10.0, // rounded to 1 decimal
                totalSteps = totalSteps,
                workoutMinutes = workoutMinutes,
                cardioMinutes = cardioMinutes,
                totalCalories = totalCalories
            )
            Result.success(summary)
        } catch (e: Exception) {
            Log.e(tag, "Error reading Health records for $dateStr", e)
            Result.failure(e)
        }
    }
}
