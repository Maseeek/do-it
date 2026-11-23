package com.doit.app.data.remote

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class SupabaseClient(
    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()
) {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    private fun buildRequest(url: String, method: String = "GET", body: RequestBody? = null): Request.Builder {
        val token = SupabaseConfig.authToken ?: SupabaseConfig.supabaseAnonKey
        return Request.Builder()
            .url(url)
            .header("apikey", SupabaseConfig.supabaseAnonKey)
            .header("Authorization", "Bearer $token")
            .header("Content-Type", "application/json")
            .header("Prefer", "return=representation")
            .method(method, body)
    }

    // --- RPC: create_duel ---
    suspend fun createDuel(displayName: String): Result<DuelDto> = withContext(Dispatchers.IO) {
        try {
            val payload = json.encodeToString(CreateDuelRpcRequest(displayName))
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/rpc/create_duel",
                method = "POST",
                body = payload.toRequestBody(jsonMediaType)
            ).build()

            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("create_duel failed: ${response.code} ${response.message}"))
                }
                val bodyStr = response.body?.string().orEmpty()
                val duel = json.decodeFromString<DuelDto>(bodyStr)
                Result.success(duel)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- RPC: accept_duel ---
    suspend fun acceptDuel(inviteCode: String, displayName: String): Result<DuelDto> = withContext(Dispatchers.IO) {
        try {
            val payload = json.encodeToString(AcceptDuelRpcRequest(inviteCode, displayName))
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/rpc/accept_duel",
                method = "POST",
                body = payload.toRequestBody(jsonMediaType)
            ).build()

            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("accept_duel failed: ${response.code} ${response.message}"))
                }
                val bodyStr = response.body?.string().orEmpty()
                val duel = json.decodeFromString<DuelDto>(bodyStr)
                Result.success(duel)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- RPC: replace_solo_duel_with_invite ---
    suspend fun replaceSoloDuelWithInvite(inviteCode: String, displayName: String): Result<DuelDto> = withContext(Dispatchers.IO) {
        try {
            val payload = json.encodeToString(ReplaceSoloRpcRequest(inviteCode, displayName))
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/rpc/replace_solo_duel_with_invite",
                method = "POST",
                body = payload.toRequestBody(jsonMediaType)
            ).build()

            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("replace_solo failed: ${response.code} ${response.message}"))
                }
                val bodyStr = response.body?.string().orEmpty()
                val duel = json.decodeFromString<DuelDto>(bodyStr)
                Result.success(duel)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- RPC: set_player_color ---
    suspend fun setPlayerColor(colorId: String): Result<DuelDto> = withContext(Dispatchers.IO) {
        try {
            val payload = json.encodeToString(SetPlayerColorRpcRequest(colorId))
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/rpc/set_player_color",
                method = "POST",
                body = payload.toRequestBody(jsonMediaType)
            ).build()

            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("set_player_color failed: ${response.code} ${response.message}"))
                }
                val bodyStr = response.body?.string().orEmpty()
                val duel = json.decodeFromString<DuelDto>(bodyStr)
                Result.success(duel)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- RPC: record_app_invite ---
    suspend fun recordAppInvite(): Result<DuelDto> = withContext(Dispatchers.IO) {
        try {
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/rpc/record_app_invite",
                method = "POST",
                body = "{}".toRequestBody(jsonMediaType)
            ).build()

            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("record_app_invite failed: ${response.code} ${response.message}"))
                }
                val bodyStr = response.body?.string().orEmpty()
                val duel = json.decodeFromString<DuelDto>(bodyStr)
                Result.success(duel)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: fetch duel by id ---
    suspend fun fetchDuel(duelId: String): Result<DuelDto?> = withContext(Dispatchers.IO) {
        try {
            val req = buildRequest("${SupabaseConfig.restUrl}/duels?id=eq.$duelId").build()
            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("fetchDuel failed: ${response.code}"))
                val bodyStr = response.body?.string().orEmpty()
                val list = json.decodeFromString<List<DuelDto>>(bodyStr)
                Result.success(list.firstOrNull())
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: fetch habits ---
    suspend fun fetchHabits(duelId: String): Result<List<DuelHabitDto>> = withContext(Dispatchers.IO) {
        try {
            val req = buildRequest("${SupabaseConfig.restUrl}/duel_habits?duel_id=eq.$duelId").build()
            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("fetchHabits failed: ${response.code}"))
                val list = json.decodeFromString<List<DuelHabitDto>>(response.body?.string().orEmpty())
                Result.success(list)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: upsert habit ---
    suspend fun upsertHabit(dto: DuelHabitDto): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val payload = json.encodeToString(dto)
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/duel_habits?on_conflict=duel_id,id",
                method = "POST",
                body = payload.toRequestBody(jsonMediaType)
            ).header("Prefer", "resolution=merge-duplicates").build()

            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("upsertHabit failed: ${response.code}"))
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: delete habit ---
    suspend fun deleteHabit(duelId: String, habitId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/duel_habits?duel_id=eq.$duelId&id=eq.$habitId",
                method = "DELETE"
            ).build()
            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("deleteHabit failed: ${response.code}"))
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: fetch check-ins ---
    suspend fun fetchCheckIns(duelId: String): Result<List<DuelCheckInDto>> = withContext(Dispatchers.IO) {
        try {
            val req = buildRequest("${SupabaseConfig.restUrl}/duel_check_ins?duel_id=eq.$duelId").build()
            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("fetchCheckIns failed: ${response.code}"))
                val list = json.decodeFromString<List<DuelCheckInDto>>(response.body?.string().orEmpty())
                Result.success(list)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: upsert check-in ---
    suspend fun upsertCheckIn(dto: DuelCheckInDto): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val payload = json.encodeToString(dto)
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/duel_check_ins?on_conflict=duel_id,id",
                method = "POST",
                body = payload.toRequestBody(jsonMediaType)
            ).header("Prefer", "resolution=merge-duplicates").build()

            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("upsertCheckIn failed: ${response.code}"))
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: delete check-in ---
    suspend fun deleteCheckIn(duelId: String, checkInId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/duel_check_ins?duel_id=eq.$duelId&id=eq.$checkInId",
                method = "DELETE"
            ).build()
            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("deleteCheckIn failed: ${response.code}"))
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: fetch stakes ---
    suspend fun fetchStakes(duelId: String): Result<List<DuelStakeDto>> = withContext(Dispatchers.IO) {
        try {
            val req = buildRequest("${SupabaseConfig.restUrl}/duel_stakes?duel_id=eq.$duelId").build()
            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("fetchStakes failed: ${response.code}"))
                val list = json.decodeFromString<List<DuelStakeDto>>(response.body?.string().orEmpty())
                Result.success(list)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: upsert stake ---
    suspend fun upsertStake(dto: DuelStakeDto): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val payload = json.encodeToString(dto)
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/duel_stakes?on_conflict=duel_id,id",
                method = "POST",
                body = payload.toRequestBody(jsonMediaType)
            ).header("Prefer", "resolution=merge-duplicates").build()

            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("upsertStake failed: ${response.code}"))
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: fetch reactions ---
    suspend fun fetchReactions(duelId: String): Result<List<DuelReactionDto>> = withContext(Dispatchers.IO) {
        try {
            val req = buildRequest("${SupabaseConfig.restUrl}/duel_reactions?duel_id=eq.$duelId").build()
            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("fetchReactions failed: ${response.code}"))
                val list = json.decodeFromString<List<DuelReactionDto>>(response.body?.string().orEmpty())
                Result.success(list)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: insert reaction ---
    suspend fun insertReaction(dto: DuelReactionDto): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val payload = json.encodeToString(dto)
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/duel_reactions",
                method = "POST",
                body = payload.toRequestBody(jsonMediaType)
            ).build()
            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("insertReaction failed: ${response.code}"))
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: fetch rest days ---
    suspend fun fetchRestDays(duelId: String): Result<List<DuelRestDayDto>> = withContext(Dispatchers.IO) {
        try {
            val req = buildRequest("${SupabaseConfig.restUrl}/duel_rest_days?duel_id=eq.$duelId").build()
            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("fetchRestDays failed: ${response.code}"))
                val list = json.decodeFromString<List<DuelRestDayDto>>(response.body?.string().orEmpty())
                Result.success(list)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: insert rest day ---
    suspend fun insertRestDay(dto: DuelRestDayDto): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val payload = json.encodeToString(dto)
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/duel_rest_days",
                method = "POST",
                body = payload.toRequestBody(jsonMediaType)
            ).build()
            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("insertRestDay failed: ${response.code}"))
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- REST: delete rest day ---
    suspend fun deleteRestDay(duelId: String, restDayId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val req = buildRequest(
                url = "${SupabaseConfig.restUrl}/duel_rest_days?duel_id=eq.$duelId&id=eq.$restDayId",
                method = "DELETE"
            ).build()
            okHttpClient.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext Result.failure(IOException("deleteRestDay failed: ${response.code}"))
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
