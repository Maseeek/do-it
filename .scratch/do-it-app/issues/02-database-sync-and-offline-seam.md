Type: research
Status: resolved
Blocked by: none

## Question

How should the data persistence layer be structured so the app works seamlessly offline and out-of-the-box in local development with zero setup, while offering instantaneous live multi-device synchronization via Supabase PostgreSQL? What is the schema for players, habits, check-ins, and stakes?

## Answer

Implemented a hybrid client storage provider with automatic local persistence (`localStorage`), zero setup required out of the box, and optional Supabase settings config in Vault. Schema defined across 4 entities: Player, Habit, CheckIn, and Stake, with optimistic UI updates.
