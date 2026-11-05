import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/** All text of a PDF, page by page. Works on any PDF that has real text (not a scan). */
export async function pdfText(bytes: ArrayBuffer): Promise<string> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise
  const pages: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent()
    pages.push(content.items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : '')).join(''))
  }
  await doc.destroy()
  return pages.join('\n\n').replace(/[ \t]+/g, ' ').trim()
}

/** Text of a brief file: PDF, or a plain text file. */
export async function fileText(file: File): Promise<string> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  return isPdf ? pdfText(await file.arrayBuffer()) : (await file.text()).trim()
}
