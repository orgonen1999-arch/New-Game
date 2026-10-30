// Smoke test for the built game: loads marketing-manager/index.html in headless Chromium,
// fails on console errors / page errors / horizontal overflow, and saves screenshots.
// Run: node marketing-manager/tools/smoke.mjs [outDir]
import { chromium } from 'playwright'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdirSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const page_path = resolve(here, '..', 'index.html')
const outDir = process.argv[2] ? resolve(process.argv[2]) : join(here, '..', '.smoke')
mkdirSync(outDir, { recursive: true })

const problems = []
const browser = await chromium.launch()
for (const [name, viewport] of [['desktop', { width: 1280, height: 860 }], ['phone', { width: 400, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport, locale: 'he-IL' })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error') problems.push(`[${name}] console.error: ${m.text()}`) })
  page.on('pageerror', e => problems.push(`[${name}] pageerror: ${e.message}`))
  await page.goto(pathToFileURL(page_path).href)
  await page.waitForTimeout(800)
  const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, dir: document.documentElement.dir || document.body.dir || getComputedStyle(document.body).direction }))
  if (overflow.sw > overflow.iw + 1) problems.push(`[${name}] horizontal overflow: scrollWidth ${overflow.sw} > innerWidth ${overflow.iw}`)
  if (overflow.dir !== 'rtl') problems.push(`[${name}] page direction is not rtl (${overflow.dir})`)
  const text = (await page.evaluate(() => document.body.innerText)).trim()
  if (text.length < 40) problems.push(`[${name}] page body has almost no text (${text.length} chars)`)
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true })
  await ctx.close()
}
await browser.close()
if (problems.length) { console.error('SMOKE FAILED\n' + problems.join('\n')); process.exit(1) }
console.log(`smoke ok (screenshots in ${outDir})`)
