#!/usr/bin/env node
// Content validator for «מרקטינג מנג'ר: הדרך לשותפות» (DESIGN.md §7, §13, §15; CONTENT.md).
// No dependencies. Run: node tools/validate.mjs [--summary] [--unused] [--quiet]
//   exit 0: no errors (warnings allowed)      exit 1: at least one error
// build.mjs imports { validate } and aborts before bundling when errors.length > 0.
//
// Every error names a precise path, e.g. scenarios.compliance.json#bank-aml-kyc-sample-v1.options[2].feedback.rule
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')

/* ───────────────────────── closed vocabularies (DESIGN.md §4, §7, §13) ───────────────────────── */
const SKILLS = ['risk', 'controls', 'testing', 'evidence', 'writing', 'reg', 'interview', 'client', 'present', 'prio', 'framing', 'gather', 'judgment', 'premortem', 'escalation', 'memo', 'bd', 'positioning', 'datastory']
const SECTORS = ['bank', 'insurer', 'provident', 'invest', 'ministry', 'muni', 'govco', 'statutory']
const ENG_TYPES = ['audit', 'compliance', 'risk-survey', 'control-review', 'policy-writing', 'isox']
const PHASES = ['planning', 'fieldwork', 'findings', 'report', 'present']
const PHASES_ALL = PHASES.concat('closed')
const DOMAINS = ['compliance', 'risk', 'control', 'policy', 'decision', 'strategy', 'marketing', 'audit'] // `audit` = legacy alias of `control` (CONTENT.md §2)
const ESCALATIONS = ['none', 'inform', 'escalate']
const INFO_KINDS = ['decisive', 'noise', 'trap']
const JOURNALS = ['full', 'light', 'none']
const FOLLOWUP_LADDER = [2, 4, 8]
const RUBRIC_ITEMS = ['framing', 'info', 'noise', 'option', 'premortem', 'reversibility', 'escalation', 'memo', 'followup']
const ROLE_PREFIXES = ['contact', 'manager', 'mentor', 'regulator', 'ia', 'rival', 'partner']
const PLACEHOLDERS = ['client', 'contact', 'manager', 'mentor', 'regulator', 'firm', 'player', 'ia', 'rival', 'partner']
const REQUIRES_KEYS = ['flags', 'notFlags', 'minTrust', 'season', 'week', 'tier']
const LINE_BY_TYPE = { 'policy-writing': 2, 'risk-survey': 2, audit: 3, isox: 3, 'control-review': 3 } // compliance: either (§8)
const FIRM_KEYS = ['id', 'name', 'prestige', 'pay', 'minRep', 'need', 'hoursPenalty', 'promoDelta', 'trustMult', 'incidentRate', 'tagMult', 'infoCostMult', 'skillGainMult', 'repMult', 'philosophy', 'sectors', 'boardObjectives']
const BOARD_METRICS = ['meanQ', 'meanP', 'confidence', 'rep', 'onTime', 'findings']
const PART_KINDS = ['slots', 'ratings', 'order', 'match']
const CAPS = { 'eng.quality': 15, confidence: 10, rep: 8, 'rep.regulator': 8, integrity: 15 }
const DSL = /^(energy|confidence|rep|rep\.regulator|integrity|eng\.quality|eng\.work|eng\.deadline|trust\.[\w-]+|skill\.[\w-]+|flag\.[\w.-]+)$/
const SLASH = /[\u05D0-\u05EA]\/[\u05D0-\u05EA]/
const WEEKS = 48
const DRAW_BUDGET = 59 // §13: ≈ 51 curriculum draws + ≤ 8 spaced-repetition injections per season
const PATTERN_IDS = ['late-escalation-by-domain', 'early-escalation', 'info-skipped-decisive-missed', 'irreversible-under-pressure', 'trap-buyer', 'premortem-miss', 'followup-ignored', 'noise-under-low-energy', 'same-family-regression', 'crunch-dip', 'good-process-bad-luck', 'bad-process-good-luck']
// §15 "Required keys (listed in CONTENT.md, ≈ 40)"
const REQUIRED_STRINGS = ['ui.endWeek', 'ui.continue', 'ui.hours', 'ui.energyCost', 'inbox.type.decision', 'inbox.type.moment', 'inbox.type.consequence', 'inbox.type.followup', 'inbox.type.news', 'inbox.type.offer', 'friday.line', 'luck.good', 'luck.bad', 'luck.goodProcessBadOutcome', 'luck.badProcessGoodOutcome', 'gate.info', 'gate.prep', 'gate.trust', 'shortcut.option', 'match.autoResolved', 'match.prep', 'match.break', 'overdue', 'skill.decayed', 'repeat.label', 'scout.ahead', 'holiday.greeting', 'quarter.talk', 'mentor.note', 'followup.question', 'content.endsHere', 'toast.staleContent', 'leave.forced', 'dismissal.confidence', 'dismissal.materialFailure', 'ending.ethics', 'ending.summit', 'ending.otherSide', 'ending.careerOver', 'ending.v1Milestone', 'award.analystOfYear', 'award.bestMemo', 'award.escalation', 'award.finding', 'award.wolf']
  .concat([1, 2, 3, 4, 5].map(i => `tier.${i}.title`), PHASES_ALL.map(p => `phase.${p}`), [1, 2, 3, 4].map(i => `band.${i}`), [1, 2, 3, 4].map(i => `integrity.${i}`), PATTERN_IDS.map(p => `pattern.${p}`), SKILLS.map(s => `skill.${s}`))

/* ───────────────────────── small helpers ───────────────────────── */
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v)
const isStr = v => typeof v === 'string'
const isNum = v => typeof v === 'number' && Number.isFinite(v)
const isInt = v => Number.isInteger(v)
const listOf = v => v == null ? [] : Array.isArray(v) ? v : [v]
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length
const quote = s => '«' + String(s).replace(/\s+/g, ' ').slice(0, 60) + (String(s).length > 60 ? '…' : '') + '»'
const inRange = (v, lo, hi) => isNum(v) && v >= lo && v <= hi

// Binomial upper bound: largest p with P(X ≤ dev | n, p) ≥ 1 − conf/100, in percent.
function binomCdf(n, k, p) { let s = 0; for (let i = 0; i <= k; i++) s += Math.exp(logChoose(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p)); return s }
function logChoose(n, k) { let s = 0; for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s }
export function binomialUpper(n, dev, conf) {
  const alpha = 1 - conf / 100; let lo = 0, hi = 1
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (mid <= 0 || mid >= 1) break; if (binomCdf(n, dev, mid) >= alpha) lo = mid; else hi = mid }
  return lo * 100
}

/* ───────────────────────── validator ───────────────────────── */
export function validate(opts = {}) {
  const contentDir = opts.contentDir || join(ROOT, 'content')
  const srcDir = opts.srcDir || join(ROOT, 'src')
  const errors = [], warnings = []
  const err = (path, msg) => errors.push(`${path}: ${msg}`)
  const warn = (path, msg) => warnings.push(`${path}: ${msg}`)

  /* ── load every bank ── */
  const banks = {}
  let files = []
  try { files = readdirSync(contentDir).filter(f => f.endsWith('.json')).sort() } catch (e) { err('content/', `cannot read content directory: ${e.message}`) }
  for (const f of files) {
    try { banks[f] = JSON.parse(readFileSync(join(contentDir, f), 'utf8')) } catch (e) { err(f, `invalid JSON: ${e.message}`) }
  }
  const bank = name => banks[name + '.json']
  const requireBank = (name, shape) => {
    const b = bank(name)
    if (b === undefined) { if (!errors.some(e => e.startsWith(name + '.json:'))) err(name + '.json', 'missing reference bank'); return null }
    if (shape === 'array' && !Array.isArray(b)) { err(name + '.json', 'expected a top-level array'); return null }
    if (shape === 'object' && !isObj(b)) { err(name + '.json', 'expected a top-level object'); return null }
    return b
  }

  const tagsJ = requireBank('tags', 'object')
  const lessonsJ = requireBank('lessons', 'object')
  const baseRatesJ = requireBank('baseRates', 'array')
  const scalesJ = requireBank('ratingScales', 'object')
  const matchTypesJ = requireBank('matchTypes', 'array')
  const awardsJ = requireBank('awards', 'array')
  const firmsJ = requireBank('firms', 'array')
  const clientsJ = requireBank('clients', 'array')
  const stakeholdersJ = requireBank('stakeholders', 'array')
  const castJ = requireBank('cast', 'array')
  const seasonsJ = requireBank('seasons', 'array')
  const eventsJ = requireBank('events', 'array')
  const drillsJ = requireBank('drills', 'array')
  const deliverablesJ = requireBank('deliverables', 'array')
  const stringsJ = requireBank('strings', 'object')

  /* ── reference id sets ── */
  const ids = arr => new Set(listOf(arr).map(x => x && x.id).filter(isStr))
  const TAGS = ids(tagsJ && tagsJ.tags), BIASES = ids(tagsJ && tagsJ.biases)
  const LESSONS = ids(lessonsJ && lessonsJ.lessons), FRAMEWORKS = listOf(lessonsJ && lessonsJ.frameworks)
  const BASE_RATES = new Map(listOf(baseRatesJ).filter(isObj).map(r => [r.id, r]))
  const SCALES = ids(scalesJ && scalesJ.scales), BY_ENG = (scalesJ && isObj(scalesJ.byEngType)) ? scalesJ.byEngType : {}
  const MATCH_TYPES = ids(matchTypesJ)
  const CAST = new Map(listOf(castJ).filter(isObj).map(c => [c.id, c]))
  const STAKE = new Map(listOf(stakeholdersJ).filter(isObj).map(s => [s.id, s]))
  const CLIENTS = new Map(listOf(clientsJ).filter(isObj).map(c => [c.id, c]))
  const FIRMS = ids(firmsJ)
  const PEOPLE = new Set([...CAST.keys(), ...STAKE.keys()])
  const STRINGS = isObj(stringsJ) ? stringsJ : {}

  // frameworks matching rule (CONTENT.md §7.1): id, exact he, any alias, or he + " — topic"
  const fwKeys = new Map()
  for (const f of FRAMEWORKS) { if (!isObj(f)) continue; for (const k of [f.id, f.he, ...listOf(f.aliases)]) if (isStr(k)) fwKeys.set(k.trim(), f.id) }
  const resolveFramework = s => {
    if (!isStr(s)) return null
    const t = s.trim(); if (fwKeys.has(t)) return fwKeys.get(t)
    const m = t.match(/^(.+?)\s+[—–-]\s+.+$/)
    if (m) for (const f of FRAMEWORKS) if (isObj(f) && isStr(f.he) && f.he.trim() === m[1].trim()) return f.id
    return null
  }

  /* ── text checks: slash forms, gender tokens, placeholders ── */
  function checkText(str, path, o = {}) {
    if (!isStr(str)) return
    if (SLASH.test(str)) err(path, `slash form forbidden ${quote(str.match(/\S*[\u05D0-\u05EA]\/[\u05D0-\u05EA]\S*/)[0])}`)
    let depth = 0, start = -1
    for (let i = 0; i < str.length; i++) {
      const c = str[i]
      if (c === '{') { depth++; if (depth > 1) { err(path, `nested braces in ${quote(str)}`); return } start = i }
      else if (c === '}') {
        if (depth === 0) { err(path, `unbalanced braces (stray "}") in ${quote(str)}`); return }
        depth--; checkToken(str.slice(start + 1, i), path, str, o)
      } else if (c === '|' && depth === 0) { warn(path, `"|" outside a token in ${quote(str)}`) }
    }
    if (depth !== 0) err(path, `unbalanced braces (unclosed "{") in ${quote(str)}`)
  }
  function checkToken(inner, path, str, o) {
    const bar = inner.indexOf('|')
    if (bar < 0) { // placeholder or template param
      const name = inner.trim()
      if (!name) { err(path, `empty braces in ${quote(str)}`); return }
      if (o.placeholders && !PLACEHOLDERS.includes(name) && !PEOPLE.has(name)) warn(path, `unknown placeholder {${name}}`)
      return
    }
    let prefix = null, body = inner
    const colon = inner.indexOf(':')
    if (colon > 0 && colon < bar) { prefix = inner.slice(0, colon).trim(); body = inner.slice(colon + 1) }
    const alts = body.split('|')
    if (alts.length !== 2) err(path, `token {${inner}} must have exactly two alternatives (masc|fem)`)
    else if (alts.some(a => a.trim() === '')) err(path, `token {${inner}} has an empty alternative`)
    if (prefix !== null && !ROLE_PREFIXES.includes(prefix) && !PEOPLE.has(prefix)) err(path, `unknown token prefix "${prefix}" in {${inner}} (contact | manager | mentor | regulator | cast id)`)
  }
  // Walk every string in a value (used for whole-file slash/token sweeps).
  function walkText(v, path, o) {
    if (isStr(v)) checkText(v, path, o)
    else if (Array.isArray(v)) v.forEach((x, i) => walkText(x, `${path}[${i}]`, o))
    else if (isObj(v)) for (const k of Object.keys(v)) walkText(v[k], path ? `${path}.${k}` : k, o)
  }

  /* ── effect DSL ── */
  function checkEffect(eff, path, o = {}) {
    const out = {}
    if (eff === undefined) { if (o.required) err(path, 'missing effect object'); return out }
    if (!isObj(eff)) { err(path, 'effect must be an object'); return out }
    for (const k of Object.keys(eff)) {
      const v = eff[k]
      if (!DSL.test(k)) { err(`${path}.${k}`, 'unknown effect key (not in the DSL)'); continue }
      if (!isNum(v)) { err(`${path}.${k}`, 'effect value must be a number'); continue }
      if (k.startsWith('flag.')) { if (v !== 0 && v !== 1) err(`${path}.${k}`, 'flag value must be 1 (set) or 0 (clear)'); continue }
      if (k.startsWith('skill.')) { const id = k.slice(6); if (!SKILLS.includes(id)) err(`${path}.${k}`, `unknown skill "${id}"`); if (Math.abs(v) > 0.3) err(`${path}.${k}`, `skill nudge ${v} exceeds ±0.3`); continue }
      if (k.startsWith('trust.')) { const who = k.slice(6); if (!['contact', 'manager', 'mentor'].includes(who) && !PEOPLE.has(who)) warn(`${path}.${k}`, `trust target "${who}" is not contact/manager/mentor or a known cast/contact id`) }
      if (CAPS[k] != null && Math.abs(v) > CAPS[k]) err(`${path}.${k}`, `${v} exceeds the per-decision cap ±${CAPS[k]}`)
      out[k] = (out[k] || 0) + v
    }
    return out
  }
  function checkCombined(a, b, path) {
    for (const k of Object.keys(CAPS)) { const s = (a[k] || 0) + (b[k] || 0); if (Math.abs(s) > CAPS[k]) warn(path, `immediate + result ${k} = ${s} exceeds the per-decision cap ±${CAPS[k]} (the engine will clip it)`) }
  }

  /* ── shared field checks ── */
  function checkTier(v, path) {
    const t = listOf(v)
    if (v === undefined) { err(path, 'missing tier'); return [] }
    if (!t.length) err(path, 'tier must list at least one tier')
    for (const x of t) if (!isInt(x) || x < 1 || x > 5) err(path, `tier value ${JSON.stringify(x)} must be an integer 1–5`)
    return t
  }
  function checkEnum(v, list, path, label, o = {}) {
    if (v === undefined) { if (o.required) err(path, `missing ${label}`); return }
    const vals = listOf(v)
    if (o.scalar && Array.isArray(v)) err(path, `${label} must be a single value`)
    if (!vals.length) err(path, `${label} must not be empty`)
    for (const x of vals) if (!(o.wild && x === '*') && !list.includes(x)) err(path, `unknown ${label} "${x}"`)
  }
  function checkRequires(r, path) {
    if (r === undefined) return
    if (!isObj(r)) { err(path, 'requires must be an object'); return }
    for (const k of Object.keys(r)) if (!REQUIRES_KEYS.includes(k)) err(`${path}.${k}`, 'unknown requires key (flags | notFlags | minTrust | season | week | tier)')
    for (const k of ['flags', 'notFlags']) if (r[k] !== undefined && !(Array.isArray(r[k]) && r[k].every(isStr))) err(`${path}.${k}`, 'must be an array of flag names')
    if (r.minTrust !== undefined) {
      if (!isObj(r.minTrust)) err(`${path}.minTrust`, 'must be an object')
      else for (const who of Object.keys(r.minTrust)) { if (!['contact', 'manager', 'mentor'].includes(who) && !PEOPLE.has(who)) err(`${path}.minTrust.${who}`, 'unknown person (contact | manager | mentor | cast id)'); if (!inRange(r.minTrust[who], 0, 100)) err(`${path}.minTrust.${who}`, 'must be 0–100') }
    }
    if (r.season !== undefined && r.season !== null && !(isInt(r.season) && r.season >= 1)) err(`${path}.season`, 'must be a positive integer or null')
    if (r.week !== undefined && !(Array.isArray(r.week) && r.week.length === 2 && r.week.every(w => isInt(w) && w >= 1 && w <= WEEKS) && r.week[0] <= r.week[1])) err(`${path}.week`, `must be [from, to] within 1–${WEEKS}`)
    if (r.tier !== undefined && !(isInt(r.tier) && r.tier >= 1 && r.tier <= 5)) err(`${path}.tier`, 'must be an integer 1–5')
  }
  function checkSkills(sk, path, o = {}) {
    if (sk === undefined) { if (o.required) err(path, 'missing skills'); return }
    if (!Array.isArray(sk) || !sk.length) { err(path, 'skills must be a non-empty array of {id, w}'); return }
    let sum = 0
    sk.forEach((s, i) => { if (!isObj(s)) { err(`${path}[${i}]`, 'must be {id, w}'); return } if (!SKILLS.includes(s.id)) err(`${path}[${i}].id`, `unknown skill "${s.id}"`); if (!inRange(s.w, 0, 1)) err(`${path}[${i}].w`, 'must be 0–1'); else sum += s.w })
    if (Math.abs(sum - 1) > 0.02) err(path, `skill weights sum to ${+sum.toFixed(3)}, expected ≈ 1`)
  }
  function checkScale(s, path, engTypes) {
    if (s.scale !== undefined) {
      if (!isStr(s.scale) || !SCALES.has(s.scale)) err(`${path}.scale`, `unknown scale "${s.scale}"`)
      else if (engTypes.includes('*')) err(`${path}.scale`, 'engType "*" requires scaleByEngType instead of scale')
      else for (const et of engTypes) if (BY_ENG[et] && BY_ENG[et] !== s.scale) err(`${path}.scale`, `scale "${s.scale}" does not match engType "${et}" (expected "${BY_ENG[et]}")`)
    }
    if (s.scaleByEngType !== undefined) {
      if (!isObj(s.scaleByEngType)) err(`${path}.scaleByEngType`, 'must be an object { engType: scaleId }')
      else for (const et of Object.keys(s.scaleByEngType)) { const sc = s.scaleByEngType[et]; if (!ENG_TYPES.includes(et)) err(`${path}.scaleByEngType.${et}`, 'unknown engType'); if (!SCALES.has(sc)) err(`${path}.scaleByEngType.${et}`, `unknown scale "${sc}"`); else if (BY_ENG[et] && BY_ENG[et] !== sc) err(`${path}.scaleByEngType.${et}`, `scale "${sc}" does not match engType "${et}" (expected "${BY_ENG[et]}")`) }
    }
  }

  /* ── scenario / moment item ── */
  const seenIds = new Map() // id → file (scenarios.* + moments)
  const stats = { files: {}, tier: {}, domain: {}, phase: {}, family: new Set(), wild: 0, total: 0, tier1Ids: new Set(), tier1ByPhase: {}, fallback: 0, fullRooms: 0, light: 0, moments: 0, momentsByType: {}, momentsTier1: 0, events: 0 }

  function checkOption(opt, p, s, infoSets, o) {
    if (!isObj(opt)) { err(p, 'option must be an object'); return null }
    if (!isStr(opt.id)) err(`${p}.id`, 'missing option id')
    if (!isStr(opt.label)) err(`${p}.label`, 'missing label')
    else { checkText(opt.label, `${p}.label`, { placeholders: true }); if (words(opt.label) > 20) warn(`${p}.label`, `label is ${words(opt.label)} words; keep it to one line`) }
    if (!(isInt(opt.quality) && opt.quality >= 0 && opt.quality <= 3)) err(`${p}.quality`, 'quality must be an integer 0–3')
    if (o.full && typeof opt.reversible !== 'boolean') err(`${p}.reversible`, 'required (true|false) in a full room')
    else if (opt.reversible !== undefined && typeof opt.reversible !== 'boolean') err(`${p}.reversible`, 'must be a boolean')
    if (o.full && opt.escalation === undefined) err(`${p}.escalation`, 'required in a full room')
    else if (opt.escalation !== undefined && !ESCALATIONS.includes(opt.escalation)) err(`${p}.escalation`, `must be one of ${ESCALATIONS.join(' | ')}`)
    if ('setFlag' in opt) err(`${p}.setFlag`, 'setFlag is not a key; use flag.<name> in the effect DSL')
    // tags
    if (opt.tags !== undefined) { if (!Array.isArray(opt.tags)) err(`${p}.tags`, 'must be an array'); else opt.tags.forEach((t, i) => { if (!TAGS.has(t)) err(`${p}.tags[${i}]`, `unknown tag "${t}"`) }) }
    if (opt.biasTags !== undefined) { if (!Array.isArray(opt.biasTags)) err(`${p}.biasTags`, 'must be an array'); else opt.biasTags.forEach((t, i) => { if (!BIASES.has(t)) err(`${p}.biasTags[${i}]`, `unknown biasTag "${t}"`) }) }
    // gates
    if (opt.needsInfo !== undefined && opt.gate !== undefined) err(p, 'needsInfo and gate are mutually exclusive')
    if (opt.needsInfo !== undefined) { const l = listOf(opt.needsInfo); if (!l.length || !l.every(isStr)) err(`${p}.needsInfo`, 'must be a flag name or an array of flag names'); else for (const f of l) if (!infoSets.has(f)) err(`${p}.needsInfo`, `"${f}" is not set by any info action (info[].sets)`) }
    if (opt.gate !== undefined) {
      if (!isObj(opt.gate)) err(`${p}.gate`, 'must be an object { info?, prep?, trust? }')
      else {
        for (const k of Object.keys(opt.gate)) if (!['info', 'prep', 'trust'].includes(k)) err(`${p}.gate.${k}`, 'unknown gate key (info | prep | trust)')
        if (opt.gate.info !== undefined) { const l = listOf(opt.gate.info); if (!l.length || !l.every(isStr)) err(`${p}.gate.info`, 'must be a flag name or an array'); else for (const f of l) if (!infoSets.has(f)) err(`${p}.gate.info`, `"${f}" is not set by any info action (info[].sets)`) }
        if (opt.gate.prep !== undefined) { if (!inRange(opt.gate.prep, 0, 100)) err(`${p}.gate.prep`, 'must be 0–100'); if (!o.moment) warn(`${p}.gate.prep`, 'prep gates are meaningful only in moments') }
        if (opt.gate.trust !== undefined) { const g = opt.gate.trust; if (!isObj(g) || !isStr(g.id) || !inRange(g.min, 0, 100)) err(`${p}.gate.trust`, 'must be { id, min: 0–100 }'); else if (!['contact', 'manager', 'mentor'].includes(g.id) && !PEOPLE.has(g.id)) err(`${p}.gate.trust.id`, `unknown person "${g.id}"`) }
        if (!Object.keys(opt.gate).length) err(`${p}.gate`, 'empty gate')
      }
    }
    if (opt.gateText !== undefined) { if (!isStr(opt.gateText)) err(`${p}.gateText`, 'must be a string'); else checkText(opt.gateText, `${p}.gateText`, { placeholders: true }); if (opt.gate === undefined && opt.needsInfo === undefined) warn(`${p}.gateText`, 'gateText without a gate') }
    // effects
    const imm = opt.immediate === undefined ? (err(`${p}.immediate`, 'missing immediate effect object (may be {})'), {}) : checkEffect(opt.immediate, `${p}.immediate`)
    if (!isObj(opt.result)) err(`${p}.result`, 'missing result { pGood, good, bad }')
    else {
      if (!inRange(opt.result.pGood, 0, 1)) err(`${p}.result.pGood`, 'must be 0–1')
      for (const side of ['good', 'bad']) {
        const r = opt.result[side]
        if (!isObj(r)) { err(`${p}.result.${side}`, 'missing { text, effect }'); continue }
        if (!isStr(r.text)) err(`${p}.result.${side}.text`, 'missing text'); else checkText(r.text, `${p}.result.${side}.text`, { placeholders: true })
        const re = checkEffect(r.effect, `${p}.result.${side}.effect`, { required: true })
        checkCombined(imm, re, `${p}.result.${side}.effect`)
        if ('flag' in r) err(`${p}.result.${side}.flag`, 'bare flag is not allowed; use flag.<name> inside effect')
      }
    }
    if (opt.delayed !== undefined) {
      if (!Array.isArray(opt.delayed)) err(`${p}.delayed`, 'must be an array')
      else opt.delayed.forEach((d, i) => {
        const dp = `${p}.delayed[${i}]`
        if (!isObj(d)) { err(dp, 'must be an object'); return }
        if (!(isInt(d.after) && d.after >= 1)) err(`${dp}.after`, 'must be a positive integer (weeks)')
        if (!inRange(d.prob, 0, 1)) err(`${dp}.prob`, 'must be 0–1')
        if (!isStr(d.text)) err(`${dp}.text`, 'missing text'); else checkText(d.text, `${dp}.text`, { placeholders: true })
        checkEffect(d.effect, `${dp}.effect`, { required: true })
        if ('flag' in d) err(`${dp}.flag`, 'bare flag on a consequence is not allowed; use flag.<name> inside effect')
        if ('setFlag' in d) err(`${dp}.setFlag`, 'setFlag is not a key; use flag.<name> inside effect')
        if (d.failureMode !== undefined && !o.failureModes.has(d.failureMode)) err(`${dp}.failureMode`, `unknown failure mode "${d.failureMode}"`)
        if (d.recurring !== undefined && !(isObj(d.recurring) && isInt(d.recurring.every) && d.recurring.every >= 1 && isInt(d.recurring.times) && d.recurring.times >= 1)) err(`${dp}.recurring`, 'must be { every: int ≥ 1, times: int ≥ 1 }')
      })
    }
    // feedback
    const fb = opt.feedback
    if (!isObj(fb)) err(`${p}.feedback`, o.full ? 'missing feedback { why, expert, bias, rule }' : 'missing feedback { why, rule }')
    else {
      const need = o.full ? ['why', 'expert', 'bias', 'rule'] : ['why', 'rule']
      for (const k of need) if (!isStr(fb[k]) || !fb[k].trim()) err(`${p}.feedback.${k}`, 'required')
      for (const k of Object.keys(fb)) if (isStr(fb[k])) checkText(fb[k], `${p}.feedback.${k}`, { placeholders: true })
      if (isStr(fb.rule) && words(fb.rule) > 15) err(`${p}.feedback.rule`, `rule is ${words(fb.rule)} words (max 15)`)
    }
    return opt
  }

  function checkScenario(s, file, idx, kind) {
    const base = `${file}#${isStr(s.id) ? s.id : `[${idx}]`}`
    if (!isObj(s)) { err(base, 'item must be an object'); return }
    if (!isStr(s.id) || !/^[a-z0-9][a-z0-9-]*$/.test(s.id)) err(`${base}.id`, 'id must be kebab-case ASCII')
    else if (seenIds.has(s.id)) err(`${base}.id`, `duplicate id (also in ${seenIds.get(s.id)})`); else seenIds.set(s.id, file)
    const isMoment = kind === 'moment'
    const expectBank = isMoment ? 'moment' : 'decision'
    if (s.bank !== expectBank) err(`${base}.bank`, `must be "${expectBank}" in ${file}`)
    const journal = s.journal === undefined ? (isMoment ? 'light' : undefined) : s.journal
    if (journal === undefined) err(`${base}.journal`, 'missing journal weight (full | light)')
    else if (!JOURNALS.includes(journal)) err(`${base}.journal`, `must be one of ${JOURNALS.join(' | ')}`)
    else if (journal === 'none') err(`${base}.journal`, 'journal "none" items belong in events.json')
    if (isMoment && journal === 'full') err(`${base}.journal`, 'moments are light scenarios')
    const full = journal === 'full'
    for (const k of ['setFlag']) if (k in s) err(`${base}.${k}`, 'setFlag is not a key; use flag.<name> in the effect DSL')

    const tiers = checkTier(s.tier, `${base}.tier`)
    if (!isStr(s.title) || !s.title.trim()) err(`${base}.title`, 'missing title'); else checkText(s.title, `${base}.title`, { placeholders: true })
    if (!isStr(s.body) || !s.body.trim()) err(`${base}.body`, 'missing body')
    else { checkText(s.body, `${base}.body`, { placeholders: true }); if (words(s.body) > 110) err(`${base}.body`, `body is ${words(s.body)} words (max 110)`) }
    if (!isStr(s.family)) err(`${base}.family`, 'missing family')
    checkEnum(s.domain, DOMAINS, `${base}.domain`, 'domain', { required: true, scalar: true })
    if (s.domain === 'audit') warn(`${base}.domain`, '"audit" is the legacy alias; new scenarios use "control"')
    checkEnum(s.sector, SECTORS, `${base}.sector`, 'sector', { wild: true })
    checkEnum(s.engType, ENG_TYPES, `${base}.engType`, 'engType', { wild: true })
    checkEnum(s.phase, PHASES, `${base}.phase`, 'phase', { wild: true, scalar: true })
    if (s.difficulty !== undefined && !(isInt(s.difficulty) && s.difficulty >= 1 && s.difficulty <= 3)) err(`${base}.difficulty`, 'must be an integer 1–3')
    if (s.cooldown !== undefined && !(isInt(s.cooldown) && s.cooldown >= 0)) err(`${base}.cooldown`, 'must be a non-negative integer (weeks)')
    checkRequires(s.requires, `${base}.requires`)
    checkSkills(s.skills, `${base}.skills`, { required: full })
    if (s.lesson === undefined) { if (full) err(`${base}.lesson`, 'required in a full room') }
    else if (!LESSONS.has(s.lesson)) err(`${base}.lesson`, `unknown lesson "${s.lesson}"`)
    if (s.frameworks !== undefined) { if (!Array.isArray(s.frameworks)) err(`${base}.frameworks`, 'must be an array of strings'); else s.frameworks.forEach((f, i) => { if (!resolveFramework(f)) err(`${base}.frameworks[${i}]`, `${quote(f)} matches no framework (id, he, alias, or "he — topic") in lessons.json`) }) }
    if (s.baseRate !== undefined && !BASE_RATES.has(s.baseRate)) err(`${base}.baseRate`, `unknown base rate "${s.baseRate}"`)
    if (s.rightEscalation !== undefined && !ESCALATIONS.includes(s.rightEscalation)) err(`${base}.rightEscalation`, `must be one of ${ESCALATIONS.join(' | ')}`)
    if (full && s.rightEscalation === undefined) err(`${base}.rightEscalation`, 'required in a full room')
    if (s.followupWeeks !== undefined && !FOLLOWUP_LADDER.includes(s.followupWeeks)) err(`${base}.followupWeeks`, 'must be 2, 4 or 8')
    if (s.rubric !== undefined) { if (!isObj(s.rubric)) err(`${base}.rubric`, 'must be an object'); else for (const k of Object.keys(s.rubric)) { if (!RUBRIC_ITEMS.includes(k)) err(`${base}.rubric.${k}`, 'unknown rubric item'); else if (!inRange(s.rubric[k], 0, 100)) err(`${base}.rubric.${k}`, 'weight must be 0–100') } }
    for (const k of ['hint', 'pushback', 'colleagueHint']) if (s[k] !== undefined) { if (!isStr(s[k])) err(`${base}.${k}`, 'must be a string'); else checkText(s[k], `${base}.${k}`, { placeholders: true }) }
    if (s.attachments !== undefined) { if (!Array.isArray(s.attachments)) err(`${base}.attachments`, 'must be an array'); else s.attachments.forEach((a, i) => { if (!isObj(a) || !isStr(a.label) || !isStr(a.text)) err(`${base}.attachments[${i}]`, 'must be { label, text }'); else { checkText(a.label, `${base}.attachments[${i}].label`, { placeholders: true }); checkText(a.text, `${base}.attachments[${i}].text`, { placeholders: true }) } }) }
    if ('tags' in s || 'biasTags' in s) err(base, 'tags / biasTags belong on options, never on the scenario')
    const engTypes = listOf(s.engType).length ? listOf(s.engType) : ['*']
    checkScale(s, base, engTypes)

    // framings
    if (s.framings !== undefined || full) {
      if (!Array.isArray(s.framings) || !s.framings.length) err(`${base}.framings`, full ? 'required: 3–4 framings' : 'must be a non-empty array')
      else {
        if (s.framings.length < 3 || s.framings.length > 4) warn(`${base}.framings`, `${s.framings.length} framings (expected 3–4)`)
        const fids = new Set()
        s.framings.forEach((f, i) => { const fp = `${base}.framings[${i}]`; if (!isObj(f)) { err(fp, 'must be { id, text, quality }'); return } if (!isStr(f.id)) err(`${fp}.id`, 'missing id'); else if (fids.has(f.id)) err(`${fp}.id`, 'duplicate framing id'); else fids.add(f.id); if (!isStr(f.text)) err(`${fp}.text`, 'missing text'); else checkText(f.text, `${fp}.text`, { placeholders: true }); if (!(isInt(f.quality) && f.quality >= 0 && f.quality <= 3)) err(`${fp}.quality`, 'quality must be an integer 0–3') })
        if (full && !s.framings.some(f => isObj(f) && f.quality === 3)) warn(`${base}.framings`, 'no framing with quality 3')
      }
    }
    // info
    const infoSets = new Set()
    let decisive = 0
    if (s.info !== undefined || full) {
      if (!Array.isArray(s.info)) err(`${base}.info`, full ? 'required: 3–6 costed actions' : 'must be an array')
      else {
        if (full && (s.info.length < 3 || s.info.length > 6)) warn(`${base}.info`, `${s.info.length} info actions (expected 3–6)`)
        const iids = new Set()
        s.info.forEach((a, i) => {
          const ip = `${base}.info[${i}]`
          if (!isObj(a)) { err(ip, 'must be an object'); return }
          if (!isStr(a.id)) err(`${ip}.id`, 'missing id'); else if (iids.has(a.id)) err(`${ip}.id`, 'duplicate info id'); else iids.add(a.id)
          if (!INFO_KINDS.includes(a.kind)) err(`${ip}.kind`, `must be one of ${INFO_KINDS.join(' | ')}`)
          if (!(isInt(a.hours) && a.hours >= 1 && a.hours <= 6)) err(`${ip}.hours`, 'hours must be an integer 1–6')
          if (!isStr(a.label)) err(`${ip}.label`, 'missing label'); else checkText(a.label, `${ip}.label`, { placeholders: true })
          if (!isStr(a.reveal)) err(`${ip}.reveal`, 'missing reveal'); else checkText(a.reveal, `${ip}.reveal`, { placeholders: true })
          if (a.sets !== undefined) { if (!isStr(a.sets)) err(`${ip}.sets`, 'must be a flag name'); else infoSets.add(a.sets) }
          if (a.kind === 'decisive') { decisive++; if (a.sets === undefined) err(`${ip}.sets`, 'a decisive action must set a flag (sets)') }
          if (a.effect !== undefined) checkEffect(a.effect, `${ip}.effect`)
          if ('setFlag' in a) err(`${ip}.setFlag`, 'setFlag is not a key')
        })
        if (full && decisive === 0) warn(`${base}.info`, 'no decisive info action')
      }
    }
    // failure modes / rationales
    const optIds = new Set(listOf(s.options).filter(isObj).map(o => o.id).filter(isStr))
    const fmIds = new Set()
    if (s.failureModes !== undefined || full) {
      if (!Array.isArray(s.failureModes) || !s.failureModes.length) err(`${base}.failureModes`, full ? 'required: 3–5 failure modes' : 'must be a non-empty array')
      else {
        if (s.failureModes.length < 3 || s.failureModes.length > 5) warn(`${base}.failureModes`, `${s.failureModes.length} failure modes (expected 3–5)`)
        s.failureModes.forEach((m, i) => { const mp = `${base}.failureModes[${i}]`; if (!isObj(m)) { err(mp, 'must be { id, text, signal, forOptions }'); return } if (!isStr(m.id)) err(`${mp}.id`, 'missing id'); else if (fmIds.has(m.id)) err(`${mp}.id`, 'duplicate failure mode id'); else fmIds.add(m.id); for (const k of ['text', 'signal']) { if (!isStr(m[k])) err(`${mp}.${k}`, 'missing'); else checkText(m[k], `${mp}.${k}`, { placeholders: true }) } if (!Array.isArray(m.forOptions) || !m.forOptions.length) err(`${mp}.forOptions`, 'must list at least one option id'); else m.forOptions.forEach((o, j) => { if (!optIds.has(o)) err(`${mp}.forOptions[${j}]`, `unknown option id "${o}"`) }) })
      }
    }
    if (s.rationales !== undefined || full) {
      if (!Array.isArray(s.rationales) || !s.rationales.length) err(`${base}.rationales`, full ? 'required: 3 rationales' : 'must be a non-empty array')
      else {
        if (s.rationales.length !== 3) warn(`${base}.rationales`, `${s.rationales.length} rationales (expected 3)`)
        const rids = new Set()
        s.rationales.forEach((r, i) => { const rp = `${base}.rationales[${i}]`; if (!isObj(r)) { err(rp, 'must be { id, text, fits }'); return } if (!isStr(r.id)) err(`${rp}.id`, 'missing id'); else if (rids.has(r.id)) err(`${rp}.id`, 'duplicate rationale id'); else rids.add(r.id); if (!isStr(r.text)) err(`${rp}.text`, 'missing text'); else checkText(r.text, `${rp}.text`, { placeholders: true }); if (!Array.isArray(r.fits) || !r.fits.length) err(`${rp}.fits`, 'must list at least one option id'); else r.fits.forEach((o, j) => { if (!optIds.has(o)) err(`${rp}.fits[${j}]`, `unknown option id "${o}"`) }) })
      }
    }
    // options
    const opts = []
    if (!Array.isArray(s.options) || !s.options.length) err(`${base}.options`, 'required: 3–5 options (2–4 in a moment)')
    else {
      const lo = isMoment ? 2 : 3, hi = isMoment ? 4 : 5
      if (s.options.length < lo || s.options.length > hi) warn(`${base}.options`, `${s.options.length} options (expected ${lo}–${hi})`)
      const seen = new Set()
      s.options.forEach((o, i) => { const p = `${base}.options[${i}]`; if (isObj(o) && isStr(o.id)) { if (seen.has(o.id)) err(`${p}.id`, 'duplicate option id'); seen.add(o.id) } const r = checkOption(o, p, s, infoSets, { full, moment: isMoment, failureModes: fmIds }); if (r) opts.push(r) })
      // escalation invariant
      if (s.rightEscalation !== undefined && opts.length) {
        const top = Math.max(...opts.map(o => isInt(o.quality) ? o.quality : -1))
        opts.forEach((o, i) => { if (o.quality === top && o.escalation !== undefined && o.escalation !== s.rightEscalation) err(`${base}.options[${i}].escalation`, `top-quality option has escalation "${o.escalation}" but rightEscalation is "${s.rightEscalation}"`) })
        if (top < 3) warn(`${base}.options`, `best option quality is ${top}; no quality-3 option`)
      }
      // every option referenced by some failure mode / rationale (full rooms)
      if (full) {
        const fmCover = new Set(listOf(s.failureModes).flatMap(m => listOf(m && m.forOptions)))
        const rCover = new Set(listOf(s.rationales).flatMap(r => listOf(r && r.fits)))
        for (const o of opts) { if (!fmCover.has(o.id)) warn(`${base}.failureModes`, `no failure mode covers option "${o.id}"`); if (!rCover.has(o.id)) warn(`${base}.rationales`, `no rationale fits option "${o.id}"`) }
      }
    }
    if (s.shortcutOption !== undefined) { const r = checkOption(s.shortcutOption, `${base}.shortcutOption`, s, infoSets, { full: false, moment: isMoment, failureModes: fmIds }); if (r && r.quality !== 0) err(`${base}.shortcutOption.quality`, 'the shortcut option must have quality 0') }
    // moments
    if (isMoment) {
      const mts = listOf(s.matchType)
      if (!mts.length) err(`${base}.matchType`, 'required (string or array)'); else mts.forEach((m, i) => { if (!MATCH_TYPES.has(m)) err(`${base}.matchType${Array.isArray(s.matchType) ? `[${i}]` : ''}`, `unknown match type "${m}"`) })
      if (!isObj(s.ticker)) err(`${base}.ticker`, 'required: { hostile: [], neutral: [], friendly: [] }')
      else for (const h of ['hostile', 'neutral', 'friendly']) { const l = s.ticker[h]; if (!Array.isArray(l) || !l.every(isStr)) err(`${base}.ticker.${h}`, 'must be an array of strings'); else { if (l.length < 3 || l.length > 6) err(`${base}.ticker.${h}`, `${l.length} lines (expected 3–6)`); l.forEach((line, i) => checkText(line, `${base}.ticker.${h}[${i}]`, { placeholders: true })) } }
      for (const k of Object.keys(s.ticker || {})) if (!['hostile', 'neutral', 'friendly'].includes(k)) err(`${base}.ticker.${k}`, 'unknown hostility')
    } else {
      for (const k of ['matchType', 'ticker', 'colleagueHint']) if (k in s) err(`${base}.${k}`, 'moment-only key in a decision bank')
    }
    // stats
    stats.total++
    stats.files[file] = (stats.files[file] || 0) + 1
    for (const t of tiers) stats.tier[t] = (stats.tier[t] || 0) + 1
    if (!isMoment) {
      stats.domain[s.domain] = (stats.domain[s.domain] || 0) + 1
      const ph = s.phase === undefined ? '*' : String(s.phase); stats.phase[ph] = (stats.phase[ph] || 0) + 1
      if (isStr(s.family)) stats.family.add(s.family)
      if (listOf(s.sector).includes('*') || s.sector === undefined) stats.wild++
      if ((listOf(s.sector).includes('*') || s.sector === undefined) && ph === '*') stats.fallback++
      if (full) stats.fullRooms++; else stats.light++
      if (tiers.includes(1)) { stats.tier1Ids.add(s.id); stats.tier1ByPhase[ph] = (stats.tier1ByPhase[ph] || 0) + 1 }
    } else {
      stats.moments++
      for (const m of listOf(s.matchType)) stats.momentsByType[m] = (stats.momentsByType[m] || 0) + 1
      if (tiers.includes(1)) stats.momentsTier1++
    }
  }

  /* ── scenario banks (may be absent) ── */
  const scenarioFiles = files.filter(f => /^scenarios\..+\.json$/.test(f))
  if (!scenarioFiles.length) warn('content/', 'no scenarios.*.json bank present yet (nothing to validate)')
  for (const f of scenarioFiles) { const arr = banks[f]; if (arr === undefined) continue; if (!Array.isArray(arr)) { err(f, 'expected a top-level array of scenarios'); continue } if (!arr.length) warn(f, 'empty bank'); arr.forEach((s, i) => checkScenario(s, f, i, 'decision')) }
  if (banks['moments.json'] === undefined && !errors.some(e => e.startsWith('moments.json:'))) warn('moments.json', 'moment bank not present yet')
  else if (Array.isArray(banks['moments.json'])) banks['moments.json'].forEach((s, i) => checkScenario(s, 'moments.json', i, 'moment'))
  else if (banks['moments.json'] !== undefined) err('moments.json', 'expected a top-level array of moments')

  /* ── events ── */
  const eventIds = new Set()
  if (eventsJ) eventsJ.forEach((e, i) => {
    const base = `events.json#${isObj(e) && isStr(e.id) ? e.id : `[${i}]`}`
    if (!isObj(e)) { err(base, 'must be an object'); return }
    if (!isStr(e.id)) err(`${base}.id`, 'missing id'); else { if (eventIds.has(e.id)) err(`${base}.id`, 'duplicate event id'); eventIds.add(e.id); if (seenIds.has(e.id)) warn(`${base}.id`, `id collides with a scenario in ${seenIds.get(e.id)}`) }
    if (e.bank !== 'event') err(`${base}.bank`, 'must be "event"')
    if (e.journal !== 'none') err(`${base}.journal`, 'must be "none"')
    checkTier(e.tier, `${base}.tier`)
    if (!isStr(e.title)) err(`${base}.title`, 'missing title'); else checkText(e.title, `${base}.title`, { placeholders: true })
    const body = e.body !== undefined ? e.body : e.text
    if (!isStr(body)) err(`${base}.body`, 'missing body (or text)'); else { checkText(body, `${base}.${e.body !== undefined ? 'body' : 'text'}`, { placeholders: true }); if (words(body) > 110) err(`${base}.${e.body !== undefined ? 'body' : 'text'}`, `${words(body)} words (max 110)`) }
    if (!isStr(e.sender)) err(`${base}.sender`, 'missing sender (cast id | "system")')
    else if (e.sender !== 'system' && !ROLE_PREFIXES.includes(e.sender) && !PEOPLE.has(e.sender)) err(`${base}.sender`, `unknown sender "${e.sender}" (cast id, contact id, role or "system")`)
    checkEffect(e.effect, `${base}.effect`, { required: true })
    checkRequires(e.requires, `${base}.requires`)
    checkEnum(e.sector, SECTORS, `${base}.sector`, 'sector', { wild: true })
    checkEnum(e.engType, ENG_TYPES, `${base}.engType`, 'engType', { wild: true })
    checkEnum(e.phase, PHASES, `${base}.phase`, 'phase', { wild: true, scalar: true })
    if (e.scoutable !== undefined && typeof e.scoutable !== 'boolean') err(`${base}.scoutable`, 'must be a boolean')
    if (e.leadWeeks !== undefined && !(isInt(e.leadWeeks) && e.leadWeeks >= 1 && e.leadWeeks <= 12)) err(`${base}.leadWeeks`, 'must be an integer 1–12')
    if (e.scoutable && e.leadWeeks === undefined) warn(`${base}.leadWeeks`, 'scoutable event without leadWeeks (engine default 3)')
    if (e.week !== undefined && !(isInt(e.week) && e.week >= 1 && e.week <= WEEKS)) err(`${base}.week`, `must be an integer 1–${WEEKS}`)
    if (e.weekRange !== undefined && !(Array.isArray(e.weekRange) && e.weekRange.length === 2 && e.weekRange.every(w => isInt(w) && w >= 1 && w <= WEEKS) && e.weekRange[0] <= e.weekRange[1])) err(`${base}.weekRange`, `must be [from, to] within 1–${WEEKS}`)
    if (e.lesson !== undefined && !LESSONS.has(e.lesson)) err(`${base}.lesson`, `unknown lesson "${e.lesson}"`)
    if (e.attachments !== undefined) { if (!Array.isArray(e.attachments)) err(`${base}.attachments`, 'must be an array'); else e.attachments.forEach((a, j) => { if (!isObj(a) || !isStr(a.label) || !isStr(a.text)) err(`${base}.attachments[${j}]`, 'must be { label, text }'); else { checkText(a.label, `${base}.attachments[${j}].label`, { placeholders: true }); checkText(a.text, `${base}.attachments[${j}].text`, { placeholders: true }) } }) }
    for (const k of ['setFlag', 'flag']) if (k in e) err(`${base}.${k}`, 'use flag.<name> inside effect')
    if ('options' in e) err(`${base}.options`, 'an event has no options')
    stats.events++
  })

  /* ── reference banks ── */
  if (tagsJ) for (const grp of ['tags', 'biases']) { if (!Array.isArray(tagsJ[grp])) err(`tags.json.${grp}`, 'must be an array'); else { const seen = new Set(); tagsJ[grp].forEach((t, i) => { if (!isObj(t) || !isStr(t.id) || !isStr(t.he)) err(`tags.json.${grp}[${i}]`, 'must be { id, he }'); else if (seen.has(t.id)) err(`tags.json.${grp}[${i}].id`, 'duplicate'); else seen.add(t.id) }) } }
  if (lessonsJ) {
    if (!Array.isArray(lessonsJ.frameworks)) err('lessons.json.frameworks', 'must be an array')
    else { const seen = new Set(); lessonsJ.frameworks.forEach((f, i) => { const p = `lessons.json.frameworks[${i}]`; if (!isObj(f) || !isStr(f.id) || !isStr(f.he)) { err(p, 'must be { id, he, aliases? }'); return } if (seen.has(f.id)) err(`${p}.id`, 'duplicate'); seen.add(f.id); if (f.aliases !== undefined && !(Array.isArray(f.aliases) && f.aliases.every(isStr))) err(`${p}.aliases`, 'must be an array of strings') }) }
    if (!Array.isArray(lessonsJ.lessons)) err('lessons.json.lessons', 'must be an array')
    else { const fw = ids(lessonsJ.frameworks); const seen = new Set(); lessonsJ.lessons.forEach((l, i) => { const p = `lessons.json#${isObj(l) && isStr(l.id) ? l.id : `[${i}]`}`; if (!isObj(l)) { err(p, 'must be an object'); return } if (!isStr(l.id)) err(`${p}.id`, 'missing'); else if (seen.has(l.id)) err(`${p}.id`, 'duplicate'); else seen.add(l.id); if (!isStr(l.title)) err(`${p}.title`, 'missing'); if (!isStr(l.body)) err(`${p}.body`, 'missing'); else { const n = words(l.body); if (n < 80 || n > 160) warn(`${p}.body`, `${n} words (expected 80–160)`) } if (!(isInt(l.tier) && l.tier >= 1 && l.tier <= 5)) err(`${p}.tier`, 'must be 1–5'); listOf(l.frameworks).forEach((f, j) => { if (!fw.has(f)) err(`${p}.frameworks[${j}]`, `unknown framework id "${f}"`) }); listOf(l.skills).forEach((s, j) => { if (!SKILLS.includes(s)) err(`${p}.skills[${j}]`, `unknown skill "${s}"`) }) }) }
  }
  if (baseRatesJ) baseRatesJ.forEach((r, i) => {
    const p = `baseRates.json#${isObj(r) && isStr(r.id) ? r.id : `[${i}]`}`
    if (!isObj(r)) { err(p, 'must be an object'); return }
    if (!isStr(r.id)) err(`${p}.id`, 'missing')
    if (!(isInt(r.n) && r.n >= 1)) err(`${p}.n`, 'must be a positive integer')
    if (!(isInt(r.dev) && r.dev >= 0)) err(`${p}.dev`, 'must be a non-negative integer')
    if (!inRange(r.conf, 50, 99.9)) err(`${p}.conf`, 'must be a confidence level in percent (50–99.9)')
    if (!isNum(r.upper)) err(`${p}.upper`, 'must be a number (percent)')
    if (!isStr(r.source)) err(`${p}.source`, 'missing source citation')
    if (!isStr(r.he)) err(`${p}.he`, 'missing card template'); else for (const k of ['n', 'upper', 'conf']) if (!r.he.includes(`{${k}}`)) warn(`${p}.he`, `template does not use {${k}}`)
    if (isInt(r.n) && isInt(r.dev) && isNum(r.conf) && isNum(r.upper)) { if (r.dev >= r.n) err(`${p}.dev`, 'dev must be < n'); else { const u = binomialUpper(r.n, r.dev, r.conf); if (Math.abs(u - r.upper) > 1) err(`${p}.upper`, `stored ${r.upper}% but the binomial upper bound for n=${r.n}, dev=${r.dev}, conf=${r.conf}% is ${u.toFixed(1)}%`) } }
  })
  if (scalesJ) {
    if (!isObj(scalesJ.byEngType)) err('ratingScales.json.byEngType', 'must be an object')
    else for (const et of Object.keys(scalesJ.byEngType)) { if (!ENG_TYPES.includes(et)) err(`ratingScales.json.byEngType.${et}`, 'unknown engType'); if (!SCALES.has(scalesJ.byEngType[et])) err(`ratingScales.json.byEngType.${et}`, `unknown scale "${scalesJ.byEngType[et]}"`) }
    for (const et of ENG_TYPES) if (isObj(scalesJ.byEngType) && !scalesJ.byEngType[et]) err(`ratingScales.json.byEngType.${et}`, 'every engType needs a scale')
    if (!Array.isArray(scalesJ.scales)) err('ratingScales.json.scales', 'must be an array')
    else scalesJ.scales.forEach((s, i) => { const p = `ratingScales.json#${isObj(s) && isStr(s.id) ? s.id : `[${i}]`}`; if (!isObj(s)) { err(p, 'must be an object'); return } if (!isStr(s.id)) err(`${p}.id`, 'missing'); if (!isStr(s.he)) err(`${p}.he`, 'missing'); if (!['severity', 'status'].includes(s.kind)) err(`${p}.kind`, 'must be severity | status'); listOf(s.engTypes).forEach((et, j) => { if (!ENG_TYPES.includes(et)) err(`${p}.engTypes[${j}]`, 'unknown engType'); else if (isObj(scalesJ.byEngType) && scalesJ.byEngType[et] !== s.id) err(`${p}.engTypes[${j}]`, `byEngType maps "${et}" to "${scalesJ.byEngType[et]}", not to this scale`) }); if (!Array.isArray(s.pills) || s.pills.length < 2) err(`${p}.pills`, 'must list at least 2 pills'); else s.pills.forEach((pl, j) => { if (!isObj(pl) || !isStr(pl.id) || !isStr(pl.he) || !isInt(pl.level)) err(`${p}.pills[${j}]`, 'must be { id, he, level }') }) })
  }
  if (matchTypesJ) matchTypesJ.forEach((m, i) => {
    const p = `matchTypes.json#${isObj(m) && isStr(m.id) ? m.id : `[${i}]`}`
    if (!isObj(m)) { err(p, 'must be an object'); return }
    if (!isStr(m.id)) err(`${p}.id`, 'missing'); if (!isStr(m.hebrew)) err(`${p}.hebrew`, 'missing')
    if (!(isInt(m.moments) && m.moments >= 1 && m.moments <= 7)) err(`${p}.moments`, 'must be an integer 1–7')
    if (m.hebrewByEngType !== undefined) { if (!isObj(m.hebrewByEngType)) err(`${p}.hebrewByEngType`, 'must be an object'); else for (const et of Object.keys(m.hebrewByEngType)) if (!ENG_TYPES.includes(et)) err(`${p}.hebrewByEngType.${et}`, 'unknown engType') }
    const fit = m.fit; const want = { basis: ['risk', 'rules'], transparency: ['full', 'managed'], escalation: ['low', 'high'] }
    if (!isObj(fit)) err(`${p}.fit`, 'missing fit tables'); else for (const k of Object.keys(want)) { if (!isObj(fit[k])) { err(`${p}.fit.${k}`, `missing { ${want[k].join(', ')} }`); continue } for (const v of want[k]) if (!(isInt(fit[k][v]) && fit[k][v] >= 0 && fit[k][v] <= 3)) err(`${p}.fit.${k}.${v}`, 'must be an integer 0–3') }
    listOf(m.momentsFrom).forEach((x, j) => { if (!MATCH_TYPES.has(x)) err(`${p}.momentsFrom[${j}]`, `unknown match type "${x}"`) })
  })
  if (awardsJ) awardsJ.forEach((a, i) => { const p = `awards.json#${isObj(a) && isStr(a.id) ? a.id : `[${i}]`}`; if (!isObj(a)) { err(p, 'must be an object'); return } for (const k of ['id', 'key', 'he', 'criteria', 'rule']) if (!isStr(a[k])) err(`${p}.${k}`, 'missing'); if (typeof a.shame !== 'boolean') err(`${p}.shame`, 'must be a boolean'); if (isStr(a.key) && STRINGS[a.key] == null) err(`${p}.key`, `strings.json has no key "${a.key}"`) })

  /* ── world banks ── */
  if (firmsJ) firmsJ.forEach((f, i) => {
    const p = `firms.json#${isObj(f) && isStr(f.id) ? f.id : `[${i}]`}`
    if (!isObj(f)) { err(p, 'must be an object'); return }
    for (const k of FIRM_KEYS) if (f[k] === undefined) err(`${p}.${k}`, 'required firm key')
    for (const k of ['prestige', 'pay', 'minRep', 'need', 'hoursPenalty', 'promoDelta', 'trustMult', 'incidentRate']) if (f[k] !== undefined && !isNum(f[k])) err(`${p}.${k}`, 'must be a number')
    const mult = (key, allowed, label) => { const o = f[key]; if (o === undefined) return; if (!isObj(o)) { err(`${p}.${key}`, 'must be an object'); return } for (const k of Object.keys(o)) { if (!allowed.includes(k)) err(`${p}.${key}.${k}`, `unknown ${label} "${k}"`); if (!isNum(o[k]) || o[k] < 0) err(`${p}.${key}.${k}`, 'must be a non-negative number') } }
    mult('tagMult', [...TAGS], 'option tag'); mult('infoCostMult', INFO_KINDS.concat(SKILLS), 'info kind'); mult('skillGainMult', SKILLS, 'skill'); mult('repMult', ['regulator'], 'rep source')
    // §10 writes castel's infoCostMult as {evidence: 1.5} (a skill id) while §14 and engine.js multiply by the info action's kind; a skill-id key is accepted but inert.
    if (isObj(f.infoCostMult)) for (const k of Object.keys(f.infoCostMult)) if (!INFO_KINDS.includes(k) && SKILLS.includes(k)) warn(`${p}.infoCostMult.${k}`, `the engine keys infoCostMult by info kind (${INFO_KINDS.join(' | ')}); a skill-id key has no runtime effect`)
    listOf(f.sectors).forEach((s, j) => { if (!SECTORS.includes(s)) err(`${p}.sectors[${j}]`, `unknown sector "${s}"`) })
    if (f.boardObjectives !== undefined) { if (!Array.isArray(f.boardObjectives)) err(`${p}.boardObjectives`, 'must be an array'); else f.boardObjectives.forEach((b, j) => { if (!isObj(b)) { err(`${p}.boardObjectives[${j}]`, 'must be { metric, target, hebrew }'); return } if (!BOARD_METRICS.includes(b.metric)) err(`${p}.boardObjectives[${j}].metric`, `unknown metric "${b.metric}"`); if (!isNum(b.target)) err(`${p}.boardObjectives[${j}].target`, 'must be a number'); if (!isStr(b.hebrew)) err(`${p}.boardObjectives[${j}].hebrew`, 'missing') }) }
  })
  if (clientsJ) { const seen = new Set(); clientsJ.forEach((c, i) => {
    const p = `clients.json#${isObj(c) && isStr(c.id) ? c.id : `[${i}]`}`
    if (!isObj(c)) { err(p, 'must be an object'); return }
    if (!isStr(c.id)) err(`${p}.id`, 'missing'); else if (seen.has(c.id)) err(`${p}.id`, 'duplicate'); else seen.add(c.id)
    if (!isStr(c.name)) err(`${p}.name`, 'missing')
    if (!SECTORS.includes(c.sector)) err(`${p}.sector`, `unknown sector "${c.sector}"`)
    if (typeof c.isox !== 'boolean') err(`${p}.isox`, 'must be a boolean')
    if (!Array.isArray(c.contacts) || !c.contacts.length) err(`${p}.contacts`, 'must list at least one stakeholder id')
    else c.contacts.forEach((id, j) => { const s = STAKE.get(id); if (!s) err(`${p}.contacts[${j}]`, `unknown stakeholder "${id}"`); else if (s.clientId !== c.id) err(`${p}.contacts[${j}]`, `stakeholder "${id}" belongs to client "${s.clientId}"`) })
    listOf(c.cast).forEach((id, j) => { if (!CAST.has(id)) err(`${p}.cast[${j}]`, `unknown cast id "${id}"`) })
    if (c.iaId !== undefined && c.iaId !== null && !PEOPLE.has(c.iaId)) err(`${p}.iaId`, `unknown person "${c.iaId}"`)
    if (!Array.isArray(c.processes) || !c.processes.length) err(`${p}.processes`, 'must list the client processes [{ id, name }]')
    else c.processes.forEach((pr, j) => { if (!isObj(pr) || !isStr(pr.id) || !isStr(pr.name)) err(`${p}.processes[${j}]`, 'must be { id, name }') })
  }) }
  if (stakeholdersJ) { const seen = new Set(); stakeholdersJ.forEach((s, i) => {
    const p = `stakeholders.json#${isObj(s) && isStr(s.id) ? s.id : `[${i}]`}`
    if (!isObj(s)) { err(p, 'must be an object'); return }
    if (!isStr(s.id)) err(`${p}.id`, 'missing'); else if (seen.has(s.id)) err(`${p}.id`, 'duplicate'); else seen.add(s.id)
    if (CAST.has(s.id)) err(`${p}.id`, 'id collides with a cast id')
    if (!CLIENTS.has(s.clientId)) err(`${p}.clientId`, `unknown client "${s.clientId}"`)
    for (const k of ['role', 'name', 'temper']) if (!isStr(s[k])) err(`${p}.${k}`, 'missing')
    if (!['m', 'f'].includes(s.gender)) err(`${p}.gender`, 'must be "m" or "f"')
    if (!inRange(s.trust0, 0, 100)) err(`${p}.trust0`, 'must be 0–100')
    if (isStr(s.temper) && STRINGS['temper.' + s.temper] == null) warn(`${p}.temper`, `strings.json has no "temper.${s.temper}"`)
  }) }
  if (castJ) { const seen = new Set(); castJ.forEach((c, i) => {
    const p = `cast.json#${isObj(c) && isStr(c.id) ? c.id : `[${i}]`}`
    if (!isObj(c)) { err(p, 'must be an object'); return }
    if (!isStr(c.id)) err(`${p}.id`, 'missing'); else if (seen.has(c.id)) err(`${p}.id`, 'duplicate'); else seen.add(c.id)
    for (const k of ['name', 'role']) if (!isStr(c[k])) err(`${p}.${k}`, 'missing')
    if (!['m', 'f'].includes(c.gender)) err(`${p}.gender`, 'must be "m" or "f"')
    if (!inRange(c.trust0, 0, 100)) err(`${p}.trust0`, 'must be 0–100')
    if (c.firmId !== undefined && c.firmId !== null && !FIRMS.has(c.firmId)) err(`${p}.firmId`, `unknown firm "${c.firmId}"`)
    if (isStr(c.temper) && STRINGS['temper.' + c.temper] == null) warn(`${p}.temper`, `strings.json has no "temper.${c.temper}"`)
    listOf(c.memoryKeys).forEach((k, j) => { if (!isStr(k) || !k.startsWith(c.id + '.')) err(`${p}.memoryKeys[${j}]`, `memory keys are flags of the form "${c.id}.<name>"`) })
  }) }

  /* ── seasons ── */
  if (seasonsJ) { const seen = new Set(); seasonsJ.forEach((t, i) => {
    const p = `seasons.json#${isObj(t) && isStr(t.id) ? t.id : `[${i}]`}`
    if (!isObj(t)) { err(p, 'must be an object'); return }
    if (!isStr(t.id)) err(`${p}.id`, 'missing'); else if (seen.has(t.id)) err(`${p}.id`, 'duplicate'); else seen.add(t.id)
    if (!(isInt(t.tier) && t.tier >= 1 && t.tier <= 5)) err(`${p}.tier`, 'must be 1–5')
    if (t.firm !== undefined && !FIRMS.has(t.firm)) err(`${p}.firm`, `unknown firm "${t.firm}"`)
    if (t.season !== undefined && t.season !== null && !(isInt(t.season) && t.season >= 1)) err(`${p}.season`, 'must be a positive integer or null')
    if (!isStr(t.title)) err(`${p}.title`, 'missing')
    if (!Array.isArray(t.scripted)) err(`${p}.scripted`, 'must be an array (may be empty)')
    else t.scripted.forEach((id, j) => { if (!isStr(id)) { err(`${p}.scripted[${j}]`, 'must be a scenario id'); return } if (!seenIds.has(id)) warn(`${p}.scripted[${j}]`, `scripted scenario "${id}" is not authored yet`); else { const s = scenarioFiles.concat('moments.json').map(f => listOf(banks[f]).find(x => isObj(x) && x.id === id)).find(Boolean); if (s && !listOf(s.tier).includes(t.tier)) err(`${p}.scripted[${j}]`, `"${id}" is not tier ${t.tier}`); if (s && s.bank !== 'decision') err(`${p}.scripted[${j}]`, `"${id}" is not a decision scenario`) } })
    if (t.scripted && t.scripted.length && (t.season === undefined || t.season === null)) warn(`${p}.scripted`, 'scripted ids apply only when season is set')
    if (!Array.isArray(t.engagements) || !t.engagements.length) { err(`${p}.engagements`, 'must list 4–6 engagements'); return }
    if (t.engagements.length < 4 || t.engagements.length > 6) warn(`${p}.engagements`, `${t.engagements.length} engagements (expected 4–6)`)
    const byClient = {} // clientId → [{line, process, idx}]
    t.engagements.forEach((e, j) => {
      const ep = `${p}.engagements[${j}]`
      if (!isObj(e)) { err(ep, 'must be an object'); return }
      const hasClient = e.clientId !== undefined, hasPool = e.sectorPool !== undefined
      if (hasClient === hasPool) err(ep, 'exactly one of clientId | sectorPool is required')
      const client = hasClient ? CLIENTS.get(e.clientId) : null
      if (hasClient && !client) err(`${ep}.clientId`, `unknown client "${e.clientId}"`)
      if (hasPool) { if (!Array.isArray(e.sectorPool) || !e.sectorPool.length) err(`${ep}.sectorPool`, 'must be a non-empty array of sectors'); else e.sectorPool.forEach((s, k) => { if (!SECTORS.includes(s)) err(`${ep}.sectorPool[${k}]`, `unknown sector "${s}"`); else if (![...CLIENTS.values()].some(c => c.sector === s)) err(`${ep}.sectorPool[${k}]`, `no client in sector "${s}"`) }) }
      if (!ENG_TYPES.includes(e.type)) err(`${ep}.type`, `unknown engType "${e.type}"`)
      if (e.line !== 2 && e.line !== 3) err(`${ep}.line`, 'must be 2 or 3')
      else if (LINE_BY_TYPE[e.type] && LINE_BY_TYPE[e.type] !== e.line) err(`${ep}.line`, `"${e.type}" is line ${LINE_BY_TYPE[e.type]} work (§8)`)
      if (!isStr(e.process)) err(`${ep}.process`, 'missing process id')
      else if (client) { if (!listOf(client.processes).some(x => isObj(x) && x.id === e.process)) err(`${ep}.process`, `client "${client.id}" has no process "${e.process}"`) }
      else if (hasPool && Array.isArray(e.sectorPool)) {
        const pool = [...CLIENTS.values()].filter(c => e.sectorPool.includes(c.sector))
        const withProc = pool.filter(c => listOf(c.processes).some(x => isObj(x) && x.id === e.process))
        if (pool.length && !withProc.length) err(`${ep}.process`, `no client in sectors [${e.sectorPool.join(', ')}] has process "${e.process}"`)
        else for (const s of e.sectorPool) if (pool.some(c => c.sector === s) && !withProc.some(c => c.sector === s)) warn(`${ep}.process`, `no "${s}" client has process "${e.process}"; the draw can only use the other sectors`)
      }
      if (e.type === 'isox' && client && !client.isox) err(`${ep}.type`, `client "${client.id}" is not an ISOX reporting entity (isox: false)`)
      if (e.type === 'isox' && hasPool && Array.isArray(e.sectorPool) && ![...CLIENTS.values()].some(c => e.sectorPool.includes(c.sector) && c.isox)) err(`${ep}.type`, 'no ISOX client in the sector pool')
      if (!(isInt(e.startWeek) && e.startWeek >= 1 && e.startWeek <= WEEKS)) err(`${ep}.startWeek`, `must be 1–${WEEKS}`)
      if (!(isInt(e.duration) && e.duration >= 8 && e.duration <= 14)) err(`${ep}.duration`, 'must be 8–14 weeks')
      if (isInt(e.startWeek) && isInt(e.duration) && e.startWeek + e.duration > WEEKS) warn(`${ep}.duration`, `deadline week ${e.startWeek + e.duration} is past week ${WEEKS}`)
      if (e.managerId !== undefined && !CAST.has(e.managerId)) err(`${ep}.managerId`, `unknown cast id "${e.managerId}"`)
      if (e.contactId !== undefined) { const s = STAKE.get(e.contactId); if (!s && !CAST.has(e.contactId)) err(`${ep}.contactId`, `unknown contact "${e.contactId}"`); else if (s && client && s.clientId !== client.id) err(`${ep}.contactId`, `"${e.contactId}" belongs to client "${s.clientId}", not "${client.id}"`); else if (s && hasPool) err(`${ep}.contactId`, 'contactId needs a fixed clientId (sectorPool draws the client)') }
      if (e.phaseWork !== undefined) { if (!isObj(e.phaseWork)) err(`${ep}.phaseWork`, 'must be an object'); else for (const k of Object.keys(e.phaseWork)) { if (!PHASES.includes(k)) err(`${ep}.phaseWork.${k}`, 'unknown phase'); if (!(isInt(e.phaseWork[k]) && e.phaseWork[k] >= 1)) err(`${ep}.phaseWork.${k}`, 'must be a positive integer') } }
      if (hasClient) (byClient[e.clientId] = byClient[e.clientId] || []).push({ line: e.line, process: e.process, j, selfReviewTest: !!e.selfReviewTest })
    })
    for (const cid of Object.keys(byClient)) for (const a of byClient[cid]) if (a.line === 3) for (const b of byClient[cid]) if (b.line === 2 && b.process === a.process && !a.selfReviewTest) err(`${p}.engagements[${a.j}].process`, `line-3 work on "${a.process}" at "${cid}" while engagements[${b.j}] does line-2 work on the same process (self-review; set "selfReviewTest": true only for the independence-self-review family)`)
  }) }

  /* ── drills ── */
  if (drillsJ) { const seen = new Set(); drillsJ.forEach((d, i) => {
    const p = `drills.json#${isObj(d) && isStr(d.id) ? d.id : `[${i}]`}`
    if (!isObj(d)) { err(p, 'must be an object'); return }
    if (!isStr(d.id)) err(`${p}.id`, 'missing'); else if (seen.has(d.id)) err(`${p}.id`, 'duplicate'); else seen.add(d.id)
    if (!isStr(d.title)) err(`${p}.title`, 'missing')
    checkSkills(d.skills, `${p}.skills`, { required: true }); checkTier(d.tier, `${p}.tier`)
    if (d.hours !== undefined && !(isInt(d.hours) && d.hours >= 1 && d.hours <= 8)) err(`${p}.hours`, 'must be 1–8')
    if (!Array.isArray(d.items) || !d.items.length) err(`${p}.items`, 'must list items'); else { if (d.items.length !== 5) warn(`${p}.items`, `${d.items.length} items (expected 5)`); d.items.forEach((it, j) => { const ip = `${p}.items[${j}]`; if (!isObj(it)) { err(ip, 'must be an object'); return } if (!isStr(it.q) && !isStr(it.question)) err(`${ip}.q`, 'missing question'); if (!Array.isArray(it.options) || it.options.length < 2) err(`${ip}.options`, 'must list at least 2 options'); else { it.options.forEach((o, k) => { if (isStr(o)) return; if (!isObj(o) || !(isStr(o.t) || isStr(o.text))) err(`${ip}.options[${k}]`, 'must be { t, quality }'); else if (!(isInt(o.quality) && o.quality >= 0 && o.quality <= 3)) err(`${ip}.options[${k}].quality`, 'must be 0–3') }); if (!it.options.some(o => isObj(o) && o.quality === 3)) warn(`${ip}.options`, 'no quality-3 option') } }) }
  }) }

  /* ── deliverables ── */
  if (deliverablesJ) { const seen = new Set(); deliverablesJ.forEach((d, i) => {
    const p = `deliverables.json#${isObj(d) && isStr(d.id) ? d.id : `[${i}]`}`
    if (!isObj(d)) { err(p, 'must be an object'); return }
    if (!isStr(d.id)) err(`${p}.id`, 'missing'); else if (seen.has(d.id)) err(`${p}.id`, 'duplicate'); else seen.add(d.id)
    if (!isStr(d.title)) err(`${p}.title`, 'missing')
    if (!(isInt(d.tier) && d.tier >= 1 && d.tier <= 5)) err(`${p}.tier`, 'must be 1–5')
    if (d.kind !== undefined && !['gate', 'practice'].includes(d.kind)) err(`${p}.kind`, 'must be gate | practice')
    const practice = d.practice === true || d.kind === 'practice'
    if (d.passThreshold != null ? !inRange(d.passThreshold, 0, 100) : !practice) err(`${p}.passThreshold`, practice ? 'must be 0–100 (or null for a practice builder)' : 'a gate deliverable needs passThreshold 0–100')
    if (d.window !== undefined && !(Array.isArray(d.window) && d.window.length === 2 && d.window.every(w => isInt(w) && w >= 1 && w <= WEEKS))) err(`${p}.window`, `must be [from, to] within 1–${WEEKS}`)
    checkEnum(d.engType, ENG_TYPES, `${p}.engType`, 'engType', { wild: true })
    if (d.scale !== undefined && !SCALES.has(d.scale)) err(`${p}.scale`, `unknown scale "${d.scale}"`)
    if (!Array.isArray(d.parts) || !d.parts.length) { err(`${p}.parts`, 'must list parts'); return }
    let wsum = 0
    d.parts.forEach((pt, j) => {
      const pp = `${p}.parts[${j}]`
      if (!isObj(pt)) { err(pp, 'must be an object'); return }
      if (!isStr(pt.id)) err(`${pp}.id`, 'missing')
      if (!PART_KINDS.includes(pt.kind)) err(`${pp}.kind`, `must be one of ${PART_KINDS.join(' | ')}`)
      if (!inRange(pt.weight, 0, 100)) err(`${pp}.weight`, 'must be 0–100'); else wsum += pt.weight
      if (pt.kind === 'slots') { if (!Array.isArray(pt.slots) || !pt.slots.length) err(`${pp}.slots`, 'must list slots'); else pt.slots.forEach((sl, k) => { const sp = `${pp}.slots[${k}]`; if (!isObj(sl) || !isStr(sl.id) || !isStr(sl.label)) { err(sp, 'must be { id, label, choices }'); return } const ch = sl.choices || sl.candidates; if (!Array.isArray(ch) || ch.length < 2) err(`${sp}.choices`, 'must list at least 2 candidate sentences'); else { ch.forEach((c, m) => { if (!isObj(c) || !(isStr(c.t) || isStr(c.text))) err(`${sp}.choices[${m}]`, 'must be { t, quality, why }'); else if (c.quality !== undefined && !(isInt(c.quality) && c.quality >= 0 && c.quality <= 3)) err(`${sp}.choices[${m}].quality`, 'must be 0–3'); else if (c.quality === undefined && !isNum(c.pts)) err(`${sp}.choices[${m}]`, 'needs quality (0–3) or pts') }); if (!ch.some(c => isObj(c) && (c.quality === 3 || c.pts === 20))) warn(`${sp}.choices`, 'no best (quality 3) choice') } }) }
      if (pt.kind === 'order') { const items = listOf(pt.items), ans = listOf(pt.answer); if (!ans.length) err(`${pp}.answer`, 'missing authored order'); else if (items.length && (items.length !== ans.length || !items.every(x => ans.includes(x)))) err(`${pp}.answer`, 'answer must be a permutation of items') }
      if (pt.kind === 'match') { const targets = ids(pt.targets); listOf(pt.items).forEach((it, k) => { if (!isObj(it)) return; if (targets.size && it.answer !== undefined && !targets.has(it.answer)) err(`${pp}.items[${k}].answer`, `unknown target "${it.answer}"`); if (Array.isArray(it.reasons) && it.reasons.length && !it.reasons.some(r => isObj(r) && r.correct === true)) err(`${pp}.items[${k}].reasons`, 'no reason marked correct') }); if (pt.n !== undefined && listOf(pt.items).length && listOf(pt.items).filter(it => isObj(it) && it.answer === 'in').length !== pt.n && targets.has('in')) warn(`${pp}.n`, `n is ${pt.n} but ${listOf(pt.items).filter(it => isObj(it) && it.answer === 'in').length} items answer "in"`) }
      if (pt.kind === 'ratings') { if (!Array.isArray(pt.items) || !pt.items.length) err(`${pp}.items`, 'must list items to rate'); if (pt.scale !== undefined && !(isObj(pt.scale) && isNum(pt.scale.min) && isNum(pt.scale.max) && pt.scale.min < pt.scale.max)) err(`${pp}.scale`, 'must be { min, max }') }
    })
    if (Math.abs(wsum - 100) > 0.01) err(`${p}.parts`, `part weights sum to ${wsum}, expected 100`)
  }) }

  /* ── whole-file text sweep: slash forms and token structure everywhere ── */
  for (const f of files) {
    if (banks[f] === undefined) continue
    if (/^scenarios\./.test(f) || f === 'moments.json' || f === 'events.json') continue // already checked field by field with placeholder validation
    walkText(banks[f], f.replace(/\.json$/, '.json'), { placeholders: false })
  }

  /* ── strings.json: shape, required keys, coverage of src/engine.js + src/ui.js ── */
  if (stringsJ) {
    for (const k of Object.keys(STRINGS)) if (!isStr(STRINGS[k])) err(`strings.json.${k}`, 'every value must be a string template')
    for (const k of REQUIRED_STRINGS) if (STRINGS[k] == null) err(`strings.json.${k}`, 'required key (DESIGN.md §15) is missing')
    const src = {}
    for (const f of ['engine.js', 'ui.js']) { const fp = join(srcDir, f); if (existsSync(fp)) src[f] = readFileSync(fp, 'utf8'); else warn(`src/${f}`, 'not found; string coverage not checked for it') }
    // Hard references (missing → error): t('k') / tp('k') / err('k') / key: 'k' / note(notes, 'k'); the same forms with 'prefix.' + … are prefix references.
    // Soft references (count as used only): hasKey('k') guarded lookups and any bare 'x.y' literal (e.g. the TABS tables in ui.js).
    const refs = new Map() // key → "file:line"
    const prefixes = new Map() // prefix → "file:line"
    const soft = new Set(), softPrefixes = new Set()
    for (const f of Object.keys(src)) {
      const lines = src[f].split('\n')
      lines.forEach((line, i) => {
        const at = `src/${f}:${i + 1}`
        for (const m of line.matchAll(/(?:(?<![\w.$])(?:t|tp|err)\(|\bkey:|note\(notes,)\s*'([^'\\]+)'\s*([+)]|,)/g)) {
          if (m[2] === '+') { if (m[1].endsWith('.')) prefixes.set(m[1], at) } else if (!refs.has(m[1])) refs.set(m[1], at)
        }
        for (const m of line.matchAll(/(?<![\w.$])hasKey\(\s*'([^'\\]+)'\s*([+)])/g)) { if (m[2] === '+') softPrefixes.add(m[1]); else soft.add(m[1]) }
        for (const m of line.matchAll(/'([a-z]+\.[A-Za-z0-9_.-]+)'/g)) soft.add(m[1])
      })
    }
    for (const [k, at] of refs) if (STRINGS[k] == null) err(`strings.json.${k}`, `referenced at ${at} but missing`)
    for (const [pre, at] of prefixes) if (!softPrefixes.has(pre) && !Object.keys(STRINGS).some(k => k.startsWith(pre))) err(`strings.json.${pre}*`, `prefix referenced at ${at} but no key starts with it`)
    const allPrefixes = [...prefixes.keys(), ...softPrefixes]
    const used = k => refs.has(k) || soft.has(k) || REQUIRED_STRINGS.includes(k) || allPrefixes.some(pre => k.startsWith(pre)) || listOf(awardsJ).some(a => isObj(a) && a.key === k) || /^(temper|role|skill|phase|engType|domain|sector|month|tier|band|integrity|pattern|inbox\.type|firm\.metric|match\.(basis|transparency|escalation)|room\.rubric|award|nav|screen)\./.test(k)
    const unused = Object.keys(STRINGS).filter(k => !used(k))
    if (unused.length) warn('strings.json', `${unused.length} key${unused.length === 1 ? '' : 's'} not referenced from src/ (unused)${opts.unused ? ':\n    ' + unused.join('\n    ') : ': ' + unused.slice(0, 12).join(', ') + (unused.length > 12 ? ', … (run with --unused for the full list)' : '')}`)
  }

  /* ── summary ── */
  const summary = buildSummary(stats, seenIds)
  return { errors, warnings, summary, stats }
}

function buildSummary(stats, seenIds) {
  const fmt = o => Object.keys(o).sort().map(k => `${k} ${o[k]}`).join(' · ') || '—'
  const t1 = stats.tier1Ids.size
  const lines = []
  lines.push(`per bank:    ${fmt(stats.files)}${stats.moments ? ` · moments ${stats.moments}` : ''}${stats.events ? ` · events ${stats.events}` : ''}`)
  lines.push(`decision scenarios: ${stats.total} (${stats.fullRooms} full rooms, ${stats.light} light) in ${stats.family.size} families; moments ${stats.moments} (tier 1: ${stats.momentsTier1}); ids ${seenIds.size}`)
  lines.push(`per tier:    ${fmt(stats.tier)}  (an id tagged [1,2] counts in both)`)
  lines.push(`per domain:  ${fmt(stats.domain)}`)
  lines.push(`per phase:   ${fmt(stats.phase)}`)
  lines.push(`moments per matchType: ${fmt(stats.momentsByType)}`)
  lines.push(`sector wildcard share: ${stats.total ? Math.round(100 * stats.wild / stats.total) : 0}% (${stats.wild}/${stats.total}); fallback pool (phase "*" ∧ sector "*"): ${stats.fallback}`)
  lines.push(`tier-1 draw coverage: ${t1} distinct tier-1 decision ids vs ≈${DRAW_BUDGET} draws per season (§13) → ${t1 >= DRAW_BUDGET ? `margin +${t1 - DRAW_BUDGET}` : `short by ${DRAW_BUDGET - t1} (ids will repeat within a season)`}; tier-1 by phase: ${fmt(stats.tier1ByPhase)}`)
  return lines.join('\n')
}

/* ───────────────────────── CLI ───────────────────────── */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = new Set(process.argv.slice(2))
  const r = validate({ unused: args.has('--unused') })
  const quiet = args.has('--quiet')
  if (!quiet) for (const w of r.warnings) console.log('warning  ' + w)
  for (const e of r.errors) console.error('error    ' + e)
  if (args.has('--summary')) console.log('\n' + r.summary)
  console.log(`\nvalidate: ${r.errors.length} error${r.errors.length === 1 ? '' : 's'}, ${r.warnings.length} warning${r.warnings.length === 1 ? '' : 's'} → ${r.errors.length ? 'FAIL' : 'PASS'}`)
  process.exit(r.errors.length ? 1 : 0)
}
