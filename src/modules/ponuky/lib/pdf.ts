import fontkit from '@pdf-lib/fontkit'
import { PDFBool, PDFCheckBox, PDFDocument, PDFDropdown, PDFName, PDFRadioGroup, PDFTextField, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { BRIEF_MARK, briefSections, type BriefValues } from './brief'
import { buildContract, signatureNames } from './contract'
import type { PriceItem, Quote, Settings } from './types'

const INK = rgb(91 / 255, 75 / 255, 122 / 255)
const MUTED = rgb(138 / 255, 127 / 255, 160 / 255)
const MINT = rgb(172 / 255, 1, 211 / 255)
const W = 595.28
const H = 841.89
const M = 48

const asset = (p: string) => fetch(`${import.meta.env.BASE_URL}${p}`).then((r) => {
  if (!r.ok) throw new Error(`Chýba súbor ${p}`)
  return r.arrayBuffer()
})

async function setup(title: string) {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const [medium, regular, logoBytes] = await Promise.all([
    asset('pdf-fonts/BarlowCondensed-Medium.ttf'), asset('pdf-fonts/BarlowCondensed-Regular.ttf'), asset('logo.png'),
  ])
  // Not subset: form fields need every glyph the client may type (č, ľ, ž…).
  // Ligatures off: "fi" and the Dutch "IJ" would otherwise drop letters (Offi ce, POUŽIJ ETE).
  const features = { liga: false, dlig: false, clig: false }
  const bold = await doc.embedFont(medium, { subset: false, features })
  const body = await doc.embedFont(regular, { subset: false, features })
  const logo = await doc.embedPng(logoBytes)
  doc.setTitle(title)
  doc.setAuthor('Štullers Creative')
  doc.setCreator('Štullers Ponuky')
  return { doc, bold, body, logo }
}

/** Split text into lines that fit the width, keeping the author's own line breaks. */
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) > width && line) { out.push(line); line = word } else line = next
    }
    out.push(line)
  }
  return out
}

/* ───────── Brief (the client's form) ───────── */

export async function makeBriefPdf(s: Settings, prices: PriceItem[]): Promise<Uint8Array> {
  const { doc, bold, body, logo } = await setup('Zadanie projektu – Štullers')
  doc.setSubject(BRIEF_MARK)
  doc.setKeywords([BRIEF_MARK])
  const form = doc.getForm()
  let page = doc.addPage([W, H])
  let y = H - M

  const header = (p: PDFPage, first: boolean) => {
    const lw = first ? 150 : 90
    const lh = lw * logo.height / logo.width
    p.drawImage(logo, { x: M, y: H - M - lh, width: lw, height: lh })
    if (first) {
      p.drawText('ZADANIE PROJEKTU', { x: W - M - bold.widthOfTextAtSize('ZADANIE PROJEKTU', 26), y: H - M - 26, size: 26, font: bold, color: INK })
      const sub = 'Vyplňte, uložte a pošlite nám späť.'
      p.drawText(sub, { x: W - M - body.widthOfTextAtSize(sub, 12), y: H - M - 44, size: 12, font: body, color: MUTED })
    }
    p.drawLine({ start: { x: M, y: H - M - lh - 10 }, end: { x: W - M, y: H - M - lh - 10 }, thickness: 2, color: INK })
    return H - M - lh - 30
  }
  const footer = (p: PDFPage, n: number) => {
    const t = `${s.company.name} · ${[s.company.email, s.company.phone, s.company.web].filter(Boolean).join(' · ')}`
    p.drawText(t, { x: M, y: 26, size: 9, font: body, color: MUTED })
    p.drawText(String(n), { x: W - M - 6, y: 26, size: 9, font: body, color: MUTED })
  }
  y = header(page, true)
  const intro = `Ďakujeme za záujem o spoluprácu so Štullers. Aby sme vám vedeli pripraviť presnú ponuku a zmluvu, vyplňte prosím tento formulár priamo v PDF (Adobe Reader, Náhľad na Macu alebo Súbory na iPhone). Potom ho uložte a pošlite späť${s.company.email ? ` na ${s.company.email}` : ''}.`
  for (const l of wrap(intro, body, 11, W - 2 * M)) { page.drawText(l, { x: M, y, size: 11, font: body, color: INK }); y -= 15 }
  y -= 8

  const fieldH = 22
  const gap = 10
  const usable = W - 2 * M
  let pageNo = 1

  for (const sec of briefSections(s, prices)) {
    if (sec.fields.length === 0) continue
    const need = 110
    if (sec.newPage || y - need < 60) { footer(page, pageNo); page = doc.addPage([W, H]); pageNo++; y = header(page, false) }
    // Section band
    page.drawRectangle({ x: M, y: y - 22, width: usable, height: 26, color: MINT })
    page.drawText(sec.title.toUpperCase(), { x: M + 10, y: y - 14, size: 14, font: bold, color: INK })
    y -= 36
    if (sec.hint) {
      for (const l of wrap(sec.hint, body, 10.5, usable)) { page.drawText(l, { x: M, y, size: 10.5, font: body, color: MUTED }); y -= 14 }
      y -= 4
    }
    let x = M
    let rowH = 0
    const height = (f: (typeof sec.fields)[number]) => f.kind === 'check' ? 24 : f.kind === 'radio' ? 40 : (f.kind === 'multiline' ? (f.h ?? 80) : fieldH) + 24
    for (const f of sec.fields) {
      const w = usable * (f.w ?? 1) - (f.w && f.w < 1 ? gap / 2 : 0)
      if (x + w > W - M + 1) { x = M; y -= rowH; rowH = 0 }
      if (x === M && y - height(f) < 56) { footer(page, pageNo); page = doc.addPage([W, H]); pageNo++; y = header(page, false) }
      if (f.kind === 'check') {
        const cb = form.createCheckBox(f.id)
        cb.addToPage(page, { x, y: y - 14, width: 13, height: 13, borderColor: INK, borderWidth: 1.2, textColor: INK })
        for (const [i, l] of wrap(f.label, body, 11, w - 22).entries()) page.drawText(l, { x: x + 19, y: y - 11 - i * 13, size: 11, font: body, color: INK })
        rowH = Math.max(rowH, 24)
      } else if (f.kind === 'radio') {
        page.drawText(f.label.toUpperCase(), { x, y: y - 9, size: 8.5, font: bold, color: MUTED })
        const rg = form.createRadioGroup(f.id)
        let ox = x
        for (const o of f.options ?? []) {
          rg.addOptionToPage(o.value, page, { x: ox, y: y - 28, width: 13, height: 13, borderColor: INK, borderWidth: 1.2, textColor: INK })
          page.drawText(o.label, { x: ox + 19, y: y - 25, size: 11, font: body, color: INK })
          ox += 19 + body.widthOfTextAtSize(o.label, 11) + 24
        }
        rowH = Math.max(rowH, 40)
      } else {
        const h = f.kind === 'multiline' ? (f.h ?? 80) : fieldH
        page.drawText(f.label.toUpperCase(), { x, y: y - 9, size: 8.5, font: bold, color: MUTED })
        const opts = { x, y: y - 14 - h, width: w, height: h, borderColor: INK, borderWidth: 1, textColor: INK, backgroundColor: rgb(1, 1, 1) }
        if (f.kind === 'dropdown') {
          const dd = form.createDropdown(f.id)
          dd.addOptions(['', ...(f.options ?? []).map((o) => o.value)])
          dd.addToPage(page, opts)
        } else {
          const tf = form.createTextField(f.id)
          if (f.kind === 'multiline') tf.enableMultiline()
          tf.addToPage(page, opts)
          tf.setFontSize(f.kind === 'multiline' ? 10.5 : 11)
        }
        rowH = Math.max(rowH, h + 24)
      }
      x += w + (f.w && f.w < 1 ? gap : 0)
    }
    y -= rowH + 10
  }
  footer(page, pageNo)
  form.updateFieldAppearances(body)
  doc.catalog.getOrCreateAcroForm().dict.set(PDFName.of('NeedAppearances'), PDFBool.True)
  return doc.save()
}

/** Read a filled-in brief. Returns null when the PDF is not our form. */
export async function readBriefPdf(bytes: ArrayBuffer): Promise<{ values: BriefValues; ours: boolean }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const ours = (doc.getSubject() ?? '').includes(BRIEF_MARK) || (doc.getKeywords() ?? '').includes(BRIEF_MARK)
  const values: BriefValues = {}
  for (const f of doc.getForm().getFields()) {
    const name = f.getName()
    if (f instanceof PDFTextField) values[name] = f.getText() ?? ''
    else if (f instanceof PDFCheckBox) values[name] = f.isChecked()
    else if (f instanceof PDFDropdown) values[name] = f.getSelected()[0] ?? ''
    else if (f instanceof PDFRadioGroup) values[name] = f.getSelected() ?? ''
  }
  return { values, ours }
}

/* ───────── Contract ───────── */

export async function makeContractPdf(q: Quote, s: Settings): Promise<Uint8Array> {
  const { doc, bold, body, logo } = await setup(`Zmluva ${q.number}`)
  let page = doc.addPage([W, H])
  const usable = W - 2 * M
  let y = H - M
  const lw = 110
  const lh = lw * logo.height / logo.width
  page.drawImage(logo, { x: M, y: y - lh, width: lw, height: lh })
  y -= lh + 18
  let n = 1
  const foot = () => page.drawText(`Zmluva č. ${q.number} · strana ${n}`, { x: M, y: 26, size: 9, font: body, color: MUTED })
  const ensure = (need: number) => {
    if (y - need < 56) { foot(); page = doc.addPage([W, H]); n++; y = H - M }
  }
  const para = (text: string, font: PDFFont, size: number, color = INK, center = false, lead = 1.35) => {
    for (const l of wrap(text, font, size, usable)) {
      ensure(size * lead)
      const x = center ? M + (usable - font.widthOfTextAtSize(l, size)) / 2 : M
      page.drawText(l, { x, y: y - size, size, font, color })
      y -= size * lead
    }
  }
  for (const b of buildContract(q, s)) {
    if (b.kind === 'title') { para(b.text.toUpperCase(), bold, 20, INK, true, 1.2); y -= 4 }
    else if (b.kind === 'note') { para(b.text, body, 10, MUTED, true); y -= 8 }
    else if (b.kind === 'h') { ensure(40); y -= 8; para(b.text, bold, 13); y -= 2 }
    else { para(b.text, body, 10.5); y -= 6 }
  }
  // Signatures
  const sig = signatureNames(q, s)
  ensure(150)
  y -= 18
  page.drawText('V ......................................... dňa .....................', { x: M, y, size: 10.5, font: body, color: INK })
  page.drawText('V ......................................... dňa .....................', { x: M + usable / 2 + 10, y, size: 10.5, font: body, color: INK })
  y -= 70
  const col = (x: number, title: string, names: string[]) => {
    let yy = y
    for (const name of names.length ? names : ['']) {
      page.drawLine({ start: { x, y: yy }, end: { x: x + usable / 2 - 20, y: yy }, thickness: 0.8, color: INK })
      page.drawText(`${title}${name ? `: ${name}` : ''}`, { x, y: yy - 13, size: 10, font: body, color: MUTED })
      yy -= 60
    }
  }
  col(M, 'Autor', sig.authors)
  col(M + usable / 2 + 10, 'Objednávateľ', [sig.client])
  foot()
  return doc.save()
}

