# Stullers Creative Studio

Jedna appka pre všetky Štullers appky: jedno prihlásenie, jeden dizajn (font Barlow Medium, Štullers farby), jeden Supabase projekt („stullers home“).

## Čo je vnútri
| Časť | Stav |
|---|---|
| Stullers Home (rodinné úlohy) | v hube (`src/modules/home`) |
| Ponuky (cenové ponuky a zmluvy) | v hube (`src/modules/ponuky`) |
| Handrbolka Studio, Atelier Studio | v hube ako pôvodné appky (`public/apps/<id>/`), neskôr spoločné Studio s témami |
| Stullers Studio | pripravujeme (spoločné Studio) |
| Stullers Social | v hube ako pôvodná appka (`public/apps/social/`) |
| Hudy Packaging | v hube (`public/apps/hudy/`), CMYK šablóna .ai sa nahrá raz tlačidlom Šablóna (nie je v repozitári) |
| Učiteľ 2.0 (diktáty z vybraných slov) | v hube (`public/apps/ucitel/`), otvorí sa aj bez prihlásenia (`#/ucitel`), dáta v `diktat_results` a `diktat_payouts` (`supabase/ucitel/diktaty.sql`). Banku viet kontroluje `node tools/check-ucitel-bank.mjs` |

## Ako to funguje
- `src/App.tsx` – prihlásenie (rodinné profily s PIN, alebo e-mail), úvodná obrazovka s dlaždicami, otváranie modulov na `#/<id>`.
- `src/apps.ts` – zoznam appiek na úvodnej obrazovke a kto ich vidí (rodičia, deti, ostatní).
- `src/modules/<id>/` – každá appka má vlastný priečinok. Jej CSS sa automaticky obmedzí na `.mod-<id>` (pozri `vite.config.ts`), takže sa appky navzájom nerozbijú.
- `public/apps/<id>/` – pôvodné samostatné appky skopírované do hubu (bez vlastného service workera, UI vo fonte Barlow cez `public/hub-ui-font.css`). Zdieľajú prihlásenie s hubom, lebo bežia na rovnakej adrese.
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
