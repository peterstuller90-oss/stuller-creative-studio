// Zloží Matiku do jedného HTML súboru (na zdieľanie ako claude.ai artifact).
// Použitie: node tools/build-matika-artifact.mjs <výstup.html>
import fs from 'node:fs'
const dir = new URL('../public/apps/matika/', import.meta.url)
const read = (f) => fs.readFileSync(new URL(f, dir), 'utf8')
const avatar = 'data:image/png;base64,' + fs.readFileSync(new URL('mascot.png', dir)).toString('base64')
// V artifacte nejde tlač, tlačidlo Vytlačiť sa skryje.
const app = read('app.js').replace("const AVATAR = 'mascot.png';", `const AVATAR = '${avatar}';`)
  .replace('<button class="btn dark" data-act="print">', '<button class="btn dark" data-act="print" hidden>')
const html = `<title>Matika</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Nunito:wght@700;900&display=swap">
<style>
${read('style.css')}
</style>
<main class="wrap" id="app"></main>
<script>
${read('engine.js')}
</script>
<script>
${app}
</script>
`
fs.writeFileSync(process.argv[2], html)
console.log('ok', html.length)
