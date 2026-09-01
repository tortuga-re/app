-- Migrazione di pulizia: Rimozione tabelle inutilizzate (Match & Drink, Buzzer, Customer Avatars)
-- Esegui questo script nell'editor SQL di Supabase per eliminare le tabelle vecchie non più utilizzate dall'app.

DROP TABLE IF EXISTS public.customer_avatars CASCADE;

DROP TABLE IF EXISTS public.match_drink_players CASCADE;
DROP TABLE IF EXISTS public.match_drink_bottle_messages CASCADE;
DROP TABLE IF EXISTS public.match_drink_questions CASCADE;
DROP TABLE IF EXISTS public.match_drink_sessions CASCADE;
DROP TABLE IF EXISTS public.match_drink_answers CASCADE;
DROP TABLE IF EXISTS public.match_drink_matches CASCADE;

DROP TABLE IF EXISTS public.buzzer_session CASCADE;
DROP TABLE IF EXISTS public.buzzer_playlists CASCADE;

-- Attiva la Row Level Security (RLS) sulle tabelle dell'app ancora aperte
ALTER TABLE IF EXISTS public.legends_hall_of_fame ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_state ENABLE ROW LEVEL SECURITY;
