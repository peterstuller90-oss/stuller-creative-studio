import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin as PostcssPlugin, Rule } from 'postcss'

// Every app inside the hub keeps its own CSS. This plugin scopes the CSS of src/modules/<id>/
// under the wrapper class .mod-<id>, so two apps never fight over the same class names.
// :root / html / body rules apply to the wrapper itself.
const scopeModules: PostcssPlugin = {
  postcssPlugin: 'scope-modules',
  Rule(rule: Rule) {
    const file = rule.source?.input.file ?? ''
    const m = file.match(/[\\/]src[\\/]modules[\\/]([^\\/]+)[\\/]/)
    if (!m) return
    if (rule.parent?.type === 'atrule' && /keyframes$/.test((rule.parent as { name: string }).name)) return
    const scope = `.mod-${m[1]}`
    if (rule.selector.includes(scope)) return
    rule.selectors = rule.selectors.map((sel) => {
      const s = sel.trim()
      if (/^(:root|html|body|html body)$/.test(s)) return scope
      if (/^(html|body)[\s.]/.test(s)) return s.replace(/^(html body|html|body)/, scope)
      return `${scope} ${s}`
    })
  },
}

// BASE_PATH is set when building for GitHub Pages (served under /<repo>/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  css: { postcss: { plugins: [scopeModules] } },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 5173 },
  build: { chunkSizeWarningLimit: 1500 },
})
