package com.doit.app.data.repository

import android.content.Context
import android.util.Log
import com.doit.app.data.health.HealthConnectManager
import com.doit.app.data.local.DoItDatabase
import com.doit.app.data.local.entity.*
import com.doit.app.data.remote.*
import com.doit.app.model.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

class DuelRepository(
    private val context: Context,
    private val db: DoItDatabase = DoItDatabase.getInstance(context),
    val supabaseClient: SupabaseClient = SupabaseClient(),
    private val realtimeClient: SupabaseRealtimeClient = SupabaseRealtimeClient(),
    val healthConnectManager: HealthConnectManager = HealthConnectManager(context),
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
) {
    private val tag = "DuelRepository"
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    val activeDuelFlow: Flow<DuelEntity?> = db.duelDao().getActiveDuelFlow()
    val activePlayerId = MutableStateFlow(PlayerId.MACIEK)
    val selectedDate = MutableStateFlow(LocalDate.now().toString())

    init {
        scope.launch {
            initDefaultDataIfEmpty()
            listenToRealtimeEvents()
        }
    }

    private suspend fun initDefaultDataIfEmpty() {
        val existing = db.duelDao().getActiveDuel()
        if (existing == null) {
            val defaultDuelId = "local-duel-default"
            val duel = DuelEntity(
                id = defaultDuelId,
                ownerId = "owner-local",
                guestId = "guest-local",
                ownerName = "Maciek",
                guestName = "Myrna",
                inviteCode = UUID.randomUUID().toString(),
                ownerColor = "blue",
                guestColor = "purple",
                createdAt = LocalDateTime.now().toString(),
                isLocal = true
            )
            db.duelDao().insertOrUpdate(duel)

            // Seed habits
            val defaultHabits = HabitCatalog.getInitialHabits(defaultDuelId).map { h ->
                HabitEntity(
                    id = h.id,
                    duelId = defaultDuelId,
                    playerId = h.playerId.key,
                    title = h.title,
                    description = h.description,
                    category = h.category.key,
                    points = h.points,
                    iconName = h.iconName,
                    frequency = h.frequency.name,
                    weeklyTargetDays = h.weeklyTargetDays,
                    isQuantitative = h.isQuantitative,
                    quantityUnit = h.quantityUnit,
                    maxQuantity = h.maxQuantity,
                    pointsPerUnit = h.pointsPerUnit,
                    requiresProof = h.requiresProof,
                    order = h.order,
                    isActive = h.isActive,
                    isArchived = h.isArchived,
                    automationJson = h.automation?.let { json.encodeToString(it) }
                )
            }
            db.habitDao().insertAll(defaultHabits)

            // Seed stakes
            val defaultStakes = HabitCatalog.getInitialStakes().map { s ->
                StakeEntity(
                    id = s.id,
                    duelId = defaultDuelId,
                    period = s.period.name,
                    periodKey = s.periodKey,
                    title = s.title,
                    description = s.description,
                    status = s.status.name,
                    winnerId = s.winnerId,
                    dueDate = s.dueDate
                )
            }
            db.stakeDao().insertAll(defaultStakes)
        }
    }

    fun getHabitsFlow(duelId: String): Flow<List<Habit>> {
        return db.habitDao().getHabitsForDuel(duelId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun getCheckInsFlow(duelId: String): Flow<List<CheckIn>> {
        return db.checkInDao().getCheckInsForDuel(duelId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun getStakesFlow(duelId: String): Flow<List<Stake>> {
        return db.stakeDao().getStakesForDuel(duelId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun getReactionsFlow(duelId: String): Flow<List<CouplesReaction>> {
        return db.reactionDao().getReactionsForDuel(duelId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun getRestDaysFlow(duelId: String): Flow<List<RestDay>> {
        return db.restDayDao().getRestDaysForDuel(duelId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    suspend fun toggleCheckIn(
        habit: Habit,
        date: String,
        quantity: Int? = null,
        proofUrl: String? = null,
        note: String? = null
    ) {
        val duel = db.duelDao().getActiveDuel() ?: return
        val existing = db.checkInDao().getCheckIn(duel.id, habit.id, date)
        if (existing != null) {
            // Uncheck / delete
            db.checkInDao().deleteById(existing.id)
            if (!duel.isLocal) {
                scope.launch {
                    supabaseClient.deleteCheckIn(duel.id, existing.id)
                }
            }
        } else {
            // Compute points earned
            val pointsEarned = if (habit.isQuantitative && quantity != null) {
                val perUnit = habit.pointsPerUnit ?: 1
                val maxQ = habit.maxQuantity ?: 25
                minOf(quantity, maxQ) * perUnit
            } else {
                habit.points
            }

            val checkIn = CheckInEntity(
                id = UUID.randomUUID().toString(),
                duelId = duel.id,
                habitId = habit.id,
                playerId = habit.playerId.key,
                date = date,
                pointsEarned = pointsEarned,
                quantity = quantity,
                proofUrl = proofUrl,
                proofUrlsJson = proofUrl?.let { json.encodeToString(listOf(it)) } ?: "[]",
                completedAt = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME),
                note = note,
                isRetroactive = date != LocalDate.now().toString(),
                loggedAt = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME),
                source = "manual",
                healthValue = null
            )
            db.checkInDao().insertOrUpdate(checkIn)

            if (!duel.isLocal) {
                scope.launch {
                    val habitData = buildJsonObject {
                        put("id", checkIn.id)
                        put("habitId", checkIn.habitId)
                        put("playerId", checkIn.playerId)
                        put("date", checkIn.date)
                        put("pointsEarned", checkIn.pointsEarned)
                        quantity?.let { put("quantity", it) }
                        proofUrl?.let { put("proofUrl", it) }
                        put("completedAt", checkIn.completedAt)
                    }
                    supabaseClient.upsertCheckIn(
                        DuelCheckInDto(
                            duelId = duel.id,
                            id = checkIn.id,
                            habitId = checkIn.habitId,
                            playerSlot = checkIn.playerId,
                            data = habitData
                        )
                    )
                }
            }
        }
    }

    suspend fun toggleRestDay(date: String, reason: String? = null) {
        val duel = db.duelDao().getActiveDuel() ?: return
        val playerId = activePlayerId.value
        val existing = db.restDayDao().getRestDay(duel.id, playerId.key, date)
        if (existing != null) {
            db.restDayDao().delete(duel.id, playerId.key, date)
            if (!duel.isLocal) {
                scope.launch { supabaseClient.deleteRestDay(duel.id, existing.id) }
            }
        } else {
            val restDay = RestDayEntity(
                id = UUID.randomUUID().toString(),
                duelId = duel.id,
                playerId = playerId.key,
                date = date,
                reason = reason ?: "Recovery Day",
                createdAt = LocalDateTime.now().toString()
            )
            db.restDayDao().insert(restDay)
            if (!duel.isLocal) {
                scope.launch {
                    val dataObj = buildJsonObject {
                        put("id", restDay.id)
                        put("playerId", restDay.playerId)
                        put("date", restDay.date)
                        put("reason", restDay.reason)
                    }
                    supabaseClient.insertRestDay(
                        DuelRestDayDto(
                            duelId = duel.id,
                            id = restDay.id,
                            playerSlot = restDay.playerId,
                            date = restDay.date,
                            data = dataObj
                        )
                    )
                }
            }
        }
    }

    suspend fun sendReaction(emoji: String, message: String) {
        val duel = db.duelDao().getActiveDuel() ?: return
        val fromPlayer = activePlayerId.value
        val toPlayer = fromPlayer.partner

        val reaction = ReactionEntity(
            id = UUID.randomUUID().toString(),
            duelId = duel.id,
            fromPlayerId = fromPlayer.key,
            toPlayerId = toPlayer.key,
            emoji = emoji,
            message = message,
            timestamp = LocalDateTime.now().toString()
        )
        db.reactionDao().insert(reaction)

        if (!duel.isLocal) {
            scope.launch {
                val dataObj = buildJsonObject {
                    put("id", reaction.id)
                    put("fromPlayerId", reaction.fromPlayerId)
                    put("toPlayerId", reaction.toPlayerId)
                    put("emoji", reaction.emoji)
                    put("message", reaction.message)
                    put("timestamp", reaction.timestamp)
                }
                supabaseClient.insertReaction(
                    DuelReactionDto(
                        duelId = duel.id,
                        id = reaction.id,
                        playerSlot = reaction.fromPlayerId,
                        data = dataObj
                    )
                )
            }
        }
    }

    suspend fun syncHealthConnectForDate(dateStr: String): Int {
        if (!healthConnectManager.hasAllPermissions()) return 0
        val summaryResult = healthConnectManager.readHealthSummaryForDate(dateStr)
        val summary = summaryResult.getOrNull() ?: return 0

        val duel = db.duelDao().getActiveDuel() ?: return 0
        val currentSlot = activePlayerId.value
        val habits = db.habitDao().getHabitsDirect(duel.id).map { it.toDomain() }
        val playerHabits = habits.filter { it.playerId == currentSlot && it.automation != null && it.isActive }

        var checkedInCount = 0
        for (habit in playerHabits) {
            val auto = habit.automation ?: continue
            val qualifies = when (auto.metric) {
                HealthMetric.SLEEP -> summary.sleepHours >= auto.target
                HealthMetric.STEPS -> summary.totalSteps >= auto.target.toLong()
                HealthMetric.WORKOUT -> summary.workoutMinutes >= auto.target.toLong()
                HealthMetric.CARDIO -> summary.cardioMinutes >= auto.target.toLong()
            }

            if (qualifies) {
                val existing = db.checkInDao().getCheckIn(duel.id, habit.id, dateStr)
                if (existing == null) {
                    val entity = CheckInEntity(
                        id = UUID.randomUUID().toString(),
                        duelId = duel.id,
                        habitId = habit.id,
                        playerId = currentSlot.key,
                        date = dateStr,
                        pointsEarned = habit.points,
                        quantity = null,
                        proofUrl = null,
                        proofUrlsJson = "[]",
                        completedAt = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME),
                        note = "Automated from Health Connect",
                        isRetroactive = dateStr != LocalDate.now().toString(),
                        loggedAt = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME),
                        source = "health_connect",
                        healthValue = when (auto.metric) {
                            HealthMetric.SLEEP -> summary.sleepHours
                            HealthMetric.STEPS -> summary.totalSteps.toDouble()
                            HealthMetric.WORKOUT -> summary.workoutMinutes.toDouble()
                            HealthMetric.CARDIO -> summary.cardioMinutes.toDouble()
                        }
                    )
                    db.checkInDao().insertOrUpdate(entity)
                    checkedInCount++
                }
            }
        }
        return checkedInCount
    }

    suspend fun syncFromRemote(): Result<Unit> {
        val current = db.duelDao().getActiveDuel() ?: return Result.success(Unit)
        if (current.isLocal) return Result.success(Unit)

        return try {
            val duelDto = supabaseClient.fetchDuel(current.id).getOrNull()
            if (duelDto != null) {
                db.duelDao().insertOrUpdate(
                    DuelEntity(
                        id = duelDto.id,
                        ownerId = duelDto.ownerId,
                        guestId = duelDto.guestId,
                        ownerName = duelDto.ownerName,
                        guestName = duelDto.guestName,
                        inviteCode = duelDto.inviteCode,
                        ownerColor = duelDto.ownerColor,
                        guestColor = duelDto.guestColor,
                        ownerInvites = duelDto.ownerInvites,
                        guestInvites = duelDto.guestInvites,
                        createdAt = duelDto.createdAt ?: current.createdAt,
                        isLocal = false
                    )
                )
            }
            // Fetch habits
            val remoteHabits = supabaseClient.fetchHabits(current.id).getOrNull()
            if (!remoteHabits.isNullOrEmpty()) {
                val entities = remoteHabits.mapNotNull { it.toEntity() }
                db.habitDao().insertAll(entities)
            }
            // Fetch check-ins
            val remoteCheckIns = supabaseClient.fetchCheckIns(current.id).getOrNull()
            if (!remoteCheckIns.isNullOrEmpty()) {
                val entities = remoteCheckIns.mapNotNull { it.toEntity() }
                db.checkInDao().insertAll(entities)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(tag, "Remote sync error", e)
            Result.failure(e)
        }
    }

    private fun listenToRealtimeEvents() {
        scope.launch {
            realtimeClient.events.collect { event ->
                when (event) {
                    is RealtimeEvent.TableChange -> {
                        syncFromRemote()
                    }
                    is RealtimeEvent.StatusChange -> {
                        Log.d(tag, "Realtime status: ${event.isConnected}")
                    }
                }
            }
        }
    }

    // Domain to Entity Mappers
    private fun HabitEntity.toDomain(): Habit {
        val auto: HabitAutomation? = automationJson?.let {
            try { json.decodeFromString(it) } catch (_: Exception) { null }
        }
        return Habit(
            id = id,
            playerId = PlayerId.fromKey(playerId),
            title = title,
            description = description,
            category = HabitCategory.fromKey(category),
            points = points,
            iconName = iconName,
            frequency = HabitFrequency.fromString(frequency),
            weeklyTargetDays = weeklyTargetDays,
            isQuantitative = isQuantitative,
            quantityUnit = quantityUnit,
            maxQuantity = maxQuantity,
            pointsPerUnit = pointsPerUnit,
            requiresProof = requiresProof,
            order = order,
            isActive = isActive,
            isArchived = isArchived,
            automation = auto
        )
    }

    private fun CheckInEntity.toDomain(): CheckIn {
        val urls: List<String> = try { json.decodeFromString(proofUrlsJson) } catch (_: Exception) { emptyList() }
        return CheckIn(
            id = id,
            habitId = habitId,
            playerId = PlayerId.fromKey(playerId),
            date = date,
            pointsEarned = pointsEarned,
            quantity = quantity,
            proofUrl = proofUrl,
            proofUrls = urls,
            completedAt = completedAt,
            note = note,
            isRetroactive = isRetroactive,
            loggedAt = loggedAt,
            source = source,
            healthValue = healthValue
        )
    }

    private fun StakeEntity.toDomain(): Stake {
        val p = try { StakePeriod.valueOf(period.uppercase()) } catch (_: Exception) { StakePeriod.WEEKLY }
        val s = try { StakeStatus.valueOf(status.uppercase()) } catch (_: Exception) { StakeStatus.ACTIVE }
        return Stake(
            id = id,
            period = p,
            periodKey = periodKey,
            title = title,
            description = description,
            status = s,
            winnerId = winnerId,
            dueDate = dueDate
        )
    }

    private fun ReactionEntity.toDomain(): CouplesReaction {
        return CouplesReaction(
            id = id,
            fromPlayerId = PlayerId.fromKey(fromPlayerId),
            toPlayerId = PlayerId.fromKey(toPlayerId),
            emoji = emoji,
            message = message,
            timestamp = timestamp
        )
    }

    private fun RestDayEntity.toDomain(): RestDay {
        return RestDay(
            id = id,
            playerId = PlayerId.fromKey(playerId),
            date = date,
            reason = reason,
            createdAt = createdAt
        )
    }

    private fun DuelHabitDto.toEntity(): HabitEntity? {
        val d = data
        val habitId = d["id"]?.jsonPrimitive?.content ?: id
        val title = d["title"]?.jsonPrimitive?.content ?: return null
        val points = d["points"]?.jsonPrimitive?.intOrNull ?: 10
        val category = d["category"]?.jsonPrimitive?.content ?: "foundation"
        return HabitEntity(
            id = habitId,
            duelId = duelId,
            playerId = playerSlot,
            title = title,
            description = d["description"]?.jsonPrimitive?.content ?: "",
            category = category,
            points = points,
            iconName = d["iconName"]?.jsonPrimitive?.content ?: "Sparkles",
            frequency = d["frequency"]?.jsonPrimitive?.content ?: "DAILY",
            weeklyTargetDays = d["weeklyTargetDays"]?.jsonPrimitive?.intOrNull,
            isQuantitative = d["isQuantitative"]?.jsonPrimitive?.booleanOrNull ?: false,
            quantityUnit = d["quantityUnit"]?.jsonPrimitive?.content,
            maxQuantity = d["maxQuantity"]?.jsonPrimitive?.intOrNull,
            pointsPerUnit = d["pointsPerUnit"]?.jsonPrimitive?.intOrNull,
            requiresProof = d["requiresProof"]?.jsonPrimitive?.booleanOrNull ?: false,
            order = d["order"]?.jsonPrimitive?.intOrNull ?: 0,
            isActive = d["isActive"]?.jsonPrimitive?.booleanOrNull ?: true,
            isArchived = d["isArchived"]?.jsonPrimitive?.booleanOrNull ?: false,
            automationJson = d["automation"]?.toString()
        )
    }

    private fun DuelCheckInDto.toEntity(): CheckInEntity? {
        val d = data
        val checkInId = d["id"]?.jsonPrimitive?.content ?: id
        val hId = d["habitId"]?.jsonPrimitive?.content ?: habitId
        val dateStr = d["date"]?.jsonPrimitive?.content ?: return null
        val points = d["pointsEarned"]?.jsonPrimitive?.intOrNull ?: 0
        return CheckInEntity(
            id = checkInId,
            duelId = duelId,
            habitId = hId,
            playerId = playerSlot,
            date = dateStr,
            pointsEarned = points,
            quantity = d["quantity"]?.jsonPrimitive?.intOrNull,
            proofUrl = d["proofUrl"]?.jsonPrimitive?.content,
            proofUrlsJson = d["proofUrls"]?.toString() ?: "[]",
            completedAt = d["completedAt"]?.jsonPrimitive?.content ?: LocalDateTime.now().toString(),
            note = d["note"]?.jsonPrimitive?.content,
            isRetroactive = d["isRetroactive"]?.jsonPrimitive?.booleanOrNull ?: false,
            loggedAt = d["loggedAt"]?.jsonPrimitive?.content,
            source = d["source"]?.jsonPrimitive?.content,
            healthValue = d["healthValue"]?.jsonPrimitive?.doubleOrNull
        )
    }
}
