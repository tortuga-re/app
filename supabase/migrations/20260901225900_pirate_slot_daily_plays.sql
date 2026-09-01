-- One server-side play per Cooperto contact and Tortuga calendar day.
-- The browser never receives a prize unless the corresponding play is marked won.
create table if not exists public.pirate_slot_daily_plays (
  id uuid primary key default gen_random_uuid(),
  contact_code text not null,
  customer_email text not null,
  play_date date not null,
  status text not null default 'started'
    check (status in ('started', 'won', 'lost', 'claiming', 'claimed')),
  attempts_used smallint not null default 0
    check (attempts_used between 0 and 5),
  coupon_code text,
  coupon_contact_code text,
  coupon_qr_value text,
  coupon_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_code, play_date)
);

create index if not exists pirate_slot_daily_plays_date_idx
  on public.pirate_slot_daily_plays (play_date desc);

alter table public.pirate_slot_daily_plays enable row level security;
revoke all on table public.pirate_slot_daily_plays from anon, authenticated;
grant select, insert, update on table public.pirate_slot_daily_plays to service_role;
