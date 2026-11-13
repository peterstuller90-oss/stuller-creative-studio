-- Matika (public/apps/matika): cvičenia z matematiky bez prihlásenia, projekt „stullers home“.
-- Jedna tabuľka udalostí, iba čítanie a pridávanie (žiadne úpravy ani mazanie):
--   done      – hotové cvičenie (príklady, chyby, režim papier/tablet, XP pri tablete)
--   heard     – vypočul si vysvetlenie k chybe č. idx
--   confirmed – rodič potvrdil cvičenie na papier kódom (XP)
--   wish      – vybraný zážitok za týždennú výzvu; wish_done – zážitok splnený
create table if not exists public.matika_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  child text not null check (char_length(child) between 1 and 40),
  ex_id uuid not null,
  kind text not null check (kind in ('done','heard','confirmed','wish','wish_done')),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 20000)
);
alter table public.matika_events enable row level security;
create policy "matika_events read" on public.matika_events for select to anon, authenticated using (true);
create policy "matika_events add" on public.matika_events for insert to anon, authenticated with check (true);
revoke all on public.matika_events from anon, authenticated;
grant select, insert on public.matika_events to anon, authenticated;
create index if not exists matika_events_child_idx on public.matika_events (child, created_at);
