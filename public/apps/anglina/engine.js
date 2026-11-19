/* Anglina – slovíčka z angličtiny pre Ota (4. ročník ZŠ, úroveň A1).
   Britská angličtina (ako v slovenských učebniciach): colour, grey, mum, rubber, jumper, trousers.
   Extra téma Slová s W (Otovi robí w problém). Témy podľa ŠVP pre 1. stupeň (rodina, škola, zvieratá, jedlo, oblečenie, telo, dom, čísla, farby, dni)
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
      // Extra cvičenie: slová s písmenom w (Otovi robí problém). Slová z 1.–4. ročníka a pár jednoduchých navyše.
      id: 'w', name: 'Slová s W', em: 'W', color: '#FF5FA8', badge: 'Extra',
      words: [
        W('water', 'voda', '💧'), W('window', 'okno', '🪟'), W('white', 'biely', '', { sw: '#FFFFFF' }),
        W('watch', 'hodinky', '⌚'), W('week', 'týždeň', '📅'), W('woman', 'žena', '👩'),
        W('wolf', 'vlk', '🐺'), W('winter', 'zima', '❄️'), W('warm', 'teplý', ''), W('wet', 'mokrý', '💦'),
        W('wind', 'vietor', '🌬️'), W('wall', 'stena', '🧱'), W('world', 'svet', '🌍'),
        W('Wednesday', 'streda', 'St', { tip: 'V slove {Wednesday} sa prvé d nevyslovuje, ale píše sa. Dni v týždni sa píšu s veľkým písmenom.' }),
        W('what', 'čo', '❓'), W('where', 'kde', ''), W('when', 'kedy', ''),
        W('who', 'kto', '', { tip: 'V slove {who} sa w nevyslovuje.', silentW: true }),
        W('write', 'písať', '✍️', { tip: 'V slove {write} sa w na začiatku nevyslovuje.', silentW: true }),
        W('two', 'dva', '2', { tip: 'V slove {two} sa w nevyslovuje.', silentW: true }),
        W('twelve', 'dvanásť', '12'), W('twenty', 'dvadsať', '20'),
        W('swim', 'plávať', '🏊'), W('sweets', 'cukríky', '🍬'), W('sandwich', 'sendvič', '🥪'),
        W('cow', 'krava', '🐮', { ow: 'au' }), W('brown', 'hnedý', '', { sw: '#8B5A2B', ow: 'au' }), W('owl', 'sova', '🦉', { ow: 'au' }),
        W('flower', 'kvet', '🌸', { ow: 'au' }), W('tower', 'veža', '🗼', { ow: 'au' }),
        W('yellow', 'žltý', '', { sw: '#FFD60A', ow: 'ou' }), W('snow', 'sneh', '☃️', { ow: 'ou' }),
      ].map((w) => {
        // Overené poznámky k výslovnosti w (ak slovo nemá vlastnú, ktorá to už hovorí).
        let t = w.tip || '';
        if (w.ow) t = `Písmená o a w znejú v tomto slove ako slovenské ${w.ow}.` + (t ? ' ' + t : '');
        else if (!w.silentW) t = (t ? t + ' ' : '') + 'Písmeno w sa vyslovuje ako krátke u so zaokrúhlenými perami, nie ako slovenské v.';
        return { ...w, tip: t };
      }),
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

  // ---------------- Otázky a odpovede (rozhovor) ----------------
  // Základné otázky a odpovede z 1.–4. ročníka. a = vzorová odpoveď, aSk = jej význam, note = poznámka (napr. povedz svoj vek).
  // Viac správnych odpovedí je oddelených „ / “.
  const Q = (key, en, sk, a, aSk, extra = {}) => ({ key, en, sk, a, aSk, qa: true, em: '', ...extra });
  const QA_TOPIC = {
    id: 'otazky', name: 'Otázky a odpovede', em: '💬', color: '#3FD4FF', qa: true, badge: 'Rozhovor',
    words: [
      Q('name', "What's your name?", 'Ako sa voláš?', 'My name is Oto.', 'Volám sa Oto.', { note: 'Môžeš povedať aj {I am Oto.}' }),
      Q('age', 'How old are you?', 'Koľko máš rokov?', "I'm ten.", 'Mám desať rokov.', { note: 'Povedz svoj vek, napríklad {I am nine.} alebo {I am ten.}' }),
      Q('how', 'How are you?', 'Ako sa máš?', "I'm fine, thank you.", 'Mám sa dobre, ďakujem.'),
      Q('from', 'Where are you from?', 'Odkiaľ si?', "I'm from Slovakia.", 'Som zo Slovenska.'),
      Q('meet', 'Nice to meet you.', 'Teší ma.', 'Nice to meet you too.', 'Aj mňa teší.'),
      Q('morning', 'Good morning!', 'Dobré ráno!', 'Good morning!', 'Dobré ráno!'),
      Q('thanks', 'Thank you!', 'Ďakujem!', "You're welcome.", 'Nemáš za čo.'),
      Q('bye', 'Goodbye!', 'Dovidenia!', 'Goodbye! / Bye!', 'Dovidenia! / Ahoj!'),
      Q('colour', "What's your favourite colour?", 'Aká je tvoja obľúbená farba?', 'My favourite colour is blue.', 'Moja obľúbená farba je modrá.', { note: 'Povedz svoju obľúbenú farbu.' }),
      Q('animal', "What's your favourite animal?", 'Aké je tvoje obľúbené zviera?', 'My favourite animal is a dog.', 'Moje obľúbené zviera je pes.', { note: 'Povedz svoje obľúbené zviera.' }),
      Q('food', "What's your favourite food?", 'Aké je tvoje obľúbené jedlo?', 'My favourite food is pizza.', 'Moje obľúbené jedlo je pizza.', { note: 'Povedz svoje obľúbené jedlo.' }),
      Q('sister', 'Have you got a sister?', 'Máš sestru?', "Yes, I have. / No, I haven't.", 'Áno, mám. / Nie, nemám.'),
      Q('pet', 'Have you got a pet?', 'Máš domáce zvieratko?', "Yes, I have. / No, I haven't.", 'Áno, mám. / Nie, nemám.'),
      Q('swim', 'Can you swim?', 'Vieš plávať?', "Yes, I can. / No, I can't.", 'Áno, viem. / Nie, neviem.'),
      Q('bike', 'Can you ride a bike?', 'Vieš jazdiť na bicykli?', "Yes, I can. / No, I can't.", 'Áno, viem. / Nie, neviem.'),
      Q('apples', 'Do you like apples?', 'Máš rád jablká?', "Yes, I do. / No, I don't.", 'Áno, mám. / Nie, nemám.'),
      Q('chocolate', 'Do you like chocolate?', 'Máš rád čokoládu?', "Yes, I do. / No, I don't.", 'Áno, mám. / Nie, nemám.'),
      Q('this-dog', "What's this?", 'Čo je to?', "It's a dog.", 'Je to pes.', { em: '🐶' }),
      Q('this-apple', "What's this?", 'Čo je to?', "It's an apple.", 'Je to jablko.', { em: '🍎', note: 'Pred slovom, ktoré sa začína samohláskou, je {an}: {an apple}.' }),
      Q('colour-banana', 'What colour is it?', 'Akú to má farbu?', "It's yellow.", 'Je žltý.', { em: '🍌' }),
      Q('cats', 'How many cats?', 'Koľko je mačiek?', 'Three cats.', 'Tri mačky.', { em: '🐱🐱🐱' }),
      Q('is-cat', 'Is it a cat?', 'Je to mačka?', "No, it isn't. It's a dog.", 'Nie, nie je. Je to pes.', { em: '🐶' }),
      Q('is-dog', 'Is it a dog?', 'Je to pes?', 'Yes, it is.', 'Áno, je.', { em: '🐶' }),
      Q('who', 'Who is this?', 'Kto je to?', "It's my grandma.", 'To je moja babka.', { em: '👵' }),
      Q('day', 'What day is it today?', 'Aký je dnes deň?', "It's Monday.", 'Je pondelok.', { note: 'Povedz, aký deň je dnes. Dni sa píšu s veľkým písmenom.' }),
      Q('time', 'What time is it?', 'Koľko je hodín?', "It's three o'clock.", 'Sú tri hodiny.', { em: '🕒' }),
      Q('weather', "What's the weather like?", 'Aké je počasie?', "It's sunny.", 'Je slnečno.', { em: '☀️' }),
    ],
  };
  TOPICS.splice(2, 0, QA_TOPIC);
  // Emoji, ktoré by slovo prezradili alebo sú nepresné, nahradíme farebným štítkom témy.
  const NO_PIC = new Set(['rubber', 'living room', 'tablet', 'lamp', 'fridge', 'desk', 'board', 'glue', 'skirt', 'jumper', 'neck', 'bedroom', 'wardrobe', 'table', 'pencil case', 'knee', 'shoulder', 'doll', 'aunt', 'son']);
  for (const t of TOPICS) for (const w of t.words) { w.topic = t.id; w.id = `${t.id}:${w.key || w.en}`; if (NO_PIC.has(w.en)) w.em = ''; }
  const BY_ID = new Map(TOPICS.flatMap((t) => t.words.map((w) => [w.id, w])));
  const topicOf = (id) => TOPICS.find((t) => t.id === id);

  const LEVELS = {
    lahke: { name: 'Ľahké', n: 1 },
    stredne: { name: 'Stredné', n: 2 },
    tazke: { name: 'Ťažké', n: 3 },
    poskladaj: { name: 'Poskladaj', n: 2, only: 'tablet' },
    dopis: { name: 'Píšem perom', n: 3, only: 'tablet', test: true },
    rozhovor: { name: 'Rozhovor', n: 2, only: 'tablet', qa: true },
  };
  const LEVEL_INFO = {
    tablet: {
      lahke: 'Počuješ anglické slovo a vyberieš, čo znamená.',
      stredne: 'Vidíš slovenské slovo a vyberieš anglické.',
      tazke: 'Vidíš slovenské slovo a napíšeš ho po anglicky.',
      poskladaj: 'Vidíš slovenské slovo a poskladáš ho z rozhádzaných písmen.',
      dopis: 'Vidíš rozhádzané písmená a slovenské slovo. Slovo napíšeš perom ako do zošita.',
      rozhovor: 'Appka sa ťa opýta po anglicky, ty odpovieš nahlas.',
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
    let pool = topic === 'mix' ? TOPICS.filter((t) => !t.qa).flatMap((t) => t.words) : topicOf(topic).words;
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

  /** Rozhádzané písmená slova (bez medzier a pomlčiek), nikdy nie v správnom poradí. */
  function tiles(en) {
    const letters = en.replace(/[ -]/g, '').split('');
    if (new Set(letters).size < 2) return letters;
    let t = letters;
    for (let k = 0; k < 20 && t.join('') === letters.join(''); k++) t = shuffle(letters);
    return t;
  }
  /** Poskladaná odpoveď: písmená z dlaždíc doplnené do slova, medzery a pomlčky ostávajú na mieste. */
  function assemble(en, tl, picks) {
    let k = 0;
    return en.split('').map((c) => (c === ' ' || c === '-' ? c : (picks[k] != null ? tl[picks[k++]] : (k++, '?')))).join('');
  }
  function generate(topic, level, count, mode, history) {
    const words = pick(topic, COUNTS[count].n, history);
    return words.map((w) => {
      const it = { id: w.id };
      if (mode === 'tablet' && level === 'lahke') it.opts = options(w, 'sk');
      if (mode === 'tablet' && level === 'stredne') it.opts = options(w, 'en');
      if (mode === 'tablet' && (level === 'poskladaj' || level === 'dopis') && !w.qa) it.tiles = tiles(w.en);
      return it;
    });
  }

  const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[‐-―]/g, '-');
  /** Napísaná odpoveď: veľké/malé písmená sa nerozlišujú, uznajú sa aj iné správne tvary (alt). */
  function check(item, answer) {
    const w = BY_ID.get(item.id);
    if (!w) return false;
    if (w.qa) return answer === 'ok';
    if (item.opts) return answer === w.id;
    const a = norm(answer);
    return [w.en, ...(w.alt || [])].some((x) => norm(x) === a);
  }

  /** Hláskovanie: písmená oddelené bodkou (hlas prečíta názvy písmen), slová oddelené pauzou. */
  // Slovenské názvy písmen (ako sa hláskuje v škole), napísané tak, aby ich slovenský hlas prečítal správne.
  const SK_LETTER = { a: 'á', b: 'bé', c: 'cé', d: 'dé', e: 'é', f: 'ef', g: 'gé', h: 'há', i: 'í', j: 'jé', k: 'ká', l: 'el', m: 'em', n: 'en', o: 'ó', p: 'pé', q: 'kvé', r: 'er', s: 'es', t: 'té', u: 'ú', v: 'vé', w: 'dvojité vé', x: 'iks', y: 'ypsilon', z: 'zet' };
  /** Hláskovanie po slovensky: každé písmeno zvlášť a pomaly (veľké písmeno, medzera a pomlčka sa povedia). */
  const spellSk = (en) => en.split('').map((c) => {
    if (c === ' ') return { lang: 'sk', text: 'medzera', rate: 0.7 };
    if (c === '-') return { lang: 'sk', text: 'pomlčka', rate: 0.7 };
    const name = SK_LETTER[c.toLowerCase()];
    return { lang: 'sk', text: c !== c.toLowerCase() ? `veľké ${name}` : name, rate: 0.7 };
  });
  /** Hláskovanie po anglicky: anglické názvy písmen, každé zvlášť a pomaly. */
  const spellEn = (en) => en.replace(/[ -]/g, '').toUpperCase().split('').map((c) => ({ lang: 'en', text: `${c}.`, rate: 0.6 }));
  /** Vysvetlenie chyby: riadky na čítanie a postupnosť pre hlas (sk / en). */
  /** Text odpovede pre hlas: „ / “ prečíta ako „alebo“. */
  const sayAns = (a) => a.split(' / ');
  function explainQA(w) {
    const lines = [`Otázka: ${w.en} = ${w.sk}`, `Odpoveď: ${w.a} = ${w.aSk}`];
    if (w.note) lines.push(plain(w.note));
    const seq = [{ lang: 'sk', text: 'Otázka' }, { lang: 'en', text: w.en, rate: 0.75 }, { lang: 'sk', text: `znamená: ${w.sk}` }, { lang: 'sk', text: 'Odpovieš:' }];
    sayAns(w.a).forEach((x, i) => { if (i) seq.push({ lang: 'sk', text: 'alebo' }); seq.push({ lang: 'en', text: x, rate: 0.75 }); });
    seq.push({ lang: 'sk', text: `To znamená: ${w.aSk.replace(/ \/ /g, ' alebo ')}` });
    if (w.note) seq.push(...tipSeq(w.note));
    seq.push({ lang: 'sk', text: 'Ešte raz:' }, { lang: 'en', text: w.en, rate: 0.75 }, { lang: 'en', text: sayAns(w.a)[0], rate: 0.75 });
    return { lines, seq };
  }
  function explain(item) {
    const w = BY_ID.get(item.id);
    if (w.qa) return explainQA(w);
    const lines = [`Slovo „${w.sk}“ sa po anglicky povie ${w.en}.`];
    if (w.alt && w.alt.length) lines.push(`Uznáva sa aj: ${w.alt.join(', ')}.`);
    if (w.tip) lines.push(plain(w.tip));
    const seq = [
      { lang: 'sk', text: `Slovo ${w.sk} sa po anglicky povie` }, { lang: 'en', text: w.en, rate: 0.7 },
      { lang: 'sk', text: 'Hláskujeme po slovensky:', rate: 0.85 }, ...spellSk(w.en),
      { lang: 'sk', text: 'A teraz po anglicky:', rate: 0.85 }, ...spellEn(w.en),
    ];
    if (w.tip) seq.push(...tipSeq(w.tip));
    seq.push({ lang: 'sk', text: 'Ešte raz:' }, { lang: 'en', text: w.en, rate: 0.7 });
    return { lines, seq };
  }
  /** Tip so značkami {anglické slovo}: na čítanie bez zátvoriek, pre hlas po častiach (sk / en). */
  const plain = (t) => t.replace(/[{}]/g, '');
  const tipSeq = (t) => t.split(/(\{[^}]+\})/).filter((x) => x.trim()).map((x) => (x.startsWith('{') ? { lang: 'en', text: x.slice(1, -1) } : { lang: 'sk', text: x.trim() }));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  window.ANGLINA_ENGINE = { TOPICS, BY_ID, topicOf, LEVELS, LEVEL_INFO, COUNTS, generate, check, explain, pick, word: (id) => BY_ID.get(id), sayAns, assemble, plain, skLetter: (c) => SK_LETTER[c.toLowerCase()] || '' };
})();
