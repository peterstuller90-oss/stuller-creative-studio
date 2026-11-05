-- Stullers Home: prihlásenie cez Face ID / odtlačok (passkey). Spusti raz celé v Supabase → SQL Editor.
-- Obe tabuľky číta a zapisuje iba serverová funkcia "passkey"; aplikácia k nim nemá prístup.

-- One row per device where someone turned on Face ID. Only the public key is stored, never anything secret.
create table public.passkeys (
    id            text primary key,          -- credential id (base64url)
    user_id       uuid not null references public.profiles(id) on delete cascade,
    email         text not null,
    public_key    text not null,             -- base64url
    counter       bigint not null default 0,
    transports    text[],
    created_at    timestamptz not null default now(),
    last_used_at  timestamptz
);
create index on public.passkeys (email);
alter table public.passkeys enable row level security;
revoke all on public.passkeys from anon, authenticated;

-- One-time challenges, valid for 5 minutes.
create table public.passkey_challenges (
    id         uuid primary key default gen_random_uuid(),
    kind       text not null check (kind in ('register', 'login')),
    challenge  text not null,
    user_id    uuid references public.profiles(id) on delete cascade,
    email      text,
    expires_at timestamptz not null default now() + interval '5 minutes'
);
alter table public.passkey_challenges enable row level security;
revoke all on public.passkey_challenges from anon, authenticated;
