-- Match & Drink Tables

-- Sessions
CREATE TABLE IF NOT EXISTS match_drink_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  join_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby', -- lobby | playing | matching | reveal | ended
  stage_mode TEXT NOT NULL DEFAULT 'lobby', -- lobby | question | question_results | message | matching | reveal | ended
  current_question_index INTEGER NOT NULL DEFAULT 0,
  current_stage_message_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Players
CREATE TABLE IF NOT EXISTS match_drink_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES match_drink_sessions(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  table_number TEXT NULL,
  age_range TEXT NOT NULL,
  gender TEXT NOT NULL,
  relationship_status TEXT NOT NULL,
  looking_for TEXT NOT NULL,
  public_consent BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Answers
CREATE TABLE IF NOT EXISTS match_drink_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES match_drink_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES match_drink_players(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  selected_option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, player_id, question_id)
);

-- Matches
CREATE TABLE IF NOT EXISTS match_drink_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES match_drink_sessions(id) ON DELETE CASCADE,
  player_a_id UUID NOT NULL REFERENCES match_drink_players(id) ON DELETE CASCADE,
  player_b_id UUID NOT NULL REFERENCES match_drink_players(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  match_type TEXT NOT NULL,
  label TEXT NOT NULL,
  common_criterion TEXT NOT NULL,
  reason TEXT NOT NULL,
  accepted_by_a BOOLEAN NULL,
  accepted_by_b BOOLEAN NULL,
  accepted_at_a TIMESTAMPTZ NULL,
  accepted_at_b TIMESTAMPTZ NULL,
  drink_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  drink_redeemed BOOLEAN NOT NULL DEFAULT FALSE,
  drink_redeemed_at TIMESTAMPTZ NULL,
  drink_code TEXT UNIQUE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bottle Messages
CREATE TABLE IF NOT EXISTS match_drink_bottle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES match_drink_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES match_drink_players(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  display_mode TEXT NOT NULL, -- anonymous | nickname
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | shown
  approved_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  moderated_at TIMESTAMPTZ NULL,
  shown_at TIMESTAMPTZ NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_md_players_session ON match_drink_players(session_id);
CREATE INDEX IF NOT EXISTS idx_md_answers_session ON match_drink_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_md_matches_session ON match_drink_matches(session_id);
CREATE INDEX IF NOT EXISTS idx_md_bottle_messages_session ON match_drink_bottle_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_md_bottle_messages_status ON match_drink_bottle_messages(status);
CREATE INDEX IF NOT EXISTS idx_md_sessions_join_code ON match_drink_sessions(join_code);
