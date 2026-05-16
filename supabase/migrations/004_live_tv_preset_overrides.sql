-- Live TV preset overrides
-- Allows saving a custom playlist per preset that takes priority over the static default.

CREATE TABLE IF NOT EXISTS public.live_tv_preset_overrides (
  preset_id TEXT PRIMARY KEY,
  items     JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.live_tv_preset_overrides ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'live_tv_preset_overrides'
      AND policyname = 'Service role full access live_tv_preset_overrides'
  ) THEN
    CREATE POLICY "Service role full access live_tv_preset_overrides"
      ON public.live_tv_preset_overrides
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
