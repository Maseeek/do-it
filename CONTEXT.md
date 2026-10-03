# Do It — Multi-Tenant Two-Player Habit Parity & Accountability Engine

A high-contrast, offline-first two-player habit competition and accountability platform. Originating as a calibrated two-player parity engine, **Do It** scales into a multi-tenant architecture where any pair of users can create accounts, pair via one-use cryptographic invitation tokens, and compete in isolated duels backed by Supabase Row-Level Security (RLS) and wearable telemetry automation.

## Bounded Context & Ubiquitous Language

### Core Domain Entities

**Duel**:
An isolated two-player competitive tenancy linking an `owner` and a `guest` account via a one-use cryptographic `invite_code`. All habits, check-ins, reactions, rest days, and stakes are strictly scoped to a single `duel_id` and enforced by PostgreSQL Row-Level Security policies.
_Avoid_: Room, Group, Team, Workspace, Organization

**Player**:
One of the two authenticated participants bound to a Duel slot (`owner` or `guest`), or one of the two local profiles when operating in offline/local-first mode. Each Player has read visibility across the shared Duel but write authority strictly over their own slot's habits, check-ins, reactions, and rest days.
_Avoid_: User, Account, Customer, Client, Member

**Habit**:
A recurring behavioral commitment configured during onboarding or custom setup, defined by an agreed point weight, category, and target cadence (daily or flexible weekly target sessions such as `4x/wk`).
_Avoid_: Task, Todo, Chore, Goal

**Equivalent Habit**:
Asymmetric habits tailored to each Player's individual lifestyle and preferences (e.g., *Basketball* vs. *Running*, *Swedish* vs. *Polish*, *Strength Training* vs. *Pilates*) that are calibrated to identical point ceilings (`240 Daily Par` / balanced weekly point potential) to preserve competitive fairness without forcing identical routines.
_Avoid_: Custom task, Handicap, Unbalanced habit

**Check-in**:
An idempotent record of a Habit completion (or quantitative progress such as pages read) for a specific civil date in the Player's local timezone, awarding calibrated points toward active Leaderboards and lifetime Karma. Enforced at the database layer by a composite uniqueness constraint `(duel_id, habit_id, date)`.
_Avoid_: Tick-off, Completion, Log, Entry

**Proof**:
An optional visual (client-compressed photo) or quantitative confirmation attached to a Check-in and surfaced in the shared Duel activity feed and proof gallery.
_Avoid_: Attachment, Evidence, Upload

**Wearable Automation**:
An optional telemetry binding on a Habit (`sleep`, `steps`, `workout`, `cardio`) evaluated against reconciled health records and daily rollups via OAuth 2.0 providers, while respecting manual Check-in precedence and weekly session caps.
_Avoid_: Background tracker, Passive logger

### Gamification & Competition Mechanics

**Karma**:
The permanent, cumulative lifetime point total earned by a Player across all historical Check-ins. Karma never resets and cannot be spent, decoupling lifetime consistency from short-term stake redemptions.
_Avoid_: XP, Currency, Balance, Spendable tokens

**Leaderboard Score**:
The time-windowed competitive point tally that resets automatically at period boundaries (**Weekly** on Sunday midnight, **Monthly** on the last calendar day, **Yearly** on December 31).
_Avoid_: Ranking, Level, Tier

**Stake**:
The mutual real-world reward or forfeit wagered by both Players on a given Leaderboard window (e.g., Sunday dinner date or weekend getaway), recorded in the shared Hall of Champions ledger upon period completion.
_Avoid_: Prize, Bounty, Purchase, Shop item

**Rest Day**:
An explicitly declared recovery date scoped to a Player within a Duel that preserves active habit streaks without awarding artificial Leaderboard points.
_Avoid_: Cheat day, Skip, Freeze token
