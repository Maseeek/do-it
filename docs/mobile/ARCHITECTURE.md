# Do It — Mobile System Architecture

This document defines the high-level system architecture, cross-platform technical parity matrix, offline-first synchronization protocol, health telemetry pipelines, and security standards for the native **Do It** iOS and Android applications.

---

## 1. High-Level System Architecture

Do It is an asymmetric two-player habit accountability platform built on a calibrated **240 Daily Par** economic model. The mobile ecosystem delivers zero-friction habit completion, biometric wearable automation, and sub-second dual-player synchronization across mobile platforms and the existing web client.

```mermaid
flowchart TB
    subgraph MobileDevice["Mobile Client (iOS / Android)"]
        UI["UI Layer\n(SwiftUI / Jetpack Compose)"]
        Widgets["Glance & Lock Screen Widgets\n(WidgetKit / Jetpack Glance)"]
        Intents["Interactive App Intents\n(1-Tap Habit Logging)"]
        
        subgraph LocalEngine["Local Engine (Offline-First)"]
            Store["Local Database\n(SwiftData / Room SQLite)"]
            Outbox["Mutation Outbox Queue\n(Pending Operations)"]
            ConflictResolver["Deterministic Conflict Resolver\n(LWW + Parity Precedence)"]
        end

        subgraph HealthPipeline["Health Telemetry Ingestion"]
            HealthDaemon["Health Subsystem\n(HealthKit Daemon / Health Connect)"]
            BackgroundDelivery["Background Trigger\n(HKObserverQuery / WorkManager)"]
            TelemetryNormalizer["Telemetry Normalizer\n(Sleep / Steps / Cardio / Strength)"]
        end
    end

    subgraph SupabaseCloud["Supabase Multi-Tenant Backend"]
        AuthService["Supabase Auth\n(PKCE OAuth + Hardware Keystore)"]
        PostgresDB[("PostgreSQL 15+ DB\nRLS Tenancy: duels, duel_habits,\nduel_check_ins, duel_stakes")]
        RealtimeEngine["Supabase Realtime\n(Postgres CDC WebSocket)"]
        StorageEngine["Supabase Storage\n(Encrypted Proof Artifacts)"]
    end

    subgraph PeerClient["Peer Player Mobile Client"]
        PeerUI["Peer Device UI\n(Instant Haptic Notification)"]
    end

    %% Interactions
    UI --> Store
    Widgets --> Intents
    Intents --> Store
    Store --> Outbox
    Outbox --> ConflictResolver

    HealthDaemon --> BackgroundDelivery
    BackgroundDelivery --> TelemetryNormalizer
    TelemetryNormalizer --> Store

    ConflictResolver <-->|"TLS 1.3 REST / RPC\n(Signed Bearer JWT)"| PostgresDB
    ConflictResolver <-->|"WebSocket Channel\n(duel_id tenancy)"| RealtimeEngine
    AuthService -.->|"Hardware JWT Rotation"| ConflictResolver
    Store -->|"Compressed WebP"| StorageEngine
    RealtimeEngine -->|"CDC Payload"| PeerClient
```

### Core Architecture Principles

1. **Local-First Supremacy**: Every user action (habit check-in, rest day request, cheer reaction, stake update) commits to the local transactional database first (`SwiftData` on iOS, `Room` on Android). The user interface renders state updates synchronously with zero network latency.
2. **Deterministic Asymmetric Parity**: Competitors choose different lifestyle habits (e.g., Strength Training vs. Pilates), but both compete against calibrated weekly target points and an equivalent **240 Daily Par** ceiling.
3. **Idempotent Multi-Tenancy**: Data is strictly scoped to a `duel_id` shared between an `owner` and a `guest` player slot. The database layer enforces multi-tenant isolation via PostgreSQL Row-Level Security (RLS) policies and composite unique constraints: `(duel_id, habit_id, date)`.
4. **Autonomous Biometric Automation**: Wearable telemetry is evaluated locally on the client against habit thresholds. Validated readings produce check-in records without requiring cloud roundtrips or exposing unconsented raw health metrics to backend servers.

---

## 2. Cross-Platform Parity Matrix

The native mobile architecture mirrors the domain model and gamification engine of the web platform while taking full advantage of low-level operating system capabilities.

| Capability Layer | Web Client (`src/`) | iOS Native (`ios/`) | Android Native (`android/`) |
| :--- | :--- | :--- | :--- |
| **Language & Runtime** | TypeScript 5.5 / Node.js 20 | Swift 6 / Swift Concurrency (`Sendable`) | Kotlin 2.0+ / Coroutines & Flow |
| **UI Framework** | Next.js 15 / React 19 / Tailwind CSS | SwiftUI (Declarative / StateObject / Observation) | Jetpack Compose (Material 3 Adaptive) |
| **Local Persistence** | `localStorage` / IndexedDB caching | SwiftData (`@Model`) backed by SQLite | Room Persistence Library (`@Entity`) |
| **Reactive State** | React Context / Custom Hooks | Swift Observation (`@Observable`) | Jetpack ViewModel + `StateFlow` |
| **Health Telemetry** | Google Health REST API (OAuth cron) | HealthKit (`HKHealthStore` + Background Delivery) | Health Connect API (`HealthConnectClient` + SDK) |
| **Home Screen Widgets** | PWA Manifest shortcuts | WidgetKit (Small, Medium, Lock Screen Accessory) | Jetpack Glance (`GlanceAppWidget`) |
| **1-Tap Interactive Logging** | Web click handler | App Intents (`AppIntent` in WidgetKit) | Glance `ActionCallback` + WorkManager |
| **Push Notifications** | Web Push API (Service Worker) | Apple Push Notification service (APNs) | Firebase Cloud Messaging (FCM) |
| **Biometric Auth & Tokens** | Browser Cookies / Session Storage | Apple Keychain Services (`kSecAttrAccessible`) | Android KeyStore + `EncryptedSharedPreferences` |
| **Photo Proof Pipeline** | Browser Canvas Client Compression | CoreImage / AVFoundation WebP compression | AndroidX ImageCapture / WebP Transcoder |
| **Realtime Sync** | `@supabase/supabase-js` WebSocket | `Supabase-Swift` Realtime Channel | `Supabase-kt` Realtime Channel |

---

## 3. Offline-First Synchronization Protocol

The Do It synchronization protocol guarantees that two players maintain synchronized game state even during intermittent network connectivity, airplane mode, or background execution limits.

### 3.1 Data Model & Outbox Pattern

All local modifications write transactionally to both the domain table and a local `PendingMutation` outbox table.

```mermaid
classDiagram
    class PendingMutation {
        +UUID mutation_id
        +UUID duel_id
        +String table_name
        +String operation_type
        +String record_id
        +JSON payload
        +Timestamp created_at
        +Int retry_count
        +String status
    }
    class HabitEntity {
        +String id
        +String duel_id
        +String player_id
        +String title
        +Int points
        +String frequency
        +Int weekly_target_days
        +Boolean is_active
        +Timestamp updated_at
    }
    class CheckInEntity {
        +String id
        +String duel_id
        +String habit_id
        +String player_id
        +String date
        +Int points_earned
        +String source
        +Float health_value
        +Timestamp completed_at
    }
    PendingMutation --> CheckInEntity : records
    PendingMutation --> HabitEntity : records
```

### 3.2 Bidirectional Sync Flow

```mermaid
sequenceDiagram
    autonumber
    participant UI as Client UI / Widget
    participant DB as Local Database (SwiftData/Room)
    participant Outbox as Mutation Outbox
    participant Engine as Sync Engine Worker
    participant Remote as Supabase Postgres (RLS)
    participant Peer as Peer Client (Realtime)

    UI->>DB: Perform Check-in (habit_id, date, points)
    DB->>Outbox: Insert PendingMutation(UPSERT, check_in_payload)
    DB-->>UI: Optimistic State Rendered (< 16ms)
    
    critical Sync Trigger
        Engine->>Outbox: Dequeue pending mutations (ordered by created_at)
        Engine->>Remote: POST /rest/v1/duel_check_ins (Idempotent UPSERT)
        alt Network Success
            Remote-->>Engine: 201 Created / 200 OK
            Engine->>Outbox: Mark mutation as PROCESSED / Delete
            Remote->>Peer: Broadcast CDC (INSERT/UPDATE payload)
            Peer->>Peer: Ingest Check-in & Haptic Pulse
        else Network Unavailable / Offline
            Engine->>Outbox: Increment retry_count, schedule exponential backoff
        else Conflict / RLS Rejection
            Engine->>Remote: Fetch authoritative row state
            Engine->>DB: Resolve via Conflict Strategy
            Engine->>Outbox: Delete failed mutation
        end
    end
```

### 3.3 Conflict Resolution Rules

The synchronization engine enforces three strict conflict rules:

1. **Composite Uniqueness on Check-ins**:
   Check-ins are uniquely identified by the tuple `(duel_id, habit_id, date)`. An insert for an existing tuple becomes a deterministic update:
   $$\text{CheckInID} = \text{"health-" } \Vert \text{ habit\_id } \Vert \text{ "-" } \Vert \text{ date}$$
2. **Manual Check-In Precedence**:
   If a user records a manual check-in (`source = "manual"`), incoming automated wearable sync (`source = "wearable"`) **must never overwrite** the manual record, even if the wearable sync finishes later. The only exception is if the manual check-in was explicitly marked as a temporary placeholder within the 48-hour trailing settling window.
3. **Last-Write-Wins (LWW) with Lamport Timestamps for Non-Point Entities**:
   Habit configurations, duel stakes, and reaction cheers utilize UTC ISO-8601 timestamps (`updated_at`). Remote changes with newer timestamps overwrite local cached versions, triggering an automatic UI state re-render.
4. **Exponential Backoff and Jitter**:
   Failed mutations retry using decorrelated full jitter to prevent thundering herds when recovering from connectivity outages:
   $$t_{\text{sleep}} = \min(t_{\text{max}}, \; \text{random}(0, \; t_{\text{base}} \times 2^{\text{retry\_count}}))$$
   Where $t_{\text{base}} = 1.5\text{s}$ and $t_{\text{max}} = 300\text{s}$.

---

## 4. Health Telemetry Pipeline (HealthKit + Health Connect)

The mobile clients interface directly with device health daemons rather than relying on third-party cloud polling.

```mermaid
flowchart LR
    subgraph iOSHealth["iOS Health Subsystem"]
        HKStore[("HealthKit Store")]
        HKQuery["HKObserverQuery\n+ HKAnchoredObjectQuery"]
    end

    subgraph AndroidHealth["Android Health Subsystem"]
        HCStore[("Health Connect Store")]
        HCWorker["WorkManager\nPeriodic Sync Worker"]
    end

    subgraph NormalizationEngine["Telemetry Normalizer & Policy Filter"]
        Classifier["Exercise & Stage Classifier"]
        SettlingBuffer["48-Hour Settling Buffer\n(Late-arriving Oura/Whoop/Watch Data)"]
        ParityEvaluator["Parity Point Deductor\n(Piecewise Sleep & Exercise Caps)"]
    end

    subgraph StoragePipeline["Local & Remote DB"]
        CheckInTable[("duel_check_ins")]
    end

    HKStore --> HKQuery --> Classifier
    HCStore --> HCWorker --> Classifier
    Classifier --> SettlingBuffer
    SettlingBuffer --> ParityEvaluator
    ParityEvaluator --> CheckInTable
```

### 4.1 Native Health Ingestion Mechanics

#### iOS (Apple HealthKit)
- **Observer Queries**: Registers an `HKObserverQuery` for:
  - `HKCategoryTypeIdentifier.sleepAnalysis`
  - `HKQuantityTypeIdentifier.stepCount`
  - `HKWorkoutTypeIdentifier`
- **Background Delivery**: Invokes `HKHealthStore.enableBackgroundDelivery(for:frequency:priority:)` set to `.immediate` for workouts and `.hourly` for steps and sleep.
- **Anchored Object Queries**: Uses `HKAnchoredObjectQuery` to fetch incremental delta records since the previous persistent anchor, minimizing battery drain and memory footprint.

#### Android (Health Connect)
- **System Integration**: Uses the Android 14+ Jetpack Health Connect API (`androidx.health.connect.client.HealthConnectClient`).
- **Changes Token Sync**: Stores a persistent `changesToken` to fetch only mutated records via `getChanges(changesToken)`.
- **Scheduled Background Sync**: Registers a periodic `CoroutineWorker` scheduled every 15 minutes with constraints:
  - `NetworkType.CONNECTED`
  - `BatteryNotLow(true)`

### 4.2 Settling Windows & Delay Handling
Wearable devices (Oura Ring, Whoop, Apple Watch, Garmin) often compute sleep stages or sync workouts hours after the event occurs.
- The telemetry engine inspects a **trailing 48-hour window** (`[today - 2 days, today]`).
- Sleep records recalculate automatically if sleep stage updates arrive before the 48-hour cutoff.
- Any check-in updated during this settling window updates the remote Supabase record with `source: "wearable"`.

---

## 5. Security, Authentication & Token Handling

Do It enforces a zero-trust model for client-side cryptographic storage, credential lifecycles, and database row access.

```mermaid
flowchart TD
    subgraph ClientStorage["Client Secure Storage"]
        KeyStore["iOS Keychain / Android KeyStore\n(Hardware Backed Enclave)"]
        MemoryCache["Ephemeral Session Cache\n(Volatile Memory Only)"]
    end

    subgraph AuthLifecycle["Token Lifecycle & Refresh Engine"]
        PKCE["OAuth 2.0 PKCE Flow\n(Apple Sign-In / Google Auth)"]
        AccessToken["Access Token (JWT)\nTTL: 3600 seconds"]
        RefreshToken["Refresh Token\nSingle-Use Rotating"]
        Mutex["Concurrent Request Interceptor\n(Refresh Mutex)"]
    end

    subgraph SupabaseSecurity["Supabase Cloud Security"]
        RLS["PostgreSQL Row-Level Security\n(auth.uid() = owner_id OR guest_id)"]
    end

    PKCE --> KeyStore
    KeyStore --> MemoryCache
    MemoryCache --> AccessToken
    AccessToken -->|"Attached to HTTP Authorization Header"| RLS
    AccessToken -->|"401 Unauthorized"| Mutex
    Mutex -->|"Exchange Refresh Token"| RefreshToken
    RefreshToken --> KeyStore
```

### 5.1 Credential Storage & Encryption

- **iOS Implementation**:
  - Refresh tokens, access tokens, and duel invitation secrets are stored using Apple Keychain Services (`Security.framework`).
  - Access control flag: `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
  - Disallows unencrypted iCloud Keychain synchronization to prevent cross-device session leaks.
- **Android Implementation**:
  - Tokens are encrypted via `EncryptedSharedPreferences` backed by Android KeyStore (`MasterKey.DEFAULT_AES256_GCM_SPEC`).
  - Hardware cryptographic keys are sealed inside the device Trusted Execution Environment (TEE) or StrongBox Keymaster.

### 5.2 Multi-Tenant Row-Level Security (RLS) Enforcement

Every database read, write, and realtime subscription is constrained by PostgreSQL RLS policies matching the authenticated Supabase user ID:

```sql
-- Enforces that a player can only read habits within their duel
CREATE POLICY "Members read habits" ON public.duel_habits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.duels d 
      WHERE d.id = duel_id 
        AND (d.owner_id = auth.uid() OR d.guest_id = auth.uid())
    )
  );

-- Enforces that a player can only modify habits for their assigned slot
CREATE POLICY "Players write own habits" ON public.duel_habits
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.duels d 
      WHERE d.id = duel_id 
        AND (
          (player_slot = 'maciek' AND d.owner_id = auth.uid()) OR 
          (player_slot = 'myrna' AND d.guest_id = auth.uid())
        )
    )
  );
```

### 5.3 Token Refresh Mutex Pipeline
When access tokens expire (HTTP 401), concurrent network requests pause behind an asynchronous mutex. Exactly one request exchanges the single-use refresh token with the Supabase Auth server, updates the secure hardware keystore, and unblocks waiting requests with the new token. If token rotation fails, all sessions are cleared, and the user is redirected to the native authentication screen.
