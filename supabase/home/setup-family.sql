-- Spusti PO vytvorení 4 účtov v Authentication → Users (Add user, Auto Confirm, heslo = 6-miestny PIN).
update public.profiles p set name = v.name, role = v.role
from (values
    ('viki@stullers.home', 'Viki', 'parent'),
    ('peto@stullers.home', 'Peto', 'parent'),
    ('oto@stullers.home',  'Oto',  'child'),
    ('dita@stullers.home', 'Dita', 'child')
) as v(email, name, role)
join auth.users u on u.email = v.email
where p.id = u.id;

select name, role from public.profiles order by role, name;
