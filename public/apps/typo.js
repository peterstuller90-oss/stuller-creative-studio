/* Slovak typography for texts on designs (only how the text is drawn; what you typed stays as it is):
   - one-letter words (a, i, k, o, s, u, v, z) never stay alone at the end of a line
   - dates with a space after each dot: 14.3.2026 → 14. 3. 2026, 30.01 → 30. 1.; a date never breaks apart
   - ranges with an en dash: 10:00-13:00 → 10:00 – 13:00, a dash never starts a line
   - Slovak quotes „…“, three dots …, number and unit stay together (10 %, 5 €, 20 rokov)
   Joined words use a no-break space (U+00A0); wrapping functions split only on normal spaces. */
(function () {
  const NB = '\u00A0'
  function sk(t) {
    if (!t) return t
    let s = String(t)
    s = s.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.;:!?…])/g, '$1').replace(/\.\.\./g, '…')
    // dates (day 1–31, month 1–12), optional year
    // (2.5 alone is a number, not a date: a date needs a two-digit month, a dot after the month, or a year)
    s = s.replace(/(^|[^\d.,:])(\d{1,2})\.\s*(\d{1,2})(\.?)(?:\s*(\d{4}))?(?![\d:])/g, (m, pre, d, mo, dot, y) => {
      if (+d < 1 || +d > 31 || +mo < 1 || +mo > 12) return m
      if (!dot && !y && mo.length < 2) return m
      return pre + +d + '.' + NB + +mo + '.' + (y ? NB + y : '')
    })
    // ranges between numbers or times, and a free-standing hyphen used as a dash
    s = s.replace(/(\d\.?)\s*[-–—]\s*(\d)/g, '$1' + NB + '–' + NB + '$2').replace(/ [-–—] /g, NB + '– ')
    // quotes
    s = s.replace(/"([^"\n]*)"/g, '„$1“').replace(/“([^“”\n]*)”/g, '„$1“')
    // number + unit or sign
    s = s.replace(/(\d) (%|‰|€|Kč|kg|g|km|m|cm|mm|h|hod\.|min\.?|l|ks|°C|rok|roky|rokov|deti|detí|ľudí|osôb)(?=[\s,.;:!?)…]|$)/g, '$1' + NB + '$2')
    // one-letter words stick to the next word (twice, for "a v lese")
    for (let i = 0; i < 2; i++) s = s.replace(/(^|[\s(„" ])([aiksouvzAIKSOUVZ]) /g, '$1$2' + NB)
    return s
  }
  window.Typo = { sk, NB }
})()
