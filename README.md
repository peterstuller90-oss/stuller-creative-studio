# Stullers Creative Studio

Jedna appka pre všetky Štullers appky: jedno prihlásenie, jeden dizajn (font Barlow Condensed Medium, Štullers farby), jeden Supabase projekt („stullers home“).

## Čo je vnútri
| Časť | Stav |
|---|---|
| Stullers Home (rodinné úlohy) | v hube (`src/modules/home`) |
| Ponuky (cenové ponuky a zmluvy) | v hube (`src/modules/ponuky`) |
| Handrbolka Studio, Atelier Studio, Stullers Studio | spoločné Studio s témami (pripravujeme), zatiaľ odkaz na samostatné appky |
| Stullers Social | zatiaľ odkaz na samostatnú appku |
| Učiteľ, Hudy Packaging | pripravujeme |

## Ako to funguje
- `src/App.tsx` – prihlásenie (rodinné profily s PIN, alebo e-mail), úvodná obrazovka s dlaždicami, otváranie modulov na `#/<id>`.
- `src/apps.ts` – zoznam appiek na úvodnej obrazovke a kto ich vidí (rodičia, deti, ostatní).
- `src/modules/<id>/` – každá appka má vlastný priečinok. Jej CSS sa automaticky obmedzí na `.mod-<id>` (pozri `vite.config.ts`), takže sa appky navzájom nerozbijú.
- `src/lib/supabase.ts` – jeden spoločný Supabase klient pre všetky moduly.
- `supabase/` – SQL a Edge Functions jednotlivých modulov.

## Bezpečnosť
- V kóde je iba verejný (publishable) Supabase kľúč. Dáta chráni prihlásenie a RLS pravidlá v databáze.
- Tajné kľúče (napr. pre notifikácie) sú v Supabase → Edge Functions → Secrets, nikdy v repozitári.

## Spustenie
```
npm install
npm run dev
```
Po zlúčení do `main` sa appka sama nasadí na GitHub Pages (`.github/workflows/deploy.yml`).
