package com.doit.app.data.remote

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@Serializable
data class DuelDto(
    val id: String,
    @SerialName("owner_id") val ownerId: String,
    @SerialName("guest_id") val guestId: String? = null,
    @SerialName("owner_name") val ownerName: String,
    @SerialName("guest_name") val guestName: String? = null,
    @SerialName("invite_code") val inviteCode: String,
    @SerialName("owner_color") val ownerColor: String = "blue",
    @SerialName("guest_color") val guestColor: String = "purple",
    @SerialName("owner_invites") val ownerInvites: Int = 0,
    @SerialName("guest_invites") val guestInvites: Int = 0,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class DuelHabitDto(
    @SerialName("duel_id") val duelId: String,
    val id: String,
    @SerialName("player_slot") val playerSlot: String,
    val data: JsonObject
)

@Serializable
data class DuelCheckInDto(
    @SerialName("duel_id") val duelId: String,
    val id: String,
    @SerialName("habit_id") val habitId: String,
    @SerialName("player_slot") val playerSlot: String,
    val data: JsonObject
)

@Serializable
data class DuelStakeDto(
    @SerialName("duel_id") val duelId: String,
    val id: String,
    val data: JsonObject
)

@Serializable
data class DuelReactionDto(
    @SerialName("duel_id") val duelId: String,
    val id: String,
    @SerialName("player_slot") val playerSlot: String,
    val data: JsonObject
)

@Serializable
data class DuelRestDayDto(
    @SerialName("duel_id") val duelId: String,
    val id: String,
    @SerialName("player_slot") val playerSlot: String,
    val date: String,
    val data: JsonObject
)

@Serializable
data class CreateDuelRpcRequest(
    @SerialName("display_name") val displayName: String
)

@Serializable
data class AcceptDuelRpcRequest(
    val code: String,
    @SerialName("display_name") val displayName: String
)

@Serializable
data class ReplaceSoloRpcRequest(
    val code: String,
    @SerialName("display_name") val displayName: String
)

@Serializable
data class SetPlayerColorRpcRequest(
    @SerialName("requested_color") val requestedColor: String
)

@Serializable
data class UpdatePlayerNameRpcRequest(
    @SerialName("display_name") val displayName: String
)

@Serializable
data class RealtimeMessage(
    val topic: String,
    val event: String,
    val payload: JsonObject? = null,
    val ref: String? = null
)
