package com.doit.app.model

import kotlinx.serialization.Serializable

@Serializable
enum class PlayerId(val key: String) {
    MACIEK("maciek"),
    MYRNA("myrna");

    val partner: PlayerId
        get() = if (this == MACIEK) MYRNA else MACIEK

    companion object {
        fun fromKey(key: String): PlayerId =
            entries.find { it.key.equals(key, ignoreCase = true) } ?: MACIEK
    }
}

@Serializable
enum class PlayerColorId(
    val id: String,
    val displayName: String,
    val hexColor: String,
    val accentBgHex: String,
    val accentBorderHex: String,
    val unlockKarma: Int,
    val requiredInvites: Int = 0
) {
    BLUE("blue", "Blue", "#60A5FA", "#1A60A5FA", "#4060A5FA", 0, 0),
    PURPLE("purple", "Purple", "#C084FC", "#1AC084FC", "#40C084FC", 0, 0),
    TEAL("teal", "Teal", "#2DD4BF", "#1A2DD4BF", "#402DD4BF", 250, 0),
    ORANGE("orange", "Orange", "#FB923C", "#1AFB923C", "#40FB923C", 500, 0),
    PINK("pink", "Pink", "#F472B6", "#1AF472B6", "#40F472B6", 1000, 0),
    GREEN("green", "Green", "#4ADE80", "#1A4ADE80", "#404ADE80", 2500, 0),
    RAINBOW("rainbow", "Rainbow", "#F0ABFC", "#1AF0ABFC", "#40F0ABFC", 10000, 0),
    GOLD("gold", "Gold", "#EAB308", "#1AEAB308", "#40EAB308", 0, 1);

    companion object {
        fun fromId(id: String?): PlayerColorId =
            entries.find { it.id.equals(id, ignoreCase = true) } ?: BLUE
    }
}

@Serializable
data class Player(
    val id: PlayerId,
    val name: String,
    val avatar: String,
    val colorId: PlayerColorId = if (id == PlayerId.MACIEK) PlayerColorId.BLUE else PlayerColorId.PURPLE,
    val inviteCount: Int = 0
)

@Serializable
enum class HabitCategory(val key: String, val label: String) {
    FOUNDATION("foundation", "Sleep & Recovery"),
    PHYSICAL("physical", "Gym & Strength"),
    CARDIO("cardio", "Sport & Running"),
    MIND("mind", "Mind & Meditation"),
    INTELLECT("intellect", "Reading & Books"),
    SKILLS("skills", "Deliberate Craft"),
    DEEP_WORK("deep_work", "Personal Project"),
    LANGUAGE("language", "Language Study"),
    NUTRITION("nutrition", "Nutrition & Fuel"),
    ENVIRONMENT("environment", "Clean Space"),
    FINANCE("finance", "Finance");

    companion object {
        fun fromKey(key: String): HabitCategory =
            entries.find { it.key.equals(key, ignoreCase = true) } ?: FOUNDATION
    }
}

@Serializable
enum class HabitFrequency {
    DAILY,
    WEEKLY;

    companion object {
        fun fromString(str: String?): HabitFrequency =
            if (str?.lowercase() == "weekly") WEEKLY else DAILY
    }
}

@Serializable
enum class HealthMetric(val key: String) {
    SLEEP("sleep"),
    WORKOUT("workout"),
    CARDIO("cardio"),
    STEPS("steps");

    companion object {
        fun fromKey(key: String?): HealthMetric? =
            entries.find { it.key.equals(key, ignoreCase = true) }
    }
}

@Serializable
data class HabitAutomation(
    val metric: HealthMetric,
    val target: Double
)

@Serializable
data class Habit(
    val id: String,
    val playerId: PlayerId,
    val title: String,
    val description: String = "",
    val category: HabitCategory,
    val points: Int,
    val iconName: String = "Sparkles",
    val frequency: HabitFrequency = HabitFrequency.DAILY,
    val weeklyTargetDays: Int? = null,
    val isQuantitative: Boolean = false,
    val quantityUnit: String? = null,
    val maxQuantity: Int? = null,
    val pointsPerUnit: Int? = null,
    val requiresProof: Boolean = false,
    val order: Int = 0,
    val isActive: Boolean = true,
    val isArchived: Boolean = false,
    val automation: HabitAutomation? = null
)

@Serializable
data class CheckIn(
    val id: String,
    val habitId: String,
    val playerId: PlayerId,
    val date: String, // YYYY-MM-DD format
    val pointsEarned: Int,
    val quantity: Int? = null,
    val proofUrl: String? = null,
    val proofUrls: List<String> = emptyList(),
    val completedAt: String, // ISO timestamp
    val note: String? = null,
    val isRetroactive: Boolean = false,
    val loggedAt: String? = null,
    val source: String? = null,
    val healthValue: Double? = null
)

@Serializable
data class CouplesReaction(
    val id: String,
    val fromPlayerId: PlayerId,
    val toPlayerId: PlayerId,
    val emoji: String,
    val message: String = "",
    val timestamp: String
)

@Serializable
data class RestDay(
    val id: String,
    val playerId: PlayerId,
    val date: String, // YYYY-MM-DD
    val reason: String? = null,
    val createdAt: String
)

@Serializable
enum class StakePeriod {
    WEEKLY,
    MONTHLY,
    YEARLY
}

@Serializable
enum class StakeStatus {
    ACTIVE,
    COMPLETED,
    ROLLED_OVER
}

@Serializable
data class Stake(
    val id: String,
    val period: StakePeriod,
    val periodKey: String, // e.g. "2026-W41" or "2026-10"
    val title: String,
    val description: String,
    val status: StakeStatus = StakeStatus.ACTIVE,
    val winnerId: String? = null, // "maciek", "myrna", or "tie"
    val dueDate: String
)

@Serializable
enum class BadgeTypeCategory {
    STREAK,
    PARITY,
    READING,
    PROOF,
    COMPETITION,
    MASTERY
}

@Serializable
data class BadgeDefinition(
    val id: String,
    val title: String,
    val description: String,
    val icon: String,
    val targetCount: Int,
    val category: BadgeTypeCategory
)

@Serializable
data class PlayerBadgeStatus(
    val badge: BadgeDefinition,
    val isUnlocked: Boolean,
    val progress: Int, // 0..100
    val currentValue: Int,
    val unlockedAt: String? = null
)

data class CategoryComparison(
    val category: HabitCategory,
    val label: String,
    val maciekPoints: Int,
    val myrnaPoints: Int,
    val leader: String // "maciek", "myrna", or "tie"
)

data class DailyDuelPoint(
    val dayName: String,
    val dateStr: String,
    val maciekPoints: Int,
    val myrnaPoints: Int,
    val isToday: Boolean,
    val isFuture: Boolean
)

data class DuelScoreSummary(
    val maciekScore: Int,
    val myrnaScore: Int,
    val leader: String, // "maciek", "myrna", or "tie"
    val delta: Int,
    val maciekPct: Float,
    val myrnaPct: Float
)

enum class LeaderboardScope(val title: String) {
    WEEKLY("This Week"),
    MONTHLY("This Month"),
    YEARLY("This Year"),
    LIFETIME_KARMA("Lifetime Karma")
}

data class LeaderboardStanding(
    val player: Player,
    val score: Int,
    val rank: Int,
    val isAhead: Boolean
)

data class DuelTenancy(
    val duelId: String,
    val ownerId: String,
    val guestId: String?,
    val ownerName: String,
    val guestName: String?,
    val inviteCode: String,
    val ownerColor: PlayerColorId,
    val guestColor: PlayerColorId,
    val ownerInvites: Int,
    val guestInvites: Int,
    val mySlot: PlayerId
)
