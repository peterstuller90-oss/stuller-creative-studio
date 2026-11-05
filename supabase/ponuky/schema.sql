-- Štullers Ponuky: tables for price quotes.
-- Safe to run in a shared Supabase project: every object is prefixed quote_ and
-- only e-mails listed in quote_admins can read or change anything. Nothing is public.

create table if not exists public.quote_admins (
  email text primary key
);

create or replace function public.is_quote_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.quote_admins a where lower(a.email) = lower(auth.jwt() ->> 'email'))
$$;

create table if not exists public.quote_settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_price_items (
  id text primary key,
  category text not null,
  name text not null,
  unit text not null default 'paušál',
  price numeric(12,2) not null default 0,
  note text not null default '',
  sort integer not null default 0,
  active boolean not null default true,
  placeholder boolean not null default false
);

create table if not exists public.quote_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  company text not null default '',
  ico text not null default '',
  dic text not null default '',
  address text not null default '',
  email text not null default '',
  phone text not null default ''
);

create table if not exists public.quotes (
  id uuid primary key,
  number text not null unique,
  status text not null default 'koncept' check (status in ('koncept','odoslana','prijata','zamietnuta')),
  public_token text not null unique,
  client_name text not null default '',
  total numeric(12,2) not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_name text not null default ''
);

alter table public.quote_admins enable row level security;
alter table public.quote_settings enable row level security;
alter table public.quote_price_items enable row level security;
alter table public.quote_clients enable row level security;
alter table public.quotes enable row level security;

drop policy if exists "admins read own row" on public.quote_admins;
create policy "admins read own row" on public.quote_admins for select to authenticated using ((select public.is_quote_admin()));

drop policy if exists "admins all" on public.quote_settings;
create policy "admins all" on public.quote_settings for all to authenticated using ((select public.is_quote_admin())) with check ((select public.is_quote_admin()));
drop policy if exists "admins all" on public.quote_price_items;
create policy "admins all" on public.quote_price_items for all to authenticated using ((select public.is_quote_admin())) with check ((select public.is_quote_admin()));
drop policy if exists "admins all" on public.quote_clients;
create policy "admins all" on public.quote_clients for all to authenticated using ((select public.is_quote_admin())) with check ((select public.is_quote_admin()));
drop policy if exists "admins all" on public.quotes;
create policy "admins all" on public.quotes for all to authenticated using ((select public.is_quote_admin())) with check ((select public.is_quote_admin()));

revoke all on function public.is_quote_admin() from public, anon;
grant execute on function public.is_quote_admin() to authenticated;
