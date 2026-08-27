-- Create sequence for Legend numbers
CREATE SEQUENCE IF NOT EXISTS public.legend_number_seq START WITH 1;

-- Create Hall of Fame table
CREATE TABLE IF NOT EXISTS public.legends_hall_of_fame (
    email TEXT PRIMARY KEY,
    nickname TEXT NOT NULL CHECK (char_length(nickname) >= 2 AND char_length(nickname) <= 25),
    real_name TEXT,
    legend_number INT NOT NULL UNIQUE DEFAULT nextval('public.legend_number_seq'),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.legends_hall_of_fame ENABLE ROW LEVEL SECURITY;

-- Select policy (allow anyone to view legends)
CREATE POLICY "Allow public read access" ON public.legends_hall_of_fame
    FOR SELECT USING (true);
