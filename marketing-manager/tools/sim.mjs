// Balance harness over src/engine.js (§14). Plays N seasons with simple policies and prints the balance report.
// Run: node marketing-manager/tools/sim.mjs [--seasons 2] [--runs 10] [--policy all|best|random|lazy] [--seed 1] [--fixture] [--json]
// Loads content/ like build.mjs (every *.json keyed by file stem); without content/ (or with --fixture) it plays inline fixtures.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const MM = require(join(here, '..', 'src', 'engine.js'))

const args = process.argv.slice(2)
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] != null && !args[i + 1].startsWith('--') ? args[i + 1] : def }
const flag = name => args.includes('--' + name)
const SEASONS = Number(opt('seasons', 2)), RUNS = Number(opt('runs', 10)), SEED = Number(opt('seed', 1)), POLICY = opt('policy', 'all')

// Content loading with build.mjs's stem rule; duplicate scenario ids throw inside MM.loadContent.
function loadContentDir(dir) {
  const out = {}
  for (const f of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) out[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  return out
}
// Inline fixture bank: enough wildcard and phase-tagged scenarios, moments and a gate deliverable to exercise every path.
function fixtureContent() {
  const opt = (id, q, esc, extra) => Object.assign({ id, label: id, quality: q, reversible: q >= 2, escalation: esc, tags: q === 0 ? ['shortcut'] : ['documentation'], biasTags: [], immediate: { 'eng.quality': q * 3 - 3, energy: -1 }, result: { pGood: 0.3 + q * 0.15, good: { text: 'g', effect: { confidence: 1 } }, bad: { text: 'b', effect: { confidence: -1 } } }, delayed: q === 0 ? [{ after: 3, prob: 0.6, failureMode: 'm1', text: 'x', effect: { 'eng.quality': -6, confidence: -3 } }] : [], feedback: { why: 'w', expert: 'e', bias: 'b', rule: 'r' } }, extra || {})
  const full = (id, i, extra) => Object.assign({ id, family: 'fam-' + (i % 6), bank: 'decision', journal: 'full', tier: [1, 2], difficulty: 1 + (i % 3), domain: ['audit', 'risk', 'compliance', 'decision'][i % 4], sector: ['*'], engType: ['*'], phase: ['*', 'fieldwork', 'planning', 'findings', 'report', 'present'][i % 6], skills: [{ id: MM.CRAFT[i % MM.CRAFT.length], w: 0.6 }, { id: MM.CRAFT[(i + 3) % MM.CRAFT.length], w: 0.4 }], rightEscalation: ['none', 'inform', 'escalate'][i % 3], followupWeeks: [2, 4, 8][i % 3], title: id, body: 'b',
    framings: [{ id: 'f1', text: 'f', quality: 3 }, { id: 'f2', text: 'f', quality: 1 }, { id: 'f3', text: 'f', quality: 0 }],
    info: [{ id: 'i1', kind: 'decisive', hours: 2, label: 'l', reveal: 'r', sets: 'k' + id }, { id: 'i2', kind: 'decisive', hours: 1, label: 'l', reveal: 'r', sets: 'k2' + id }, { id: 'i3', kind: 'noise', hours: 1, label: 'l', reveal: 'r' }, { id: 'i4', kind: 'trap', hours: 2, label: 'l', reveal: 'r', effect: { energy: -2 } }],
    failureModes: [{ id: 'm1', text: 'm', signal: 's', forOptions: ['a'] }, { id: 'm2', text: 'm', signal: 's', forOptions: ['b', 'c'] }, { id: 'm3', text: 'm', signal: 's', forOptions: ['d'] }],
    rationales: [{ id: 'r1', text: 'r', fits: ['a'] }, { id: 'r2', text: 'r', fits: ['b', 'c'] }, { id: 'r3', text: 'r', fits: ['d'] }],
    options: [opt('a', 0, 'none'), opt('b', 2, 'none', { needsInfo: 'k' + id }), opt('c', 3, ['none', 'inform', 'escalate'][i % 3], { gate: { info: ['k' + id] }, gateText: 'g' }), opt('d', 1, 'escalate')] }, extra || {})
  const lightS = (id, i) => ({ id, family: 'lfam-' + (i % 4), bank: 'decision', journal: 'light', tier: [1, 2], domain: 'control', sector: ['*'], engType: ['*'], phase: '*', skills: [{ id: MM.CRAFT[i % MM.CRAFT.length], w: 1 }], title: id, body: 'b', rightEscalation: 'none', options: [opt('x', 3, 'none'), opt('y', 1, 'none'), opt('z', 0, 'inform')].map(o => Object.assign(o, { feedback: { why: 'w', rule: 'r' } })) })
  const moment = (id, i) => ({ id, bank: 'moment', journal: 'light', tier: [1, 2], matchType: [['validation', 'ac'], ['present', 'ac'], ['inspection'], ['incident']][i % 4], sector: ['*'], engType: ['*'], title: id, body: 'b', rightEscalation: 'none', skills: [{ id: 'client', w: 1 }], ticker: { hostile: ['h', 'h', 'h'], neutral: ['n', 'n', 'n'], friendly: ['f', 'f', 'f'] }, options: [opt('g', 3, 'none'), opt('w', 1, 'none'), opt('p', 3, 'none', { gate: { prep: 60 } })].map(o => Object.assign(o, { feedback: { why: 'w', rule: 'r' } })) })
  const fulls = [], lights = [], moments = []
  for (let i = 0; i < 40; i++) fulls.push(full('full-' + i, i)); for (let i = 0; i < 24; i++) lights.push(lightS('light-' + i, i)); for (let i = 0; i < 16; i++) moments.push(moment('mo-' + i, i))
  return {
    'scenarios.full': fulls, 'scenarios.light': lights, moments,
    firms: [{ id: 'ofek', name: 'ofek', prestige: 45, minRep: 0, need: 1, hoursPenalty: 0, promoDelta: -5, trustMult: 1.5, boardObjectives: [{ metric: 'meanQ', target: 60 }] }, { id: 'goldstein', name: 'g', prestige: 90, minRep: 55, need: 0.6, hoursPenalty: 4, promoDelta: 0, trustMult: 1 }],
    cast: [{ id: 'naama', name: 'N', gender: 'f', role: 'mentor', firmId: 'ofek', trust0: 55 }, { id: 'uri', name: 'U', gender: 'm', role: 'manager', firmId: 'ofek', trust0: 45 }, { id: 'tom', name: 'T', gender: 'm', role: 'rival', firmId: 'ofek' }, { id: 'regulator', name: 'R', gender: 'm', role: 'regulator' }],
    stakeholders: [{ id: 'anat', name: 'A', gender: 'f', clientId: 'bank-alon' }, { id: 'alon-ia', name: 'M', gender: 'f', clientId: 'bank-alon' }, { id: 'yossi', name: 'Y', gender: 'm', clientId: 'muni-north' }],
    clients: [{ id: 'bank-alon', name: 'bank', sector: 'bank', isox: true, contacts: ['anat'], iaId: 'alon-ia' }, { id: 'muni-north', name: 'muni', sector: 'muni', contacts: ['yossi'] }],
    deliverables: [{ id: 'gate-t1', kind: 'gate', tier: 1, parts: [{ id: 'p1', kind: 'slots', weight: 100, slots: [1, 2, 3, 4, 5].map(i => ({ id: 's' + i, candidates: [{ id: 'a', pts: 20 }, { id: 'b', pts: 10 }, { id: 'c', pts: 5 }, { id: 'd', pts: 0 }] })) }] }],
    drills: MM.CRAFT.map(id => ({ id: 'd-' + id, skill: id, items: [1, 2, 3, 4, 5].map(i => ({ q: 'q', options: [{ text: 'a', correct: true }, { text: 'b' }, { text: 'c' }, { text: 'd' }] })) })),
    strings: {}
  }
}

const contentDir = join(here, '..', 'content')
const useContent = !flag('fixture') && existsSync(contentDir) && readdirSync(contentDir).some(f => f.endsWith('.json'))
const raw = useContent ? loadContentDir(contentDir) : fixtureContent()
const C = MM.loadContent(raw)
const source = useContent ? 'content/' : 'inline fixtures'

// ───────── closed-form energy assertions (§14) ─────────
const normal = MM.energyTrajectory({ work: 3, learn: 1, network: 1, unspent: 8, rooms: 1.35, matches: 0.3 }, 40, 80, 0)
const fixedPoint = normal[normal.length - 1]
const crunch = MM.energyTrajectory({ work: 5, rooms: 2, matches: 1, unspent: 0 }, 5, fixedPoint, 0)
const crunchBig = MM.energyTrajectory({ work: 5, rooms: 2, matches: 1, unspent: 0 }, 5, fixedPoint, 4)
const crunchWeek = crunch.findIndex(e => e < 30), crunchWeekBig = crunchBig.findIndex(e => e < 30)
const rested = MM.energyTrajectory({ work: 4, learn: 1, rooms: 1.35, matches: 0.3, rest: 1 / 3, unspent: 0 }, 40, 70, 0)
const failures = []
if (!(fixedPoint >= 60 && fixedPoint <= 72)) failures.push(`normal-week fixed point ${fixedPoint} outside [60, 72]`)
if (!(crunchWeek > 0 && crunchWeek <= 5)) failures.push(`crunch does not reach < 30 within 5 weeks (${crunch.join(', ')})`)

// ───────── play ─────────
const policies = POLICY === 'all' ? ['best', 'random', 'lazy'] : [POLICY]
const results = {}
for (const p of policies) results[p] = MM.sim({ seasons: SEASONS, policy: p, seed: SEED, runs: RUNS })

const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0
const r1 = v => Math.round(v * 10) / 10
// Mean confidence per quarter across runs (trajectory).
function confidenceTrajectory(runs) {
  const weeks = Math.max(...runs.map(r => r.confidence.length)); const q = []
  for (let w = 11; w < weeks; w += 12) q.push(r1(mean(runs.map(r => r.confidence[w]).filter(v => v != null))))
  return q
}
function energyQuartiles(runs) { const all = runs.flatMap(r => r.energy).sort((a, b) => a - b); const at = f => all[Math.min(all.length - 1, Math.floor(f * all.length))]; return { p10: at(0.1), p50: at(0.5), p90: at(0.9) } }
const rungName = ['exact', 'drop-phase', 'drop-sector', 'drop-engType', 'wildcard', 'tier-relax', 'cooldown-relax']

if (flag('json')) { console.log(JSON.stringify({ source, fixedPoint, crunch, crunchWeek, results }, null, 1)); process.exit(failures.length ? 1 : 0) }

console.log(`sim: ${source} — scenarios ${C.scenarios.length}, moments ${C.moments.length}, events ${C.events.length}, firms ${C.firms.length}, clients ${C.clients.length}, seasons templates ${C.seasons.length}`)
console.log(`play: ${SEASONS} season(s) × ${RUNS} run(s) per policy, seed ${SEED}\n`)
console.log('energy (closed form, §14):')
console.log(`  normal week fixed point: ${fixedPoint}  (target [60, 72])  trajectory from 80: ${normal.slice(0, 8).join(' → ')} …`)
console.log(`  crunch from ${fixedPoint}: ${crunch.join(' → ')}  → below 30 at week ${crunchWeek} (target ≤ 5); with hoursPenalty 4: week ${crunchWeekBig}`)
console.log(`  full 40h + one rest block every third week: settles at ${rested[rested.length - 1]}\n`)
for (const p of policies) {
  const R = results[p]; const s = R.summary; const runs = R.results
  const rungs = {}; for (const r of runs) for (const k of Object.keys(r.rungs)) rungs[k] = (rungs[k] || 0) + r.rungs[k]
  const totalDraws = Object.values(rungs).reduce((a, b) => a + b, 0)
  console.log(`policy «${p}»:`)
  console.log(`  energy mean ${s.energyMean}, min ${s.energyMin}, weeks < 30 per run ${s.weeksBelow30}, quartiles ${JSON.stringify(energyQuartiles(runs))}`)
  console.log(`  process mean P ${s.meanP}, season mean Q ${s.meanQ}, rooms/run ${s.rooms}, matches/run ${s.matches}, auto-resolved/run ${s.autoResolved}`)
  console.log(`  confidence by quarter: ${confidenceTrajectory(runs).join(' → ')}  (end mean ${r1(mean(runs.map(r => r.confidenceEnd)))})`)
  console.log(`  promoted ${s.promotedPct}%, dismissed ${s.dismissedPct}%, ended ${s.endedPct}%, final tier mean ${r1(mean(runs.map(r => r.tier)))}, rep mean ${r1(mean(runs.map(r => r.rep)))}`)
  console.log(`  repeat draws (same id twice in a season) per run: ${s.repeats}; draw rungs: ${Object.keys(rungs).sort().map(k => `${rungName[k] || k} ${rungs[k]} (${totalDraws ? Math.round(100 * rungs[k] / totalDraws) : 0}%)`).join(', ') || 'none'}`)
  console.log(`  season scores: ${runs.map(r => r.seasonScores.join('/')).join('  ')}`)
  if (p === 'best' && totalDraws && (rungs[5] || rungs[6])) console.log(`  warning: the tier-relax / cooldown-relax rungs were reached ${(rungs[5] || 0) + (rungs[6] || 0)} times — the bank is too thin for this tier`)
  if (p === 'best' && C.scenarios.length && s.repeats > 0) console.log(`  warning: ${s.repeats} repeat draws per season with the current bank`)
  console.log('')
}
if (!C.scenarios.length) console.log('note: no scenario banks loaded — the inbox only carried matches, events and follow-ups; curriculum metrics (P, repeats, rungs) are empty by design.\n')
if (failures.length) { console.error('SIM FAILED\n' + failures.map(f => '  ' + f).join('\n')); process.exit(1) }
console.log('sim ok')
