-- Persist phone numbers for Match & Drink players so accepted matches can reveal a copyable contact.

ALTER TABLE public.match_drink_players
  ADD COLUMN IF NOT EXISTS phone TEXT NULL;
