import { ARTIFACT } from '../components/ui'

type Downloads = { save(r: { filename: string; data: Blob }): Promise<unknown> }
declare global { interface Window { claude?: { use(name: string): Promise<unknown> } } }

/** Hand a generated file to the user: a normal download, or the viewer's save prompt inside a claude.ai artifact. */
export async function saveFile(bytes: Uint8Array, filename: string, type = 'application/pdf') {
  const blob = new Blob([bytes as BlobPart], { type })
  if (ARTIFACT) {
    const d = (await window.claude?.use('downloads')) as Downloads | null | undefined
    if (!d) throw new Error('Sťahovanie tu nie je dostupné.')
    try { await d.save({ filename, data: blob }) } catch (e) {
      const code = (e as { code?: string }).code
      if (code === 'declined') return
      throw new Error('Súbor sa nepodarilo uložiť.')
    }
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
