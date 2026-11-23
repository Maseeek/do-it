package com.doit.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.doit.app.data.local.dao.*
import com.doit.app.data.local.entity.*

@Database(
    entities = [
        DuelEntity::class,
        HabitEntity::class,
        CheckInEntity::class,
        StakeEntity::class,
        ReactionEntity::class,
        RestDayEntity::class,
        SyncQueueEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class DoItDatabase : RoomDatabase() {
    abstract fun duelDao(): DuelDao
    abstract fun habitDao(): HabitDao
    abstract fun checkInDao(): CheckInDao
    abstract fun stakeDao(): StakeDao
    abstract fun reactionDao(): ReactionDao
    abstract fun restDayDao(): RestDayDao
    abstract fun syncQueueDao(): SyncQueueDao

    companion object {
        @Volatile
        private var INSTANCE: DoItDatabase? = null

        fun getInstance(context: Context): DoItDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    DoItDatabase::class.java,
                    "do_it_master.db"
                ).fallbackToDestructiveMigration()
                 .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
