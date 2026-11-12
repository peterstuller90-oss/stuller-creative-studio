// Zloží Učiteľa 2.0 do jedného HTML súboru (na zdieľanie ako claude.ai artifact).
// Použitie: node tools/build-ucitel-artifact.mjs <výstup.html>
import fs from 'node:fs'
const dir = new URL('../public/apps/ucitel/', import.meta.url)
const read = (f) => fs.readFileSync(new URL(f, dir), 'utf8')
const mascot = 'data:image/png;base64,' + fs.readFileSync(new URL('mascot.png', dir)).toString('base64')
const app = read('app.js').replace("const MASCOT = 'mascot.png';", `const MASCOT = '${mascot}';`)
const html = `<title>Učiteľ 2.0</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=Barlow:wght@500;600&display=swap">
<style>
${read('style.css')}
</style>
<main class="wrap" id="app"></main>
<script>
${read('bank.js')}
</script>
<script>
${read('engine.js')}
</script>
<script>
${app}
</script>
`
fs.writeFileSync(process.argv[2], html)
console.log('ok', html.length)
