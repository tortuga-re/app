-- App alignment migration
-- Brings repository migrations in sync with tables already used by the app in production.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Generic app state
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_state (
  key TEXT PRIMARY KEY,
  value TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Live Buzzer
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.buzzer_session (
  id BIGINT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buzzer_session_updated_at
  ON public.buzzer_session (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.buzzer_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  playlist_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buzzer_playlists_created_at
  ON public.buzzer_playlists (created_at ASC);

-- ---------------------------------------------------------------------------
-- Live TV
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.live_tv_state (
  id BIGINT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_tv_state_updated_at
  ON public.live_tv_state (updated_at DESC);

-- ---------------------------------------------------------------------------
-- Customer profile enrichments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customer_avatars (
  email TEXT PRIMARY KEY,
  avatar_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_achievements (
  email TEXT PRIMARY KEY,
  achievement_ids TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Match & Drink questions and schema alignment
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.match_drink_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_md_questions_category
  ON public.match_drink_questions (category);

ALTER TABLE public.match_drink_sessions
  ADD COLUMN IF NOT EXISTS question_ids JSONB NULL,
  ADD COLUMN IF NOT EXISTS bottle_messages_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.match_drink_players
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL;

-- ---------------------------------------------------------------------------
-- Basic RLS enablement for tables accessed via service role only
-- ---------------------------------------------------------------------------

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buzzer_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buzzer_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_tv_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_drink_questions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_state'
      AND policyname = 'Service role full access app_state'
  ) THEN
    CREATE POLICY "Service role full access app_state"
      ON public.app_state
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'buzzer_session'
      AND policyname = 'Service role full access buzzer_session'
  ) THEN
    CREATE POLICY "Service role full access buzzer_session"
      ON public.buzzer_session
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'buzzer_playlists'
      AND policyname = 'Service role full access buzzer_playlists'
  ) THEN
    CREATE POLICY "Service role full access buzzer_playlists"
      ON public.buzzer_playlists
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'live_tv_state'
      AND policyname = 'Service role full access live_tv_state'
  ) THEN
    CREATE POLICY "Service role full access live_tv_state"
      ON public.live_tv_state
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'customer_avatars'
      AND policyname = 'Service role full access customer_avatars'
  ) THEN
    CREATE POLICY "Service role full access customer_avatars"
      ON public.customer_avatars
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'customer_achievements'
      AND policyname = 'Service role full access customer_achievements'
  ) THEN
    CREATE POLICY "Service role full access customer_achievements"
      ON public.customer_achievements
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'match_drink_questions'
      AND policyname = 'Service role full access match_drink_questions'
  ) THEN
    CREATE POLICY "Service role full access match_drink_questions"
      ON public.match_drink_questions
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Seed rows for singleton state tables
-- ---------------------------------------------------------------------------

INSERT INTO public.buzzer_session (id, state)
VALUES (
  1,
  jsonb_build_object(
    'status', 'idle',
    'currentRound', 0,
    'roundOpenedAt', null,
    'entries', '[]'::jsonb,
    'leaderboard', '[]'::jsonb,
    'currentResponderEntryId', null,
    'leaderboardVisible', true,
    'leaderboardRevealStep', null,
    'frozenLeaderboard', null,
    'roundEnded', false,
    'lastUpdateId', 'init',
    'countdownStart', null,
    'isLive', false,
    'accumulatedTimeMs', 0,
    'youtubePlaylistId', null,
    'youtubeStatus', 'stopped',
    'youtubeCurrentIndex', 0,
    'youtubeCommandId', 0,
    'lastScoredEntry', null
  )
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.live_tv_state (id, state)
VALUES (
  1,
  jsonb_build_object(
    'stageMode', 'live_tv',
    'activePresetId', 'generica',
    'playlist', '[]'::jsonb,
    'currentItemIndex', 0,
    'currentItemStartedAt', NOW()::text,
    'nowPlayingOverride', null,
    'nowPlayingStartedAt', null,
    'overlay', null,
    'isBlackout', false,
    'autoReturnAfterBuzzer', false,
    'autoReturnAfterMatchDrink', false,
    'lastUpdateId', 'init',
    'updatedAt', NOW()::text
  )
)
ON CONFLICT (id) DO NOTHING;
