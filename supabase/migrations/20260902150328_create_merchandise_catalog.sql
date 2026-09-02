create table if not exists public.merchandise_products (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  price_label text,
  button_label text,
  order_url text,
  images jsonb not null default '[]'::jsonb,
  required_rank text check (required_rank in ('mozzo', 'corsaro', 'capitano', 'leggenda')),
  lock_text text,
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merchandise_products_published_position_idx
  on public.merchandise_products (published, position asc, created_at desc);

alter table public.merchandise_products enable row level security;

-- Il catalogo è letto solo dalla route server e gestito dalla sessione admin.
revoke all on table public.merchandise_products from anon, authenticated;
