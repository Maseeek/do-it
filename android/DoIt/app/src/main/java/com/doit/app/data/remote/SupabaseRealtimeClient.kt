package com.doit.app.data.remote

import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.*
import java.util.concurrent.TimeUnit

sealed class RealtimeEvent {
    data class TableChange(val table: String, val eventType: String, val recordJson: String) : RealtimeEvent()
    data class StatusChange(val isConnected: Boolean) : RealtimeEvent()
}

class SupabaseRealtimeClient(
    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .build()
) {
    private val tag = "SupabaseRealtime"
    private var webSocket: WebSocket? = null
    private val _events = MutableSharedFlow<RealtimeEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<RealtimeEvent> = _events.asSharedFlow()

    private val json = Json { ignoreUnknownKeys = true }

    fun connect(duelId: String) {
        disconnect()
        val url = SupabaseConfig.realtimeWsUrl
        val request = Request.Builder().url(url).build()

        webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(tag, "Connected to Supabase Realtime WebSocket")
                _events.tryEmit(RealtimeEvent.StatusChange(true))
                subscribeToTable(webSocket, "duel_check_ins", duelId)
                subscribeToTable(webSocket, "duel_habits", duelId)
                subscribeToTable(webSocket, "duel_stakes", duelId)
                subscribeToTable(webSocket, "duel_reactions", duelId)
                subscribeToTable(webSocket, "duel_rest_days", duelId)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    // Check if it's a postgres_changes broadcast
                    if (text.contains("postgres_changes")) {
                        val parsed = json.parseToJsonElement(text)
                        _events.tryEmit(RealtimeEvent.TableChange(table = "unknown", eventType = "*", recordJson = text))
                    }
                } catch (e: Exception) {
                    Log.w(tag, "Failed to parse realtime msg: $text", e)
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(tag, "Realtime closed: $reason ($code)")
                _events.tryEmit(RealtimeEvent.StatusChange(false))
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(tag, "Realtime failure: ${t.message}")
                _events.tryEmit(RealtimeEvent.StatusChange(false))
            }
        })
    }

    private fun subscribeToTable(ws: WebSocket, table: String, duelId: String) {
        val topic = "realtime:public:$table"
        val joinPayload = buildJsonObject {
            put("topic", topic)
            put("event", "phx_join")
            put("payload", buildJsonObject {
                put("config", buildJsonObject {
                    put("broadcast", buildJsonObject { put("self", false) })
                    put("presence", buildJsonObject { put("key", "") })
                    put("postgres_changes", buildJsonObject {
                        put("event", "*")
                        put("schema", "public")
                        put("table", table)
                        put("filter", "duel_id=eq.$duelId")
                    })
                })
            })
            put("ref", "1")
        }.toString()
        ws.send(joinPayload)
    }

    fun disconnect() {
        try {
            webSocket?.close(1000, "Normal closure")
            webSocket = null
        } catch (_: Exception) {}
    }
}
