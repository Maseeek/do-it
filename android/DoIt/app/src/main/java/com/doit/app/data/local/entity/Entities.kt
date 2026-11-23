package com.doit.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "duels")
data class DuelEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val guestId: String?,
    val ownerName: String,
    val guestName: String?,
    val inviteCode: String,
    val ownerColor: String,
    val guestColor: String,
    val ownerInvites: Int = 0,
    val guestInvites: Int = 0,
    val createdAt: String,
    val isLocal: Boolean = false
)

@Entity(
    tableName = "habits",
    indices = [
        Index(value = ["duelId", "playerId"]),
        Index(value = ["duelId", "id"])
    ]
)
data class HabitEntity(
    @PrimaryKey val id: String,
    val duelId: String,
    val playerId: String,
    val title: String,
    val description: String,
    val category: String,
    val points: Int,
    val iconName: String,
    val frequency: String,
    val weeklyTargetDays: Int?,
    val isQuantitative: Boolean,
    val quantityUnit: String?,
    val maxQuantity: Int?,
    val pointsPerUnit: Int?,
    val requiresProof: Boolean,
    val order: Int,
    val isActive: Boolean,
    val isArchived: Boolean,
    val automationJson: String?
)

@Entity(
    tableName = "check_ins",
    indices = [
        Index(value = ["duelId", "habitId", "date"], unique = true),
        Index(value = ["duelId", "playerId", "date"])
    ]
)
data class CheckInEntity(
    @PrimaryKey val id: String,
    val duelId: String,
    val habitId: String,
    val playerId: String,
    val date: String,
    val pointsEarned: Int,
    val quantity: Int?,
    val proofUrl: String?,
    val proofUrlsJson: String,
    val completedAt: String,
    val note: String?,
    val isRetroactive: Boolean,
    val loggedAt: String?,
    val source: String?,
    val healthValue: Double?
)

@Entity(
    tableName = "stakes",
    indices = [Index(value = ["duelId", "periodKey"])]
)
data class StakeEntity(
    @PrimaryKey val id: String,
    val duelId: String,
    val period: String,
    val periodKey: String,
    val title: String,
    val description: String,
    val status: String,
    val winnerId: String?,
    val dueDate: String
)

@Entity(
    tableName = "reactions",
    indices = [Index(value = ["duelId"])]
)
data class ReactionEntity(
    @PrimaryKey val id: String,
    val duelId: String,
    val fromPlayerId: String,
    val toPlayerId: String,
    val emoji: String,
    val message: String,
    val timestamp: String
)

@Entity(
    tableName = "rest_days",
    indices = [
        Index(value = ["duelId", "playerId", "date"], unique = true)
    ]
)
data class RestDayEntity(
    @PrimaryKey val id: String,
    val duelId: String,
    val playerId: String,
    val date: String,
    val reason: String?,
    val createdAt: String
)

@Entity(tableName = "sync_queue")
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val tableName: String,
    val action: String, // "INSERT", "UPDATE", "DELETE"
    val recordId: String,
    val payloadJson: String,
    val createdAt: Long = System.currentTimeMillis()
)
