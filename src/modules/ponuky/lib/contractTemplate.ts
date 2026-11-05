// Default contract template. Editable in Settings. Lines starting with "# " are the title,
// "## " are article headings, "### " a small centered note; other blocks are paragraphs.
// {{placeholders}} are filled from the quote (see contract.ts).

export const CONTRACT_PLACEHOLDERS: [string, string][] = [
  ['cislo', 'číslo zmluvy (= číslo ponuky)'],
  ['autori', 'autori (z Nastavení)'],
  ['objednavatel', 'objednávateľ (klient z ponuky)'],
  ['nazov_diela', 'názov projektu'],
  ['popis_diela', 'popis projektu'],
  ['polozky', 'zoznam položiek a ich cien'],
  ['miesto', 'miesto realizácie'],
  ['termin', 'termín odovzdania'],
  ['odmena', 'celková odmena'],
  ['zaloha', 'záloha'],
  ['doplatok', 'doplatok'],
  ['iban', 'IBAN'],
  ['dan', 'odsek o dani (podľa Nastavení)'],
  ['licencia_vyhradnost', 'výhradnú / nevýhradnú'],
  ['licencia_sposoby', 'spôsoby použitia'],
  ['licencia_uzemie', 'územný rozsah'],
  ['licencia_cas', 'časový rozsah'],
  ['zverejnenie', 'odsek o zverejnení (pre mestá, školy…)'],
  ['datum', 'dnešný dátum'],
]

export const DEFAULT_CONTRACT = `# Zmluva o vytvorení diela a licenčná zmluva

### uzavretá podľa § 91 a § 65 a nasl. zákona č. 185/2015 Z. z. Autorský zákon v znení neskorších predpisov · č. {{cislo}}

## Zmluvné strany

Autor:
{{autori}}
(ďalej len „autor“; ak je autorov viac, sú spoluautormi diela, práva a povinnosti z tejto zmluvy im patria spoločne a nerozdielne)

Objednávateľ:
{{objednavatel}}
(ďalej len „objednávateľ“)

## Čl. I Predmet zmluvy

1. Autor sa zaväzuje pre objednávateľa osobne vytvoriť autorské dielo „{{nazov_diela}}“ (ďalej len „dielo“) podľa zadania objednávateľa: {{popis_diela}}

2. Rozsah plnenia:
{{polozky}}

3. Objednávateľ sa zaväzuje poskytnúť autorovi potrebnú súčinnosť, dielo prevziať a zaplatiť autorovi odmenu podľa čl. III.

4. Autor zároveň udeľuje objednávateľovi licenciu na použitie diela v rozsahu podľa čl. V.

## Čl. II Miesto a čas plnenia

1. Miesto realizácie: {{miesto}}.

2. Autor odovzdá dielo najneskôr do {{termin}}. Termín sa primerane predlžuje o čas, keď autor nemôže pracovať pre nepriaznivé počasie, pre nedostatok súčinnosti objednávateľa alebo pre zmeny zadania.

3. Objednávateľ zabezpečí najmä prístup na miesto realizácie, potrebné povolenia a súhlasy vlastníka nehnuteľnosti, prípravu podkladu (ak nie je dohodnuté inak), prístup k elektrine a vode a podklady potrebné na vytvorenie diela.

4. Dielo je odovzdané dňom, keď autor oznámi objednávateľovi jeho dokončenie, ak objednávateľ do 5 dní neoznámi konkrétne vady diela.

## Čl. III Odmena

1. Zmluvné strany sa dohodli na odmene za vytvorenie diela a za udelenie licencie vo výške {{odmena}}. Autor nie je platiteľom DPH.

2. Objednávateľ zaplatí zálohu {{zaloha}} do 7 dní od podpisu zmluvy a doplatok {{doplatok}} do 14 dní od odovzdania diela, bezhotovostne na účet autora {{iban}}.

3. {{dan}}

4. Odmena zahŕňa náklady uvedené v rozsahu plnenia. Iné náklady hradí objednávateľ len po predchádzajúcej dohode.

## Čl. IV Návrh a pripomienky

1. Pred realizáciou autor predloží objednávateľovi návrh diela. Objednávateľ má právo na dve kolá pripomienok k návrhu. Ďalšie zmeny alebo zmeny po schválení návrhu sa riešia dohodou vrátane úpravy odmeny a termínu.

2. Autor vytvára dielo samostatne, podľa schváleného návrhu a svojho umeleckého zámeru.

## Čl. V Licencia

1. Autor udeľuje objednávateľovi {{licencia_vyhradnost}} licenciu na použitie diela týmito spôsobmi: {{licencia_sposoby}}.

2. Licencia sa udeľuje v územnom rozsahu: {{licencia_uzemie}} a v časovom rozsahu: {{licencia_cas}}.

3. Odmena za udelenie licencie je zahrnutá v odmene podľa čl. III. Licencia nadobúda účinnosť zaplatením celej odmeny.

4. Objednávateľ nie je oprávnený udeliť tretej osobe sublicenciu ani licenciu postúpiť bez predchádzajúceho písomného súhlasu autora.

## Čl. VI Osobnostné práva a vlastníctvo

1. Autorské osobnostné práva autora sú neprevoditeľné. Objednávateľ pri použití diela uvádza autorstvo „Štullers“, ak to spôsob použitia umožňuje.

2. Vlastnícke právo k hmotnému podkladu diela (originál, stena) nadobúda objednávateľ, resp. vlastník nehnuteľnosti. Nadobudnutím vlastníckeho práva nevzniká právo použiť dielo nad rozsah licencie.

3. Objednávateľ nebude do diela zasahovať ani ho meniť bez súhlasu autora. Ak má byť dielo odstránené alebo zničené, objednávateľ o tom autora vopred upovedomí a umožní mu dielo zdokumentovať.

4. Autor je oprávnený dielo fotografovať, filmovať a používať tieto zábery na prezentáciu svojej tvorby, najmä na webe, sociálnych sieťach, v portfóliu a súťažiach.

## Čl. VII Záverečné ustanovenia

1. Ak objednávateľ od zmluvy odstúpi alebo ju zruší po začatí prác, autorovi patrí pomerná časť odmeny za vykonanú prácu a náhrada účelne vynaložených nákladov; záloha sa na ňu započíta.

2. Právne vzťahy neupravené touto zmluvou sa riadia Autorským zákonom a Občianskym zákonníkom.

3. Zmluvu možno meniť len písomnými dodatkami podpísanými oboma stranami.

4. Zmluva nadobúda platnosť dňom podpisu oboma zmluvnými stranami. {{zverejnenie}}

5. Zmluva je vyhotovená v dvoch rovnopisoch, každá strana dostane jeden. Strany si zmluvu prečítali, jej obsahu rozumejú a na znak súhlasu ju podpisujú.`
