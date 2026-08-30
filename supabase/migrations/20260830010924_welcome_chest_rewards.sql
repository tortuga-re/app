-- One row per customer makes the welcome reward idempotent even when the
-- browser retries the request after a slow connection or an app restart.
create table if not exists public.welcome_chest_rewards (
  email text primary key,
  status text not null check (status in ('processing', 'completed', 'failed')),
  is_new_customer boolean not null default false,
  coupon_code text not null default 'BAULE-DI-BENVENUTO',
  coupon_contact_code text,
  coupon_expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.welcome_chest_rewards enable row level security;
revoke all on table public.welcome_chest_rewards from anon, authenticated;
