-- Zoznam 26 úloh. Spusti v SQL Editore po schema.sql.
-- Dá sa spustiť opakovane: úlohy sa rozpoznajú podľa čísla (code) a nezduplikujú sa.
insert into public.tasks (code, name, xp) values
    (1,  'Pripraviť horné poschodie na vysávanie', 5),
    (2,  'Pripraviť spodné poschodie na vysávanie', 5),
    (3,  'Povysávať schody', 4),
    (4,  'Povysávať gauč', 2),
    (5,  'Umyť záchod, sprchu a umývadlo', 10),
    (6,  'Umyť podlahu – chodba', 3),
    (7,  'Umyť podlahu – kuchyňa', 3),
    (8,  'Umyť podlahu – obývačka', 4),
    (9,  'Umyť podlahu – detská izba', 5),
    (10, 'Umyť podlahu – spálňa', 4),
    (11, 'Povysávať špajzu', 2),
    (12, 'Vyložiť umývačku', 7),
    (13, 'Naložiť umývačku', 10),
    (14, 'Upratať topánky', 3),
    (15, 'Vyniesť smeti', 2),
    (16, 'Vyložiť smetiak', 2),
    (17, 'Vyniesť kompost', 2),
    (18, 'Vyniesť papier', 2),
    (19, 'Vyniesť plasty', 2),
    (20, 'Dať Elenke jesť a piť', 2),
    (21, 'Zavesiť prádlo', 10),
    (22, 'Vyniesť prádlo', 2),
    (23, 'Dať prať', 10),
    (24, 'Povysávať celé auto', 10),
    (25, 'Upratať bicykle', 5),
    (26, 'Pozrieť prababku', 5)
on conflict (code) do nothing;

select count(*) as pocet_uloh, sum(xp) as sucet_bodov from public.tasks;
