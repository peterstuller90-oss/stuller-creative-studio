/* Anglina – slovíčka z angličtiny pre Ota (4. ročník ZŠ, úroveň A1).
   Britská angličtina (ako v slovenských učebniciach): colour, grey, mum, rubber, jumper, trousers.
   Témy podľa ŠVP pre 1. stupeň (rodina, škola, zvieratá, jedlo, oblečenie, telo, dom, čísla, farby, dni)
   a ako prvá téma učivo, ktoré Oto práve preberá v škole (zoznam od ocka).
   Každé slovo: en = anglicky (správny pravopis), sk = slovensky, em = obrázok (emoji), alt = iné uznané tvary,
   tip = krátka overená poznámka. Kontrola obsahu: node tools/check-anglina.mjs */
(() => {
  const W = (en, sk, em = '', extra = {}) => ({ en, sk, em, ...extra });

  const TOPICS = [
    {
      id: 'veci', name: 'Veci a technika', em: '💻', color: '#45C3FF', school: true,
      words: [
        W('computer', 'počítač', '💻'),
        W('glasses', 'okuliare', '👓', { tip: '{Glasses} je vždy v množnom čísle, rovnako ako okuliare.' }),
        W('phone', 'telefón', '📱'),
        W('television', 'televízor', '📺', { alt: ['tv'], tip: 'Skrátene sa povie aj {TV}.' }),
        W('tablet', 'tablet', '🔲'),
        W('camera', 'fotoaparát', '📷'),
        W('radio', 'rádio', '📻'),
        W('headphones', 'slúchadlá', '🎧', { tip: '{Headphones} je v množnom čísle, rovnako ako slúchadlá.' }),
        W('keyboard', 'klávesnica', '⌨️'),
        W('mouse', 'myš', '🖱️', { tip: '{Mouse} je počítačová myš aj zvieratko myš.' }),
        W('watch', 'hodinky', '⌚', { tip: '{Watch} znamená hodinky na ruke. {Clock} znamená hodiny na stene.' }),
        W('clock', 'hodiny', '🕰️', { tip: '{Clock} znamená hodiny na stene. {Watch} znamená hodinky na ruke.' }),
        W('lamp', 'lampa', '🛋️'),
        W('fridge', 'chladnička', '🧊'),
        W('computer game', 'počítačová hra', '🎮', { tip: '{Computer game} sa píše ako dve slová, medzi nimi je medzera.' }),
      ],
    },
    {
      id: 'farby', name: 'Farby', em: '🎨', color: '#FF5FA8',
      words: [
        W('red', 'červený', '', { sw: '#E53935' }),
        W('blue', 'modrý', '', { sw: '#1E63E9' }),
        W('green', 'zelený', '', { sw: '#2FB25A' }),
        W('yellow', 'žltý', '', { sw: '#FFD60A' }),
        W('orange', 'oranžový', '', { sw: '#FF8A1F' }),
        W('pink', 'ružový', '', { sw: '#FF8CC6' }),
        W('purple', 'fialový', '', { sw: '#8E44D9' }),
        W('brown', 'hnedý', '', { sw: '#8B5A2B' }),
        W('black', 'čierny', '', { sw: '#111111' }),
        W('white', 'biely', '', { sw: '#FFFFFF' }),
        W('grey', 'sivý', '', { sw: '#9AA0A6', alt: ['gray'], tip: 'V britskej angličtine sa píše {grey}, v americkej {gray}.' }),
      ],
    },
    {
      id: 'cisla', name: 'Čísla 1–20', em: '🔢', color: '#FFCF1F',
      words: [
        W('one', 'jeden', '1'), W('two', 'dva', '2'), W('three', 'tri', '3'), W('four', 'štyri', '4'),
        W('five', 'päť', '5'), W('six', 'šesť', '6'), W('seven', 'sedem', '7'), W('eight', 'osem', '8'),
        W('nine', 'deväť', '9'), W('ten', 'desať', '10'), W('eleven', 'jedenásť', '11'), W('twelve', 'dvanásť', '12'),
        W('thirteen', 'trinásť', '13'), W('fourteen', 'štrnásť', '14', { tip: '{Fourteen} je {four} a na konci {teen}.' }),
        W('fifteen', 'pätnásť', '15', { tip: 'Pozor: päť je {five}, ale pätnásť je {fifteen}.' }),
        W('sixteen', 'šestnásť', '16'), W('seventeen', 'sedemnásť', '17'), W('eighteen', 'osemnásť', '18', { tip: '{Eighteen} sa píše len s jedným t.' }),
        W('nineteen', 'devätnásť', '19'), W('twenty', 'dvadsať', '20'),
      ],
    },
    {
      id: 'rodina', name: 'Rodina', em: '👨‍👩‍👦', color: '#FF9A3C',
      words: [
        W('mum', 'mama', '👩', { alt: ['mom'], tip: 'V britskej angličtine {mum}, v americkej {mom}.' }),
        W('dad', 'otec', '👨'),
        W('brother', 'brat', '👦'),
        W('sister', 'sestra', '👧'),
        W('grandma', 'babka', '👵', { alt: ['granny'] }),
        W('grandpa', 'dedko', '👴', { alt: ['grandad', 'granddad'] }),
        W('baby', 'bábätko', '👶'),
        W('parents', 'rodičia', '👫'),
        W('son', 'syn', '🧒'),
        W('daughter', 'dcéra', '👧', { tip: 'V slove {daughter} sa písmená g h nevyslovujú.' }),
        W('aunt', 'teta', '👩‍🦰'),
        W('friend', 'kamarát', '🤝', { tip: '{Friend} sa píše s písmenami i e v strede.' }),
        W('family', 'rodina', '👨‍👩‍👦'),
      ],
    },
    {
      id: 'zvierata', name: 'Zvieratá', em: '🐶', color: '#2FCB61',
      words: [
        W('dog', 'pes', '🐶'), W('cat', 'mačka', '🐱'),
        W('mouse', 'myš', '🐭', { tip: 'Jedna myš je {mouse}, viac myší je {mice}.' }),
        W('bird', 'vták', '🐦'),
        W('fish', 'ryba', '🐟', { tip: 'Jedna ryba je {fish} a viac rýb je tiež {fish}.' }),
        W('horse', 'kôň', '🐴'), W('cow', 'krava', '🐮'), W('pig', 'prasa', '🐷'),
        W('sheep', 'ovca', '🐑', { tip: 'Jedna ovca je {sheep} a viac oviec je tiež {sheep}.' }),
        W('duck', 'kačica', '🦆'), W('rabbit', 'králik', '🐰'), W('frog', 'žaba', '🐸'),
        W('lion', 'lev', '🦁'), W('elephant', 'slon', '🐘', { tip: 'V slove {elephant} sa písmená p h čítajú ako f.' }),
        W('monkey', 'opica', '🐵'), W('snake', 'had', '🐍'), W('bear', 'medveď', '🐻'),
      ],
    },
    {
      id: 'skola', name: 'Škola', em: '🎒', color: '#C4B5FD',
      words: [
        W('pen', 'pero', '🖊️'), W('pencil', 'ceruzka', '✏️'),
        W('rubber', 'guma', '🧽', { alt: ['eraser'], tip: 'V britskej angličtine {rubber}, v americkej {eraser}.' }),
        W('ruler', 'pravítko', '📏'), W('book', 'kniha', '📕'), W('notebook', 'zošit', '📓'),
        W('schoolbag', 'školská taška', '🎒'), W('pencil case', 'peračník', '👝'),
        W('desk', 'lavica', '🏫', { tip: '{Desk} je školská lavica alebo písací stôl.' }),
        W('chair', 'stolička', '🪑'), W('board', 'tabuľa', '🟩'), W('teacher', 'učiteľ', '🧑‍🏫'),
        W('scissors', 'nožnice', '✂️', { tip: '{Scissors} je vždy v množnom čísle, rovnako ako nožnice.' }),
        W('glue', 'lepidlo', '🧴'),
      ],
    },
    {
      id: 'telo', name: 'Telo', em: '🙂', color: '#FF4D5E',
      words: [
        W('head', 'hlava', '🙂'), W('eye', 'oko', '👁️'), W('ear', 'ucho', '👂'), W('nose', 'nos', '👃'),
        W('mouth', 'ústa', '👄'),
        W('hair', 'vlasy', '💇', { tip: '{Hair} sa píše bez s na konci, aj keď vlasov je veľa.' }),
        W('face', 'tvár', '😊'), W('neck', 'krk', '🦒'),
        W('hand', 'ruka', '✋', { tip: '{Hand} je ruka od zápästia po prsty. Celá ruka od pleca je {arm}.' }),
        W('finger', 'prst', '☝️'), W('leg', 'noha', '🦵'),
        W('foot', 'chodidlo', '🦶', { tip: 'Jedno chodidlo je {foot}, dve chodidlá sú {feet}.' }),
        W('knee', 'koleno', '🦵', { tip: '{Knee} sa píše s k na začiatku, ale k sa nevyslovuje.' }),
        W('tooth', 'zub', '🦷', { tip: 'Jeden zub je {tooth}, viac zubov je {teeth}.' }),
        W('shoulder', 'plece', '💪'),
      ],
    },
    {
      id: 'jedlo', name: 'Jedlo', em: '🍎', color: '#FF9A3C',
      words: [
        W('apple', 'jablko', '🍎'), W('banana', 'banán', '🍌'), W('bread', 'chlieb', '🍞'), W('milk', 'mlieko', '🥛'),
        W('water', 'voda', '💧'), W('cheese', 'syr', '🧀'), W('egg', 'vajce', '🥚'),
        W('ice cream', 'zmrzlina', '🍦', { tip: '{Ice cream} sa píše ako dve slová.' }),
        W('chocolate', 'čokoláda', '🍫'), W('juice', 'džús', '🧃'), W('tea', 'čaj', '🍵'), W('soup', 'polievka', '🍲'),
        W('carrot', 'mrkva', '🥕'), W('tomato', 'paradajka', '🍅'), W('potato', 'zemiak', '🥔'),
        W('butter', 'maslo', '🧈'), W('sandwich', 'sendvič', '🥪'),
      ],
    },
    {
      id: 'oblecenie', name: 'Oblečenie', em: '👕', color: '#45C3FF',
      words: [
        W('T-shirt', 'tričko', '👕', { tip: '{T-shirt} sa píše s veľkým T a pomlčkou.' }),
        W('shirt', 'košeľa', '👔'),
        W('trousers', 'nohavice', '👖', { tip: '{Trousers} je vždy v množnom čísle, rovnako ako nohavice.' }),
        W('jeans', 'džínsy', '👖'), W('skirt', 'sukňa', '🩱'), W('dress', 'šaty', '👗'),
        W('jumper', 'sveter', '🧶', { alt: ['sweater'], tip: 'V britskej angličtine {jumper}, v americkej {sweater}.' }),
        W('jacket', 'bunda', '🧥'), W('coat', 'kabát', '🧥'), W('shoes', 'topánky', '👟'),
        W('socks', 'ponožky', '🧦'), W('boots', 'čižmy', '🥾'), W('gloves', 'rukavice', '🧤'),
        W('scarf', 'šál', '🧣'), W('shorts', 'kraťasy', '🩳'), W('cap', 'šiltovka', '🧢'),
      ],
    },
    {
      id: 'hracky', name: 'Hračky', em: '🧸', color: '#FFCF1F',
      words: [
        W('ball', 'lopta', '⚽'), W('doll', 'bábika', '🎎'), W('teddy bear', 'plyšový macko', '🧸'),
        W('kite', 'šarkan', '🪁'), W('train', 'vlak', '🚂'), W('plane', 'lietadlo', '✈️'),
        W('bike', 'bicykel', '🚲', { alt: ['bicycle'] }), W('car', 'auto', '🚗'), W('boat', 'loď', '⛵'),
        W('game', 'hra', '🎲'), W('balloon', 'balón', '🎈', { tip: '{Balloon} sa píše s dvoma l a dvoma o.' }),
      ],
    },
    {
      id: 'dom', name: 'Dom', em: '🏠', color: '#2FCB61',
      words: [
        W('house', 'dom', '🏠'), W('flat', 'byt', '🏢', { alt: ['apartment'], tip: 'V britskej angličtine {flat}, v americkej {apartment}.' }),
        W('kitchen', 'kuchyňa', '🍳'), W('bathroom', 'kúpeľňa', '🛁'), W('bedroom', 'spálňa', '😴'),
        W('living room', 'obývačka', '🛋️'), W('garden', 'záhrada', '🌻'), W('door', 'dvere', '🚪'),
        W('window', 'okno', '🪟'), W('bed', 'posteľ', '🛏️'), W('table', 'stôl', '🍽️'), W('sofa', 'gauč', '🛋️'),
        W('wardrobe', 'skriňa', '🚪'), W('shower', 'sprcha', '🚿'), W('toilet', 'záchod', '🚽'), W('stairs', 'schody', '🪜'),
      ],
    },
    {
      id: 'dni', name: 'Dni v týždni', em: '📅', color: '#C4B5FD', caps: true,
      words: [
        W('Monday', 'pondelok', 'Po'), W('Tuesday', 'utorok', 'Ut'), W('Wednesday', 'streda', 'St', { tip: 'V slove {Wednesday} sa prvé d nevyslovuje, ale píše sa.' }),
        W('Thursday', 'štvrtok', 'Št'), W('Friday', 'piatok', 'Pi'), W('Saturday', 'sobota', 'So'), W('Sunday', 'nedeľa', 'Ne'),
      ].map((w) => ({ ...w, tip: (w.tip ? w.tip + ' ' : '') + 'Dni v týždni sa po anglicky píšu s veľkým písmenom.' })),
    },
  ];
  // Emoji, ktoré by slovo prezradili alebo sú nepresné, nahradíme farebným štítkom témy.
  const NO_PIC = new Set(['rubber', 'living room', 'tablet', 'lamp', 'fridge', 'desk', 'board', 'glue', 'skirt', 'jumper', 'neck', 'bedroom', 'wardrobe', 'table', 'pencil case', 'knee', 'shoulder', 'doll', 'aunt', 'son']);
  for (const t of TOPICS) for (const w of t.words) { w.topic = t.id; w.id = `${t.id}:${w.en}`; if (NO_PIC.has(w.en)) w.em = ''; }
  const BY_ID = new Map(TOPICS.flatMap((t) => t.words.map((w) => [w.id, w])));
  const topicOf = (id) => TOPICS.find((t) => t.id === id);

  const LEVELS = {
    lahke: { name: 'Ľahké', n: 1 },
    stredne: { name: 'Stredné', n: 2 },
    tazke: { name: 'Ťažké', n: 3 },
  };
  const LEVEL_INFO = {
    tablet: {
      lahke: 'Počuješ anglické slovo a vyberieš, čo znamená.',
      stredne: 'Vidíš slovenské slovo a vyberieš anglické.',
      tazke: 'Vidíš slovenské slovo a napíšeš ho po anglicky.',
    },
    papier: {
      lahke: 'Vidíš obrázok a slovenské slovo, appka ti ho prečíta po anglicky. Píšeš do zošita.',
      stredne: 'Appka prečíta anglické slovo, ty ho napíšeš do zošita (diktát).',
      tazke: 'Vidíš len slovenské slovo, napíšeš ho po anglicky bez pomoci.',
    },
  };
  const COUNTS = { kratke: { name: 'Krátke', n: 8 }, dlhe: { name: 'Dlhé', n: 12 } };

  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };

  /** Slová na cvičenie. history = [{ids:[...], at}] od najnovšieho. Najprv slová, ktoré ešte neboli, potom tie najdávnejšie.
      Nikdy nie presne rovnaká sada ako minule. */
  function pick(topic, n, history = []) {
    let pool = topic === 'mix' ? TOPICS.flatMap((t) => t.words) : topicOf(topic).words;
    // V mixe rovnaké anglické slovo len raz (mouse je v dvoch témach).
    const seen = new Set(); pool = shuffle(pool).filter((w) => (seen.has(w.en) ? false : seen.add(w.en)));
    n = Math.min(n, pool.length);
    const last = new Map(); // id -> poradie (0 = najnovšie cvičenie)
    history.forEach((h, k) => { for (const id of h.ids || []) if (!last.has(id)) last.set(id, k); });
    const prevSet = new Set(history[0]?.ids || []);
    const sorted = pool.slice().sort((a, b) => (last.has(b.id) ? last.get(b.id) : 1e9) - (last.has(a.id) ? last.get(a.id) : 1e9));
    let chosen = sorted.slice(0, n);
    // Ak by to bola rovnaká sada ako minule, vymeň aspoň polovicu za iné slová.
    if (chosen.every((w) => prevSet.has(w.id)) && pool.length > n) {
      const rest = sorted.slice(n);
      const k = Math.max(1, Math.min(rest.length, Math.ceil(n / 2)));
      chosen = [...chosen.slice(0, n - k), ...rest.slice(0, k)];
    }
    return shuffle(chosen);
  }

  /** 4 možnosti na výber (správna + 3 z rovnakej témy, bez rovnakého prekladu). */
  function options(w, field) {
    const same = topicOf(w.topic).words.filter((x) => x.id !== w.id && x[field] !== w[field] && x.en !== w.en);
    return shuffle([w, ...shuffle(same).slice(0, 3)]).map((x) => x.id);
  }

  function generate(topic, level, count, mode, history) {
    const words = pick(topic, COUNTS[count].n, history);
    return words.map((w) => {
      const it = { id: w.id };
      if (mode === 'tablet' && level === 'lahke') it.opts = options(w, 'sk');
      if (mode === 'tablet' && level === 'stredne') it.opts = options(w, 'en');
      return it;
    });
  }

  const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[‐-―]/g, '-');
  /** Napísaná odpoveď: veľké/malé písmená sa nerozlišujú, uznajú sa aj iné správne tvary (alt). */
  function check(item, answer) {
    const w = BY_ID.get(item.id);
    if (!w) return false;
    if (item.opts) return answer === w.id;
    const a = norm(answer);
    return [w.en, ...(w.alt || [])].some((x) => norm(x) === a);
  }

  /** Hláskovanie: písmená oddelené bodkou (hlas prečíta názvy písmen), slová oddelené pauzou. */
  const spell = (en) => en.split(' ').map((part) => part.replace(/-/g, '').toUpperCase().split('').join('. ') + '.').join(' … ');
  /** Vysvetlenie chyby: riadky na čítanie a postupnosť pre hlas (sk / en). */
  function explain(item) {
    const w = BY_ID.get(item.id);
    const lines = [`Slovo „${w.sk}“ sa po anglicky povie ${w.en}.`];
    if (w.alt && w.alt.length) lines.push(`Uznáva sa aj: ${w.alt.join(', ')}.`);
    if (w.tip) lines.push(plain(w.tip));
    const seq = [
      { lang: 'sk', text: `Slovo ${w.sk} sa po anglicky povie` }, { lang: 'en', text: w.en },
      { lang: 'sk', text: 'Píše sa' }, { lang: 'en', text: spell(w.en) },
    ];
    if (w.tip) seq.push(...tipSeq(w.tip));
    seq.push({ lang: 'sk', text: 'Ešte raz:' }, { lang: 'en', text: w.en });
    return { lines, seq };
  }
  /** Tip so značkami {anglické slovo}: na čítanie bez zátvoriek, pre hlas po častiach (sk / en). */
  const plain = (t) => t.replace(/[{}]/g, '');
  const tipSeq = (t) => t.split(/(\{[^}]+\})/).filter((x) => x.trim()).map((x) => (x.startsWith('{') ? { lang: 'en', text: x.slice(1, -1) } : { lang: 'sk', text: x.trim() }));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  window.ANGLINA_ENGINE = { TOPICS, BY_ID, topicOf, LEVELS, LEVEL_INFO, COUNTS, generate, check, explain, pick, word: (id) => BY_ID.get(id), plain };
})();
