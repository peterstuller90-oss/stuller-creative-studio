-- Stullers Home: notifikácie na telefón. Spusti raz celé v Supabase → SQL Editor (po schema.sql).

create extension if not exists pg_net with schema extensions;

-- Server-only settings: webhook secret and VAPID keys. No policies, so only the service role can read it.
create table public.push_config (
    id             integer primary key default 1 check (id = 1),
    webhook_secret text not null,
    vapid_public   text,
    vapid_private  text
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
insert into public.push_config (webhook_secret) values (encode(extensions.gen_random_bytes(32), 'hex'));

-- One row per device that turned notifications on.
create table public.push_subscriptions (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references public.profiles(id) on delete cascade,
    endpoint   text not null unique,
    p256dh     text not null,
    auth       text not null,
    created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated;
create policy "own subscriptions" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());

-- The public half of the VAPID key pair, needed by the app to subscribe.
create function public.vapid_public_key() returns text
language sql stable security definer set search_path = public as $$
    select vapid_public from public.push_config where id = 1;
$$;

-- A shared iPad can switch users, so the device always belongs to whoever turned notifications on last.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then raise exception 'Nie si prihlásený.'; end if;
    delete from public.push_subscriptions where endpoint = p_endpoint;
    insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth);
end;
$$;

create function public.remove_push_subscription(p_endpoint text) returns void
language sql security definer set search_path = public as $$
    delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke execute on function public.vapid_public_key(), public.save_push_subscription(text, text, text),
    public.remove_push_subscription(text) from public, anon;
grant execute on function public.vapid_public_key(), public.save_push_subscription(text, text, text),
    public.remove_push_subscription(text) to authenticated;

-- Every change to an assignment is sent to the notify Edge Function, which decides who gets a notification.
create function public.notify_assignment_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    perform net.http_post(
        url := 'https://vupzrryhxnninttjyges.supabase.co/functions/v1/notify',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
            'secret', (select webhook_secret from public.push_config where id = 1),
            'type', tg_op,
            'actor', auth.uid(),
            'record', to_jsonb(new),
            'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) end
        )
    );
    return new;
end;
$$;
revoke execute on function public.notify_assignment_change() from public, anon, authenticated;

create trigger on_assignment_change after insert or update on public.assignments
    for each row execute function public.notify_assignment_change();
