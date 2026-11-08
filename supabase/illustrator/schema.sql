-- Stullers Illustrator: uložené návrhy (až 6 fotiek s kresbami v jednom návrhu).
-- Vidia a menia ich iba rodičia (Peťo, Viki). Spustené raz v Supabase → SQL Editor.
create table public.illustrator_designs (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Návrh',
  state jsonb not null,
  thumb text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.illustrator_designs enable row level security;
create policy "parents read illustrator" on public.illustrator_designs for select to authenticated using ((select public.is_parent()));
create policy "parents insert illustrator" on public.illustrator_designs for insert to authenticated with check ((select public.is_parent()));
create policy "parents update illustrator" on public.illustrator_designs for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy "parents delete illustrator" on public.illustrator_designs for delete to authenticated using ((select public.is_parent()));
create index illustrator_designs_updated on public.illustrator_designs (updated_at desc);
