-- Extends the existing customer achievements system with normalized,
-- idempotent unlocks and the activity history required by long-term rules.

create table if not exists public.customer_achievement_unlocks (
  email text not null,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (email, achievement_id)
);

create table if not exists public.customer_achievement_activity (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  activity_type text not null check (activity_type in ('visit', 'event')),
  activity_key text,
  occurred_at timestamptz not null,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique (email, dedupe_key)
);

create index if not exists idx_customer_achievement_activity_email_occurred
  on public.customer_achievement_activity (email, occurred_at);

create index if not exists idx_customer_achievement_activity_email_type_key
  on public.customer_achievement_activity (email, activity_type, activity_key);

insert into public.customer_achievement_unlocks (email, achievement_id, unlocked_at)
select lower(ca.email), achievement_id, ca.updated_at
from public.customer_achievements ca
cross join lateral unnest(ca.achievement_ids) as achievement_id
on conflict (email, achievement_id) do nothing;

alter table public.customer_achievement_unlocks enable row level security;
alter table public.customer_achievement_activity enable row level security;

revoke all on table public.customer_achievement_unlocks from anon, authenticated;
revoke all on table public.customer_achievement_activity from anon, authenticated;

-- Both tables are intentionally service-role-only. The server returns a
-- filtered presentation model, preventing hidden achievements from leaking.

