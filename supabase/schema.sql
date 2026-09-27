-- ==============================================================================
-- DO IT: Couples Habit Tracker & Duel Database Schema
-- Run this in your Supabase SQL Editor (supabase.com > SQL Editor > New query)
-- ==============================================================================

-- 1. Players Table
CREATE TABLE IF NOT EXISTS public.players (
    id TEXT PRIMARY KEY, -- 'maciek' or 'myrna'
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habits Table
CREATE TABLE IF NOT EXISTS public.habits (
    id TEXT PRIMARY KEY,
    player_id TEXT REFERENCES public.players(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 20,
    icon_name TEXT NOT NULL DEFAULT 'Activity',
    frequency TEXT DEFAULT 'daily',
    weekly_target_days INTEGER,
    is_quantitative BOOLEAN DEFAULT FALSE,
    quantity_unit TEXT,
    max_quantity INTEGER,
    points_per_unit INTEGER DEFAULT 1,
    requires_proof BOOLEAN DEFAULT FALSE,
    "order" INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Check-ins Table (Habit Completions)
CREATE TABLE IF NOT EXISTS public.check_ins (
    id TEXT PRIMARY KEY,
    habit_id TEXT REFERENCES public.habits(id) ON DELETE CASCADE,
    player_id TEXT REFERENCES public.players(id) ON DELETE CASCADE,
    date DATE NOT NULL, -- 'YYYY-MM-DD'
    points_earned INTEGER NOT NULL,
    quantity INTEGER,
    proof_url TEXT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Stakes & Wagers Table
CREATE TABLE IF NOT EXISTS public.stakes (
    id TEXT PRIMARY KEY,
    period TEXT NOT NULL, -- 'weekly', 'monthly', 'yearly'
    period_key TEXT NOT NULL, -- '2026-W39', '2026-09'
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'rolled_over'
    winner_id TEXT,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. OAuth Tokens Table (for background sync across devices)
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
    player_id TEXT PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'google'
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) & Allow public read/write for private 2-player app
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to habits" ON public.habits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to check_ins" ON public.check_ins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to stakes" ON public.stakes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to oauth_tokens" ON public.oauth_tokens FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime broadcasting on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stakes;

