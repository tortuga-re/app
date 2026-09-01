alter table public.pirate_slot_daily_plays
  add column if not exists customer_email text not null default '';

alter table public.pirate_slot_daily_plays
  alter column customer_email drop default;

create index if not exists pirate_slot_daily_plays_email_date_idx
  on public.pirate_slot_daily_plays (customer_email, play_date desc);
