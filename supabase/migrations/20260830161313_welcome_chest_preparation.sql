alter table public.welcome_chest_rewards
  drop constraint if exists welcome_chest_rewards_status_check;

alter table public.welcome_chest_rewards
  add constraint welcome_chest_rewards_status_check
  check (status in ('prepared', 'processing', 'completed', 'failed'));
