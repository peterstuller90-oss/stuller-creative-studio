-- Učiteľ 2.0 (public/apps/ucitel): diktáty bez prihlásenia, projekt „stullers home“.
-- Iba čítanie a pridávanie (žiadne úpravy ani mazanie): výsledky diktátov a výplaty peňazí.
-- Zostatok dieťaťa = súčet reward_cents mínus súčet výplat.
create table if not exists public.diktat_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  child text not null check (char_length(child) between 1 and 40),
  length text not null check (length in ('kratky','stredny','dlhy')),
  letters text not null default '' check (char_length(letters) <= 20),
  mode text not null check (mode in ('pisanie','doplnanie')),
  speed text check (char_length(speed) <= 20),
  text text not null check (char_length(text) <= 4000),
  answer text check (char_length(answer) <= 6000),
  words int not null default 0,
  mistakes int not null default 0,
  iy_mistakes int not null default 0,
  stars int not null default 0 check (stars between 0 and 3),
  reward_cents int not null default 0 check (reward_cents in (0,25,50,100)),
  details jsonb check (pg_column_size(details) < 20000)
);
create table if not exists public.diktat_payouts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  child text not null check (char_length(child) between 1 and 40),
  amount_cents int not null check (amount_cents > 0 and amount_cents <= 100000)
);
alter table public.diktat_results enable row level security;
alter table public.diktat_payouts enable row level security;
create policy "diktat_results read" on public.diktat_results for select to anon, authenticated using (true);
create policy "diktat_results add" on public.diktat_results for insert to anon, authenticated with check (true);
create policy "diktat_payouts read" on public.diktat_payouts for select to anon, authenticated using (true);
create policy "diktat_payouts add" on public.diktat_payouts for insert to anon, authenticated with check (true);
revoke all on public.diktat_results, public.diktat_payouts from anon, authenticated;
grant select, insert on public.diktat_results, public.diktat_payouts to anon, authenticated;
create index if not exists diktat_results_child_idx on public.diktat_results (child, created_at desc);
create index if not exists diktat_payouts_child_idx on public.diktat_payouts (child, created_at desc);
