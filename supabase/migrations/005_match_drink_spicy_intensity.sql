-- Marks stronger adult spicy questions so each Match & Drink session can
-- include a minimum quota without relying on fragile text matching.

ALTER TABLE public.match_drink_questions
  ADD COLUMN IF NOT EXISTS spicy_intensity TEXT NOT NULL DEFAULT 'standard';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'match_drink_questions_spicy_intensity_check'
      AND conrelid = 'public.match_drink_questions'::regclass
  ) THEN
    ALTER TABLE public.match_drink_questions
      ADD CONSTRAINT match_drink_questions_spicy_intensity_check
      CHECK (spicy_intensity IN ('standard', 'adult'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_md_questions_category_spicy_intensity
  ON public.match_drink_questions (category, spicy_intensity);

UPDATE public.match_drink_questions
SET spicy_intensity = 'adult'
WHERE category = 'spicy'
  AND (
    lower(text) LIKE '%sotto le lenzuola%'
    OR lower(text) LIKE '%rapporti occasionali%'
    OR lower(text) LIKE '%cosa a tre%'
    OR lower(text) LIKE '%dominato%'
    OR lower(text) LIKE '%prendere il controllo%'
    OR lower(text) LIKE '%passione%'
    OR lower(text) LIKE '%messaggio%ose%'
    OR lower(text) LIKE '%messaggio%osé%'
    OR lower(text) LIKE '%posto%strano%dove%'
    OR lower(text) LIKE '%sesso consensuale%'
    OR lower(text) LIKE '%dirty talk%'
    OR lower(text) LIKE '%fantasia adulta%'
    OR lower(text) LIKE '%notte spinta%'
    OR lower(text) LIKE '%finisce in camera%'
    OR lower(text) LIKE '%qui si fa sul serio%'
    OR lower(text) LIKE '%bacio molto spinto%'
    OR lower(text) LIKE '%limite ti piace rispettare%'
  );
