package com.doit.app

import android.app.Application
import androidx.work.*
import com.doit.app.data.worker.SyncWorker
import java.util.concurrent.TimeUnit

class DoItApp : Application() {

    override fun onCreate() {
        super.onCreate()
        schedulePeriodicSync()
    }

    private fun schedulePeriodicSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWorkRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            repeatInterval = 1,
            repeatIntervalTimeUnit = TimeUnit.HOURS
        )
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "DoItPeriodicSyncWorker",
            ExistingPeriodicWorkPolicy.KEEP,
            syncWorkRequest
        )
    }
}
