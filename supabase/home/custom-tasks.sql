-- Stullers Home: vlastná úloha s vlastným XP, ktorú zadá rodič. Spusti raz v Supabase → SQL Editor.
-- Vlastná úloha je jednorazová: nepridá sa do stáleho zoznamu 26 úloh (active = false),
-- ale pridelené zadania na ňu normálne fungujú, schvaľujú sa a pripíšu XP.
create function public.create_custom_task(p_name text, p_xp integer, p_users uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
    if not public.is_parent() then raise exception 'Vlastnú úlohu môže zadať iba rodič.'; end if;
    p_name := btrim(p_name);
    if p_name is null or length(p_name) < 2 or length(p_name) > 80 then raise exception 'Názov úlohy musí mať 2 až 80 znakov.'; end if;
    if p_xp is null or p_xp < 1 or p_xp > 100 then raise exception 'XP musí byť od 1 do 100.'; end if;
    if coalesce(array_length(p_users, 1), 0) = 0 then raise exception 'Vyber aspoň jedného člena.'; end if;

    insert into public.tasks (name, xp, active) values (p_name, p_xp, false) returning id into t;
    insert into public.assignments (task_id, user_id)
    select t, u from unnest(p_users) as u where exists (select 1 from public.profiles where id = u);
    return t;
end;
$$;
revoke execute on function public.create_custom_task(text, integer, uuid[]) from public, anon;
grant execute on function public.create_custom_task(text, integer, uuid[]) to authenticated;
