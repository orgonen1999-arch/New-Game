// node:test coverage for src/engine.js (§15). Uses small inline fixtures so it never depends on content/.
// Run: node --test marketing-manager/tools/engine.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const MM = require(join(here, '..', 'src', 'engine.js'))

// ───────── fixtures ─────────
// The §7 worked example, reduced to its structure and numbers (texts shortened).
const S7 = {
  id: 'bank-aml-kyc-sample-v1', family: 'sampling-independence', bank: 'decision', journal: 'full', tier: [1, 2], difficulty: 2,
  domain: 'audit', sector: ['bank'], engType: ['audit', 'compliance'], phase: 'fieldwork',
  skills: [{ id: 'testing', w: 0.5 }, { id: 'evidence', w: 0.3 }, { id: 'gather', w: 0.2 }],
  cooldown: 30, requires: { flags: [], notFlags: ['kyc_sample_done'], minTrust: {}, season: null },
  rightEscalation: 'inform', followupWeeks: 4, baseRate: 'attr-25-1-90', lesson: 'sampling-population',
  title: 'המדגם של {contact}', body: '{contact} {contact:שלח|שלחה} מייל ל{client}. {אתה|את} בשבוע השני.',
  hint: 'hint', pushback: 'pushback',
  framings: [{ id: 'f1', text: 'f1', quality: 3 }, { id: 'f2', text: 'f2', quality: 1 }, { id: 'f3', text: 'f3', quality: 1 }, { id: 'f4', text: 'f4', quality: 0 }],
  info: [
    { id: 'pop', kind: 'decisive', hours: 2, label: 'population', reveal: 'r1', sets: 'asked_population' },
    { id: 'method', kind: 'decisive', hours: 1, label: 'method', reveal: 'r2', sets: 'asked_method' },
    { id: 'gossip', kind: 'noise', hours: 1, label: 'gossip', reveal: 'r3' },
    { id: 'lastyear', kind: 'trap', hours: 2, label: 'lastyear', reveal: 'r4', effect: { energy: -2 } }
  ],
  failureModes: [
    { id: 'm1', text: 'm1', signal: 's1', forOptions: ['a'] }, { id: 'm2', text: 'm2', signal: 's2', forOptions: ['b'] },
    { id: 'm3', text: 'm3', signal: 's3', forOptions: ['c'] }, { id: 'm4', text: 'm4', signal: 's4', forOptions: ['d'] }
  ],
  rationales: [{ id: 'r1', text: 'r1', fits: ['a'] }, { id: 'r2', text: 'r2', fits: ['b', 'c'] }, { id: 'r3', text: 'r3', fits: ['d'] }],
  options: [
    { id: 'a', label: 'a', quality: 0, tags: ['shortcut', 'client-pleasing'], biasTags: ['anchoring', 'social-pressure'], reversible: false, escalation: 'none',
      immediate: { energy: -1, 'eng.quality': -4, 'eng.work': 1, 'trust.contact': 6, 'flag.kyc_sample_done': 1 },
      result: { pGood: 0.3, good: { text: 'g', effect: {} }, bad: { text: 'b', effect: { confidence: -2 } } },
      delayed: [{ after: 4, prob: 0.7, failureMode: 'm1', text: 'regulator found it', effect: { 'eng.quality': -15, confidence: -8, integrity: -4, 'flag.kyc_missed_file': 1 } }],
      feedback: { why: 'w', expert: 'e', bias: 'b', rule: 'r' } },
    { id: 'b', label: 'b', quality: 2, needsInfo: 'asked_population', tags: ['documentation'], biasTags: ['procedure-bias'], reversible: true, escalation: 'none',
      immediate: { energy: -1, 'eng.quality': 4, 'flag.kyc_sample_done': 1 },
      result: { pGood: 0.6, good: { text: 'g', effect: { 'eng.quality': 3 } }, bad: { text: 'b', effect: {} } },
      delayed: [{ after: 3, prob: 0.4, failureMode: 'm2', text: 'extend', effect: { 'eng.work': -1 } }],
      feedback: { why: 'w', expert: 'e', bias: 'b', rule: 'r' } },
    { id: 'c', label: 'c', quality: 3, gate: { info: ['asked_population'] }, gateText: 'needs population', tags: ['documentation', 'initiative'], biasTags: [], reversible: true, escalation: 'inform',
      immediate: { energy: -2, 'eng.quality': 8, 'trust.contact': -3, 'flag.kyc_sample_done': 1 },
      result: { pGood: 0.75, good: { text: 'g', effect: { rep: 3, 'flag.finding_kyc_def': 1 } }, bad: { text: 'b', effect: { 'trust.contact': -2 } } },
      delayed: [{ after: 6, prob: 0.5, failureMode: 'm3', text: 'late evidence', effect: { 'eng.work': -1 } }],
      feedback: { why: 'w', expert: 'e', bias: 'b', rule: 'r' } },
    { id: 'd', label: 'd', quality: 1, tags: ['escalate'], biasTags: ['responsibility-transfer'], reversible: true, escalation: 'escalate',
      immediate: { 'trust.manager': -2, 'flag.kyc_sample_done': 1 },
      result: { pGood: 0.5, good: { text: 'g', effect: {} }, bad: { text: 'b', effect: { 'eng.work': -1 } } },
      delayed: [], feedback: { why: 'w', expert: 'e', bias: 'b', rule: 'r' } }
  ],
  rubric: { framing: 15, info: 20, noise: 5, option: 20, premortem: 10, reversibility: 10, escalation: 10, memo: 5, followup: 5 }
}
const light = (id, extra) => Object.assign({ id, family: 'fam-' + id, bank: 'decision', journal: 'light', tier: [1], domain: 'control', sector: ['*'], engType: ['*'], phase: '*', title: id, body: 'b', skills: [{ id: 'controls', w: 1 }],
  options: [{ id: 'x', label: 'x', quality: 3, immediate: { 'eng.quality': 2 }, result: { pGood: 0.5, good: { text: 'g', effect: {} }, bad: { text: 'b', effect: {} } }, feedback: { why: 'w', rule: 'r' } },
    { id: 'y', label: 'y', quality: 1, immediate: {}, result: { pGood: 0.5, good: { text: 'g', effect: {} }, bad: { text: 'b', effect: {} } }, feedback: { why: 'w', rule: 'r' } }] }, extra || {})
const moment = (id, extra) => Object.assign({ id, bank: 'moment', journal: 'light', tier: [1, 2], matchType: ['validation', 'present', 'ac', 'inspection', 'incident'], sector: ['*'], engType: ['*'], title: id, body: 'b', rightEscalation: 'none',
  ticker: { hostile: ['h1', 'h2', 'h3'], neutral: ['n1', 'n2', 'n3'], friendly: ['f1', 'f2', 'f3'] }, skills: [{ id: 'client', w: 1 }],
  options: [{ id: 'good', label: 'g', quality: 3, escalation: 'none', immediate: { 'eng.quality': 3 }, result: { pGood: 0.8, good: { text: 'g', effect: {} }, bad: { text: 'b', effect: {} } }, feedback: { why: 'w', rule: 'r' } },
    { id: 'weak', label: 'w', quality: 1, escalation: 'none', immediate: { 'eng.quality': -2 }, result: { pGood: 0.5, good: { text: 'g', effect: {} }, bad: { text: 'b', effect: {} } }, feedback: { why: 'w', rule: 'r' } },
    { id: 'prepGated', label: 'p', quality: 3, escalation: 'none', gate: { prep: 60 }, immediate: {}, result: { pGood: 0.9, good: { text: 'g', effect: {} }, bad: { text: 'b', effect: {} } }, feedback: { why: 'w', rule: 'r' } },
    { id: 'trustGated', label: 't', quality: 3, escalation: 'none', gate: { trust: { id: 'manager', min: 60 } }, immediate: {}, result: { pGood: 0.9, good: { text: 'g', effect: {} }, bad: { text: 'b', effect: {} } }, feedback: { why: 'w', rule: 'r' } }] }, extra || {})

function fixture(over) {
  const c = {
    strings: {
      'tier.1.title': '{אנליסט|אנליסטית}', 'friday.line': 'תוצאה {o}/10 · תהליך {p}/10', 'hello': '{contact} {contact:אמר|אמרה} ל{manager:מנהל|מנהלת} ש{אתה|את} {מוכן|מוכנה}',
      'pattern.good-process-bad-luck': '{k} פעמים — זה מזל, לא {אתה|את}', 'skill.decayed': 'לא תרגלת {n} שבועות', 'band.1': 'b1',
      'skill.testing': 'בדיקה', 'journal.export.heading': '## שבוע {week}', 'journal.export.question': 'השאלה', 'journal.export.known': 'מה ידעתי', 'journal.export.options': 'חלופות', 'journal.export.decided': 'מה החלטתי', 'journal.export.signal': 'מה יוכיח שטעיתי', 'journal.export.when': 'מתי בודקים'
    },
    cast: [
      { id: 'naama', name: 'נעמה', gender: 'f', role: 'mentor', firmId: 'ofek', trust0: 55 },
      { id: 'uri', name: 'אורי', gender: 'm', role: 'manager', firmId: 'ofek', trust0: 45 },
      { id: 'tom', name: 'תום', gender: 'm', role: 'rival', firmId: 'ofek' },
      { id: 'regulator', name: 'הרפרנט', gender: 'm', role: 'regulator' },
      { id: 'dalia', name: 'דליה', gender: 'f', role: 'acChair' }
    ],
    stakeholders: [
      { id: 'anat', name: 'ענת', gender: 'f', clientId: 'bank-alon', trust0: 35 },
      { id: 'alon-ia', name: 'מיכל', gender: 'f', clientId: 'bank-alon', trust0: 35 },
      { id: 'yossi', name: 'יוסי', gender: 'm', clientId: 'muni-north', trust0: 35 }
    ],
    clients: [
      { id: 'bank-alon', name: 'בנק אלון', sector: 'bank', isox: true, contacts: ['anat'], iaId: 'alon-ia' },
      { id: 'muni-north', name: 'מועצה צפון', sector: 'muni', contacts: ['yossi'] }
    ],
    firms: [
      { id: 'ofek', name: 'אופק', prestige: 45, pay: 0.9, minRep: 0, need: 1, hoursPenalty: 0, promoDelta: -5, trustMult: 1.5, incidentRate: 1, tagMult: {}, infoCostMult: {}, skillGainMult: {}, repMult: {}, boardObjectives: [{ metric: 'meanQ', target: 60 }] },
      { id: 'goldstein', name: 'גולדשטיין', prestige: 90, pay: 1.4, minRep: 55, need: 0.6, hoursPenalty: 4, promoDelta: 0, trustMult: 1, incidentRate: 1, tagMult: { documentation: 1.1 }, infoCostMult: {}, skillGainMult: {}, repMult: { regulator: 1.5 }, boardObjectives: [] }
    ],
    seasons: [{ id: 't1', tier: 1, season: 1, scripted: ['bank-aml-kyc-sample-v1'], engagements: [
      { clientId: 'bank-alon', type: 'compliance', line: 3, process: 'kyc', startWeek: 2, duration: 12, managerId: 'uri', contactId: 'anat' },
      { clientId: 'muni-north', type: 'audit', line: 3, process: 'procurement', startWeek: 8, duration: 14, contactId: 'yossi' }
    ] }],
    matchTypes: [{ id: 'validation', hebrew: 'תיקוף', moments: 3, fit: { basis: { risk: 3, rules: 1 }, transparency: { full: 3, managed: 1 }, escalation: { low: 1, high: 2 } } }, { id: 'present', moments: 3, fit: {} }, { id: 'ac', moments: 5, fit: {} }, { id: 'inspection', moments: 5, fit: {} }, { id: 'incident', moments: 3, fit: {} }],
    'scenarios.fieldwork': [S7],
    'scenarios.wild': [light('wild-1'), light('wild-2'), light('wild-3'), light('wild-4')],
    'scenarios.other': [light('t2-only', { tier: [2], sector: ['bank'], phase: 'planning' }), light('bank-planning', { phase: 'planning', sector: ['bank'], engType: ['compliance'] })],
    moments: [moment('mo-1'), moment('mo-2'), moment('mo-3'), moment('mo-4'), moment('mo-5')],
    events: [{ id: 'ev-fixed', bank: 'event', journal: 'none', week: 3, tier: [1], title: 'fixed', text: 't', sender: 'system', effect: { energy: -1, 'flag.ev_fixed': 1 } }],
    deliverables: [{ id: 'gate-t1', kind: 'gate', tier: 1, parts: [{ id: 'p1', kind: 'slots', weight: 100, slots: [{ id: 's1', candidates: [{ id: 'c1', pts: 20 }, { id: 'c2', pts: 10 }] }, { id: 's2', candidates: [{ id: 'c3', pts: 20 }, { id: 'c4', pts: 0 }] }] }] }],
    drills: [{ id: 'd-testing', skill: 'testing', items: [1, 2, 3, 4, 5].map(i => ({ q: 'q' + i, options: [{ text: 'a', correct: true }, { text: 'b' }] })) }],
    baseRates: [{ id: 'attr-25-1-90', n: 25, dev: 1, conf: 90, upper: 15, source: 's' }]
  }
  return Object.assign(c, over || {})
}
const load = over => MM.loadContent(fixture(over))
const game = (opts) => MM.newGame(Object.assign({ name: 'דנה', gender: 'f', seed: 42, firmId: 'ofek' }, opts || {}))
const engOf = (st, clientId) => st.engagements.find(e => e.clientId === clientId)
// Play the §7 room on the perfect path through the public API; returns the finalize result.
function perfectPath(st, item) {
  assert.ok(MM.openScenario(st, item.id).ok)
  MM.chooseFraming(st, item.id, 'f1'); MM.buyInfo(st, item.id, 'pop'); MM.buyInfo(st, item.id, 'method')
  const ch = MM.choose(st, item.id, 'c'); assert.equal(ch.pending, true)
  MM.choosePremortem(st, item.id, 'm3')
  return MM.submitMemo(st, item.id, { rationaleId: 'r2', followupWeeks: 4 })
}

// ───────── tests ─────────
test('loadContent merges scenarios.* and throws on duplicate ids', () => {
  const c = load(); assert.equal(c.scenarios.length, 7); assert.equal(c.moments.length, 5)
  assert.throws(() => MM.loadContent(fixture({ 'scenarios.dup': [S7] })), /duplicate scenario id/)
  load()
})

test('t() resolves both token families, params and missing keys', () => {
  load(); const st = game({ gender: 'f' })
  assert.equal(MM.t('tier.1.title', {}, st), 'אנליסטית')
  st.player.gender = 'm'; assert.equal(MM.t('tier.1.title', {}, st), 'אנליסט')
  const eng = engOf(st, 'bank-alon'); const ctx = MM.ctxFor(st, eng.id)
  assert.equal(MM.t('hello', {}, ctx), 'ענת אמרה למנהל שאתה מוכן')
  st.player.gender = 'f'; assert.equal(MM.t('hello', {}, MM.ctxFor(st, eng.id)), 'ענת אמרה למנהל שאת מוכנה')
  assert.equal(MM.t('friday.line', { o: 8.1, p: 10 }), 'תוצאה 8.1/10 · תהליך 10/10')
  assert.equal(MM.t('no.such.key', { x: 1 }), 'no.such.key')
  assert.equal(MM.fill('{dalia:אומר|אומרת} {client}', {}, MM.ctxFor(st, eng.id)), 'אומרת בנק אלון')
  assert.equal(MM.fill('{missing}', {}, ctx), '')
})

test('deterministic tick with a fixed seed', () => {
  load(); const a = game({ seed: 7 }), b = game({ seed: 7 }), c = game({ seed: 8 })
  for (let i = 0; i < 20; i++) { MM.tick(a); MM.tick(b); MM.tick(c) }
  assert.equal(MM.exportJSON(a), MM.exportJSON(b))
  assert.notEqual(a.rng.s, c.rng.s)
  assert.equal(a.week, 21); assert.equal(a.season, 1)
})

test('effect DSL: caps, unknown keys, trust targets, flags mirrored into memory, rep blocked below integrity 60', () => {
  load(); const st = game(); MM.tick(st); const eng = engOf(st, 'bank-alon'); eng.status = 'active'
  const q0 = eng.quality, c0 = st.player.confidence
  const ap = MM.applyEffect(st, { 'eng.quality': 40, confidence: 30, bogus: 5, 'skill.testing': 2, 'flag.anat.annoyed': 1, 'trust.contact': 4, 'trust.nobody': 3 }, { engId: eng.id })
  assert.equal(eng.quality - q0, 15); assert.equal(st.player.confidence - c0, 10); assert.equal(ap.skills.testing, 0.3)
  assert.equal(st.player.flags['anat.annoyed'], 1); assert.equal(st.world.contacts.anat.memory.annoyed, 1)
  assert.equal(ap.trust.anat, 6) // +4 × trustMult 1.5
  assert.equal(ap.trust.nobody, undefined)
  const ap2 = MM.applyEffect(st, { 'eng.quality': 5 }, { engId: eng.id, applied: ap }); assert.equal(ap2.engQuality, 15) // cap holds across the same decision
  st.player.integrity = 50; const r0 = st.player.rep; MM.applyEffect(st, { rep: 5 }); assert.equal(st.player.rep, r0)
  MM.applyEffect(st, { rep: -3 }); assert.equal(st.player.rep, r0 - 3)
  st.weekDelta.confidence = 0; MM.applyEffect(st, { confidence: 10 }); MM.applyEffect(st, { confidence: 10 }); assert.equal(st.weekDelta.confidence, 12) // weekly cap
})

test('rubric: the §7 example scores 100 on the perfect path; escalation ordinal and calibration', () => {
  load()
  const perfect = { framingId: 'f1', infoBought: ['pop', 'method'], optionId: 'c', failureModeId: 'm3', rationaleId: 'r2', followupWeeks: 4 }
  const r = MM.score(S7, perfect); assert.equal(r.P, 100); assert.equal(r.calibration, 'right'); assert.equal(r.craft, 100)
  const d = MM.score(S7, Object.assign({}, perfect, { optionId: 'd', failureModeId: 'm4', rationaleId: 'r3' }))
  assert.equal(d.items.escalation.pts, 5); assert.equal(d.calibration, 'early'); assert.equal(d.items.option.pts, 20 / 3)
  const a = MM.score(S7, Object.assign({}, perfect, { optionId: 'a', failureModeId: 'm1', rationaleId: 'r1' }))
  assert.equal(a.items.escalation.pts, 5); assert.equal(a.calibration, 'late'); assert.equal(a.items.reversibility.pts, 0)
  const far = MM.score(Object.assign({}, S7, { rightEscalation: 'escalate' }), Object.assign({}, perfect, { optionId: 'a' })); assert.equal(far.items.escalation.pts, 0)
  const noisy = MM.score(S7, Object.assign({}, perfect, { infoBought: ['pop', 'method', 'gossip'] })); assert.equal(noisy.items.noise.pts, 2.5)
  const adj = MM.score(S7, Object.assign({}, perfect, { followupWeeks: 8 })); assert.equal(adj.items.followup.pts, 2.5)
  const none = MM.score(S7, Object.assign({}, perfect, { infoBought: [] })); assert.equal(none.items.info.pts, 0); assert.equal(none.craft, 50)
  const lt = MM.score(light('l'), { optionId: 'x' }); assert.equal(lt.P, 100); assert.equal(Object.keys(lt.items).join(','), 'option')
  assert.equal(r.process.gather, 100); assert.equal(none.process.gather, 20)
})

test('needsInfo / gate gating: greyed with reason, chooseable after the info is bought', () => {
  load(); const st = game(); const item = st.inbox.find(i => i.scenarioId === S7.id); assert.ok(item, 'scripted first scenario drawn at week 1')
  const room = MM.openScenario(st, item.id); assert.ok(room.ok)
  const c = room.options.find(o => o.id === 'c'); assert.equal(c.locked, true); assert.equal(c.lock.text, 'needs population')
  const b = room.options.find(o => o.id === 'b'); assert.equal(b.locked, true); assert.equal(b.lock.key, 'gate.info'); assert.equal(b.lock.params.info, 'population')
  const bad = MM.choose(st, item.id, 'c'); assert.equal(bad.ok, false); assert.equal(bad.error.key, 'gate.locked')
  const h0 = st.budget.hours; const bi = MM.buyInfo(st, item.id, 'pop'); assert.equal(bi.ok, true); assert.equal(bi.reveal, 'r1'); assert.equal(st.budget.hours, h0 - 2)
  assert.equal(MM.openScenario(st, item.id).options.find(o => o.id === 'c').locked, false)
  st.budget.hours = 0; assert.equal(MM.buyInfo(st, item.id, 'method').error.key, 'budget.notEnough')
})

test('full room end to end: journal entry, applied deltas, outcome score, follow-up queued', () => {
  load(); const st = game(); const item = st.inbox.find(i => i.scenarioId === S7.id)
  const eng = engOf(st, 'bank-alon'); const q0 = eng.quality
  const res = perfectPath(st, item)
  assert.equal(res.ok, true); assert.equal(res.entry.P, 100); assert.equal(res.entry.kind, 'full')
  assert.equal(st.budget.rooms, 1); assert.equal(st.journal.length, 1)
  assert.equal(res.entry.applied.engQuality, 8); assert.equal(eng.quality - q0, 8)
  assert.equal(res.entry.applied.trust.anat, res.entry.luck.good ? -3 : -5)
  const O = res.entry.luck.good ? 8.1 : 4.2; assert.equal(res.entry.O, O)
  assert.equal(res.friday.params.o, O); assert.equal(res.friday.params.p, 10)
  assert.ok(st.queue.some(q => q.kind === 'followup' && q.journalId === res.entry.id && q.due === MM.absWeek(st) + 4))
  assert.equal(st.inbox.some(i => i.id === item.id), false)
  assert.equal(st.player.flags.kyc_sample_done, 1)
  assert.ok(st.player.skills.testing.obs === 1 && st.player.skills.gather.obs === 1 && st.player.skills.framing.obs === 1)
})

test('delayed consequences are rolled at enqueue time and stored; applied updates in place when they land', () => {
  load(); const st = game(); const item = st.inbox.find(i => i.scenarioId === S7.id)
  MM.openScenario(st, item.id); MM.chooseFraming(st, item.id, 'f1')
  const ch = MM.choose(st, item.id, 'a'); assert.equal(ch.pending, true)
  MM.choosePremortem(st, item.id, 'm1'); const res = MM.submitMemo(st, item.id, { rationaleId: 'r1', followupWeeks: 2 })
  const e = res.entry; assert.equal(e.delayed.length, 1); assert.equal(typeof e.delayed[0].rolled, 'boolean'); assert.equal(e.delayed[0].due, MM.absWeek(st) + 4)
  const queued = st.queue.filter(q => q.kind === 'consequence'); assert.equal(queued.length, e.delayed[0].rolled ? 1 : 0)
  const snapshot = MM.exportJSON(st)
  for (let i = 0; i < 4; i++) MM.tick(st)
  if (e.delayed[0].rolled) {
    assert.equal(e.delayed[0].landed, true); assert.equal(e.consequences.length, 1); assert.equal(e.consequences[0].failureMode, 'm1'); assert.equal(e.consequences[0].premortemHit, true)
    assert.ok(e.applied.engQuality <= -4 - 15 + 0.001); assert.ok(e.applied.confidence < 0); assert.equal(st.player.flags.kyc_missed_file, 1)
    assert.equal(e.O, MM.outcome(e.applied, e.luck.good))
    assert.ok(st.inbox.some(i => i.type === 'consequence' && i.journalId === e.id))
    // reload changes nothing: the same consequence lands at the same week with the same effect
    const st2 = MM.importJSON(snapshot).state; for (let i = 0; i < 4; i++) MM.tick(st2)
    assert.equal(MM.journalEntry(st2, e.id).applied.engQuality, e.applied.engQuality)
  } else assert.equal(e.consequences.length, 0)
  // the follow-up arrives no later than the consequence (2 weeks here)
  assert.ok(e.followup || st.inbox.some(i => i.type === 'followup' && i.journalId === e.id) || st.journal[0].followup)
})

test('follow-up answer is compared with the record and feeds the memo skill', () => {
  load(); const st = game(); const item = st.inbox.find(i => i.scenarioId === S7.id)
  const res = perfectPath(st, item); const e = res.entry
  for (let i = 0; i < 5; i++) MM.tick(st)
  const fu = st.inbox.find(i => i.type === 'followup' && i.journalId === e.id); assert.ok(fu, 'follow-up item delivered after 4 weeks')
  const obs0 = st.player.skills.memo.obs
  const ans = MM.answerFollowup(st, fu.id, false); assert.equal(ans.ok, true); assert.equal(typeof ans.record, 'boolean'); assert.equal(e.followup.answer, false)
  assert.equal(st.player.skills.memo.obs, obs0 + 1); assert.equal(st.inbox.some(i => i.id === fu.id), false)
})

test('mastery: obs-driven K, delta formula, tier ceiling, decay after 8 idle weeks', () => {
  load(); const st = game(); const sk = st.player.skills.testing; sk.mastery = 6; sk.obs = 0; sk.peak = 6
  assert.equal(MM.mastery.K(0), 2.0); assert.equal(MM.mastery.K(5), 1.2); assert.equal(MM.mastery.K(15), 0.7)
  const d = MM.mastery(st, 'testing', 100, { w: 0.5, difficulty: 2 }); assert.equal(d, 1.4) // 2.0·0.5·2·(1−0.3)
  assert.equal(sk.mastery, 7.4); assert.equal(sk.obs, 1); assert.equal(sk.peak, 7.4)
  MM.mastery(st, 'testing', 100, { drill: true }); assert.equal(sk.obs, 1.5)
  sk.mastery = 11.9; sk.obs = 20; MM.mastery(st, 'testing', 100, { w: 1, difficulty: 3 }); assert.equal(sk.mastery, 12) // tier-1 ceiling
  sk.peak = 12; sk.lastPracticed = MM.absWeek(st); MM.mastery.decay(st, MM.absWeek(st) + 7); assert.equal(sk.mastery, 12)
  MM.mastery.decay(st, MM.absWeek(st) + 8); assert.equal(sk.mastery, 11.85); assert.equal(sk.decayed, true)
  for (let i = 0; i < 100; i++) MM.mastery.decay(st, MM.absWeek(st) + 9 + i); assert.equal(sk.mastery, 7.2) // floor 0.6·peak
  assert.deepEqual(MM.skillNote(Object.assign({}, st, { week: st.week + 9 }), 'testing'), { key: 'skill.decayed', params: { n: 9 } })
})

test('spaced-repetition ladder: advance on ≥70, reset below 50, repeat otherwise', () => {
  load(); const st = game(); const abs = MM.absWeek(st)
  let L = MM.scheduler(st, 'testing', 80); assert.equal(L.rung, 1); assert.equal(L.due, abs + 3)
  L = MM.scheduler(st, 'testing', 60); assert.equal(L.rung, 1)
  L = MM.scheduler(st, 'testing', 90); assert.equal(L.rung, 2); assert.equal(L.due, abs + 7)
  L = MM.scheduler(st, 'testing', 40); assert.equal(L.rung, 0); assert.equal(L.due, abs + 1)
  for (let i = 0; i < 9; i++) MM.scheduler(st, 'testing', 100); assert.equal(L.rung, 4); assert.equal(L.due, abs + 30)
  st.week += 2; assert.deepEqual(MM.scheduler.due(Object.assign({}, st, { player: Object.assign({}, st.player, { ladder: { testing: { rung: 0, due: abs + 1 } } }) })), ['testing'])
})

test('energy: fixed point of a normal week in [60, 72]; a crunch drops below 30 within 5 weeks', () => {
  const normal = MM.energyTrajectory({ work: 3, learn: 1, network: 1, unspent: 8, rooms: 1.35, matches: 0.3 }, 30, 80, 0)
  const fp = normal[normal.length - 1]; assert.ok(fp >= 60 && fp <= 72, 'fixed point ' + fp)
  const crunch = MM.energyTrajectory({ work: 5, rooms: 2, matches: 1, unspent: 0 }, 5, fp, 0)
  assert.ok(crunch.some(e => e < 30), 'crunch ' + crunch.join(','))
  const bigFour = MM.energyTrajectory({ work: 5, rooms: 2, matches: 1, unspent: 0 }, 3, fp, 4); assert.ok(bigFour[3] < 30, 'hoursPenalty 4 → below 30 in 3 weeks: ' + bigFour.join(','))
  load(); const st = game(); st.player.energy = 60; st.budget.rest = 1; st.budget.hours = 8
  const d = MM.energyStep(st, st.budget); assert.equal(d, 10 + 15 + 4); assert.equal(st.player.energy, 89)
})

test('spendBlock: hours are hard, work adds units (+1 with contact trust ≥ 60), learn returns a drill', () => {
  load(); const st = game(); MM.tick(st); const eng = engOf(st, 'bank-alon'); assert.equal(eng.status, 'active')
  const r = MM.spendBlock(st, 'work', { engId: eng.id }); assert.equal(r.units, 1); assert.equal(eng.work, 1); assert.equal(st.budget.hours, 32)
  st.world.contacts.anat.trust = 60; assert.equal(MM.spendBlock(st, 'work', { engId: eng.id }).units, 2)
  const l = MM.spendBlock(st, 'learn', { skillId: 'testing' }); assert.equal(l.drill.id, 'd-testing'); assert.equal(l.drill.items.length, 5)
  const dr = MM.runDrill(st, 'd-testing', [0, 0, 0, 0, 1]); assert.equal(dr.score, 80); assert.equal(st.player.skills.testing.obs, 0.5)
  const n = MM.spendBlock(st, 'network', { personId: 'uri' }); assert.equal(n.gain, 4.5); assert.equal(st.budget.hours, 12)
  MM.spendBlock(st, 'rest'); assert.equal(st.budget.hours, 4); assert.equal(MM.spendBlock(st, 'work', { engId: eng.id }).error.key, 'budget.notEnough')
  assert.equal(MM.spendBlock(st, 'work', { engId: 'nope' }).error.key, 'budget.needsEngagement')
})

test('phase advance, match scheduling at W+1, placement at the tick into W+1, auto-resolve at the tick out of it', () => {
  load(); const st = game(); MM.tick(st); const eng = engOf(st, 'bank-alon') // week 2, active
  eng.phase = 'findings'; eng.work = 2
  MM.tick(st) // tick into week 3: findings complete → match scheduled for week 4
  assert.equal(st.week, 3); const m = st.matches.find(x => x.engId === eng.id); assert.ok(m); assert.equal(m.week, 4); assert.equal(m.type, 'validation'); assert.equal(m.placed, false); assert.equal(eng.phase, 'findings')
  MM.tick(st) // into week 4: placed in the inbox with 3 moments
  assert.equal(m.placed, true); assert.equal(m.moments.length, 3); assert.ok(st.inbox.some(i => i.type === 'moment' && i.matchId === m.id))
  const c0 = st.player.confidence
  const r = MM.tick(st) // into week 5: unplayed → auto-resolved
  assert.equal(m.played, true); assert.equal(m.auto, true); assert.ok(r.notes.some(n => n.key === 'match.autoResolved'))
  assert.equal(eng.phase, 'report'); assert.ok(st.player.confidence < c0); assert.equal(st.inbox.some(i => i.matchId === m.id), false)
  assert.equal(st.stats.ratings[0].auto, true); assert.equal(st.stats.ratings[0].player, 4) // 2 + 8·(1/3) + 0.01·(prep−50)
  // planning → fieldwork advances without a match; present → closed through the present match
  eng.phase = 'present'; eng.work = 1; MM.tick(st); MM.tick(st); const m2 = st.matches.find(x => x.engId === eng.id && x.type === 'present'); assert.ok(m2)
  MM.resolveMatch(st, m2.id, { auto: true }); assert.equal(eng.phase, 'closed'); assert.equal(eng.status, 'closed')
})

test('match play: prep/fit, hostility rolled at start, gate.prep and gate.trust, ratings and engagement exit', () => {
  load(); const st = game({ seed: 3 }); MM.tick(st); const eng = engOf(st, 'bank-alon')
  for (let i = 0; i < 3; i++) MM.spendBlock(st, 'work', { engId: eng.id })
  const m = MM.scheduleMatch(st, eng.id, 'validation', st.week); assert.equal(m.placed, true)
  MM.setApproach(st, { basis: 'risk', transparency: 'full', escalation: 'high' })
  const v0 = MM.matchView(st, m.id); assert.equal(v0.fit, 2.67); assert.equal(v0.prep, Math.round(36 + 0.4 * eng.quality + 5 * 2.67))
  st.world.contacts['alon-ia'].trust = 60; assert.equal(MM.computePrep(st, m, st.player.approach).prep, v0.prep + 10)
  const s = MM.startMatch(st, m.id); assert.equal(s.ok, true); assert.equal(m.hostility.length, 3); assert.ok(['hostile', 'neutral', 'friendly'].includes(m.hostility[0])); assert.equal(st.budget.matches, 1)
  const v = MM.matchView(st, m.id); assert.equal(v.moment.ticker.length, 3)
  const pg = v.moment.options.find(o => o.id === 'prepGated'); assert.equal(pg.locked, m.prep < 60); if (pg.locked) assert.equal(pg.lock.key, 'gate.prep')
  const tg = v.moment.options.find(o => o.id === 'trustGated'); assert.equal(tg.locked, true); assert.equal(tg.lock.key, 'gate.trust'); assert.equal(tg.lock.params.name, 'אורי')
  assert.equal(MM.playMoment(st, m.id, 'trustGated').error.key, 'gate.locked')
  const r1 = MM.playMoment(st, m.id, 'good'); assert.equal(r1.ok, true); assert.equal(r1.entry.kind, 'moment'); assert.equal(r1.entry.matchId, m.id); assert.equal(r1.done, false)
  MM.playMoment(st, m.id, 'good'); const r3 = MM.playMoment(st, m.id, 'good'); assert.equal(r3.done, true); assert.ok(r3.summary)
  assert.equal(m.played, true); assert.ok(m.ratings.player >= 8); assert.ok(m.ratings.participants.anat >= 1)
  assert.equal(st.journal.filter(e => e.kind === 'moment').length, 3)
})

test('draw fallback ladder: exact match rung 0, wildcard-only rung 4, no active engagement starts at 4, tier relax rung 5 shows the content-ends card once', () => {
  load(); let st = game({ seed: 11 }); st.scriptedLeft = []; st.inbox = []
  // week 1: no active engagement → wildcard rung
  let it = MM.drawOne(st); assert.ok(it); assert.equal(it.rung, 4); assert.ok(it.scenarioId.startsWith('wild-'))
  MM.tick(st); st.inbox = []; const eng = engOf(st, 'bank-alon'); eng.phase = 'fieldwork'
  st.player.flags = {}; st.seen = {}
  it = MM.drawOne(st); assert.equal(it.rung, 0); assert.equal(it.scenarioId, S7.id); assert.equal(it.engId, eng.id)
  st.inbox = []; it = MM.drawOne(st); assert.equal(it.rung, 1); assert.equal(it.scenarioId, 'bank-planning') // phase dropped
  st.inbox = []; it = MM.drawOne(st); assert.equal(it.rung, 4) // only wildcards left (rungs 2–3 have nothing new)
  // tier relax: a tier-3 player with only tier-1/2 content
  st = game({ seed: 12, tier: 3 }); st.scriptedLeft = []; st.inbox = []; MM.tick(st); st.inbox = []
  it = MM.drawOne(st); assert.ok(it); assert.equal(it.rung, 5); assert.equal(st.contentEndShown, true); assert.equal(st.inbox.filter(i => i.key === 'content.endsHere').length, 1)
  st.inbox = []; MM.drawOne(st); assert.equal(st.inbox.filter(i => i.key === 'content.endsHere').length, 0)
  // cooldown relax never returns an id seen this season
  st = game({ seed: 13 }); st.scriptedLeft = []; st.inbox = []; MM.tick(st)
  const drawn = new Set(); for (let i = 0; i < 12; i++) { st.inbox = []; const d = MM.drawOne(st); if (!d) break; assert.equal(drawn.has(d.scenarioId), false); drawn.add(d.scenarioId) }
  assert.equal(st.stats.drawRungs[6], undefined)
})

test('inbox draw respects holidays, the 2-full-rooms cap and the size cap', () => {
  load(); const st = game({ seed: 5 }); st.week = 14; st.inbox = []; MM.tick(st); assert.equal(st.week, 15)
  assert.equal(st.inbox.filter(i => i.type === 'decision').length, 0); assert.ok(st.inbox.some(i => i.key === 'holiday.greeting'))
  st.inbox = []; for (let i = 0; i < 5; i++) st.inbox.push({ id: 'z' + i, type: 'news', week: st.week, season: 1, read: false, done: false })
  st.week = 20; MM.tick(st); assert.equal(st.inbox.filter(i => i.type === 'decision').length, 0); assert.ok(st.stats.deferred >= 1)
  assert.equal(MM.fullRooms(st), 0)
})

test('events fire on their fixed week with their effect applied on delivery', () => {
  load(); const st = game({ seed: 9 }); MM.tick(st); MM.tick(st); assert.equal(st.week, 3)
  assert.ok(st.inbox.some(i => i.eventId === 'ev-fixed')); assert.equal(st.player.flags.ev_fixed, 1)
})

test('trust decay after 6 idle weeks with floors; network block resets idle', () => {
  load(); const st = game(); const abs = MM.absWeek(st)
  st.world.cast.uri.trust = 45; st.world.cast.uri.idleSince = abs; st.world.contacts.yossi.trust = 12; st.world.contacts.yossi.idleSince = abs
  MM.decayTrust(st, abs + 6); assert.equal(st.world.cast.uri.trust, 45)
  MM.decayTrust(st, abs + 7); assert.equal(st.world.cast.uri.trust, 44); MM.decayTrust(st, abs + 8); assert.equal(st.world.contacts.yossi.trust, 10)
  for (let i = 0; i < 30; i++) MM.decayTrust(st, abs + 9 + i); assert.equal(st.world.cast.uri.trust, 30) // colleague floor
})

test('overdue engagement: confidence and client trust drop each week and an overdue item appears', () => {
  load(); const st = game(); MM.tick(st); const eng = engOf(st, 'bank-alon'); eng.deadline = 2
  const c0 = st.player.confidence, t0 = st.world.contacts.anat.trust; MM.tick(st)
  assert.equal(st.player.confidence, c0 - 6); assert.equal(st.world.contacts.anat.trust, t0 - 4); assert.ok(st.inbox.some(i => i.key === 'overdue' && i.engId === eng.id)); assert.equal(MM.isOverdue(st, eng), true)
})

test('low energy: info costs double, the generic shortcut option is injected and scored as quality 0', () => {
  load(); const st = game(); const item = st.inbox.find(i => i.scenarioId === S7.id); st.player.energy = 20
  const room = MM.openScenario(st, item.id); assert.equal(room.info.find(i => i.id === 'pop').hours, 4); assert.equal(room.lowEnergy, true)
  const sc = room.options.find(o => o.generic); assert.ok(sc); assert.equal(sc.labelKey, 'shortcut.option')
  const res = MM.choose(st, item.id, sc.id); assert.equal(res.pending, true); const fin = MM.submitMemo(st, item.id, { rationaleId: 'r1', followupWeeks: 4 })
  assert.equal(fin.entry.option.quality, 0); assert.equal(fin.entry.applied.engQuality, -4); assert.equal(fin.feedback.whyKey, 'shortcut.why')
})

test('patterns: good-process-bad-luck and info-skipped detectors fire from journal entries; at most 5 lines', () => {
  load(); const st = game()
  const mk = (P, O, extra) => Object.assign({ id: 'j' + Math.random(), kind: 'light', season: 1, week: 2, P, O, option: { quality: 0, tags: [], escalation: 'none' }, info: { decisiveTotal: 1, decisiveBought: 0, noise: [], offered: 0 }, rubric: {}, consequences: [], applied: MM.outcome ? { confidence: 0, rep: 0, engQuality: 0, trust: {} } : {}, energy: 50, calibration: null, family: 'f' }, extra || {})
  st.journal = [mk(80, 3), mk(75, 4), mk(90, 2), mk(20, 8), mk(30, 9)]
  const ps = MM.patterns(st); const ids = ps.map(p => p.id)
  assert.ok(ids.includes('good-process-bad-luck')); assert.ok(ids.includes('bad-process-good-luck')); assert.ok(ids.includes('info-skipped-decisive-missed'))
  assert.equal(ps.find(p => p.id === 'good-process-bad-luck').params.k, 3); assert.ok(ps.length <= 5)
  assert.equal(MM.t(ps.find(p => p.id === 'good-process-bad-luck').key, ps.find(p => p.id === 'good-process-bad-luck').params, st), '3 פעמים — זה מזל, לא את')
  assert.equal(MM.patterns(Object.assign({}, st, { journal: st.journal.slice(0, 3) })).length, 0) // minN = 4
})

test('quarter close, season end, promotion verdict and awards; dismissal after two low quarters', () => {
  load(); const st = game({ seed: 21 }); st.scriptedLeft = []
  st.week = 47; MM.tick(st); assert.equal(st.week, 48); assert.ok(st.matches.some(m => m.type === 'ac' && m.week === 48))
  st.player.gate = 80; st.world.cast.naama.trust = 70; st.player.confidence = 80
  for (const e of st.engagements) e.quality = 90
  st.journal.push({ id: 'jx', kind: 'light', season: 1, week: 40, P: 95, O: 8, option: { quality: 3, tags: [], escalation: 'none' }, info: { decisiveTotal: 0, decisiveBought: 0, noise: [], offered: 0 }, rubric: {}, consequences: [], applied: { confidence: 2, rep: 0, engQuality: 5, trust: {} }, energy: 60, calibration: null, title: 't', scenarioId: S7.id })
  const r = MM.tick(st)
  assert.equal(st.season, 2); assert.equal(st.week, 1); assert.ok(r.report); assert.equal(r.report.promoted, true); assert.equal(st.player.tier, 2); assert.equal(st.milestone.key, 'ending.v1Milestone')
  assert.ok(r.report.awards.some(a => a.key === 'award.bestMemo')); assert.equal(r.report.sponsorId, 'naama'); assert.ok(r.report.topDecisions.length >= 1)
  assert.equal(st.engagements.filter(e => e.season === 2).length, 5) // tier-2 template absent → default portfolio
  // dismissal
  const d = game({ seed: 22 }); d.week = 11; d.player.confidence = 10; MM.tick(d); assert.equal(d.counters.lowConfQuarters, 1); assert.equal(d.stats.dismissals, 0)
  d.week = 23; d.player.confidence = 10; d.player.rep = 40; MM.tick(d); assert.equal(d.stats.dismissals, 1); assert.equal(d.player.rep, 20); assert.ok(d.inbox.some(i => i.key === 'dismissal.confidence'))
})

test('losing conditions: ethics ending, forced leave, material failure', () => {
  load(); let st = game(); st.player.integrity = 15; MM.tick(st); assert.equal(st.ended.key, 'ending.ethics'); assert.equal(MM.tick(st).ended.key, 'ending.ethics')
  st = game(); st.counters.lowEnergyWeeks = 3; st.player.energy = 5; st.budget.work = 5; const m0 = st.player.skills.testing.mastery; MM.tick(st)
  assert.ok(st.leaveUntil > MM.absWeek(st)); assert.equal(st.player.skills.testing.mastery, m0 - 0.5); assert.equal(MM.spendBlock(st, 'rest').error.key, 'leave.forced')
  st = game(); st.player.flags.material_failure = 1; st.player.rep = 10; MM.tick(st); assert.equal(st.stats.dismissals, 1)
})

test('offers: transfer window probability, accept resets confidence and keeps attributes/journal/memory', () => {
  load(); const st = game({ seed: 2 }); st.player.rep = 95; st.season = 2; st.week = 1; st.inbox = []
  MM.rollOffers(st, []); const offer = st.inbox.find(i => i.type === 'offer'); assert.ok(offer, 'p = 0.9·0.6 with rep 95 and seed 2')
  st.world.cast.naama.memory.x = 1; const j = st.journal.length
  const r = MM.acceptOffer(st, offer.id); assert.equal(r.ok, true); assert.equal(st.firm.id, 'goldstein'); assert.equal(st.player.confidence, 50); assert.equal(st.world.cast.naama.memory.x, 1); assert.equal(st.journal.length, j)
  assert.equal(st.firm.mentorId, null) // no mentor at the new firm → no sponsor
})

test('deliverables: slots scoring and gate recording in weeks 44–47; order/ratings/match part scorers', () => {
  load(); const st = game(); st.week = 44
  assert.equal(MM.gateAvailable(st), true)
  const r = MM.submitDeliverable(st, 'gate-t1', { p1: { s1: 'c1', s2: 'c4' } }); assert.equal(r.score, 50); assert.equal(r.gate, true); assert.equal(st.player.gate, 50); assert.equal(MM.gateAvailable(st), false)
  assert.equal(MM.scorePart({ kind: 'order', answer: ['a', 'b', 'c', 'd'] }, ['a', 'b', 'c', 'd']), 100)
  assert.equal(MM.scorePart({ kind: 'order', answer: ['a', 'b', 'c', 'd'] }, ['d', 'c', 'b', 'a']), 0)
  assert.equal(MM.scorePart({ kind: 'ratings', max: 5, items: [{ id: 'i', answer: { l: 4, i: 2 } }] }, { i: { l: 4, i: 4 } }), 75)
  assert.equal(MM.scorePart({ kind: 'match', pairs: [{ left: 'f1', right: 'r1', reason: 'ok' }, { left: 'f2', right: 'r2', reason: 'no' }] }, [{ left: 'f1', right: 'r1', reason: 'ok' }, { left: 'f2', right: 'r1', reason: 'no' }]), 30)
  const def = MM.deliverable(st, 'gate-t1'); assert.equal(def.parts[0].slots[0].candidates[0].pts, undefined)
})

test('save/load through a storage adapter, migration by state.v, stale-save import drops unknown ids', () => {
  load(); const st = game(); const store = { m: {}, getItem(k) { return this.m[k] ?? null }, setItem(k, v) { this.m[k] = v } }
  assert.equal(MM.save(st, store, 2), true); const back = MM.load(store, 2); assert.equal(back.state.seed, st.seed); assert.equal(MM.slotSummary(store, 2).name, 'דנה')
  assert.equal(MM.save(st, { setItem() { throw new Error('quota') } }), false); assert.equal(MM.load(store, 3), null)
  MM.migrations.push({ from: 1, to: 2, fn: s => { s.player.migrated = true } })
  try { const m = MM.migrate(JSON.parse(MM.exportJSON(st))); assert.equal(m.v, 2); assert.equal(m.player.migrated, true) } finally { MM.migrations.pop() }
  const stale = JSON.parse(MM.exportJSON(st)); stale.inbox.push({ id: 'zz', type: 'decision', scenarioId: 'gone-with-the-wind', week: 1, season: 1 }); stale.queue.push({ kind: 'consequence', due: 5, scenarioId: 'gone', effect: {} })
  const imp = MM.importJSON(JSON.stringify(stale)); assert.equal(imp.ok, true); assert.equal(imp.dropped, 2); assert.deepEqual(imp.notes[0], { key: 'toast.staleContent', params: { n: 2 } })
  assert.equal(imp.state.inbox.some(i => i.id === 'zz'), false)
  assert.equal(MM.importJSON('not json').ok, false); assert.equal(MM.importJSON('{"x":1}').error.key, 'toast.importFailed')
})

test('journal export is Markdown with string headings', () => {
  load(); const st = game(); perfectPath(st, st.inbox.find(i => i.scenarioId === S7.id))
  const md = MM.exportJournal(st); assert.ok(md.startsWith('## שבוע 1')); assert.ok(md.includes('מה יוכיח שטעיתי: s3'))
})

test('engine is robust to empty content and to partial banks', () => {
  MM.loadContent({}); let st = MM.newGame({ name: 'a', gender: 'm', seed: 1 }); for (let i = 0; i < 60; i++) MM.tick(st)
  assert.equal(st.season, 2); assert.equal(st.engagements.filter(e => e.season === 1).length, 5); assert.equal(MM.t('x.y'), 'x.y')
  MM.loadContent({ 'scenarios.a': [S7] }); st = MM.newGame({ name: 'b', gender: 'f', seed: 2 }); for (let i = 0; i < 100; i++) MM.tick(st)
  assert.ok(st.season >= 2)
  const r = MM.sim({ seasons: 1, policy: 'random', seed: 1, runs: 1 }); assert.equal(r.results.length, 1)
  load()
})

test('sim harness plays seasons through the public API on the fixture', () => {
  load()
  for (const policy of ['best', 'random', 'lazy']) {
    const r = MM.sim({ seasons: 2, policy, seed: 100, runs: 2 })
    assert.equal(r.results.length, 2); assert.ok(r.results[0].energy.length >= 90); assert.ok(r.summary.energyMean > 0)
    if (policy === 'best') assert.ok(r.summary.meanP >= 80, 'best policy mean P ' + r.summary.meanP)
  }
})

test('no literal Hebrew and no closing script tag in engine.js', async () => {
  const { readFile } = await import('node:fs/promises')
  const src = await readFile(join(here, '..', 'src', 'engine.js'), 'utf8')
  assert.equal(/[֐-׿]/.test(src), false); assert.equal(src.includes('</' + 'script'), false)
  assert.ok(src.trimEnd().endsWith("})(typeof globalThis !== 'undefined' ? globalThis : this);"))
  assert.ok(src.includes("if (typeof module !== 'undefined') module.exports = MM;"))
})
