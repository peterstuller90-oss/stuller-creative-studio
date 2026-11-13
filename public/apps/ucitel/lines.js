/* Učiteľ 2.0 – všetko, čo appka hovorí (okrem viet diktátu a vysvetliviek).
   Tieto texty sú dopredu nahraté hlasom Laura (priečinok audio/), preto ich meň spolu s nahrávkami:
   po úprave spusti `node tools/ucitel-speech-list.mjs` a nahraj chýbajúce zvuky. */
window.UCITEL_LINES = {
  hello: ['Ahoj Oto! Tak čo, ideme na to?', 'Čau Oto! Poďme na diktát.', 'Ahoj Oto! Dnes to dáme, uvidíš.'],
  helloHard: ['Ahoj Oto! Dnes je to náročný diktát, plný chytákov. Dávaj dobrý pozor!', 'Čau Oto! Pozor, toto je náročný diktát. Ale ty to zvládneš.'],
  paper: ['Priprav si papier a pero.', 'Zober si papier a pero, nech môžeš písať.'],
  listenFirst: ['Najprv ti ho celý prečítam. Ty len počúvaj, ešte nepíš.', 'Najprv si ho celý vypočuj. Zatiaľ nič nepíš.'],
  nowWrite: ['Tak, a teraz píš. Budem diktovať po kúskoch.', 'Super. Teraz začni písať, ja idem pomaly po kúskoch.'],
  between: ['Super, ide ti to.', 'Výborne, pokračujeme.', 'Dobre, ďalšia veta.', 'Paráda, ideme ďalej.', 'Pekne. Tak ďalej.'],
  last: ['A posledná veta.', 'Už len posledná veta.'],
  recheck: ['A teraz ti to prečítam ešte raz celé. Skontroluj si, či ti nič nechýba.', 'Ešte raz celý diktát. Pozri sa, či máš všetko.'],
  endPaper: ['Hotovo! Ťukni na Ukázať správny diktát a porovnaj si to.', 'Máme to! Teraz si pozri správny diktát.'],
  review: ['Tu je správny diktát. Porovnaj ho so svojím papierom. Keď nájdeš chybu, ťukni na to slovo a vysvetlím ti ju.'],
  perfect: ['Paráda, Oto! Bez jedinej chyby! Zavolaj ocka, nech to potvrdí.', 'Wau, bez chyby! Si borec! Teraz zavolaj ocka.'],
  oops: ['Pár okienok bolo zle. Ťukni na otáznik pri červenom okienku a poviem ti prečo.', 'Niečo bolo zle, ale nevadí. Ťukni na otáznik a vysvetlím ti to.'],
  mistakesPaper: ['Nevadí, z chýb sa človek učí. Ťukni na každú chybu a vypočuj si prečo.'],
  saved: ['Uložené. Ocko to skontroluje a potvrdí kódom.', 'Super, diktát čaká na ocka.'],
  win: ['Paráda! Peniaze sú pripísané a diktát je medzi hotovými cvičeniami.', 'Hotovo! Zarobil si peniaze. Si šikovný, Oto!'],
  noMoney: ['Ocko to potvrdil. Tentoraz bez peňazí, ale nabudúce to dáš!', 'Diktát je uložený medzi hotovými. Nabudúce to bude bez chyby, uvidíš.'],
  sample: ['Ahoj Oto! Ja ti budem diktovať. Takto rýchlo:'],
  sampleSentence: ['Rýchly rys beží lesom.'],
  payout: ['Hotovo. Oto, užívaj si zarobené peniaze!'],
};
window.UCITEL_PUNCT = { ',': 'čiarka', '.': 'bodka', '?': 'otáznik', '!': 'výkričník' };
/** Kľúč nahrávky pre text (rovnaký v appke aj v nástroji, ktorý nahrávky pripravuje). */
window.UCITEL_KEY = (text) => {
  let h = 2166136261;
  const s = String(text).trim();
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};
