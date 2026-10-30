// Bundles marketing-manager/src/index.template.html into marketing-manager/index.html.
// No dependencies. Run: node marketing-manager/build.mjs
// - <link rel="stylesheet" href="local.css">  -> inlined <style>
// - <script src="local.js"></script>           -> inlined <script>
// - <!-- @content -->                           -> <script>window.MM_CONTENT = {...all content/*.json by file stem...}</script>
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, 'src')
const contentDir = join(here, 'content')
const template = readFileSync(join(srcDir, 'index.template.html'), 'utf8')

function readLocal(ref) {
  const p = resolve(srcDir, ref)
  if (!p.startsWith(srcDir)) throw new Error(`refusing to inline outside src/: ${ref}`)
  return readFileSync(p, 'utf8')
}

function loadContent() {
  const out = {}
  let files = []
  try { files = readdirSync(contentDir).filter(f => f.endsWith('.json')).sort() } catch { return out }
  for (const f of files) {
    const text = readFileSync(join(contentDir, f), 'utf8')
    let data
    try { data = JSON.parse(text) } catch (e) { throw new Error(`content/${f}: invalid JSON: ${e.message}`) }
    out[f.replace(/\.json$/, '')] = data
  }
  return out
}

function escapeForScript(json) {
  // Prevent "</script>" and U+2028/2029 from breaking the inline script.
  return json.replace(/<\/(script)/gi, '<\\/$1').replace(new RegExp(String.fromCharCode(0x2028),'g'), '\\u2028').replace(new RegExp(String.fromCharCode(0x2029),'g'), '\\u2029')
}

let html = template
html = html.replace(/<link\s+rel="stylesheet"\s+href="(?!https?:)([^"]+)"\s*\/?>/g, (_, href) => `<style>\n${readLocal(href)}\n</style>`)
html = html.replace(/<script\s+src="(?!https?:)([^"]+)"\s*><\/script>/g, (_, src) => `<script>\n${readLocal(src).replace(/<\/(script)/gi, '<\\/$1')}\n</script>`)
const content = loadContent()
const contentTag = `<script>window.MM_CONTENT = ${escapeForScript(JSON.stringify(content))};</script>`
if (html.includes('<!-- @content -->')) html = html.replace('<!-- @content -->', contentTag)
else html = html.replace('</head>', contentTag + '\n</head>')

const outPath = join(here, 'index.html')
writeFileSync(outPath, html)
const kb = Math.round(statSync(outPath).size / 1024)
console.log(`built ${outPath} (${kb} KB; content banks: ${Object.keys(content).join(', ') || 'none'})`)
