package com.doit.app.data.remote

object SupabaseConfig {
    // In production these are read from BuildConfig or user configuration in Settings
    var supabaseUrl: String = "https://example.supabase.co"
    var supabaseAnonKey: String = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy"
    var authToken: String? = null // Authenticated user JWT when signed in

    val restUrl: String
        get() = "${supabaseUrl.removeSuffix("/")}/rest/v1"

    val realtimeWsUrl: String
        get() {
            val base = supabaseUrl.removeSuffix("/").replace("https://", "wss://").replace("http://", "ws://")
            return "$base/realtime/v1/websocket?apikey=$supabaseAnonKey&vsn=1.0.0"
        }
}
