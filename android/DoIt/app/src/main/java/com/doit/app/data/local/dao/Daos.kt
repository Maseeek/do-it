package com.doit.app.data.local.dao

import androidx.room.*
import com.doit.app.data.local.entity.*
import kotlinx.coroutines.flow.Flow

@Dao
interface DuelDao {
    @Query("SELECT * FROM duels LIMIT 1")
    fun getActiveDuelFlow(): Flow<DuelEntity?>

    @Query("SELECT * FROM duels LIMIT 1")
    suspend fun getActiveDuel(): DuelEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(duel: DuelEntity)

    @Query("DELETE FROM duels")
    suspend fun clearAll()
}

@Dao
interface HabitDao {
    @Query("SELECT * FROM habits WHERE duelId = :duelId ORDER BY `order` ASC")
    fun getHabitsForDuel(duelId: String): Flow<List<HabitEntity>>

    @Query("SELECT * FROM habits WHERE duelId = :duelId AND playerId = :playerId ORDER BY `order` ASC")
    fun getHabitsForPlayer(duelId: String, playerId: String): Flow<List<HabitEntity>>

    @Query("SELECT * FROM habits WHERE duelId = :duelId")
    suspend fun getHabitsDirect(duelId: String): List<HabitEntity>

    @Query("SELECT * FROM habits WHERE id = :id LIMIT 1")
    suspend fun getHabitById(id: String): HabitEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(habits: List<HabitEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(habit: HabitEntity)

    @Update
    suspend fun update(habit: HabitEntity)

    @Query("DELETE FROM habits WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM habits WHERE duelId = :duelId")
    suspend fun deleteAllForDuel(duelId: String)
}

@Dao
interface CheckInDao {
    @Query("SELECT * FROM check_ins WHERE duelId = :duelId ORDER BY completedAt DESC")
    fun getCheckInsForDuel(duelId: String): Flow<List<CheckInEntity>>

    @Query("SELECT * FROM check_ins WHERE duelId = :duelId")
    suspend fun getCheckInsDirect(duelId: String): List<CheckInEntity>

    @Query("SELECT * FROM check_ins WHERE duelId = :duelId AND date = :date")
    fun getCheckInsForDate(duelId: String, date: String): Flow<List<CheckInEntity>>

    @Query("SELECT * FROM check_ins WHERE duelId = :duelId AND habitId = :habitId AND date = :date LIMIT 1")
    suspend fun getCheckIn(duelId: String, habitId: String, date: String): CheckInEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(checkIn: CheckInEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(checkIns: List<CheckInEntity>)

    @Query("DELETE FROM check_ins WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM check_ins WHERE duelId = :duelId AND habitId = :habitId AND date = :date")
    suspend fun deleteByHabitDate(duelId: String, habitId: String, date: String)

    @Query("DELETE FROM check_ins WHERE duelId = :duelId")
    suspend fun deleteAllForDuel(duelId: String)
}

@Dao
interface StakeDao {
    @Query("SELECT * FROM stakes WHERE duelId = :duelId ORDER BY dueDate DESC")
    fun getStakesForDuel(duelId: String): Flow<List<StakeEntity>>

    @Query("SELECT * FROM stakes WHERE duelId = :duelId")
    suspend fun getStakesDirect(duelId: String): List<StakeEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(stake: StakeEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(stakes: List<StakeEntity>)

    @Query("DELETE FROM stakes WHERE id = :id")
    suspend fun deleteById(id: String)
}

@Dao
interface ReactionDao {
    @Query("SELECT * FROM reactions WHERE duelId = :duelId ORDER BY timestamp DESC LIMIT 50")
    fun getReactionsForDuel(duelId: String): Flow<List<ReactionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(reaction: ReactionEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(reactions: List<ReactionEntity>)
}

@Dao
interface RestDayDao {
    @Query("SELECT * FROM rest_days WHERE duelId = :duelId")
    fun getRestDaysForDuel(duelId: String): Flow<List<RestDayEntity>>

    @Query("SELECT * FROM rest_days WHERE duelId = :duelId")
    suspend fun getRestDaysDirect(duelId: String): List<RestDayEntity>

    @Query("SELECT * FROM rest_days WHERE duelId = :duelId AND playerId = :playerId AND date = :date LIMIT 1")
    suspend fun getRestDay(duelId: String, playerId: String, date: String): RestDayEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(restDay: RestDayEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(restDays: List<RestDayEntity>)

    @Query("DELETE FROM rest_days WHERE duelId = :duelId AND playerId = :playerId AND date = :date")
    suspend fun delete(duelId: String, playerId: String, date: String)
}

@Dao
interface SyncQueueDao {
    @Query("SELECT * FROM sync_queue ORDER BY createdAt ASC")
    suspend fun getAllPending(): List<SyncQueueEntity>

    @Insert
    suspend fun enqueue(item: SyncQueueEntity)

    @Delete
    suspend fun delete(item: SyncQueueEntity)

    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("DELETE FROM sync_queue")
    suspend fun clear()
}
