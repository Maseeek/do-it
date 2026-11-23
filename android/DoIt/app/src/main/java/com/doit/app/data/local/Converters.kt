package com.doit.app.data.local

import androidx.room.TypeConverter
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class Converters {
    private val json = Json { ignoreUnknownKeys = true }

    @TypeConverter
    fun fromStringList(list: List<String>?): String {
        return json.encodeToString(list ?: emptyList())
    }

    @TypeConverter
    fun toStringList(data: String?): List<String> {
        if (data.isNullOrEmpty()) return emptyList()
        return try {
            json.decodeFromString(data)
        } catch (_: Exception) {
            emptyList()
        }
    }
}
