create table if not exists public.tortuga_winners (
  id uuid primary key default gen_random_uuid(),
  team_name text not null check (char_length(trim(team_name)) between 1 and 120),
  evening text not null check (evening in ('friday', 'saturday', 'sunday')),
  created_at timestamptz not null default now()
);

create index if not exists tortuga_winners_evening_created_at_idx
  on public.tortuga_winners (evening, created_at desc);

alter table public.tortuga_winners enable row level security;

revoke all on table public.tortuga_winners from anon, authenticated;
