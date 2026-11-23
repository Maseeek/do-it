package com.doit.app.data.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.doit.app.data.repository.DuelRepository
import java.time.LocalDate

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val tag = "SyncWorker"

    override suspend fun doWork(): Result {
        Log.d(tag, "Starting background sync...")
        return try {
            val repository = DuelRepository(applicationContext)

            // 1. Sync Health Connect for today & yesterday (to capture sleep that concluded this morning)
            val today = LocalDate.now().toString()
            val yesterday = LocalDate.now().minusDays(1).toString()

            repository.syncHealthConnectForDate(today)
            repository.syncHealthConnectForDate(yesterday)

            // 2. Sync with Supabase remote backend
            repository.syncFromRemote()

            Log.d(tag, "Background sync completed successfully")
            Result.success()
        } catch (e: Exception) {
            Log.e(tag, "SyncWorker failed", e)
            Result.retry()
        }
    }
}
