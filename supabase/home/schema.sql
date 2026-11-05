-- Stullers Home: databáza a prístupové pravidlá.
-- Spusti raz celé v Supabase → SQL Editor (na prázdnom projekte).

-- ───────── Tabuľky ─────────

create table public.profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    name        text not null,
    role        text not null default 'child' check (role in ('parent', 'child')),
    avatar_path text,
    created_at  timestamptz not null default now()
);

create table public.tasks (
    id         uuid primary key default gen_random_uuid(),
    code       integer unique,  -- stabilné číslo úlohy zo zoznamu (1–26), chráni pred duplikátmi
    name       text not null,
    xp         integer not null check (xp >= 0),
    active     boolean not null default true,
    created_at timestamptz not null default now()
);

create table public.assignments (
    id           uuid primary key default gen_random_uuid(),
    task_id      uuid not null references public.tasks(id) on delete cascade,
    user_id      uuid not null references public.profiles(id) on delete cascade,
    status       text not null default 'available'
                 check (status in ('available', 'waiting_for_approval', 'completed', 'rejected')),
    witness_id   uuid references public.profiles(id),  -- pripravené: rodinný svedok
    photo_path   text,                                  -- pripravené: fotka ako dôkaz
    created_at   timestamptz not null default now(),
    submitted_at timestamptz,
    reviewed_by  uuid references public.profiles(id),
    reviewed_at  timestamptz
);
create index on public.assignments (user_id, status);
-- Ten istý človek nemôže mať tú istú úlohu otvorenú dvakrát.
create unique index assignments_one_open on public.assignments (task_id, user_id) where status <> 'completed';

create table public.xp_transactions (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.profiles(id) on delete cascade,
    assignment_id uuid unique references public.assignments(id) on delete set null,
    xp            integer not null,
    created_at    timestamptz not null default now()
);
create index on public.xp_transactions (user_id);

-- Súhrn pre obrazovky Domov a Rodina.
create view public.profile_stats with (security_invoker = on) as
select p.id, p.name, p.role, p.avatar_path,
       coalesce((select sum(x.xp) from public.xp_transactions x where x.user_id = p.id), 0)::int as xp,
       (select count(*) from public.assignments a where a.user_id = p.id and a.status = 'completed')::int as completed_count
from public.profiles p;

-- ───────── Pomocné funkcie ─────────

-- Rola sa číta z databázy, nie z aplikácie, takže úprava rozhrania nič nezmení.
create function public.is_parent() returns boolean
language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.profiles where id = auth.uid() and role = 'parent');
$$;

-- Nový účet v Authentication → Users automaticky dostane profil (rola dieťa).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    insert into public.profiles (id, name)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
    return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();

-- Dieťa alebo rodič odošle svoju úlohu na schválenie.
create function public.submit_assignment(p_assignment uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
    update public.assignments
       set status = 'waiting_for_approval', submitted_at = now()
     where id = p_assignment and user_id = auth.uid() and status in ('available', 'rejected');
    if not found then raise exception 'Úlohu nie je možné odoslať.'; end if;
end;
$$;

-- Iba rodič, a nikdy nie vlastnú úlohu. XP sa pripíše jedným zápisom na serveri.
create function public.review_assignment(p_assignment uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare a public.assignments;
begin
    if not public.is_parent() then raise exception 'Schvaľovať môže iba rodič.'; end if;

    select * into a from public.assignments where id = p_assignment for update;
    if a.id is null or a.status <> 'waiting_for_approval' then raise exception 'Úloha nečaká na schválenie.'; end if;
    if a.user_id = auth.uid() then raise exception 'Vlastnú úlohu nemôžeš schváliť.'; end if;

    update public.assignments
       set status = case when p_approve then 'completed' else 'rejected' end,
           reviewed_by = auth.uid(), reviewed_at = now()
     where id = a.id;

    if p_approve then
        insert into public.xp_transactions (user_id, assignment_id, xp)
        select a.user_id, a.id, t.xp from public.tasks t where t.id = a.task_id;
    end if;
end;
$$;

-- Preradenie úlohy inému členovi. Rodič môže preradiť ktorúkoľvek nesplnenú úlohu,
-- ostatní iba svoju vlastnú, kým ešte nie je odoslaná na schválenie.
create function public.reassign_assignment(p_assignment uuid, p_new_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.assignments;
begin
    select * into a from public.assignments where id = p_assignment for update;
    if a.id is null or a.status = 'completed' then raise exception 'Túto úlohu nie je možné preradiť.'; end if;
    if not exists (select 1 from public.profiles where id = p_new_user) then raise exception 'Neznámy člen rodiny.'; end if;
    if exists (select 1 from public.assignments where task_id = a.task_id and user_id = p_new_user
               and status <> 'completed' and id <> a.id) then
        raise exception 'Tento člen už túto úlohu má.';
    end if;
    if not (public.is_parent() or (a.user_id = auth.uid() and a.status in ('available', 'rejected'))) then
        raise exception 'Túto úlohu môžeš preradiť iba ak je tvoja a ešte nie je odoslaná.';
    end if;

    update public.assignments
       set user_id = p_new_user, status = 'available', submitted_at = null, reviewed_by = null, reviewed_at = null
     where id = a.id;
end;
$$;

-- Rodič pridelí úlohu jednému alebo viacerým členom. Kto ju už má otvorenú, toho preskočí.
create function public.assign_task(p_task uuid, p_users uuid[]) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
    if not public.is_parent() then raise exception 'Prideľovať môže iba rodič.'; end if;
    insert into public.assignments (task_id, user_id)
    select p_task, u from unnest(p_users) as u
    where exists (select 1 from public.profiles where id = u)
    on conflict (task_id, user_id) where status <> 'completed' do nothing;
    get diagnostics n = row_count;
    return n;
end;
$$;

revoke execute on function public.submit_assignment(uuid), public.review_assignment(uuid, boolean),
    public.reassign_assignment(uuid, uuid), public.assign_task(uuid, uuid[]) from public, anon;
grant execute on function public.submit_assignment(uuid), public.review_assignment(uuid, boolean),
    public.reassign_assignment(uuid, uuid), public.assign_task(uuid, uuid[]) to authenticated;
-- Pomocné funkcie nie sú pre neprihlásených; trigger nevolá nikto priamo.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_parent() from public, anon;
grant execute on function public.is_parent() to authenticated;

-- ───────── Row Level Security ─────────
-- Všetko len pre prihlásených. Nikto nemení stav úloh ani XP priamo, iba cez funkcie vyššie.

alter table public.profiles        enable row level security;
alter table public.tasks           enable row level security;
alter table public.assignments     enable row level security;
alter table public.xp_transactions enable row level security;

create policy "family read" on public.profiles        for select to authenticated using (true);
create policy "family read" on public.tasks           for select to authenticated using (true);
create policy "family read" on public.assignments     for select to authenticated using (true);
create policy "family read" on public.xp_transactions for select to authenticated using (true);

-- Profil: každý mení iba svoje meno a avatar. Stĺpec role sa z aplikácie zmeniť nedá.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (name, avatar_path) on public.profiles to authenticated;
create policy "own profile" on public.profiles for update to authenticated
    using (id = auth.uid()) with check (id = auth.uid());

-- Úlohy a priradenia spravujú rodičia.
create policy "parents manage" on public.tasks for all to authenticated
    using (public.is_parent()) with check (public.is_parent());
create policy "parents assign" on public.assignments for insert to authenticated
    with check (public.is_parent() and status = 'available');
create policy "parents remove" on public.assignments for delete to authenticated
    using (public.is_parent());
revoke update on public.assignments from anon, authenticated;
revoke insert, update, delete on public.xp_transactions from anon, authenticated;

-- ───────── Úložisko avatarov (súkromné) ─────────
-- Vidia ho iba prihlásení. Každý nahráva iba do priečinka so svojím ID.

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false);

create policy "family reads avatars" on storage.objects for select to authenticated
    using (bucket_id = 'avatars');
create policy "own avatar insert" on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own avatar update" on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own avatar delete" on storage.objects for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
