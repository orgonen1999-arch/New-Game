/* Marketing Manager — game engine.
 * Pure logic: no DOM, no storage access (the UI passes a storage adapter), no literal Hebrew.
 * Every message the engine emits is { key, params } resolved by MM.t() against content.strings.
 * ES2020, no dependencies. Inlined into one HTML by build.mjs. Never contains the closing script tag literal.
 */
(function (root) {
  'use strict';

  // ───────────────────────── constants (ids and numbers only) ─────────────────────────
  const VERSION = 1;
  const WEEKS = 48;
  const CRAFT = ['risk', 'controls', 'testing', 'evidence', 'writing', 'reg', 'interview', 'client', 'present', 'prio'];
  const PROCESS = ['framing', 'gather', 'judgment', 'premortem', 'escalation', 'memo'];
  const PARTNER = ['bd', 'positioning', 'datastory'];
  const PEOPLE = ['interview', 'client', 'present'];
  const SKILLS = CRAFT.concat(PROCESS, PARTNER);
  const PROCESS_ROWS = { framing: ['framing'], gather: ['info', 'noise'], judgment: ['option'], premortem: ['premortem', 'reversibility'], escalation: ['escalation'], memo: ['memo', 'followup'] };
  const RUBRIC_W = { framing: 15, info: 20, noise: 5, option: 20, premortem: 10, reversibility: 10, escalation: 10, memo: 5, followup: 5 };
  const ESC = { none: 0, inform: 1, escalate: 2 };
  const PHASES = ['planning', 'fieldwork', 'findings', 'report', 'present', 'closed'];
  const PHASE_WORK = { planning: 1, fieldwork: 4, findings: 2, report: 2, present: 1 };
  const PHASE_MATCH = { findings: 'validation', present: 'present' };
  const LINE2 = ['policy-writing', 'risk-survey'];
  const TIER_CEIL = [12, 15, 17, 19, 20];
  const TIER_MINS = { 2: { testing: 8, evidence: 8, writing: 8 }, 3: { client: 11, prio: 11 }, 4: { present: 14 }, 5: {} };
  const TRUST0 = { mentor: 55, partner: 55, manager: 45, rival: 40, contact: 35, clientIA: 35, regulator: 30, junior: 50 };
  const LADDER = [1, 3, 7, 14, 30];
  const FOLLOWUP_LADDER = [2, 4, 8];
  const CAPS = { engQuality: 15, confidence: 10, rep: 8, integrity: 15 };
  const WEEK_CONF_CAP = 12;
  const DSL = /^(energy|confidence|rep|rep\.regulator|integrity|eng\.quality|eng\.work|eng\.deadline|trust\.[\w-]+|skill\.[\w-]+|flag\.[\w.-]+)$/;
  const CAL = { holidays: [15, 36, 37], light: [18, 22], august: [29, 30, 31, 32], crunch: [38, 39, 40], quarters: [12, 24, 36, 48], window: [1, 6], gate: [44, 47], certification: 10, rollforward: [41, 44] };
  const FIN = ['bank', 'insurer', 'provident', 'invest', 'investment', 'pension', 'finance'];
  const HOURS = { work: 8, learn: 4, network: 4, scout: 4, rest: 8 };
  const WEEK_HOURS = 40;
  const DEFAULT_MATCH_TYPES = [
    { id: 'validation', moments: 3, fit: { basis: { risk: 3, rules: 1 }, transparency: { full: 3, managed: 1 }, escalation: { low: 1, high: 2 } } },
    { id: 'present', moments: 3, fit: { basis: { risk: 3, rules: 1 }, transparency: { full: 2, managed: 2 }, escalation: { low: 1, high: 3 } } },
    { id: 'inspection', moments: 5, fit: { basis: { risk: 1, rules: 3 }, transparency: { full: 3, managed: 0 }, escalation: { low: 0, high: 3 } } },
    { id: 'incident', moments: 3, fit: { basis: { risk: 3, rules: 1 }, transparency: { full: 3, managed: 1 }, escalation: { low: 0, high: 3 } } },
    { id: 'ac', moments: 5, fit: { basis: { risk: 3, rules: 2 }, transparency: { full: 2, managed: 2 }, escalation: { low: 2, high: 2 } } }
  ];
  const DEFAULT_FIRM = { id: 'default', name: '', prestige: 50, pay: 1, minRep: 0, need: 1, hoursPenalty: 0, promoDelta: 0, trustMult: 1, incidentRate: 1, tagMult: {}, infoCostMult: {}, skillGainMult: {}, repMult: {}, sectors: [], boardObjectives: [] };
  const DEFAULT_PORTFOLIO = [
    { type: 'audit', line: 3, process: 'procurement', startWeek: 2, duration: 12 },
    { type: 'compliance', line: 3, process: 'kyc', startWeek: 8, duration: 14 },
    { type: 'risk-survey', line: 2, process: 'operations', startWeek: 20, duration: 10 },
    { type: 'policy-writing', line: 2, process: 'gifts', startWeek: 24, duration: 8, phaseWork: { planning: 1, fieldwork: 3, findings: 1, report: 2, present: 1 } },
    { type: 'isox', line: 3, process: 'payments', startWeek: 30, duration: 14 }
  ];
  const SHORTCUT_ID = '__shortcut';

  // ───────────────────────── small utils ─────────────────────────
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round1 = v => Math.round(v * 10) / 10;
  const round2 = v => Math.round(v * 100) / 100;
  const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : (d || 0);
  const listOf = x => x == null ? [] : Array.isArray(x) ? x : [x];
  const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  const deep = x => JSON.parse(JSON.stringify(x));
  // Content banks may be arrays or objects keyed by id; always read them as arrays.
  // Content banks may be arrays or objects keyed by id (every value a plain object); anything else is not a list bank.
  const asArray = x => Array.isArray(x) ? x : (x && typeof x === 'object' && Object.keys(x).length && Object.values(x).every(v => v && typeof v === 'object' && !Array.isArray(v))) ? Object.keys(x).map(k => Object.assign({ id: k }, x[k])) : [];
  // Tag match: empty or "*" means wildcard.
  const mt = (val, want) => { const l = listOf(val); return l.length === 0 || l.includes('*') || l.includes(want); };
  const isWild = s => mt(s.phase, '__none__') && mt(s.sector, '__none__');
  const byId = (arr, id) => arr.find(x => x && x.id === id) || null;

  // ───────────────────────── seeded RNG (mulberry32, state saved) ─────────────────────────
  function hashSeed(x) { if (typeof x === 'number') return x >>> 0; let h = 2166136261; const s = String(x); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rand(state) { let s = state.rng.s = (state.rng.s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const randInt = (state, n) => Math.floor(rand(state) * n);
  const pick = (state, arr) => arr.length ? arr[randInt(state, arr.length)] : undefined;
  // Weighted pick; weights come from wf(item) and must be > 0.
  function pickWeighted(state, arr, wf) { const ws = arr.map(x => Math.max(0, num(wf(x), 1))); const total = ws.reduce((a, b) => a + b, 0); if (!total) return pick(state, arr); let r = rand(state) * total; for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r < 0) return arr[i]; } return arr[arr.length - 1]; }

  // ───────────────────────── content ─────────────────────────
  let C = emptyContent();
  const IDX = { scenarios: new Map(), moments: new Map(), events: new Map(), people: new Map(), clients: new Map(), firms: new Map() };
  function emptyContent() { return { scenarios: [], moments: [], events: [], matchTypes: [], firms: [], clients: [], cast: [], stakeholders: [], seasons: [], deliverables: [], drills: [], lessons: { frameworks: [], lessons: [] }, awards: [], ratingScales: { byEngType: {}, scales: [] }, baseRates: [], tags: { tags: [], biases: [] }, strings: {}, calendar: null }; }
  // Load the bundler's object (keyed by file stem); merges scenarios.* into one array; throws on duplicate ids.
  function loadContent(raw) {
    const c = emptyContent(); raw = raw || {};
    const ids = new Set(); const scen = [];
    for (const k of Object.keys(raw)) {
      if (k === 'scenarios' || /^scenarios\./.test(k)) {
        for (const s of asArray(raw[k])) { if (!s || !s.id) continue; if (ids.has(s.id)) throw new Error('duplicate scenario id: ' + s.id); ids.add(s.id); scen.push(s); }
      } else c[k] = raw[k];
    }
    c.scenarios = scen.filter(s => s.bank !== 'moment' && s.bank !== 'event');
    c.moments = asArray(c.moments).concat(scen.filter(s => s.bank === 'moment'));
    c.events = asArray(c.events).concat(scen.filter(s => s.bank === 'event'));
    for (const k of ['matchTypes', 'firms', 'clients', 'cast', 'stakeholders', 'seasons', 'deliverables', 'drills', 'awards', 'baseRates']) c[k] = asArray(c[k]);
    // lessons.json is { frameworks: [...], lessons: [...] }; a bare array is also accepted and wrapped
    c.lessons = Array.isArray(c.lessons) ? { frameworks: [], lessons: c.lessons } : (c.lessons && typeof c.lessons === 'object') ? { frameworks: asArray(c.lessons.frameworks), lessons: asArray(c.lessons.lessons) } : { frameworks: [], lessons: [] };
    c.tags = (c.tags && typeof c.tags === 'object' && !Array.isArray(c.tags)) ? c.tags : { tags: asArray(c.tags), biases: [] };
    c.ratingScales = (c.ratingScales && typeof c.ratingScales === 'object' && !Array.isArray(c.ratingScales)) ? c.ratingScales : { byEngType: {}, scales: asArray(c.ratingScales) };
    if (!c.matchTypes.length) c.matchTypes = deep(DEFAULT_MATCH_TYPES);
    c.strings = (c.strings && typeof c.strings === 'object') ? c.strings : {};
    c.calendar = (c.calendar && typeof c.calendar === 'object') ? c.calendar : null;
    for (const m of Object.values(IDX)) m.clear();
    for (const s of c.scenarios) IDX.scenarios.set(s.id, s);
    for (const m of c.moments) if (m && m.id) IDX.moments.set(m.id, m);
    for (const e of c.events) if (e && e.id) IDX.events.set(e.id, e);
    for (const p of c.cast) if (p && p.id) IDX.people.set(p.id, Object.assign({ kind: 'cast' }, p));
    for (const p of c.stakeholders) if (p && p.id) IDX.people.set(p.id, Object.assign({ kind: 'contact' }, p));
    for (const cl of c.clients) if (cl && cl.id) IDX.clients.set(cl.id, cl);
    for (const f of c.firms) if (f && f.id) IDX.firms.set(f.id, Object.assign({}, DEFAULT_FIRM, f));
    C = c;
    return c;
  }
  const content = () => C;
  const scenarioById = id => IDX.scenarios.get(id) || null;
  const momentById = id => IDX.moments.get(id) || null;
  const personDef = id => IDX.people.get(id) || null;
  const clientDef = id => IDX.clients.get(id) || null;
  const firmDef = id => IDX.firms.get(id) || null;
  const matchTypeDef = id => byId(C.matchTypes, id) || byId(DEFAULT_MATCH_TYPES, id) || { id, moments: 3, fit: {} };
  const lessonDef = id => byId(C.lessons.lessons, id);
  const frameworkDef = id => byId(C.lessons.frameworks, id);
  const scaleDef = id => byId(asArray(C.ratingScales.scales), id);
  const tagDef = id => byId(asArray(C.tags.tags), id) || byId(asArray(C.tags.biases), id);
  const cal = () => Object.assign({}, CAL, C.calendar || {});
  // Highest content tier that is <= the player's tier (else the overall max); used by the draw's tier-relax rung.
  function highestContentTier(tier) { let best = 0, max = 0; for (const s of C.scenarios) for (const t of listOf(s.tier)) { if (t > max) max = t; if (t <= tier && t > best) best = t; } return best || max || tier; }

  // ───────────────────────── strings: placeholders + two gender-token families ─────────────────────────
  // {masc|fem} resolves by the player's gender; {who:masc|fem} by that person's gender; {param} from params/ctx.
  function fill(text, params, ctx) {
    if (text == null) return '';
    params = params || {}; ctx = normCtx(ctx);
    return String(text).replace(/\{([^{}]*)\}/g, (m, inner) => {
      const bar = inner.indexOf('|');
      if (bar >= 0) {
        let prefix = null, body = inner;
        const colon = inner.indexOf(':');
        if (colon > 0 && colon < bar && /^[A-Za-z][\w-]*$/.test(inner.slice(0, colon))) { prefix = inner.slice(0, colon); body = inner.slice(colon + 1); }
        const alts = body.split('|');
        const g = prefix ? (ctx.genders[prefix] || 'm') : (ctx.gender || 'm');
        return g === 'f' ? (alts[1] != null ? alts[1] : alts[0]) : alts[0];
      }
      const key = inner.trim();
      if (params[key] != null) return String(params[key]);
      if (ctx.params[key] != null) return String(ctx.params[key]);
      return '';
    });
  }
  // Resolve a string key; a missing key returns the key itself (never throws).
  function t(key, params, ctx) { const s = C.strings[key]; return fill(s != null ? s : key, params, ctx); }
  function normCtx(ctx) { if (!ctx) return { gender: 'm', genders: {}, params: {} }; if (ctx.player && ctx.world) return ctxFor(ctx); return { gender: ctx.gender || 'm', genders: ctx.genders || {}, params: ctx.params || {} }; }
  // Resolve {key, params} message objects (or plain strings) for the UI.
  function msg(m, ctx) { if (m == null) return ''; if (typeof m === 'string') return fill(m, {}, ctx); return t(m.key, m.params, ctx); }
  // Build the placeholder/gender context for an engagement (or the firm-level context when engId is null).
  function ctxFor(state, engId) {
    const ctx = { gender: state.player.gender || 'm', genders: {}, params: { player: state.player.name || '', firm: firmOf(state).name || '' } };
    for (const id of IDX.people.keys()) { const p = IDX.people.get(id); ctx.genders[id] = p.gender || 'm'; ctx.params[id] = p.name || ''; }
    const roles = roleIds(state, engId);
    for (const role of Object.keys(roles)) { const id = roles[role]; const p = id ? personDef(id) : null; ctx.genders[role] = p ? (p.gender || 'm') : 'm'; ctx.params[role] = p ? (p.name || '') : ''; }
    const eng = engById(state, engId); const cl = eng ? clientDef(eng.clientId) : null;
    ctx.params.client = cl ? cl.name : '';
    ctx.params.week = state.week; ctx.params.season = state.season;
    return ctx;
  }
  // Role ids (contact, manager, mentor, regulator, ia, rival) for an engagement.
  function roleIds(state, engId) {
    const eng = engById(state, engId);
    const castByRole = r => { const p = C.cast.find(c => c.role === r && (!c.firmId || c.firmId === state.firm.id)); return p ? p.id : (C.cast.find(c => c.role === r) || {}).id || null; };
    return {
      contact: (eng && eng.contactId) || null,
      manager: (eng && eng.managerId) || state.firm.managerId || castByRole('manager'),
      mentor: state.firm.mentorId || castByRole('mentor'),
      regulator: castByRole('regulator'),
      ia: (eng && eng.iaId) || null,
      rival: castByRole('rival'),
      client: (eng && eng.contactId) || null
    };
  }
  const render = (state, text, engId, params) => fill(text, params, ctxFor(state, engId));

  // ───────────────────────── state helpers ─────────────────────────
  const absWeek = state => (state.season - 1) * WEEKS + state.week;
  const seasonOfAbs = abs => Math.floor((abs - 1) / WEEKS) + 1;
  const firmOf = state => firmDef(state.firm.id) || Object.assign({}, DEFAULT_FIRM, { id: state.firm.id });
  const engById = (state, id) => id ? (state.engagements.find(e => e.id === id) || null) : null;
  const matchById = (state, id) => state.matches.find(m => m.id === id) || null;
  const inboxItem = (state, id) => state.inbox.find(i => i.id === id) || null;
  const journalById = (state, id) => state.journal.find(j => j.id === id) || null;
  const activeEngs = state => state.engagements.filter(e => e.status === 'active' && e.phase !== 'closed');
  const tierCeiling = state => TIER_CEIL[clamp(state.player.tier, 1, 5) - 1];
  const band = m => m <= 7 ? 1 : m <= 13 ? 2 : m <= 17 ? 3 : 4;
  const integrityBand = v => v >= 80 ? 1 : v >= 50 ? 2 : v >= 20 ? 3 : 4;
  const mult = (obj, key) => (obj && typeof obj[key] === 'number') ? obj[key] : 1;
  const newBudget = () => ({ hours: WEEK_HOURS, work: 0, learn: 0, network: 0, scout: 0, rest: 0, rooms: 0, light: 0, matches: 0, info: 0, log: [] });
  const newApplied = () => ({ energy: 0, confidence: 0, rep: 0, engQuality: 0, engWork: 0, integrity: 0, trust: {}, skills: {}, flags: [] });
  const isFin = sector => FIN.includes(sector);
  // Person record (cast or client contact), created lazily with the role's default trust.
  function person(state, id) {
    if (!id) return null;
    if (state.world.cast[id]) return state.world.cast[id];
    if (state.world.contacts[id]) return state.world.contacts[id];
    const def = personDef(id); if (!def) return null;
    const rec = { trust: num(def.trust0, TRUST0[def.role] != null ? TRUST0[def.role] : 35), memory: {}, idleSince: 0 };
    if (def.kind === 'cast') state.world.cast[id] = rec; else state.world.contacts[id] = rec;
    return rec;
  }
  const trustOf = (state, id) => { const p = person(state, id); return p ? p.trust : 0; };
  // Resolve a trust target ("contact", "manager", "mentor", "client", "regulator", "ia" or a cast/contact id).
  function resolvePerson(state, who, eng) { const roles = roleIds(state, eng ? eng.id : null); if (roles[who] !== undefined) return roles[who]; return person(state, who) ? who : null; }
  // Mark a person as not idle this week (resets the 6-week idle counter).
  function touch(state, id) { const p = person(state, id); if (p) p.idleSince = absWeek(state); }
  function setFlag(state, name, v) {
    if (v) state.player.flags[name] = 1; else delete state.player.flags[name];
    const dot = name.indexOf('.');
    if (dot > 0) { const who = name.slice(0, dot), p = person(state, who); if (p) { if (v) p.memory[name.slice(dot + 1)] = state.season; else delete p.memory[name.slice(dot + 1)]; } }
  }
  const hasFlag = (state, name) => !!state.player.flags[name];
  const inboxCount = state => state.inbox.filter(i => !i.done).length;
  const fullRooms = state => state.inbox.filter(i => !i.done && i.type === 'decision' && (scenarioById(i.scenarioId) || {}).journal === 'full').length;
  function addInbox(state, item) { item.id = 'i' + (++state.counters.inbox); item.week = state.week; item.season = state.season; item.read = false; item.done = false; state.inbox.push(item); return item; }
  function removeInbox(state, id) { const i = state.inbox.findIndex(x => x.id === id); if (i >= 0) state.inbox.splice(i, 1); }
  function note(notes, key, params, extra) { const n = Object.assign({ key, params: params || {} }, extra || {}); if (notes) notes.push(n); return n; }
  const err = (key, params) => ({ ok: false, error: { key, params: params || {} } });

  // ───────────────────────── effect DSL ─────────────────────────
  // Allow `v` within the per-decision cap for `field`, given what the accumulator already applied.
  function capped(applied, field, v, cap) { const cur = applied[field] || 0; return clamp(cur + v, -cap, cap) - cur; }
  // Apply one effect object; ctx = { engId, tags (immediate only), applied (accumulator shared across a decision) }.
  function applyEffect(state, effect, ctx) {
    ctx = ctx || {}; const applied = ctx.applied || newApplied(); ctx.applied = applied;
    const firm = firmOf(state); const eng = engById(state, ctx.engId); const pl = state.player;
    for (const k of Object.keys(effect || {})) {
      let v = effect[k];
      if (!DSL.test(k) || typeof v !== 'number' || !isFinite(v)) continue; // unknown keys are ignored at runtime
      if (k === 'energy') { pl.energy = clamp(pl.energy + v, 0, 100); applied.energy += v; }
      else if (k === 'confidence') {
        v = capped(applied, 'confidence', v, CAPS.confidence);
        const wk = state.weekDelta.confidence || 0; v = clamp(wk + v, -WEEK_CONF_CAP, WEEK_CONF_CAP) - wk;
        pl.confidence = clamp(pl.confidence + v, 0, 100); applied.confidence += v; state.weekDelta.confidence = wk + v;
      }
      else if (k === 'rep' || k === 'rep.regulator') {
        if (k === 'rep.regulator') v *= mult(firm.repMult, 'regulator');
        if (v > 0 && pl.integrity < 60) v = 0; // reputation grows only while integrity >= 60
        v = capped(applied, 'rep', v, CAPS.rep); pl.rep = clamp(pl.rep + v, 0, 100); applied.rep += v;
      }
      else if (k === 'integrity') { v = capped(applied, 'integrity', v, CAPS.integrity); pl.integrity = clamp(pl.integrity + v, 0, 100); applied.integrity += v; }
      else if (k === 'eng.quality') { if (!eng) continue; if (ctx.tags) for (const tag of ctx.tags) v *= mult(firm.tagMult, tag); v = capped(applied, 'engQuality', v, CAPS.engQuality); eng.quality = clamp(round1(eng.quality + v), 0, 100); applied.engQuality += v; }
      else if (k === 'eng.work') { if (!eng) continue; eng.work = Math.max(0, eng.work + v); applied.engWork += v; }
      else if (k === 'eng.deadline') { if (!eng) continue; eng.deadline = adjustHoliday(eng.deadline + v); }
      else if (k.startsWith('trust.')) {
        const id = resolvePerson(state, k.slice(6), eng); const p = id ? person(state, id) : null; if (!p) continue;
        if (v > 0) v *= firm.trustMult; v = round1(v); p.trust = clamp(round1(p.trust + v), 0, 100); p.idleSince = absWeek(state);
        applied.trust[id] = round1((applied.trust[id] || 0) + v);
      }
      else if (k.startsWith('skill.')) { const id = k.slice(6); const sk = pl.skills[id]; if (!sk) continue; v = clamp(v, -0.3, 0.3); sk.mastery = round2(clamp(sk.mastery + v, 1, tierCeiling(state))); sk.peak = Math.max(sk.peak, sk.mastery); applied.skills[id] = round2((applied.skills[id] || 0) + v); }
      else if (k.startsWith('flag.')) { setFlag(state, k.slice(5), v); applied.flags.push([k.slice(5), v]); }
    }
    return applied;
  }
  // Outcome score O (1–10, one decimal) from applied deltas and the luck roll.
  function outcome(applied, good) { const trust = Object.values(applied.trust).reduce((a, b) => a + b, 0); return round1(clamp(5 + applied.engQuality / 5 + applied.confidence / 3 + trust / 6 + (good ? 2 : -2), 1, 10)); }
  // Halve the negative numbers of an effect (scouted events).
  function halveNegatives(effect) { const out = {}; for (const k of Object.keys(effect || {})) { const v = effect[k]; out[k] = (typeof v === 'number' && v < 0 && !k.startsWith('flag.')) ? v / 2 : v; } return out; }

  // ───────────────────────── rubric ─────────────────────────
  // All options of a scenario plus any injected ones (shortcut, distractors) recorded on the draft.
  function allOptions(s, extra) { return listOf(s.options).concat(listOf(extra)); }
  // Process rubric: pure function of the scenario and the stored choices; returns P, per-item points, calibration and skill scores.
  function score(s, d) {
    d = d || {};
    const W = Object.assign({}, RUBRIC_W, s.rubric || {});
    const full = s.journal === 'full';
    const items = {};
    const options = allOptions(s, d.extraOptions);
    const opt = byId(options, d.optionId);
    const q = opt ? clamp(num(opt.quality), 0, 3) : 0;
    const info = listOf(s.info);
    const bought = new Set(listOf(d.infoBought));
    if (full && listOf(s.framings).length) { const f = byId(s.framings, d.framingId); items.framing = { pts: W.framing * (f ? clamp(num(f.quality), 0, 3) : 0) / 3, w: W.framing }; }
    if (info.length) {
      const dec = info.filter(i => i.kind === 'decisive'); const decB = dec.filter(i => bought.has(i.id)).length;
      items.info = { pts: dec.length ? W.info * decB / dec.length : W.info, w: W.info, bought: decB, total: dec.length };
      const nt = info.filter(i => i.kind === 'noise' || i.kind === 'trap'); const ntB = nt.filter(i => bought.has(i.id)).length;
      items.noise = { pts: ntB === 0 ? W.noise : (ntB === 1 && nt.length >= 2 ? W.noise / 2 : 0), w: W.noise, bought: ntB, total: nt.length };
    } else if (full) { items.info = { pts: W.info, w: W.info, bought: 0, total: 0 }; items.noise = { pts: W.noise, w: W.noise, bought: 0, total: 0 }; }
    items.option = { pts: W.option * q / 3, w: W.option };
    if (full) {
      const fm = byId(listOf(s.failureModes), d.failureModeId);
      items.premortem = { pts: fm && opt && listOf(fm.forOptions).includes(opt.id) ? W.premortem : 0, w: W.premortem };
      const violated = !!(opt && opt.reversible === false && options.some(o => o !== opt && o.reversible === true && clamp(num(o.quality), 0, 3) >= q));
      items.reversibility = { pts: violated ? 0 : W.reversibility, w: W.reversibility };
    }
    let calibration = null;
    if (s.rightEscalation != null && opt) {
      const right = num(ESC[s.rightEscalation]), chosen = num(ESC[opt.escalation]); const dd = chosen - right;
      items.escalation = { pts: dd === 0 ? W.escalation : Math.abs(dd) === 1 ? W.escalation / 2 : 0, w: W.escalation };
      calibration = dd === 0 ? 'right' : dd > 0 ? 'early' : 'late';
    }
    if (full) {
      const r = byId(listOf(s.rationales), d.rationaleId);
      items.memo = { pts: r && opt && listOf(r.fits).includes(opt.id) ? W.memo : 0, w: W.memo };
      const want = num(s.followupWeeks, 4), got = d.followupWeeks; const li = FOLLOWUP_LADDER.indexOf(want), lj = FOLLOWUP_LADDER.indexOf(got);
      items.followup = { pts: got === want ? W.followup : (li >= 0 && lj >= 0 && Math.abs(li - lj) === 1 ? W.followup / 2 : 0), w: W.followup };
    }
    let sp = 0, sw = 0; for (const it of Object.values(items)) { sp += it.pts; sw += it.w; }
    const P = sw ? Math.round(sp / sw * 100) : 0;
    const cw = items.option.w + (items.info ? items.info.w : 0), cp = items.option.pts + (items.info ? items.info.pts : 0);
    const craft = cw ? Math.round(cp / cw * 100) : 0;
    const process = {};
    for (const row of Object.keys(PROCESS_ROWS)) { let p = 0, w = 0; for (const it of PROCESS_ROWS[row]) if (items[it]) { p += items[it].pts; w += items[it].w; } process[row] = w ? Math.round(p / w * 100) : null; }
    return { P, items, calibration, craft, process, quality: q };
  }

  // ───────────────────────── mastery, decay, spaced repetition ─────────────────────────
  const K = obs => obs < 5 ? 2.0 : obs < 15 ? 1.2 : 0.7;
  // Update one skill from a skillScore (0–100); opts = { w, difficulty, drill }. Returns the mastery delta.
  function mastery(state, id, skillScore, opts) {
    opts = opts || {}; const sk = state.player.skills[id]; if (!sk) return 0;
    const w = num(opts.w, 1), diff = num(opts.difficulty, 1), drill = !!opts.drill;
    let k = K(sk.obs); if (drill) k *= 0.5;
    const expected = sk.mastery / 20, observed = clamp(num(skillScore), 0, 100) / 100;
    const delta = k * w * diff * mult(firmOf(state).skillGainMult, id) * (observed - expected);
    const before = sk.mastery;
    sk.mastery = round2(clamp(sk.mastery + delta, 1, tierCeiling(state)));
    sk.obs = round1(sk.obs + (drill ? 0.5 : 1));
    sk.peak = Math.max(sk.peak, sk.mastery);
    sk.lastPracticed = absWeek(state); sk.decayed = false;
    return round2(sk.mastery - before);
  }
  mastery.K = K; mastery.band = band; mastery.ceiling = tierCeiling;
  // Decay: after 8 idle weeks, −0.15/week toward max(1, 0.6·peak).
  mastery.decay = function decaySkills(state, abs) {
    abs = abs || absWeek(state);
    for (const id of Object.keys(state.player.skills)) {
      const sk = state.player.skills[id]; const idle = abs - num(sk.lastPracticed, abs);
      if (idle >= 8) { const floor = Math.max(1, 0.6 * sk.peak); if (sk.mastery > floor) { sk.mastery = round2(Math.max(floor, sk.mastery - 0.15)); sk.decayed = true; } }
    }
  };
  // Spaced-repetition ladder per skill: ≥70 advances a rung, <50 resets, otherwise repeats.
  function scheduler(state, id, skillScore) {
    const L = state.player.ladder[id] || (state.player.ladder[id] = { rung: 0, due: null });
    if (skillScore >= 70) L.rung = Math.min(L.rung + 1, LADDER.length - 1); else if (skillScore < 50) L.rung = 0;
    L.due = absWeek(state) + LADDER[L.rung];
    return L;
  }
  scheduler.LADDER = LADDER;
  scheduler.due = state => { const abs = absWeek(state); return Object.keys(state.player.ladder).filter(id => state.player.ladder[id].due != null && state.player.ladder[id].due <= abs).sort((a, b) => state.player.ladder[a].due - state.player.ladder[b].due); };
  // Skill note for the profile row: decay warning with weeks idle.
  function skillNote(state, id) { const sk = state.player.skills[id]; if (!sk || !sk.decayed) return null; return { key: 'skill.decayed', params: { n: absWeek(state) - num(sk.lastPracticed, absWeek(state)) } }; }
  // Band of a scenario = band of the weakest tagged skill (or the mean craft mastery when untagged).
  function scenarioBand(state, s) { const tagged = listOf(s.skills).map(x => state.player.skills[x.id]).filter(Boolean); if (tagged.length) return band(Math.min.apply(null, tagged.map(x => x.mastery))); return band(mean(CRAFT.map(id => state.player.skills[id] ? state.player.skills[id].mastery : 10))); }

  // ───────────────────────── new game ─────────────────────────
  function newGame(opts) {
    opts = opts || {};
    const seed = hashSeed(opts.seed != null ? opts.seed : Date.now());
    const firm = firmDef(opts.firmId) || C.firms.find(f => f.recommendedStart) || C.firms[0] || DEFAULT_FIRM;
    const state = {
      v: VERSION, seed, rng: { s: seed }, season: 1, week: 1,
      player: { name: opts.name || '', gender: opts.gender === 'f' ? 'f' : 'm', tier: clamp(num(opts.tier, 1), 1, 5), energy: 80, confidence: 55, rep: 20, integrity: 85, flags: {}, skills: {}, ladder: {}, scout: 0, approach: { basis: 'risk', transparency: 'full', escalation: 'low' }, gate: null, failedPromotions: {} },
      firm: { id: firm.id, confidenceHistory: [], sponsorId: null, objectivesMet: {}, managerId: null, mentorId: null, since: 1, market: [] },
      world: { cast: {}, contacts: {}, firmHistory: {} },
      engagements: [], matches: [], inbox: [], queue: [], journal: [],
      seen: {}, familySeen: {}, scriptedLeft: [],
      stats: { ratings: [], awards: [], seasons: [], energyLog: [], drawRungs: {}, draws: [], dismissals: 0, promotions: [], skillsAtSeasonStart: {} },
      cv: [], contentEndShown: false,
      budget: newBudget(), weekDelta: { confidence: 0 },
      counters: { lowEnergyWeeks: 0, lowConfQuarters: 0, journal: 0, inbox: 0, match: 0, eng: 0 },
      calendar: { incidents: [], inspections: [] }, leaveUntil: 0, ended: null, milestone: null, lastDraw: null, report: null
    };
    initSkills(state); initFirm(state, firm.id); initWorld(state);
    startSeason(state, []);
    drawInbox(state, []);
    state.stats.energyLog.push(state.player.energy);
    return state;
  }
  // Starting profile: craft 4–7, process 6–9, people-facing 5–7, partner skills 1; obs 0.
  function initSkills(state) {
    for (const id of SKILLS) {
      let m = 1;
      if (PEOPLE.includes(id)) m = 5 + randInt(state, 3); else if (CRAFT.includes(id)) m = 4 + randInt(state, 4); else if (PROCESS.includes(id)) m = 6 + randInt(state, 4);
      state.player.skills[id] = { mastery: m, obs: 0, peak: m, lastPracticed: 1, decayed: false };
    }
  }
  // Firm record: manager and mentor at this firm by role (cast `firmId` or no firm).
  function initFirm(state, firmId) {
    state.firm.id = firmId;
    const at = r => { const p = C.cast.find(c => c.role === r && c.firmId === firmId) || C.cast.find(c => c.role === r && !c.firmId); return p ? p.id : null; };
    state.firm.managerId = at('manager'); state.firm.mentorId = at('mentor') || at('partner'); state.firm.sponsorId = null;
  }
  function initWorld(state) { for (const p of C.cast) person(state, p.id); for (const p of C.stakeholders) person(state, p.id); }

  // ───────────────────────── seasons & engagements ─────────────────────────
  // Pick the season template for the player's tier/firm/season (firm match first, then season, then any).
  function seasonTemplate(state) {
    const tier = state.player.tier;
    const pool = C.seasons.filter(tp => num(tp.tier) === tier);
    const fit = pool.filter(tp => (!tp.firm || tp.firm === state.firm.id) && (tp.season == null || tp.season === state.season));
    const bySeason = fit.filter(tp => tp.season === state.season), byFirm = fit.filter(tp => tp.firm === state.firm.id);
    return bySeason[0] || byFirm[0] || fit[0] || pool.filter(tp => tp.season == null)[0] || pool[0] || null;
  }
  function adjustHoliday(week) { const h = cal().holidays; while (h.includes(((week - 1) % WEEKS) + 1)) week++; return week; }
  // Create one engagement from a template entry (client fixed or drawn from a sector pool).
  function makeEngagement(state, tpl) {
    const id = 'e' + (++state.counters.eng);
    const client = tpl.clientId ? clientDef(tpl.clientId) : pickClient(state, tpl.sectorPool);
    const type = tpl.type || 'audit';
    const contacts = client ? listOf(client.contacts).filter(c => personDef(c)) : [];
    const eng = {
      id, clientId: client ? client.id : (tpl.clientId || null), sector: client ? client.sector : (tpl.sector || '*'), type,
      line: num(tpl.line, LINE2.includes(type) ? 2 : 3), process: tpl.process || null, phase: 'planning', status: 'pending',
      startWeek: num(tpl.startWeek, 2), duration: clamp(num(tpl.duration, 10), 1, WEEKS), deadline: 0, work: 0,
      phaseWork: Object.assign({}, PHASE_WORK, tpl.phaseWork || {}), quality: 50, findings: [],
      managerId: tpl.managerId || state.firm.managerId, contactId: tpl.contactId || (contacts.length ? pick(state, contacts) : null), iaId: client ? (client.iaId || null) : null,
      matchDue: null, matchType: null, selfReview: false, selfReviewDrawn: false, workLog: [], infoFlags: {}, closedWeek: null, season: state.season, onTime: null
    };
    eng.deadline = adjustHoliday(eng.startWeek + eng.duration);
    if (eng.contactId) person(state, eng.contactId); if (eng.iaId) person(state, eng.iaId);
    return eng;
  }
  // A client of the given sectors not already in this season's portfolio (falls back to any client, then none).
  function pickClient(state, pool) {
    const used = new Set(state.engagements.filter(e => e.season === state.season).map(e => e.clientId));
    const all = C.clients.filter(c => !used.has(c.id));
    const ok = all.filter(c => !pool || listOf(pool).includes(c.sector));
    return pick(state, ok.length ? ok : all) || null;
  }
  // Start a season: portfolio, scripted list, incident/inspection calendar, skill snapshot.
  function startSeason(state, notes) {
    const tpl = seasonTemplate(state);
    const entries = tpl && listOf(tpl.engagements).length ? tpl.engagements : DEFAULT_PORTFOLIO;
    state.engagements = state.engagements.filter(e => e.season >= state.season - 1); // keep last season's for placeholders
    for (const e of entries) state.engagements.push(makeEngagement(state, e));
    state.scriptedLeft = (tpl && listOf(tpl.scripted).length && (tpl.season == null || tpl.season === state.season)) ? tpl.scripted.slice() : [];
    const firm = firmOf(state); const cl = cal();
    const nonHoliday = []; for (let w = 2; w <= WEEKS - 2; w++) if (!cl.holidays.includes(w)) nonHoliday.push(w);
    const nInc = Math.round(2 * num(firm.incidentRate, 1)); state.calendar.incidents = []; for (let i = 0; i < nInc; i++) state.calendar.incidents.push(pick(state, nonHoliday));
    const nInsp = 1 + (rand(state) < 0.5 ? 1 : 0); state.calendar.inspections = []; for (let i = 0; i < nInsp; i++) state.calendar.inspections.push(8 + randInt(state, 33));
    state.player.gate = null; state.firm.objectivesMet = {}; state.stats.eventsSeen = {};
    state.stats.skillsAtSeasonStart = {}; for (const id of SKILLS) state.stats.skillsAtSeasonStart[id] = state.player.skills[id].mastery;
    if (state.season > 1) rollOffers(state, notes);
    note(notes, 'season.newPortfolio', { n: entries.length, season: state.season });
  }
  // Engagement start: status, firm history, self-review check (line 3 after line-2 work on the same process within 2 seasons).
  function startEngagement(state, eng, notes) {
    eng.status = 'active';
    const hist = state.world.firmHistory[eng.clientId] || (state.world.firmHistory[eng.clientId] = []);
    if (eng.line === 3 && hist.some(h => h.line === 2 && h.process === eng.process && h.firmId === state.firm.id && state.season - h.season <= 2)) eng.selfReview = true;
    hist.push({ process: eng.process, line: eng.line, season: state.season, firmId: state.firm.id });
    note(notes, 'eng.started', { n: state.week, client: eng.clientId }, { engId: eng.id });
    if (eng.selfReview) note(notes, 'eng.selfReview', {}, { engId: eng.id });
  }
  // Phase label key for the UI: engType override, ISOX roll-forward label in weeks 41–44, else phase.<id>.
  function phaseKey(state, eng) {
    const rf = cal().rollforward;
    if (eng.type === 'isox' && eng.phase === 'report' && state.week >= rf[0] && state.week <= rf[1]) return 'phase.isox.report.rollforward';
    const k = 'phase.' + eng.type + '.' + eng.phase; return C.strings[k] != null ? k : 'phase.' + eng.phase;
  }
  // Advance phases: work >= phaseWork → next phase, or schedule the exit match once; close with rep gain.
  function advanceEngagements(state, notes) {
    const w = state.week;
    for (const eng of state.engagements) {
      if (eng.status === 'pending' && eng.season === state.season && w >= eng.startWeek) startEngagement(state, eng, notes);
      if (eng.status !== 'active' || eng.phase === 'closed') continue;
      if (eng.short) { if (w > eng.deadline) { eng.phase = 'closed'; eng.status = 'closed'; eng.closedWeek = w; eng.onTime = true; } continue; }
      let guard = 0;
      while (guard++ < 6 && eng.phase !== 'closed') {
        const need = num(eng.phaseWork[eng.phase], PHASE_WORK[eng.phase]);
        if (eng.work < need) break;
        if (PHASE_MATCH[eng.phase]) { if (!eng.matchDue) { eng.matchDue = w + 1; eng.matchType = PHASE_MATCH[eng.phase]; scheduleMatch(state, eng.id, PHASE_MATCH[eng.phase], w + 1); note(notes, 'toast.matchScheduled', { week: w + 1, type: matchTypeDef(PHASE_MATCH[eng.phase]).hebrew || PHASE_MATCH[eng.phase] }, { engId: eng.id }); } break; }
        eng.work -= need; leavePlanning(state, eng, notes); eng.phase = PHASES[PHASES.indexOf(eng.phase) + 1];
      }
      if (w > eng.deadline && eng.phase !== 'closed' && eng.season === state.season) {
        eng.overdueWeeks = num(eng.overdueWeeks) + 1;
        applyEffect(state, { confidence: -6, 'trust.contact': -4 }, { engId: eng.id });
        addInbox(state, { type: 'news', key: 'overdue', params: { n: eng.overdueWeeks, weeks: eng.overdueWeeks }, engId: eng.id, sender: eng.managerId || 'system' });
      }
    }
  }
  // Self-review rule: leaving planning without a disclosure/independence choice costs integrity and seeds a regulator question.
  function leavePlanning(state, eng, notes) {
    if (eng.phase !== 'planning' || !eng.selfReview) return;
    const handled = state.journal.some(j => j.engId === eng.id && j.option && (j.option.tags || []).some(tg => tg === 'disclosure' || tg === 'independence'));
    if (handled) return;
    applyEffect(state, { integrity: -10 }, { engId: eng.id });
    if (rand(state) < 0.5) state.queue.push({ kind: 'consequence', due: absWeek(state) + 8, effect: { confidence: -6, rep: -4 }, key: 'consequence.regulatorAsks', engId: eng.id, journalId: null, rolled: true, failureMode: null });
    note(notes, 'independence.flag', {}, { engId: eng.id });
  }
  function closeEngagement(state, eng, notes) {
    eng.phase = 'closed'; eng.status = 'closed'; eng.closedWeek = state.week; eng.onTime = state.week <= eng.deadline; eng.matchDue = null;
    if (eng.quality >= 60 && state.player.integrity >= 60) { const gain = clamp(Math.round((eng.quality - 50) / 10), 1, 5); applyEffect(state, { rep: gain }, { engId: eng.id }); note(notes, 'eng.repGain', { n: gain, q: eng.quality }, { engId: eng.id }); }
    else note(notes, 'eng.closed', { n: eng.quality }, { engId: eng.id });
  }
  const isOverdue = (state, e) => e.status === 'active' && e.phase !== 'closed' && state.week > e.deadline && e.season === state.season;

  // ───────────────────────── weekly budget ─────────────────────────
  // Spend a block: work {engId}, learn {skillId}, network {personId}, scout, rest. Hours are hard; energy is charged at the tick.
  function spendBlock(state, kind, target) {
    target = target || {}; const b = state.budget; const cost = HOURS[kind];
    if (!cost) return err('budget.unknown', { kind });
    if (b.hours < cost) return err('budget.notEnough', { hours: b.hours, need: cost });
    if (state.leaveUntil > absWeek(state)) return err('leave.forced');
    const out = { ok: true, kind, hours: cost };
    if (kind === 'work') {
      const eng = engById(state, target.engId); if (!eng || eng.status !== 'active' || eng.phase === 'closed') return err('budget.needsEngagement');
      const bonus = eng.contactId && trustOf(state, eng.contactId) >= 60 ? 1 : 0;
      eng.work += 1 + bonus; eng.workLog.push(absWeek(state)); out.units = 1 + bonus; out.bonus = bonus; b.work++;
    } else if (kind === 'learn') {
      const id = target.skillId; if (!state.player.skills[id]) return err('budget.pickSkill');
      b.learn++; out.drill = startDrill(state, id); if (!out.drill) { state.player.skills[id].lastPracticed = absWeek(state); state.player.skills[id].decayed = false; }
    } else if (kind === 'network') {
      const p = person(state, target.personId); if (!p) return err('budget.pickPerson');
      const gain = round1(3 * firmOf(state).trustMult); p.trust = clamp(round1(p.trust + gain), 0, 100); p.idleSince = absWeek(state); b.network++; out.trust = p.trust; out.gain = gain;
    } else if (kind === 'scout') { state.player.scout += 1; b.scout++; out.scout = state.player.scout; out.note = { key: 'toast.scout', params: { n: Math.min(2, state.player.scout) } }; }
    else if (kind === 'rest') { b.rest++; }
    b.hours -= cost; b.log.push({ kind, target: target.engId || target.skillId || target.personId || null, hours: cost });
    return out;
  }
  // Energy step (tick step 4): regeneration toward 60 plus every block, room, match and overdue price.
  function energyStep(state, b) {
    const e = state.player.energy, w = state.week, cl = cal();
    const overdue = state.engagements.filter(x => isOverdue(state, x)).length;
    let d = 10 - Math.round((e - 60) / 10) + 15 * b.rest + 2 * Math.floor(num(b.hours) / 4) - 2 * b.work - 1 * (b.learn + b.network + b.scout) - 3 * b.rooms - 1 * b.light - 4 * b.matches - 8 * overdue - num(firmOf(state).hoursPenalty);
    if (cl.holidays.includes(w)) d += 10; if (cl.august.includes(w)) d += 4;
    state.player.energy = clamp(round1(e + d), 0, 100);
    return d;
  }

  // ───────────────────────── requires / matching ─────────────────────────
  const tierOk = (item, tier) => { const l = listOf(item.tier); return l.length === 0 || l.includes(tier); };
  function requiresOk(state, item, eng) {
    const r = item.requires; if (!r) return true;
    if (listOf(r.flags).some(f => !hasFlag(state, f))) return false;
    if (listOf(r.notFlags).some(f => hasFlag(state, f))) return false;
    if (r.season != null && r.season !== state.season) return false;
    if (r.tier != null && r.tier !== state.player.tier) return false;
    if (Array.isArray(r.week) && (state.week < r.week[0] || state.week > r.week[1])) return false;
    for (const who of Object.keys(r.minTrust || {})) { const id = resolvePerson(state, who, eng); if (!id || trustOf(state, id) < r.minTrust[who]) return false; }
    return true;
  }
  const isDecisionBank = s => s.bank !== 'moment' && s.bank !== 'event';

  // ───────────────────────── inbox draw ─────────────────────────
  // Weight: weakest tagged attribute pulls the draw; family seen in the last 10 weeks halves it.
  function drawWeight(state, s, ignoreFamily) {
    const tagged = listOf(s.skills).map(x => state.player.skills[x.id]).filter(Boolean);
    const weakest = tagged.length ? Math.min.apply(null, tagged.map(x => x.mastery)) : 12;
    let w = Math.max(0.25, 1 + (12 - weakest) / 6);
    const fs = state.familySeen[s.family]; if (!ignoreFamily && fs && fs.length && absWeek(state) - fs[fs.length - 1].week <= 10) w *= 0.5;
    return w;
  }
  // The engagement a scenario is attached to when no active one matches: prefer upcoming matching, else most recently closed.
  function attachFallback(state, s) {
    const act = activeEngs(state); if (act.length) return pick(state, act);
    const closed = state.engagements.filter(e => e.phase === 'closed').sort((a, b) => (b.closedWeek || 0) - (a.closedWeek || 0));
    if (closed.length && !s) return closed[0];
    const upcoming = state.engagements.filter(e => e.status === 'pending' && (!s || (mt(s.sector, e.sector) && mt(s.engType, e.type)))).sort((a, b) => a.startWeek - b.startWeek);
    return upcoming[0] || closed[0] || state.engagements[0] || null;
  }
  // A sector-specific scenario attaches only to a matching engagement (and the contact role it names via contactHint);
  // when none is active, the analyst gets a 3-week short assignment at a client of that sector.
  const concreteOf = list => listOf(list).filter(x => x && x !== '*');
  const contactFits = (e, hint) => !hint || (e.contactId != null && String(e.contactId).indexOf(hint) >= 0);
  function attachFor(state, s) {
    if (!s) return null;
    const hint = s.contactHint || null;
    const act = activeEngs(state).filter(e => mt(s.sector, e.sector) && mt(s.engType, e.type) && contactFits(e, hint));
    if (act.length) return pick(state, act);
    const sectors = concreteOf(s.sector);
    if (!sectors.length && !hint && !concreteOf(s.engType).includes('isox')) return null;
    return shortAssignment(state, s, sectors, hint);
  }
  function shortAssignment(state, s, sectors, hint) {
    const type = concreteOf(s.engType)[0] || 'audit';
    let pool = C.clients.filter(c => !sectors.length || sectors.includes(c.sector));
    if (type === 'isox') { const ix = pool.filter(c => c.isox); if (ix.length) pool = ix; }
    if (hint) { const h = pool.filter(c => listOf(c.contacts).some(id => String(id).indexOf(hint) >= 0)); if (h.length) pool = h; }
    const client = pick(state, pool); if (!client) return null;
    const contactId = hint ? listOf(client.contacts).find(id => String(id).indexOf(hint) >= 0) : undefined;
    const eng = makeEngagement(state, { clientId: client.id, type, startWeek: state.week, duration: 3, contactId: contactId || undefined, managerId: state.firm.managerId });
    eng.short = true; eng.status = 'active'; eng.phase = 'fieldwork'; eng.deadline = state.week + 3;
    state.engagements.push(eng); return eng;
  }
  // True when a scenario with named sectors would land on an engagement of another sector (or with the wrong contact role).
  const misfit = (s, e) => !e || (concreteOf(s.sector).length && !mt(s.sector, e.sector)) || !mt(s.engType, e.type) || !contactFits(e, s.contactHint);
  // Place a drawn scenario in the inbox; records seen/familySeen/draw stats and the content-ends card on the tier-relax rung.
  function placeScenario(state, s, eng, meta) {
    const abs = absWeek(state);
    const item = addInbox(state, { type: 'decision', scenarioId: s.id, engId: eng ? eng.id : null, rung: meta.rung, repeat: !!meta.repeat, variantOf: meta.variantOf || null, scripted: !!meta.scripted, opened: false, draft: { framingId: null, infoBought: [], infoFlags: {}, optionId: null, failureModeId: null, rationaleId: null, followupWeeks: null, note: '', extraOptions: [], hours: 0 } });
    state.seen[s.id] = abs;
    if (s.family) (state.familySeen[s.family] = state.familySeen[s.family] || []).push({ id: s.id, week: abs });
    state.stats.drawRungs[meta.rung] = (state.stats.drawRungs[meta.rung] || 0) + 1;
    state.stats.draws.push({ season: state.season, week: state.week, id: s.id, rung: meta.rung, repeat: !!meta.repeat });
    if (state.stats.draws.length > 400) state.stats.draws.splice(0, state.stats.draws.length - 400);
    if (meta.rung === 5 && !state.contentEndShown) { state.contentEndShown = true; addInbox(state, { type: 'news', key: 'content.endsHere', params: { tier: state.player.tier }, sender: 'system', card: true }); }
    return item;
  }
  // One curriculum draw through the fallback ladder (§14). Returns the inbox item or null.
  function drawOne(state, o) {
    o = o || {};
    const abs = absWeek(state), tier = state.player.tier;
    const inboxIds = new Set(state.inbox.filter(i => i.scenarioId && !i.done).map(i => i.scenarioId));
    const noFull = fullRooms(state) >= 2;
    if (state.scriptedLeft.length) {
      const id = state.scriptedLeft[0]; const s = scenarioById(id);
      if (!s) { state.scriptedLeft.shift(); return drawOne(state, o); }
      if (noFull && s.journal === 'full') return null;
      state.scriptedLeft.shift();
      return placeScenario(state, s, attachFor(state, s) || attachFallback(state, s), { rung: 0, scripted: true });
    }
    const active = activeEngs(state);
    const base = C.scenarios.filter(s => isDecisionBank(s) && !inboxIds.has(s.id) && !(noFull && s.journal === 'full') && (!s.ambiguous || scenarioBand(state, s) >= 4));
    const cool = s => { const last = state.seen[s.id]; return last == null || last + num(s.cooldown, 30) < abs; };
    const notThisSeason = s => { const last = state.seen[s.id]; return last == null || seasonOfAbs(last) !== state.season; };
    const maxTier = highestContentTier(tier);
    // forced independence-self-review draw for a self-review engagement still in planning
    const sr = active.find(e => e.selfReview && e.phase === 'planning' && !e.selfReviewDrawn);
    if (sr) { const c = base.filter(s => s.family === 'independence-self-review' && tierOk(s, tier) && cool(s) && requiresOk(state, s, sr)); if (c.length) { sr.selfReviewDrawn = true; return placeScenario(state, pick(state, c), sr, { rung: 0 }); } }
    const rungs = [
      { eng: (s, e) => mt(s.phase, e.phase) && mt(s.sector, e.sector) && mt(s.engType, e.type) },
      { eng: (s, e) => mt(s.sector, e.sector) && mt(s.engType, e.type) },
      { eng: (s, e) => mt(s.engType, e.type) },
      { eng: () => true },
      { wild: true },
      { tierRelax: true },
      { tierRelax: true, cooldownRelax: true }
    ];
    // tier relax = the highest content tier at or below the player's (or the lowest above it when nothing is below)
    const lowerTier = s => { const ts = listOf(s.tier); return !ts.length || ts.some(x => x <= tier); };
    for (let r = active.length ? 0 : 4; r < rungs.length; r++) {
      const rg = rungs[r]; const cands = [];
      for (const s of base) {
        if (!(tierOk(s, tier) || (rg.tierRelax && (lowerTier(s) || tierOk(s, maxTier))))) continue;
        if (!(rg.cooldownRelax ? notThisSeason(s) : cool(s))) continue;
        let engs;
        if (rg.wild) { if (!isWild(s)) continue; const e = attachFallback(state, null); if (!requiresOk(state, s, e)) continue; engs = [e]; }
        else if (rg.tierRelax) { const e = active.length ? pick(state, active.filter(x => mt(s.sector, x.sector) && mt(s.engType, x.type))) || pick(state, active) : attachFallback(state, s); if (!requiresOk(state, s, e)) continue; engs = [e]; }
        else { engs = active.filter(e => rg.eng(s, e) && requiresOk(state, s, e)); if (!engs.length) continue; }
        cands.push({ s, engs });
      }
      if (cands.length) { const c = pickWeighted(state, cands, x => drawWeight(state, x.s)); let e = pick(state, c.engs); if (misfit(c.s, e)) e = attachFor(state, c.s) || e; return placeScenario(state, c.s, e, { rung: r }); }
    }
    return null;
  }
  // Spaced-repetition injection for one due skill: a family variant tagged with the skill, never the same id within 20 weeks.
  function injectRepeat(state, skillId) {
    const abs = absWeek(state), tier = state.player.tier;
    const inboxIds = new Set(state.inbox.filter(i => i.scenarioId && !i.done).map(i => i.scenarioId));
    const noFull = fullRooms(state) >= 2;
    const cands = C.scenarios.filter(s => isDecisionBank(s) && !inboxIds.has(s.id) && listOf(s.skills).some(x => x.id === skillId) && tierOk(s, tier) && !(noFull && s.journal === 'full') && (state.seen[s.id] == null || abs - state.seen[s.id] >= 20) && requiresOk(state, s, attachFallback(state, s)));
    if (!cands.length) return null;
    const variants = cands.filter(s => s.family && state.familySeen[s.family] && state.familySeen[s.family].length);
    const s = pickWeighted(state, variants.length ? variants : cands, x => drawWeight(state, x, true));
    const fs = state.familySeen[s.family] || []; const prev = fs.length ? fs[fs.length - 1].id : null;
    const act = activeEngs(state).filter(e => mt(e.sector, '*') || (mt(s.sector, e.sector) && mt(s.engType, e.type)));
    let e = act.length ? pick(state, act) : attachFallback(state, s); if (misfit(s, e)) e = attachFor(state, s) || e;
    return placeScenario(state, s, e, { rung: 0, repeat: true, variantOf: prev });
  }
  // Tick step 7: draws per week (base 1, +1 at p=0.35 with no match, calendar modifiers), repeats, events.
  function drawInbox(state, notes) {
    const w = state.week, cl = cal(), abs = absWeek(state);
    if (state.leaveUntil > abs) return;
    if (cl.holidays.includes(w)) { addInbox(state, { type: 'news', key: 'holiday.greeting', params: { week: w }, sender: state.firm.mentorId || 'system' }); drawEvents(state, notes); state.lastDraw = { n: 0, holiday: true, items: [] }; return; }
    let n = 1; const matchThisWeek = state.matches.some(m => m.week === w && !m.played);
    if (cl.light.includes(w) || cl.august.includes(w)) n = 0; else if (cl.crunch.includes(w)) n = 2; else if (!matchThisWeek && rand(state) < 0.35) n = 2;
    const items = [];
    for (let i = 0; i < n; i++) { if (inboxCount(state) >= 5) { state.stats.deferred = num(state.stats.deferred) + 1; break; } const it = drawOne(state); if (!it) break; items.push(it); }
    let reps = 0;
    for (const id of scheduler.due(state)) {
      if (reps >= 2 || inboxCount(state) >= 5 || n === 0) break;
      const it = injectRepeat(state, id); const L = state.player.ladder[id];
      if (it) { reps++; items.push(it); L.due = abs + Math.max(2, LADDER[L.rung]); } else L.due = abs + 1;
    }
    drawEvents(state, notes);
    state.lastDraw = { n, items: items.map(i => i.id), rungs: items.map(i => i.rung) };
  }
  // Events: fixed-week events fire on their week; others at p=1/3 per week; scoutable events arrive as a look-ahead card (scout.ahead) with halved negatives.
  function drawEvents(state, notes) {
    const w = state.week, cl = cal(), abs = absWeek(state);
    const seenSeason = state.stats.eventsSeen || (state.stats.eventsSeen = {});
    const act = activeEngs(state);
    const engFor = ev => { const m = act.filter(e => mt(ev.sector, e.sector) && mt(ev.engType, e.type)); return m.length ? pick(state, m) : (listOf(ev.sector).length && !mt(ev.sector, '__none__') ? null : attachFallback(state, null)); };
    const ok = ev => ev && ev.id && !seenSeason[ev.id] && tierOk(ev, state.player.tier) && (ev.cooldown == null || state.seen[ev.id] == null || state.seen[ev.id] + ev.cooldown < abs);
    const fire = (ev, scouted) => {
      const eng = engFor(ev); if (eng === null && listOf(ev.sector).length && !mt(ev.sector, '__none__')) return false;
      if (!requiresOk(state, ev, eng)) return false;
      seenSeason[ev.id] = w; state.seen[ev.id] = abs;
      const applied = applyEffect(state, scouted ? halveNegatives(ev.effect) : ev.effect, { engId: eng ? eng.id : null });
      addInbox(state, { type: ev.type === 'regulation' || ev.type === 'circular' ? 'news' : 'news', scenarioId: ev.id, eventId: ev.id, engId: eng ? eng.id : null, sender: ev.sender || 'system', scouted, applied, key: scouted ? 'scout.ahead' : null, params: scouted ? { title: ev.title || '', n: num(ev.leadWeeks, 3) } : {} });
      return true;
    };
    for (const ev of C.events) { if (ev.week === w && ok(ev)) fire(ev, false); }
    if (cl.holidays.includes(w)) return;
    const ranged = C.events.filter(ev => ok(ev) && ev.week == null && (!Array.isArray(ev.weekRange) || (w >= ev.weekRange[0] && w <= ev.weekRange[1])) && (!ev.requires || !Array.isArray(ev.requires.week) || (w >= ev.requires.week[0] && w <= ev.requires.week[1])));
    if (state.player.scout >= 2) {
      const lead = C.events.filter(ev => ok(ev) && ev.scoutable && ev.week == null && Array.isArray(ev.weekRange) && w < ev.weekRange[0] && w >= ev.weekRange[0] - num(ev.leadWeeks, 3));
      if (lead.length && fire(pick(state, lead), true)) { state.player.scout -= 2; note(notes, 'scout.ahead', { n: 2 }); }
    }
    if (ranged.length && rand(state) < 1 / 3) { const ev = pick(state, ranged); fire(ev, false); }
    // calendar incidents and inspections become matches next week
    if (state.calendar.incidents.includes(w) && act.length) { const eng = pick(state, act); scheduleMatch(state, eng.id, 'incident', w + 1); note(notes, 'toast.matchScheduled', { week: w + 1, type: matchTypeDef('incident').hebrew || 'incident' }, { engId: eng.id }); }
    if (state.calendar.inspections.includes(w)) { const fin = act.filter(e => isFin(e.sector)); if (fin.length) { const eng = pick(state, fin); scheduleMatch(state, eng.id, 'inspection', w + 3); addInbox(state, { type: 'news', key: 'match.notice', params: { week: w + 3, n: 3, type: matchTypeDef('inspection').hebrew || 'inspection' }, engId: eng.id, sender: roleIds(state, eng.id).regulator || 'system' }); } }
  }
  // Prune: resolved items, read news after a week, unread news after 3 weeks, stale decisions after 4 weeks, expired offers.
  function pruneInbox(state) {
    const w = absWeek(state);
    state.inbox = state.inbox.filter(i => {
      const age = w - ((i.season - 1) * WEEKS + i.week);
      if (i.done) return false;
      if (i.type === 'news') return i.read ? age < 1 : age < 3;
      if (i.type === 'offer') return state.week <= cal().window[1] && age < 8;
      if (i.type === 'decision') return age < 4;
      if (i.type === 'consequence') return age < 3;
      return true;
    });
  }

  // ───────────────────────── decision room ─────────────────────────
  // Effective hour cost of an info action: energy<30 doubles, hostile contact +50%, trusted contact halves evidence, firm multiplier.
  function infoCost(state, item, info) {
    const eng = engById(state, item.engId); const firm = firmOf(state);
    let h = num(info.hours, 1) * mult(firm.infoCostMult, info.type || info.kind);
    const ct = eng && eng.contactId ? trustOf(state, eng.contactId) : 50;
    if (ct < 30) h *= 1.5;
    if (ct >= 60 && (info.type === 'evidence' || info.evidence)) h *= 0.5;
    if (state.player.energy < 30) h *= 2;
    return Math.max(1, Math.round(h));
  }
  // Gate status for an option: null when open, else { key, params, text } for the greyed reason.
  function gateStatus(state, item, opt, match) {
    const need = opt.needsInfo != null ? { info: listOf(opt.needsInfo) } : (opt.gate || null);
    if (!need) return null;
    const eng = engById(state, item ? item.engId : (match ? match.engId : null));
    const flags = Object.assign({}, eng ? eng.infoFlags : {}, item && item.draft ? item.draft.infoFlags : {});
    const lock = (key, params) => ({ key: opt.gateText ? null : key, params: params || {}, text: opt.gateText || null });
    for (const f of listOf(need.info)) if (!flags[f]) { const s = item ? scenarioById(item.scenarioId) : null; const inf = s ? listOf(s.info).find(i => i.sets === f) : null; return lock('gate.info', { info: inf ? inf.label : f, label: inf ? inf.label : f, flag: f }); }
    if (need.prep != null && (!match || num(match.prep) < need.prep)) return lock('gate.prep', { n: need.prep, prep: need.prep });
    if (need.trust) { const id = resolvePerson(state, need.trust.id, eng); const p = id ? personDef(id) : null; if (!id || trustOf(state, id) < num(need.trust.min)) return lock('gate.trust', { n: need.trust.min, name: p ? p.name : need.trust.id, min: need.trust.min }); }
    return null;
  }
  // The generic shortcut option injected at energy < 30 when the scenario has none authored.
  function shortcutOption(s) {
    if (s.shortcutOption) return Object.assign({ id: SHORTCUT_ID }, s.shortcutOption, { quality: 0 });
    return { id: SHORTCUT_ID, labelKey: 'shortcut.option', quality: 0, reversible: false, escalation: 'none', tags: ['shortcut'], biasTags: [], immediate: { 'eng.work': 1, 'eng.quality': -4 }, result: { pGood: 0.5, good: { key: 'shortcut.result.good', effect: {} }, bad: { key: 'shortcut.result.bad', effect: {} } }, delayed: [], feedback: { whyKey: 'shortcut.why', expertKey: 'shortcut.expert', biasKey: 'shortcut.bias', ruleKey: 'shortcut.rule' }, generic: true };
  }
  // Open a decision item: charges the full-room energy once, injects shortcut/distractors, returns the room view.
  function openScenario(state, inboxId) {
    const item = inboxItem(state, inboxId); if (!item || item.type !== 'decision') return err('room.missing', { id: inboxId });
    const s = scenarioById(item.scenarioId); if (!s) return err('room.missing', { id: item.scenarioId });
    if (!item.opened) {
      item.opened = true; item.read = true;
      if (s.journal === 'full') state.budget.rooms++;
      const extra = [];
      if (state.player.energy < 30) extra.push(shortcutOption(s));
      if (scenarioBand(state, s) >= 3) for (const d of listOf(s.distractors)) extra.push(Object.assign({}, d, { quality: 0 }));
      item.draft.extraOptions = extra;
    }
    return Object.assign({ ok: true }, roomView(state, item, s));
  }
  // Room view for the UI: text stays raw (UI fills placeholders with ctx); gates and costs are precomputed.
  function roomView(state, item, s) {
    const d = item.draft; const b = scenarioBand(state, s); const eng = engById(state, item.engId);
    const info = listOf(s.info).map(i => ({ id: i.id, label: i.label, hours: infoCost(state, item, i), bought: d.infoBought.includes(i.id), reveal: d.infoBought.includes(i.id) ? i.reveal : null }));
    const options = allOptions(s, d.extraOptions).map(o => { const lock = gateStatus(state, item, o); return { id: o.id, label: o.label, labelKey: o.labelKey || null, locked: !!lock, lock, generic: !!o.generic }; });
    const br = s.baseRate ? byId(C.baseRates, s.baseRate) : null;
    return {
      inboxId: item.id, scenarioId: s.id, engId: item.engId, journal: s.journal || 'light', title: s.title, body: s.body, attachments: listOf(s.attachments),
      band: b, hint: b === 1 ? (s.hint || null) : null, baseRate: b === 1 && br ? Object.assign({}, br) : null, pushback: b >= 3 ? (s.pushback || null) : null,
      framings: listOf(s.framings).map(f => ({ id: f.id, text: f.text })), info, options, failureModes: listOf(s.failureModes).map(m => ({ id: m.id, text: m.text, signal: m.signal })),
      rationales: listOf(s.rationales).map(r => ({ id: r.id, text: r.text })), followupChoices: FOLLOWUP_LADDER.slice(), draft: deep(d), hoursLeft: state.budget.hours,
      lowEnergy: state.player.energy < 30, scale: s.scale || (eng ? scaleFor(eng.type) : null), lesson: s.lesson || null, frameworks: listOf(s.frameworks), ctx: ctxFor(state, item.engId), repeat: !!item.repeat, variantOf: item.variantOf
    };
  }
  function scaleFor(engType) { const rs = C.ratingScales || {}; const id = rs.byEngType ? rs.byEngType[engType] : null; return id || null; }
  function chooseFraming(state, inboxId, framingId) { const item = inboxItem(state, inboxId); if (!item || !item.draft) return err('room.missing'); const s = scenarioById(item.scenarioId); if (!byId(listOf(s && s.framings), framingId)) return err('room.badFraming'); item.draft.framingId = framingId; return { ok: true }; }
  // Buy an information action: hours are deducted, its effect applied, its flag set on the draft and the engagement.
  function buyInfo(state, inboxId, infoId) {
    const item = inboxItem(state, inboxId); if (!item || !item.draft) return err('room.missing');
    const s = scenarioById(item.scenarioId); const info = byId(listOf(s && s.info), infoId); if (!info) return err('room.badInfo');
    if (item.draft.infoBought.includes(infoId)) return { ok: true, reveal: info.reveal, hours: 0 };
    const h = infoCost(state, item, info);
    if (state.budget.hours < h) return err('budget.notEnough', { hours: state.budget.hours, need: h });
    state.budget.hours -= h; state.budget.info += h; item.draft.hours += h; item.draft.infoBought.push(infoId);
    if (info.sets) { item.draft.infoFlags[info.sets] = 1; const eng = engById(state, item.engId); if (eng) eng.infoFlags[info.sets] = 1; }
    const applied = applyEffect(state, info.effect, { engId: item.engId });
    return { ok: true, reveal: info.reveal, hours: h, applied };
  }
  // Choose an option: light scenarios resolve now; full rooms wait for the pre-mortem and memo.
  function choose(state, inboxId, optionId) {
    const item = inboxItem(state, inboxId); if (!item || !item.draft) return err('room.missing');
    const s = scenarioById(item.scenarioId); const opt = byId(allOptions(s, item.draft.extraOptions), optionId); if (!opt) return err('room.badOption');
    const lock = gateStatus(state, item, opt); if (lock) return Object.assign(err('gate.locked'), { lock });
    item.draft.optionId = optionId;
    if (s.journal === 'full') return { ok: true, pending: true, failureModes: listOf(s.failureModes).map(m => ({ id: m.id, text: m.text, signal: m.signal })) };
    return finalizeDecision(state, item, s);
  }
  function choosePremortem(state, inboxId, modeId) { const item = inboxItem(state, inboxId); if (!item || !item.draft) return err('room.missing'); const s = scenarioById(item.scenarioId); const m = byId(listOf(s && s.failureModes), modeId); if (!m) return err('room.badMode'); item.draft.failureModeId = modeId; return { ok: true, signal: m.signal, rationales: listOf(s.rationales).map(r => ({ id: r.id, text: r.text })) }; }
  // Memo: rationale + follow-up window (+ free text); costs 1h when available, then resolves the full room.
  function submitMemo(state, inboxId, memo) {
    memo = memo || {}; const item = inboxItem(state, inboxId); if (!item || !item.draft) return err('room.missing');
    const s = scenarioById(item.scenarioId); if (!s) return err('room.missing');
    if (!item.draft.optionId) return err('room.noOption');
    item.draft.rationaleId = memo.rationaleId || null;
    item.draft.followupWeeks = FOLLOWUP_LADDER.includes(memo.followupWeeks) ? memo.followupWeeks : null;
    item.draft.note = memo.note || '';
    if (state.budget.hours >= 1) { state.budget.hours -= 1; item.draft.hours += 1; }
    return finalizeDecision(state, item, s);
  }
  // Resolve a decision: rubric, immediate effects, luck roll, result effects, delayed rolls, journal, mastery, scheduler, follow-up.
  function finalizeDecision(state, item, s) {
    const d = item.draft; const opt = byId(allOptions(s, d.extraOptions), d.optionId); const eng = engById(state, item.engId); const abs = absWeek(state);
    const rubric = score(s, d);
    const applied = newApplied();
    applyEffect(state, opt.immediate, { engId: item.engId, tags: listOf(opt.tags), applied });
    const pGood = opt.result ? clamp(num(opt.result.pGood, 0.5), 0, 1) : 0.5;
    const roll = rand(state); const good = roll < pGood;
    const res = opt.result ? (good ? opt.result.good : opt.result.bad) : null;
    if (res) applyEffect(state, res.effect, { engId: item.engId, applied });
    const O = outcome(applied, good);
    const entry = {
      id: 'j' + (++state.counters.journal), kind: s.journal === 'full' ? 'full' : 'light', week: state.week, season: state.season, abs, engId: item.engId, scenarioId: s.id, family: s.family || null, domain: s.domain || null, title: s.title,
      framing: d.framingId ? { id: d.framingId, quality: num((byId(listOf(s.framings), d.framingId) || {}).quality) } : null,
      info: { bought: d.infoBought.slice(), missed: listOf(s.info).filter(i => i.kind === 'decisive' && !d.infoBought.includes(i.id)).map(i => i.id), noise: listOf(s.info).filter(i => (i.kind === 'noise' || i.kind === 'trap') && d.infoBought.includes(i.id)).map(i => i.id), decisiveBought: rubric.items.info ? rubric.items.info.bought : 0, decisiveTotal: rubric.items.info ? rubric.items.info.total : 0, offered: listOf(s.info).filter(i => i.kind === 'noise' || i.kind === 'trap').length, hours: d.hours },
      option: { id: opt.id, label: opt.label || null, labelKey: opt.labelKey || null, quality: rubric.quality, tags: listOf(opt.tags), biasTags: listOf(opt.biasTags), reversible: opt.reversible !== false, escalation: opt.escalation || 'none' },
      calibration: rubric.calibration, rightEscalation: s.rightEscalation || null, failureMode: d.failureModeId || null, rationale: d.rationaleId || null, followupWeeks: d.followupWeeks, scenarioFollowup: num(s.followupWeeks, 4), note: d.note || '',
      rubric: rubric.items, P: rubric.P, O, luck: { pGood, roll: round2(roll), good }, energy: state.player.energy, delayed: [], consequences: [], followup: null, learned: '', applied, skills: {}, repeat: !!item.repeat, hint: !!(scenarioBand(state, s) === 1)
    };
    enqueueDelayed(state, entry, opt, abs);
    state.journal.push(entry);
    applyMastery(state, entry, s, rubric);
    if (entry.kind === 'full') state.queue.push({ kind: 'followup', due: abs + num(d.followupWeeks, 4), journalId: entry.id, engId: item.engId });
    if (opt.finding && eng) eng.findings.push(Object.assign({ week: state.week, scenarioId: s.id, scale: s.scale || scaleFor(eng.type) }, opt.finding));
    if (eng && eng.contactId) touch(state, eng.contactId);
    if (entry.kind === 'light') state.budget.light++;
    item.done = true; removeInbox(state, item.id);
    if (s.lesson) (state.stats.lessons = state.stats.lessons || {})[s.lesson] = 1;
    const mentor = state.firm.mentorId; if (rubric.P < 50 && mentor && trustOf(state, mentor) >= 70) addInbox(state, { type: 'news', key: 'mentor.note', params: { p: rubric.P, week: state.week, rule: (opt.feedback && opt.feedback.rule) || '' }, journalId: entry.id, sender: mentor });
    const p = Math.round((good ? pGood : 1 - pGood) * 100);
    const luck = rubric.P >= 70 && !good ? { key: 'luck.goodProcessBadOutcome', params: { p } } : rubric.P <= 40 && good ? { key: 'luck.badProcessGoodOutcome', params: { p } } : { key: good ? 'luck.good' : 'luck.bad', params: { p } };
    return { ok: true, entry, luck, result: res ? { good, text: res.text || null, key: res.key || null } : { good, text: null, key: null }, feedback: opt.feedback || {}, friday: { key: 'friday.line', params: { o: O, p: Math.round(rubric.P / 10), O, P: rubric.P } }, lesson: s.lesson || null, engId: item.engId, ctx: ctxFor(state, item.engId) };
  }
  // Delayed consequences: all rolls made now and stored; recurring ones pre-rolled per occurrence.
  function enqueueDelayed(state, entry, opt, abs) {
    for (const dc of listOf(opt.delayed)) {
      const times = dc.recurring ? Math.max(1, num(dc.recurring.times, 1)) : 1, every = dc.recurring ? num(dc.recurring.every, WEEKS) : 0;
      for (let i = 0; i < times; i++) {
        const roll = rand(state); const pass = roll < clamp(num(dc.prob, 1), 0, 1); const due = abs + Math.max(1, num(dc.after, 1)) + i * every;
        entry.delayed.push({ due, rolled: pass, roll: round2(roll), prob: num(dc.prob, 1), text: dc.text || null, failureMode: dc.failureMode || null, landed: false });
        if (pass) state.queue.push({ kind: 'consequence', due, effect: dc.effect || {}, text: dc.text || null, scenarioId: entry.scenarioId, optionId: opt.id, engId: entry.engId, journalId: entry.id, failureMode: dc.failureMode || null, rolled: true });
      }
    }
  }
  // Mastery + ladder after a decision: craft skills get the craft score weighted by w; process rows get their row score.
  function applyMastery(state, entry, s, rubric) {
    const diff = clamp(num(s.difficulty, 1), 1, 3);
    const tagged = {}; for (const x of listOf(s.skills)) if (x && x.id) tagged[x.id] = num(x.w, 1);
    for (const id of Object.keys(tagged)) if (!PROCESS.includes(id) && state.player.skills[id]) { entry.skills[id] = mastery(state, id, rubric.craft, { w: tagged[id], difficulty: diff }); scheduler(state, id, rubric.craft); }
    for (const row of PROCESS) { const sc = rubric.process[row]; if (sc == null || !state.player.skills[row]) continue; entry.skills[row] = mastery(state, row, sc, { w: tagged[row] != null ? tagged[row] : 0.5, difficulty: diff }); scheduler(state, row, sc); }
  }
  // Answer the follow-up item: calibration against the record (did the picked signal materialise?), feeds the memo skill at half strength.
  function answerFollowup(state, inboxId, yes) {
    const item = inboxItem(state, inboxId); if (!item || item.type !== 'followup') return err('room.missing');
    const entry = journalById(state, item.journalId); if (!entry) { removeInbox(state, inboxId); return err('room.missing'); }
    const record = entry.consequences.some(c => c.failureMode && c.failureMode === entry.failureMode);
    const anyLanded = entry.consequences.length > 0;
    const agree = !!yes === record;
    const abs = absWeek(state); const late = abs - num(item.due, abs) > 1;
    entry.followup = { answer: !!yes, record, anyLanded, agree, week: state.week, abs, late, ignored: false };
    if (state.player.skills.memo) { const sk = state.player.skills.memo; const k = K(sk.obs) * 0.5; const obs = agree ? 1 : 0; sk.mastery = round2(clamp(sk.mastery + k * (obs - sk.mastery / 20), 1, tierCeiling(state))); sk.obs = round1(sk.obs + 1); sk.peak = Math.max(sk.peak, sk.mastery); sk.lastPracticed = abs; sk.decayed = false; }
    const eng = engById(state, entry.engId); if (eng && eng.contactId) touch(state, eng.contactId);
    item.done = true; removeInbox(state, inboxId);
    return { ok: true, record, agree, anyLanded, consequences: entry.consequences, entry, recordKey: anyLanded ? (record ? 'followup.record.matched' : 'followup.record.contradicted') : 'followup.record.nothing' };
  }
  function setLearned(state, journalId, text) { const e = journalById(state, journalId); if (!e) return err('room.missing'); e.learned = String(text || ''); return { ok: true }; }
  function markRead(state, inboxId) { const i = inboxItem(state, inboxId); if (i) i.read = true; return { ok: !!i }; }

  // ───────────────────────── queue ─────────────────────────
  // Tick step 1: fire due consequences (effects, inbox consequence item, journal `applied` update) and deliver follow-ups.
  function fireQueue(state, abs, notes) {
    const due = state.queue.filter(q => q.due <= abs).sort((a, b) => a.due - b.due);
    state.queue = state.queue.filter(q => q.due > abs);
    for (const q of due) {
      if (q.kind === 'followup') { deliverFollowup(state, q, notes); continue; }
      const entry = q.journalId ? journalById(state, q.journalId) : null;
      const applied = applyEffect(state, q.effect, { engId: q.engId });
      if (entry) {
        for (const k of ['energy', 'confidence', 'rep', 'engQuality', 'engWork', 'integrity']) entry.applied[k] = round1(entry.applied[k] + applied[k]);
        for (const id of Object.keys(applied.trust)) entry.applied.trust[id] = round1((entry.applied.trust[id] || 0) + applied.trust[id]);
        entry.applied.flags = entry.applied.flags.concat(applied.flags);
        entry.O = outcome(entry.applied, entry.luck.good);
        const rec = entry.delayed.find(x => x.due === q.due && !x.landed && x.rolled); if (rec) rec.landed = true;
        entry.consequences.push({ abs, week: state.week, season: state.season, text: q.text || null, key: q.key || null, failureMode: q.failureMode || null, applied, premortemHit: !!(q.failureMode && q.failureMode === entry.failureMode) });
        const pending = state.queue.find(x => x.kind === 'followup' && x.journalId === entry.id);
        if (pending) { state.queue = state.queue.filter(x => x !== pending); deliverFollowup(state, pending, notes); }
      }
      addInbox(state, { type: 'consequence', journalId: q.journalId || null, scenarioId: q.scenarioId || null, engId: q.engId || null, text: q.text || null, key: q.key || null, params: q.params || {}, applied, failureMode: q.failureMode || null, sender: q.sender || (q.engId ? (engById(state, q.engId) || {}).contactId : null) || 'system' });
      note(notes, 'consequence.landed', { week: entry ? entry.week : state.week, title: entry ? render(state, entry.title || '', entry.engId) : '' }, { journalId: q.journalId || null, engId: q.engId || null });
    }
  }
  function deliverFollowup(state, q, notes) {
    for (const i of state.inbox) if (i.type === 'followup' && !i.done) { const e = journalById(state, i.journalId); if (e && !e.followup) e.followup = { ignored: true, answer: null, record: null, agree: false, late: true }; i.done = true; }
    state.inbox = state.inbox.filter(i => !i.done);
    const entry = journalById(state, q.journalId); if (!entry) return;
    const eng = engById(state, q.engId); const roles = roleIds(state, q.engId);
    addInbox(state, { type: 'followup', journalId: q.journalId, engId: q.engId || null, due: q.due, sender: roles.manager || 'system', scenarioId: entry.scenarioId });
    note(notes, 'toast.followupDue', {}, { journalId: q.journalId });
    if (eng && eng.contactId) touch(state, eng.contactId);
  }

  // ───────────────────────── matches ─────────────────────────
  // Schedule a match for an engagement; placed in the inbox at the tick into its week (or now when already due).
  function scheduleMatch(state, engId, type, week) {
    const eng = engById(state, engId); if (!eng) return null;
    const m = { id: 'm' + (++state.counters.match), engId, type, week: num(week, state.week + 1), season: state.season, prep: 0, fit: 0, approach: null, hostility: [], moments: [], momentIdx: 0, played: false, auto: false, started: false, ratings: {}, participants: [], results: [], breakUsed: false, colleagueId: null, revealFirst: false, placed: false, scheduledAt: absWeek(state) };
    state.matches.push(m);
    if (m.week <= state.week) placeMatch(state, m);
    return m;
  }
  // Tick step 3b: put this week's matches in the inbox and draw their moments.
  function placeMatches(state) { for (const m of state.matches) if (!m.placed && !m.played && m.week === state.week && m.season === state.season) placeMatch(state, m); }
  function placeMatch(state, m) {
    m.placed = true; const eng = engById(state, m.engId);
    m.moments = drawMoments(state, m, eng);
    m.participants = [eng && eng.contactId, eng && eng.iaId, eng && eng.managerId].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
    m.revealFirst = !!(eng && eng.iaId && trustOf(state, eng.iaId) >= 60);
    addInbox(state, { type: 'moment', matchId: m.id, engId: m.engId, matchType: m.type, sender: eng ? eng.contactId || 'system' : 'system' });
  }
  // Draw N moments for a match type through a small fallback ladder (exact → drop sector → drop engType → drop tier).
  function drawMoments(state, m, eng) {
    const N = num(matchTypeDef(m.type).moments, 3); const tier = state.player.tier; const out = []; const used = new Set();
    const rungs = [
      x => mt(x.matchType, m.type) && tierOk(x, tier) && (!eng || (mt(x.sector, eng.sector) && mt(x.engType, eng.type))),
      x => mt(x.matchType, m.type) && tierOk(x, tier) && (!eng || mt(x.engType, eng.type)),
      x => mt(x.matchType, m.type) && tierOk(x, tier),
      x => mt(x.matchType, m.type)
    ];
    for (const f of rungs) {
      while (out.length < N) {
        const c = C.moments.filter(x => x && x.id && !used.has(x.id) && f(x) && requiresOk(state, x, eng));
        if (!c.length) break;
        const pickd = pickWeighted(state, c, x => drawWeight(state, x, true)); used.add(pickd.id); out.push(pickd.id);
      }
      if (out.length >= N) break;
    }
    return out;
  }
  // Prep (readiness) and fit from the approach toggles and the last 3 weeks of work on the engagement.
  function computePrep(state, m, approach) {
    const eng = engById(state, m.engId); const mtd = matchTypeDef(m.type); const abs = absWeek(state);
    const fitTable = mtd.fit || {}; const vals = ['basis', 'transparency', 'escalation'].map(k => num(fitTable[k] ? fitTable[k][approach[k]] : 1, 1));
    const fit = round2(mean(vals));
    const blocks = eng ? eng.workLog.filter(a => a > abs - 3).length : 0;
    const ia = eng && eng.iaId && trustOf(state, eng.iaId) >= 60 ? 1 : 0;
    const prep = clamp(Math.round(12 * blocks + 0.4 * (eng ? eng.quality : 50) + 10 * ia + 5 * fit), 0, 100);
    return { prep, fit, blocks, ia };
  }
  function setApproach(state, a) { a = a || {}; const ap = state.player.approach; if (['risk', 'rules'].includes(a.basis)) ap.basis = a.basis; if (['full', 'managed'].includes(a.transparency)) ap.transparency = a.transparency; if (['low', 'high'].includes(a.escalation)) ap.escalation = a.escalation; return { ok: true, approach: Object.assign({}, ap) }; }
  // Hostility roll per moment: p from skills, quality, trust, prep, fit and low energy.
  function rollHostility(state, m, count) {
    const eng = engById(state, m.engId);
    const avg = mean(CRAFT.map(id => state.player.skills[id] ? state.player.skills[id].mastery : 7));
    const tc = eng && eng.contactId ? trustOf(state, eng.contactId) : 35;
    const p = clamp(0.20 + 0.03 * avg + 0.004 * (eng ? eng.quality : 50) + 0.002 * tc + 0.002 * m.prep + 0.05 * m.fit - 0.10 * (state.player.energy < 30 ? 1 : 0), 0.08, 0.95);
    const out = []; for (let i = 0; i < count; i++) { const r = rand(state); let h = r < p ? 'friendly' : r < p + 0.25 ? 'neutral' : 'hostile'; if (tc < 30 && h === 'friendly') h = 'neutral'; out.push(h); } // trust < 30: hostile variants
    m.pFriendly = round2(p);
    return out;
  }
  // Start playing a match: locks prep/fit from the current approach, rolls hostility, charges the match energy.
  function startMatch(state, matchId) {
    const m = matchById(state, matchId); if (!m) return err('match.missing');
    if (m.played) return err('match.played'); if (m.started) return Object.assign({ ok: true }, matchView(state, matchId));
    m.approach = Object.assign({}, state.player.approach); const pf = computePrep(state, m, m.approach); m.prep = pf.prep; m.fit = pf.fit; m.started = true;
    m.hostility = rollHostility(state, m, m.moments.length);
    state.budget.matches++;
    const eng = engById(state, m.engId); for (const id of m.participants) touch(state, id); if (eng) eng.infoFlagsAtMatch = Object.assign({}, eng.infoFlags);
    return Object.assign({ ok: true }, matchView(state, matchId));
  }
  // Match view for the UI: team sheet, prep/fit preview, current moment with ticker and gated options.
  function matchView(state, matchId) {
    const m = matchById(state, matchId); if (!m) return null;
    const eng = engById(state, m.engId); const pf = m.started ? { prep: m.prep, fit: m.fit } : computePrep(state, m, state.player.approach);
    const idx = m.momentIdx; const mom = m.moments[idx] ? momentById(m.moments[idx]) : null; const host = m.hostility[idx] || 'neutral';
    const options = mom ? listOf(mom.options).map(o => { const lock = gateStatus(state, null, o, m); return { id: o.id, label: o.label, locked: !!lock, lock }; }) : [];
    const first = m.moments[0] ? momentById(m.moments[0]) : null;
    const colleague = m.colleagueId && trustOf(state, m.colleagueId) >= 60 && mom ? (mom.colleagueHint || null) : null;
    return {
      matchId: m.id, type: m.type, typeKey: 'matchType.' + m.type, engId: m.engId, week: m.week, started: m.started, played: m.played, prep: pf.prep, fit: pf.fit, approach: m.approach || Object.assign({}, state.player.approach),
      participants: m.participants.map(id => ({ id, trust: trustOf(state, id), name: (personDef(id) || {}).name || '' })), engQuality: eng ? eng.quality : null, findings: eng ? eng.findings : [],
      total: m.moments.length, index: idx, revealedTopic: m.revealFirst && first ? first.title : null,
      moment: mom ? { id: mom.id, title: mom.title, body: mom.body, hostility: host, ticker: listOf(mom.ticker ? mom.ticker[host] || mom.ticker.neutral : []), options, scale: mom.scale || (eng ? scaleFor(eng.type) : null), colleagueHint: colleague } : null,
      breakAvailable: m.started && !m.breakUsed && m.moments.length >= 5 && idx === 2, done: m.started && idx >= m.moments.length, results: m.results, ctx: ctxFor(state, m.engId), scale: eng ? scaleFor(eng.type) : null
    };
  }
  // Play the current moment: gate check, effects (per-moment caps), luck roll, journal entry kind "moment".
  function playMoment(state, matchId, optionId) {
    const m = matchById(state, matchId); if (!m) return err('match.missing'); if (!m.started) return err('match.notStarted'); if (m.played) return err('match.played');
    const mom = m.moments[m.momentIdx] ? momentById(m.moments[m.momentIdx]) : null; if (!mom) return err('match.noMoment');
    const opt = byId(listOf(mom.options), optionId); if (!opt) return err('room.badOption');
    const lock = gateStatus(state, null, opt, m); if (lock) return Object.assign(err('gate.locked'), { lock });
    const host = m.hostility[m.momentIdx] || 'neutral'; const abs = absWeek(state);
    const applied = newApplied();
    applyEffect(state, opt.immediate, { engId: m.engId, tags: listOf(opt.tags), applied });
    const pGood = opt.result ? clamp(num(opt.result.pGood, 0.5), 0, 1) : 0.5; const roll = rand(state); const good = roll < pGood;
    const res = opt.result ? (good ? opt.result.good : opt.result.bad) : null; if (res) applyEffect(state, res.effect, { engId: m.engId, applied });
    const rubric = score(Object.assign({}, mom, { journal: 'light' }), { optionId });
    const entry = { id: 'j' + (++state.counters.journal), kind: 'moment', week: state.week, season: state.season, abs, engId: m.engId, scenarioId: mom.id, family: mom.family || null, domain: mom.domain || null, title: mom.title, matchId: m.id, matchType: m.type, hostility: host,
      option: { id: opt.id, label: opt.label || null, quality: rubric.quality, tags: listOf(opt.tags), biasTags: listOf(opt.biasTags), reversible: opt.reversible !== false, escalation: opt.escalation || 'none' }, calibration: rubric.calibration, rightEscalation: mom.rightEscalation || null,
      rubric: rubric.items, P: rubric.P, O: outcome(applied, good), luck: { pGood, roll: round2(roll), good }, energy: state.player.energy, delayed: [], consequences: [], followup: null, learned: '', applied, skills: {}, info: { decisiveTotal: 0, decisiveBought: 0, offered: 0, noise: [] } };
    enqueueDelayed(state, entry, opt, abs); state.journal.push(entry);
    for (const x of listOf(mom.skills)) if (x && state.player.skills[x.id] && !PROCESS.includes(x.id)) { entry.skills[x.id] = mastery(state, x.id, rubric.craft, { w: num(x.w, 1), difficulty: clamp(num(mom.difficulty, 1), 1, 3) }); scheduler(state, x.id, rubric.craft); }
    const eng = engById(state, m.engId); if (opt.finding && eng) eng.findings.push(Object.assign({ week: state.week, scenarioId: mom.id, scale: mom.scale || scaleFor(eng.type) }, opt.finding));
    m.results.push({ momentId: mom.id, optionId, quality: rubric.quality, hostility: host, good, applied, journalId: entry.id });
    m.momentIdx++;
    const done = m.momentIdx >= m.moments.length;
    return { ok: true, entry, result: res ? { good, text: res.text || null } : { good, text: null }, feedback: opt.feedback || {}, hostility: host, done, breakNow: !m.breakUsed && m.moments.length >= 5 && m.momentIdx === 2, next: done ? null : matchView(state, matchId).moment, summary: done ? resolveMatch(state, matchId) : null };
  }
  // Half-time break: change one toggle (prep/fit recomputed, remaining hostility rerolled) or bring a colleague for the next hint.
  function matchBreak(state, matchId, change) {
    const m = matchById(state, matchId); if (!m || !m.started || m.played) return err('match.missing');
    if (m.breakUsed || m.moments.length < 5 || m.momentIdx !== 2) return err('match.noBreak');
    change = change || {}; m.breakUsed = true;
    if (change.toggle) { const a = Object.assign({}, m.approach); a[change.toggle] = change.value; setApproach(state, a); m.approach = Object.assign({}, state.player.approach); const pf = computePrep(state, m, m.approach); m.prep = pf.prep; m.fit = pf.fit; const rest = rollHostility(state, m, m.moments.length - m.momentIdx); m.hostility = m.hostility.slice(0, m.momentIdx).concat(rest); }
    if (change.colleague) { m.colleagueId = change.colleague; touch(state, change.colleague); }
    return Object.assign({ ok: true }, matchView(state, matchId));
  }
  // Resolve a match: ratings, confidence/rep deltas, engagement phase exit, market headline. auto=true applies the §8 auto-resolution.
  function resolveMatch(state, matchId, opts) {
    opts = opts || {}; const m = matchById(state, matchId); if (!m) return err('match.missing'); if (m.played) return err('match.played');
    const eng = engById(state, m.engId);
    if (opts.auto) { m.auto = true; m.hostility = m.moments.map(() => 'neutral'); if (!m.started) { m.approach = Object.assign({}, state.player.approach); const pf = computePrep(state, m, m.approach); m.prep = pf.prep; m.fit = pf.fit; } while (m.results.length < m.moments.length) m.results.push({ momentId: m.moments[m.results.length], optionId: null, quality: 1, hostility: 'neutral', good: false, applied: newApplied(), auto: true }); m.momentIdx = m.moments.length; }
    else if (!m.started || m.momentIdx < m.moments.length) return err('match.notDone');
    const qs = m.results.map(r => r.quality / 3);
    const hostileLost = m.results.filter(r => r.hostility === 'hostile' && r.quality <= 1).length;
    const hostileHalf = m.hostility.filter(h => h === 'hostile').length * 2 >= Math.max(1, m.moments.length) ? 1 : 0;
    const player = clamp(Math.round(2 + 8 * (qs.length ? mean(qs) : 0.5) + 0.01 * (m.prep - 50) - 0.5 * hostileLost), 1, 10);
    m.ratings = { player, participants: {} };
    for (const id of m.participants) m.ratings.participants[id] = clamp(Math.round(5 + trustOf(state, id) / 25 - hostileHalf), 1, 10);
    const all = [player].concat(Object.values(m.ratings.participants));
    const q = eng ? eng.quality : 50;
    const deltas = { confidence: round1((q - 50) / 10 + all.reduce((s, r) => s + (r - 6) / 2, 0)), rep: state.player.integrity >= 60 ? round1((q - 60) / 20) : 0 };
    if (opts.auto) deltas.confidence = round1(deltas.confidence - 3);
    applyEffect(state, { confidence: deltas.confidence, rep: deltas.rep }, { engId: m.engId });
    m.played = true; m.playedWeek = state.week;
    state.stats.ratings.push({ matchId: m.id, season: state.season, week: state.week, type: m.type, player, participants: m.ratings.participants, auto: !!opts.auto });
    if (eng && eng.matchDue && eng.matchType === m.type && PHASE_MATCH[eng.phase] === m.type) { eng.matchDue = null; eng.matchType = null; eng.work = Math.max(0, eng.work - num(eng.phaseWork[eng.phase], 1)); if (eng.phase === 'present') closeEngagement(state, eng, null); else eng.phase = PHASES[PHASES.indexOf(eng.phase) + 1]; }
    const tone = player >= 7 ? 'good' : player <= 4 ? 'bad' : 'neutral';
    state.firm.market.unshift({ season: state.season, week: state.week, key: 'firm.market.' + tone, params: { client: eng ? eng.clientId : '', rating: player }, matchId: m.id }); if (state.firm.market.length > 20) state.firm.market.pop();
    for (const i of state.inbox) if (i.matchId === m.id) i.done = true; state.inbox = state.inbox.filter(i => !i.done);
    const summary = { ok: true, matchId: m.id, type: m.type, auto: !!opts.auto, ratings: m.ratings, deltas, engQuality: eng ? eng.quality : null, findings: eng ? eng.findings : [], tone, headline: { key: 'firm.market.' + tone, params: { rating: player } }, note: opts.auto ? { key: 'match.autoResolved', params: { type: matchTypeDef(m.type).hebrew || m.type } } : null, prep: m.prep, fit: m.fit };
    return summary;
  }
  // Tick step 3a: matches from last week still unplayed auto-resolve at neutral hostility with quality-1 choices.
  function autoResolveMatches(state, notes) {
    for (const m of state.matches) {
      const absM = (m.season - 1) * WEEKS + m.week;
      if (!m.played && m.placed && absM < absWeek(state)) { resolveMatch(state, m.id, { auto: true }); note(notes, 'match.autoResolved', { type: matchTypeDef(m.type).hebrew || m.type }, { matchId: m.id, engId: m.engId }); }
    }
    if (state.matches.length > 60) state.matches = state.matches.filter(m => !m.played || m.season >= state.season - 1);
  }

  // ───────────────────────── drills, deliverables ─────────────────────────
  // A learning block: pick a 5-item drill for the skill; the UI calls runDrill with the answers.
  // Skills tagged on a drill as [{id,w}] (or plain ids / a single `skill`), with weights.
  function drillSkills(d) { const out = []; if (d.skill) out.push({ id: d.skill, w: 1 }); for (const x of listOf(d.skills)) { if (typeof x === 'string') out.push({ id: x, w: 1 }); else if (x && x.id) out.push({ id: x.id, w: num(x.w, 1) }); } return out; }
  const optQuality = o => typeof o === 'object' && o ? (o.quality != null ? clamp(num(o.quality), 0, 3) : (o.correct ? 3 : 0)) : 0;
  function startDrill(state, skillId) {
    const pool = C.drills.filter(d => d && drillSkills(d).some(x => x.id === skillId) && tierOk(d, state.player.tier));
    if (!pool.length) return null;
    const d = pick(state, pool); const items = listOf(d.items).slice(0, 5);
    state.player.pendingDrill = { id: d.id, skillId, items: items.length };
    return { id: d.id, skillId, title: d.title || null, items: items.map((it, i) => ({ index: i, q: it.q || it.question || '', options: listOf(it.options).map((o, j) => ({ index: j, t: typeof o === 'string' ? o : (o.t || o.text || '') })) })) };
  }
  // Score a drill (answers = option indexes): an answer is correct when its option has the item's top quality; the
  // skill score is the mean quality/3 (partial credit). Mastery update at half strength (obs +0.5) for every tagged skill.
  function runDrill(state, drillId, answers) {
    const d = byId(C.drills, drillId); if (!d) return err('drill.none');
    const items = listOf(d.items).slice(0, 5); const skills = drillSkills(d);
    let correct = 0, qsum = 0;
    const detail = items.map((it, i) => { const a = num(listOf(answers)[i], -1); const opts = listOf(it.options); const top = Math.max.apply(null, opts.map(optQuality).concat([0])); const q = opts[a] ? optQuality(opts[a]) : 0; const ok = !!opts[a] && q === top && top > 0; if (ok) correct++; qsum += q / 3; return { index: i, chosen: opts[a] ? a : null, quality: q, correct: ok, best: opts.findIndex(o => optQuality(o) === top), why: it.why || it.explain || null }; });
    const sc = items.length ? Math.round(qsum / items.length * 100) : 0;
    const deltas = {}; for (const x of skills) if (state.player.skills[x.id]) { deltas[x.id] = mastery(state, x.id, sc, { drill: true, difficulty: 1, w: x.w }); scheduler(state, x.id, sc); }
    const skillId = (state.player.pendingDrill && state.player.pendingDrill.id === d.id && state.player.pendingDrill.skillId) || (skills[0] || {}).id || null;
    state.player.pendingDrill = null;
    return { ok: true, score: sc, correct, total: items.length, delta: skillId ? (deltas[skillId] || 0) : 0, deltas, detail, skillId, skills: skills.map(x => x.id) };
  }
  const kendallTau = (a, b) => { const pos = {}; b.forEach((id, i) => pos[id] = i); let c = 0, d = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const x = pos[a[i]], y = pos[a[j]], ok = x != null && y != null; if (!ok) continue; if (x < y) c++; else if (x > y) d++; } const n = a.length; const tot = n * (n - 1) / 2; return tot ? (c - d) / tot : 1; };
  const SLOT_PTS = [0, 5, 10, 20]; // choice quality 0..3 → points (§10: best 20, slot-confused 10, vague 5, wrong 0)
  // Score one deliverable part (content shape: slots[].choices, ratings items[].answer by layer/dim, order items/answer, match targets/items). Returns { score, feedback }.
  function scorePart(part, ans) {
    ans = ans || {}; const fb = [];
    if (part.kind === 'slots') {
      const slots = listOf(part.slots); if (!slots.length) return { score: 0, feedback: fb }; let s = 0;
      for (const sl of slots) { const cs = listOf(sl.choices); const idx = num(ans[sl.id], -1); const c = cs[idx] || null; const q = c ? clamp(Math.round(num(c.quality)), 0, 3) : 0; const pts = c ? SLOT_PTS[q] : 0; s += pts; const bestIdx = cs.reduce((b, x, i) => num(x.quality) > num((cs[b] || {}).quality) ? i : b, 0); fb.push({ id: sl.id, chosen: c ? idx : null, quality: q, pts, why: c ? c.why || null : null, best: bestIdx, bestWhy: cs[bestIdx] ? cs[bestIdx].why || null : null }); }
      return { score: clamp(Math.round(s / (20 * slots.length) * 100), 0, 100), feedback: fb };
    }
    if (part.kind === 'ratings') {
      const sc = part.scale || {}; const maxD = Math.max(1, num(sc.max, 5) - num(sc.min, 1)); const vals = [];
      for (const it of listOf(part.items)) { const got = ans[it.id] || {}; const cells = []; for (const layer of Object.keys(it.answer || {})) { const row = it.answer[layer]; if (row && typeof row === 'object') { for (const dim of Object.keys(row)) { const g = got[layer] ? got[layer][dim] : undefined; const v = g == null ? 0 : 1 - Math.min(maxD, Math.abs(num(g) - num(row[dim]))) / maxD; vals.push(v); cells.push({ layer, dim, got: g == null ? null : g, want: row[dim] }); } } else { const g = got[layer]; const v = g == null ? 0 : 1 - Math.min(maxD, Math.abs(num(g) - num(row))) / maxD; vals.push(v); cells.push({ layer, got: g == null ? null : g, want: row }); } } fb.push({ id: it.id, cells, why: it.why || null }); }
      return { score: vals.length ? Math.round(100 * mean(vals)) : 0, feedback: fb };
    }
    if (part.kind === 'order') {
      const want = listOf(part.answer); const got = listOf(Array.isArray(ans) ? ans : ans.order); if (!want.length) return { score: 0, feedback: fb };
      const tau = kendallTau(got.filter(x => want.includes(x)), want);
      return { score: clamp(Math.round(100 * (1 + tau) / 2), 0, 100), feedback: [{ id: part.id, tau: round2(tau), answer: want.slice(), why: part.why || null }] };
    }
    if (part.kind === 'match') {
      const items = listOf(part.items); if (!items.length) return { score: 0, feedback: fb }; const per = 100 / items.length; let s = 0;
      for (const it of items) { const g = ans[it.id] || {}; const reasons = listOf(it.reasons); const hasReason = reasons.length > 0; const target = g.target != null ? g.target : (typeof g === 'string' ? g : null); const okT = target != null && target === it.answer; const rIdx = num(g.reason, -1); const okR = hasReason && !!(reasons[rIdx] && reasons[rIdx].correct); let pts = 0; if (okT) pts += hasReason ? per / 2 : per; if (okT && okR) pts += per / 2; s += pts; fb.push({ id: it.id, target, correct: okT, reason: rIdx >= 0 ? rIdx : null, reasonCorrect: okR, answer: it.answer, pts: round1(pts) }); }
      return { score: clamp(Math.round(s), 0, 100), feedback: fb.concat([{ id: part.id, why: part.why || null }]) };
    }
    return { score: 0, feedback: fb };
  }
  // Deliverable definition for the UI with answers and explanations stripped (choices keep text and index only).
  function deliverable(state, id) {
    const d = byId(C.deliverables, id); if (!d) return null;
    const parts = listOf(d.parts).map(p => {
      const q = { id: p.id, kind: p.kind, weight: num(p.weight), prompt: p.prompt || null };
      if (p.kind === 'slots') q.slots = listOf(p.slots).map(sl => ({ id: sl.id, label: sl.label || null, choices: listOf(sl.choices).map((c, i) => ({ index: i, t: c.t || '' })) }));
      if (p.kind === 'ratings') { q.scale = p.scale || { min: 1, max: 5 }; q.dims = listOf(p.dims); q.layers = listOf(p.layers); q.items = listOf(p.items).map(it => ({ id: it.id, text: it.text || '', evidence: it.evidence || null })); }
      if (p.kind === 'order') q.items = listOf(p.items).length ? p.items.slice() : listOf(p.answer).slice();
      if (p.kind === 'match') { q.n = num(p.n, listOf(p.items).length); q.targets = listOf(p.targets); q.items = listOf(p.items).map(it => ({ id: it.id, text: it.text || '', reasons: listOf(it.reasons).map((r, i) => ({ index: i, t: r.t || '' })) })); }
      return q;
    });
    return { id: d.id, kind: d.kind || 'gate', practice: !!d.practice || d.kind === 'practice', tier: num(d.tier), title: d.title || null, intro: d.intro || null, engType: listOf(d.engType), scale: d.scale || null, window: Array.isArray(d.window) ? d.window.slice() : null, passThreshold: d.passThreshold === undefined ? (d.kind === 'practice' ? null : 65) : d.passThreshold, parts };
  }
  const isGateDef = d => d && (d.kind || 'gate') === 'gate' && !d.practice;
  const inWindow = (state, d) => { const w = Array.isArray(d.window) ? d.window : cal().gate; return state.week >= w[0] && state.week <= w[1]; };
  // Gate deliverable for the player's tier, if any.
  const gateFor = state => C.deliverables.find(d => isGateDef(d) && num(d.tier) === state.player.tier) || null;
  const gateAvailable = state => { const d = gateFor(state); return !!d && inWindow(state, d) && state.player.gate == null; };
  // Score a deliverable; the tier's gate deliverable submitted inside its window records the season's gate score (and feeds writing).
  function submitDeliverable(state, id, answers) {
    const d = byId(C.deliverables, id); if (!d) return err('deliverable.notEligible');
    answers = answers || {}; const defs = listOf(d.parts);
    const parts = defs.map((p, i) => { const r = scorePart(p, answers[p.id] !== undefined ? answers[p.id] : answers[i]); return { id: p.id, index: i, kind: p.kind, weight: num(p.weight, 100 / Math.max(1, defs.length)), score: r.score, feedback: r.feedback }; });
    const tw = parts.reduce((s, p) => s + p.weight, 0) || 1; const total = Math.round(parts.reduce((s, p) => s + p.score * p.weight, 0) / tw);
    const isGate = isGateDef(d) && num(d.tier) === state.player.tier && inWindow(state, d) && state.player.gate == null;
    const threshold = d.passThreshold === undefined ? (isGateDef(d) ? 65 : null) : d.passThreshold;
    if (isGate) { state.player.gate = total; if (state.player.skills.writing) mastery(state, 'writing', total, { w: 0.5 }); }
    return { ok: true, id: d.id, score: total, parts, gate: isGate, practice: !isGateDef(d), threshold, pass: threshold == null ? null : total >= threshold };
  }

  // ───────────────────────── patterns (12 detectors) ─────────────────────────
  const MIN_N = 4;
  const DETECTORS = [
    { id: 'late-escalation-by-domain', minN: MIN_N, run(es) { const by = {}; for (const e of es) if (e.rightEscalation && e.calibration) (by[e.domain || '*'] = by[e.domain || '*'] || []).push(e); const out = []; for (const d of Object.keys(by)) { const n = by[d].length, k = by[d].filter(e => e.calibration === 'late').length; if (n >= MIN_N && k / n >= 0.5) out.push({ params: { k, n, domain: d }, strength: k / n }); } return out; } },
    { id: 'early-escalation', minN: MIN_N, run(es) { const c = es.filter(e => e.calibration); const n = c.length, k = c.filter(e => e.calibration === 'early').length; return n >= MIN_N && k / n >= 0.4 ? [{ params: { k, n }, strength: k / n }] : []; } },
    { id: 'info-skipped-decisive-missed', minN: MIN_N, run(es) { const c = es.filter(e => e.info && e.info.decisiveTotal > 0 && e.info.decisiveBought === 0); const n = c.length; const pct = n ? Math.round(100 * c.filter(e => e.option.quality <= 1).length / n) : 0; return n >= MIN_N && pct >= 50 ? [{ params: { pct, n }, strength: pct / 100 }] : []; } },
    { id: 'irreversible-under-pressure', minN: MIN_N, run(es) { const c = es.filter(e => e.rubric && e.rubric.reversibility); const bad = c.filter(e => e.rubric.reversibility.pts === 0); const k = bad.length, j = bad.filter(e => e.energy < 30).length; return c.length >= MIN_N && k >= 3 ? [{ params: { k, j }, strength: k / c.length }] : []; } },
    { id: 'trap-buyer', minN: MIN_N, run(es) { const c = es.filter(e => e.info && e.info.offered > 0); const n = c.length, k = c.filter(e => e.info.noise.length > 0).length; return n >= MIN_N && k / n >= 0.4 ? [{ params: { k, n }, strength: k / n }] : []; } },
    { id: 'premortem-miss', minN: MIN_N, run(es) { const c = es.filter(e => e.kind === 'full' && e.consequences.some(x => x.failureMode)); const n = c.length, k = c.filter(e => !e.consequences.some(x => x.failureMode === e.failureMode)).length; return n >= MIN_N && k / n >= 0.5 ? [{ params: { k, n }, strength: k / n }] : []; } },
    { id: 'followup-ignored', minN: MIN_N, run(es) { const c = es.filter(e => e.kind === 'full'); const k = c.filter(e => e.followup && (e.followup.ignored || e.followup.late)).length; return c.length >= MIN_N && k >= 3 ? [{ params: { k }, strength: k / c.length }] : []; } },
    { id: 'noise-under-low-energy', minN: MIN_N, run(es) { const c = es.filter(e => e.info && e.info.offered > 0); const lo = c.filter(e => e.energy < 30), hi = c.filter(e => e.energy >= 30); if (lo.length < MIN_N || hi.length < MIN_N) return []; const rl = lo.filter(e => e.info.noise.length).length / lo.length, rh = hi.filter(e => e.info.noise.length).length / hi.length; const x = rh > 0 ? rl / rh : (rl > 0 ? 9.9 : 0); return x >= 1.5 ? [{ params: { x: round1(x) }, strength: Math.min(1, x / 4) }] : []; } },
    { id: 'same-family-regression', minN: MIN_N, run(es) { if (es.length < MIN_N) return []; const by = {}; for (const e of es) if (e.family && e.kind !== 'moment') (by[e.family] = by[e.family] || []).push(e); const out = []; for (const f of Object.keys(by)) { const l = by[f]; if (l.length < 2) continue; const p2 = l[l.length - 1].P, p1 = l[l.length - 2].P; if (p1 - p2 >= 15) out.push({ params: { family: f, p1, p2 }, strength: (p1 - p2) / 100 }); } return out.sort((a, b) => b.strength - a.strength).slice(0, 2); } },
    { id: 'crunch-dip', minN: MIN_N, run(es, state) { const wk = {}; for (const e of es) { const k = e.season + ':' + e.week; const w = wk[k] = wk[k] || { full: 0, match: false, P: [] }; if (e.kind === 'full') w.full++; if (e.kind === 'moment') w.match = true; if (e.kind !== 'moment') w.P.push(e.P); } const crunch = [], other = []; for (const w of Object.values(wk)) (w.full >= 2 && w.match ? crunch : other).push(...w.P); if (crunch.length < MIN_N || other.length < MIN_N) return []; const d = Math.round(mean(other) - mean(crunch)); return d >= 10 ? [{ params: { d }, strength: d / 50 }] : []; } },
    { id: 'good-process-bad-luck', minN: MIN_N, run(es) { if (es.length < MIN_N) return []; const k = es.filter(e => e.P >= 70 && e.O <= 4).length; return k >= 2 ? [{ params: { k }, strength: k / es.length }] : []; } },
    { id: 'bad-process-good-luck', minN: MIN_N, run(es) { if (es.length < MIN_N) return []; const k = es.filter(e => e.P <= 40 && e.O >= 7).length; return k >= 2 ? [{ params: { k }, strength: k / es.length }] : []; } }
  ];
  // Season-to-date pattern lines, strongest first, at most 5.
  function patterns(state, opts) {
    opts = opts || {}; const season = opts.season || state.season;
    const es = state.journal.filter(e => e.season === season && (opts.includeMoments !== false ? true : e.kind !== 'moment'));
    const main = es.filter(e => e.kind !== 'moment');
    const out = [];
    for (const d of DETECTORS) { const src = (d.id === 'good-process-bad-luck' || d.id === 'bad-process-good-luck' || d.id === 'crunch-dip') ? es : main; for (const r of d.run(src, state)) out.push({ id: d.id, key: 'pattern.' + d.id, params: r.params, strength: round2(r.strength) }); }
    return out.sort((a, b) => b.strength - a.strength).slice(0, opts.limit || 5);
  }
  patterns.detectors = DETECTORS;
  // Journal metrics (§9): means, rates, calibration, divergences.
  function metrics(state, season) {
    const es = state.journal.filter(e => e.kind !== 'moment' && (season == null || e.season === season));
    const n = es.length; const P = es.map(e => e.P);
    const half = Math.floor(n / 2);
    const withInfo = es.filter(e => e.info && e.info.decisiveTotal > 0);
    const cal = es.filter(e => e.calibration);
    const fu = es.filter(e => e.kind === 'full');
    const pm = es.filter(e => e.consequences.some(c => c.failureMode));
    return {
      n, processMean: Math.round(mean(P)), trend: n >= 4 ? Math.round(mean(P.slice(half)) - mean(P.slice(0, half))) : 0,
      infoRate: withInfo.length ? Math.round(100 * withInfo.filter(e => e.info.decisiveBought > 0).length / withInfo.length) : null,
      noiseRate: es.filter(e => e.info && e.info.offered).length ? Math.round(100 * es.filter(e => e.info && e.info.noise.length).length / es.filter(e => e.info && e.info.offered).length) : null,
      calibration: { right: cal.filter(e => e.calibration === 'right').length, early: cal.filter(e => e.calibration === 'early').length, late: cal.filter(e => e.calibration === 'late').length },
      reversibilityViolations: es.filter(e => e.rubric.reversibility && e.rubric.reversibility.pts === 0).length,
      premortemHit: pm.length ? Math.round(100 * pm.filter(e => e.consequences.some(c => c.failureMode === e.failureMode)).length / pm.length) : null,
      followupDone: fu.length ? Math.round(100 * fu.filter(e => e.followup && !e.followup.ignored).length / fu.length) : null,
      goodProcessBadOutcome: es.filter(e => e.P >= 70 && e.O <= 4).length, badProcessGoodOutcome: es.filter(e => e.P <= 40 && e.O >= 7).length,
      byDomain: groupMean(es, e => e.domain), bySkill: groupMean(es.flatMap(e => Object.keys(e.skills || {}).map(id => ({ k: id, P: e.P }))), x => x.k)
    };
  }
  function groupMean(list, kf) { const g = {}; for (const e of list) { const k = kf(e); if (!k) continue; (g[k] = g[k] || []).push(e.P); } const out = {}; for (const k of Object.keys(g)) out[k] = Math.round(mean(g[k])); return out; }
  // Journal export as Markdown with headings from strings (journal.export.*), one entry per section.
  function exportJournal(state) {
    const lines = []; const H = k => t('journal.export.' + k);
    for (const e of state.journal) {
      if (e.kind === 'moment') continue; const s = scenarioById(e.scenarioId) || {}; const ctx = ctxFor(state, e.engId);
      lines.push(t('journal.export.heading', { week: e.week, season: e.season, client: ctx.params.client || '' }, ctx) + ' · ' + fill(e.title || '', {}, ctx));
      if (e.framing) { const f = byId(listOf(s.framings), e.framing.id); lines.push('- ' + H('question') + ': ' + fill(f ? f.text : '', {}, ctx)); }
      lines.push('- ' + H('known') + ': ' + e.info.bought.map(id => { const i = byId(listOf(s.info), id); return i ? fill(i.label, {}, ctx) : id; }).join('; '));
      lines.push('- ' + H('options') + ': ' + listOf(s.options).map(o => fill(o.label, {}, ctx)).join(' / '));
      lines.push('- ' + H('decided') + ': ' + (e.option.label ? fill(e.option.label, {}, ctx) : t(e.option.labelKey || '')) + ' (P ' + e.P + ' · O ' + e.O + ')');
      if (e.failureMode) { const m = byId(listOf(s.failureModes), e.failureMode); lines.push('- ' + H('signal') + ': ' + fill(m ? m.signal : '', {}, ctx)); }
      if (e.followupWeeks) lines.push('- ' + H('when') + ': ' + e.followupWeeks);
      if (e.learned) lines.push('- ' + e.learned);
      lines.push('');
    }
    return lines.join('\n');
  }

  // ───────────────────────── quarter close, season end, promotion, offers, losing ─────────────────────────
  function findSponsor(state) { const ids = [state.firm.mentorId, state.firm.managerId].concat(C.cast.filter(c => c.firmId === state.firm.id && (c.role === 'partner' || c.role === 'manager' || c.role === 'mentor')).map(c => c.id)).filter(Boolean); const left = id => hasFlag(state, id + '.left'); return ids.find(id => !left(id) && trustOf(state, id) >= 60) || null; }
  function quarterClose(state, notes) {
    const pl = state.player;
    state.firm.confidenceHistory.push({ season: state.season, week: state.week, value: pl.confidence });
    state.counters.lowConfQuarters = pl.confidence < 25 ? state.counters.lowConfQuarters + 1 : 0;
    const since = absWeek(state) - 12; const es = state.journal.filter(e => e.kind !== 'moment' && e.abs > since).sort((a, b) => a.P - b.P).slice(0, 3);
    addInbox(state, { type: 'news', key: 'quarter.talk', params: { week: state.week, n: es.length, list: es.map(e => render(state, e.title || '', e.engId)).join(' · ') }, journalIds: es.map(e => e.id), sender: state.firm.managerId || 'system' });
    if (state.counters.lowConfQuarters >= 2) dismiss(state, 'dismissal.confidence', notes);
  }
  // Schedule the quarterly AC set piece for next week: the active financial engagement with the earliest deadline, else any active.
  function scheduleQuarterAC(state, notes) {
    const act = activeEngs(state).sort((a, b) => a.deadline - b.deadline); const fin = act.filter(e => isFin(e.sector));
    const eng = fin[0] || act[0]; if (!eng) { note(notes, 'quarter.acSkipped'); return; }
    scheduleMatch(state, eng.id, 'ac', state.week + 1); note(notes, 'toast.matchScheduled', { week: state.week + 1, type: matchTypeDef('ac').hebrew || 'ac' }, { engId: eng.id });
  }
  // Transfer window (weeks 1–6): one offer card per other firm with p = clamp((rep − minRep)/40, 0, 0.9) × need.
  function rollOffers(state, notes) {
    const pl = state.player; const cur = firmOf(state);
    for (const f of C.firms) {
      if (f.id === state.firm.id) continue; const fd = firmDef(f.id);
      let p = clamp((pl.rep - num(fd.minRep)) / 40, 0, 0.9) * num(fd.need, 1);
      if (hasFlag(state, 'hard_talk') && num(fd.prestige) < num(cur.prestige)) p = Math.max(p, 0.6);
      if (rand(state) < p) { addInbox(state, { type: 'offer', firmId: f.id, sender: 'system', scouted: pl.scout > 0, expires: cal().window[1] }); note(notes, 'offers.window', { firm: f.id }); }
    }
  }
  // Accept an offer: confidence resets to 50; attributes, journal and cast memory stay; the sponsor does not move.
  function acceptOffer(state, inboxIdOrFirm) {
    const item = inboxItem(state, inboxIdOrFirm); const firmId = item ? item.firmId : inboxIdOrFirm; const f = firmDef(firmId); if (!f) return err('offers.empty');
    if (state.week > cal().window[1] && item) return err('offers.closed');
    state.cv.push({ kind: 'move', season: state.season, week: state.week, from: state.firm.id, to: firmId });
    initFirm(state, firmId); state.firm.since = state.season; state.player.confidence = 50; state.firm.confidenceHistory = []; state.firm.objectivesMet = {}; state.firm.market = [];
    state.inbox = state.inbox.filter(i => i.type !== 'offer'); delete state.player.flags.hard_talk;
    return { ok: true, firmId, note: { key: 'offers.accepted', params: { firm: f.name } } };
  }
  function declineOffer(state, inboxId) { const i = inboxItem(state, inboxId); if (i) { i.done = true; removeInbox(state, inboxId); } return { ok: true }; }
  // Dismissal: rep halves, post-mortem entries listed, move to a lower-prestige firm; three dismissals end the career.
  function dismiss(state, key, notes) {
    const pl = state.player; pl.rep = Math.round(pl.rep / 2); state.stats.dismissals++;
    const es = state.journal.filter(e => e.kind !== 'moment').slice(-24).sort((a, b) => a.P - b.P).slice(0, 5).map(e => e.id);
    state.cv.push({ kind: 'dismissal', season: state.season, week: state.week, firm: state.firm.id, key });
    if (state.stats.dismissals >= 3) { state.ended = { key: 'ending.careerOver', season: state.season, week: state.week, journalIds: es }; note(notes, 'ending.careerOver'); return; }
    const cur = firmOf(state); const lower = C.firms.filter(f => f.id !== state.firm.id && num(f.prestige) < num(cur.prestige)).sort((a, b) => num(a.prestige) - num(b.prestige));
    const next = lower[0] || C.firms.find(f => f.id !== state.firm.id) || cur;
    initFirm(state, next.id); state.firm.since = state.season; pl.confidence = 50; state.firm.confidenceHistory = []; state.counters.lowConfQuarters = 0; state.firm.market = [];
    addInbox(state, { type: 'news', key, params: { firm: next.name || next.id }, journalIds: es, sender: 'system', card: true }); note(notes, key, { firm: next.id }, { journalIds: es });
  }
  // Losing conditions checked each tick: material failure, ethics ending, forced leave.
  function losingConditions(state, notes) {
    const pl = state.player; if (state.ended) return;
    if (pl.integrity < 20) { state.ended = { key: 'ending.ethics', season: state.season, week: state.week }; note(notes, 'ending.ethics'); return; }
    if (hasFlag(state, 'crossroads_accepted')) { state.ended = { key: 'ending.otherSide', season: state.season, week: state.week }; note(notes, 'ending.otherSide'); return; }
    if (hasFlag(state, 'material_failure') && pl.rep < 30) { delete pl.flags.material_failure; dismiss(state, 'dismissal.materialFailure', notes); if (state.ended) return; }
    state.counters.lowEnergyWeeks = pl.energy < 10 ? state.counters.lowEnergyWeeks + 1 : 0;
    if (state.counters.lowEnergyWeeks >= 4) { state.counters.lowEnergyWeeks = 0; state.leaveUntil = absWeek(state) + 4; for (const id of SKILLS) { const sk = pl.skills[id]; sk.mastery = round2(Math.max(1, sk.mastery - 0.5)); } applyEffect(state, { confidence: -5 }); for (const e of activeEngs(state)) e.deadline = adjustHoliday(e.deadline + 4); addInbox(state, { type: 'news', key: 'leave.forced', params: { weeks: 4 }, sender: state.firm.mentorId || 'system', card: true }); note(notes, 'leave.forced', { weeks: 4 }); }
  }
  // Board objectives for the firm screen and the annual review.
  function objectiveMetrics(state) {
    const engs = state.engagements.filter(e => e.season === state.season && !e.short); const es = state.journal.filter(e => e.season === state.season && e.kind !== 'moment');
    const closed = engs.filter(e => e.phase === 'closed');
    return { meanQ: Math.round(mean(engs.map(e => e.quality))), meanP: Math.round(mean(es.map(e => e.P))), confidence: state.player.confidence, rep: state.player.rep, onTime: closed.length ? Math.round(100 * closed.filter(e => e.onTime).length / closed.length) : 0, findings: engs.reduce((s, e) => s + e.findings.length, 0) };
  }
  // Board objectives; a target <= 1 is a fraction of a percentage metric (onTime 0.9 → 90%).
  function objectives(state) { const m = objectiveMetrics(state); return listOf(firmOf(state).boardObjectives).map(o => { const target = num(o.target) <= 1 ? Math.round(num(o.target) * 100) : num(o.target); return { metric: o.metric, target, hebrew: o.hebrew || null, value: m[o.metric] != null ? m[o.metric] : 0, met: m[o.metric] != null && m[o.metric] >= target }; }); }
  // Awards at week 48; each is { key, season, params, journalId? }.
  function computeAwards(state, seasonScore) {
    const es = state.journal.filter(e => e.season === state.season && e.kind !== 'moment'); const out = []; const pl = state.player;
    const rival = roleIds(state, null).rival;
    if (seasonScore >= 70 && pl.confidence >= 65) out.push({ key: 'award.analystOfYear', season: state.season, params: { name: pl.name }, winner: 'player' }); else if (rival) out.push({ key: 'award.analystOfYear', season: state.season, params: { name: (personDef(rival) || {}).name || '' }, winner: rival });
    const best = es.slice().sort((a, b) => b.P - a.P)[0]; if (best) out.push({ key: 'award.bestMemo', season: state.season, params: { p: best.P, title: best.title }, journalId: best.id, winner: 'player' });
    const esc = es.filter(e => e.calibration === 'right' && e.option.escalation === 'escalate').sort((a, b) => Math.abs(b.applied.confidence) + Math.abs(b.applied.engQuality) - Math.abs(a.applied.confidence) - Math.abs(a.applied.engQuality))[0]; if (esc) out.push({ key: 'award.escalation', season: state.season, params: { title: esc.title }, journalId: esc.id, winner: 'player' });
    const fe = state.engagements.filter(e => e.season === state.season && e.findings.length).sort((a, b) => b.quality - a.quality)[0]; if (fe) out.push({ key: 'award.finding', season: state.season, params: { client: fe.clientId, q: fe.quality }, engId: fe.id, winner: 'player' });
    const early = es.filter(e => e.calibration === 'early').length; if (early >= 3) out.push({ key: 'award.wolf', season: state.season, params: { k: early }, winner: 'player', shame: true });
    return out;
  }
  // The three decisions that mattered most (by |applied| sum) with the branch not taken.
  function topDecisions(state, season) {
    const es = state.journal.filter(e => e.season === season && e.kind !== 'moment');
    const rank = e => Math.abs(e.applied.confidence) + Math.abs(e.applied.rep) + Math.abs(e.applied.engQuality);
    return es.sort((a, b) => rank(b) - rank(a)).slice(0, 3).map(e => { const s = scenarioById(e.scenarioId); const alt = s ? listOf(s.options).filter(o => o.id !== e.option.id).sort((a, b) => num(b.quality) - num(a.quality))[0] : null; return { journalId: e.id, title: e.title, P: e.P, O: e.O, weight: round1(rank(e)), branch: alt ? { id: alt.id, label: alt.label, why: alt.feedback ? alt.feedback.why : null, quality: num(alt.quality) } : null }; });
  }
  // Annual review at week 48: season score, objectives, awards, promotion verdict; then the next season starts.
  function seasonEnd(state, notes) {
    const pl = state.player; const firm = firmOf(state); const season = state.season;
    const m = objectiveMetrics(state);
    const seasonScore = round1(0.40 * m.meanQ + 0.35 * m.meanP + 0.25 * pl.confidence);
    const objs = objectives(state); state.firm.objectivesMet = {}; for (const o of objs) state.firm.objectivesMet[o.metric] = o.met;
    if (objs.length && !objs.some(o => o.met)) { applyEffect(state, { confidence: -5 }); note(notes, 'season.objectivesMissed'); }
    const awards = computeAwards(state, seasonScore); for (const a of awards) if (a.winner === 'player') state.stats.awards.push(a);
    const sponsor = findSponsor(state); state.firm.sponsorId = sponsor;
    const reasons = []; const tier = pl.tier; const pd = num(firm.promoDelta);
    const needScore = 62 + 4 * (tier - 1) + pd; if (seasonScore < needScore) reasons.push('season.reason.score');
    if (pl.confidence < 70 + pd) reasons.push('season.reason.confidence');
    const hasGate = !!gateFor(state);
    if (hasGate && (pl.gate == null || pl.gate < 65)) reasons.push(pl.gate == null ? 'season.reason.noGate' : 'season.reason.gate');
    if (!sponsor) reasons.push('season.reason.sponsor');
    const mins = TIER_MINS[tier + 1] || {}; if (Object.keys(mins).some(id => pl.skills[id] && pl.skills[id].mastery < mins[id])) reasons.push('season.reason.attrs');
    if (tier === 4 && pl.rep < 75) reasons.push('season.reason.attrs');
    const promoted = tier < 5 && reasons.length === 0;
    const rival = roleIds(state, null).rival; let rivalPromoted = false;
    if (pl.confidence < 65 && rival) { rivalPromoted = true; setFlag(state, rival + '.promoted_first', 1); }
    let verdict = 'season.verdict.stay';
    if (promoted) { pl.tier++; state.stats.promotions.push({ season, tier: pl.tier }); verdict = 'season.verdict.promoted'; pl.failedPromotions = {}; if (pl.tier === 2 && !state.milestone) state.milestone = { key: 'ending.v1Milestone', season }; if (pl.tier === 5 && num(firm.prestige) >= 70) state.ended = { key: 'ending.summit', season, week: WEEKS }; }
    else { pl.failedPromotions[tier] = num(pl.failedPromotions[tier]) + 1; if (pl.failedPromotions[tier] >= 2) { verdict = 'season.verdict.warning'; setFlag(state, 'hard_talk', 1); } }
    const deltas = {}; for (const id of SKILLS) deltas[id] = round1(pl.skills[id].mastery - num(state.stats.skillsAtSeasonStart[id], pl.skills[id].mastery));
    const report = { season, firmId: state.firm.id, tier, score: seasonScore, meanQ: m.meanQ, meanP: m.meanP, confidence: pl.confidence, rep: pl.rep, objectives: objs, awards, promoted, verdict, reasons, sponsorId: sponsor, rivalPromoted, gate: pl.gate, topDecisions: topDecisions(state, season), patterns: patterns(state, { season }), attrDeltas: deltas, engagements: state.engagements.filter(e => e.season === season).map(e => ({ id: e.id, clientId: e.clientId, type: e.type, quality: e.quality, onTime: e.onTime, closed: e.phase === 'closed' })), metrics: metrics(state, season), dismissals: state.stats.dismissals };
    state.stats.seasons.push(report); state.report = report;
    for (const e of state.engagements) if (e.season === season && e.phase !== 'closed') { e.phase = 'closed'; e.status = 'closed'; e.closedWeek = WEEKS; e.onTime = false; e.matchDue = null; } // unfinished work is frozen at year end, no rep
    state.cv.push({ kind: 'season', season, firm: state.firm.id, tier, score: seasonScore, promoted, awards: awards.filter(a => a.winner === 'player').map(a => a.key) });
    pl.integrity = clamp(pl.integrity + 1, 0, 100);
    note(notes, verdict, { score: seasonScore, tier: pl.tier, n: needScore, list: Object.keys(mins).filter(id => pl.skills[id] && pl.skills[id].mastery < mins[id]).map(id => t('skill.' + id)).join(', '), reasons: reasons.map(k => t(k, { n: needScore, list: Object.keys(mins).filter(id => pl.skills[id] && pl.skills[id].mastery < mins[id]).map(id => t('skill.' + id)).join(', ') })).join(', ') }, { report: true, reasonKeys: reasons });
    state.season++; state.week = 1;
    startSeason(state, notes);
  }

  // ───────────────────────── the tick ─────────────────────────
  // End of week: the deterministic weekly step in the §14 order. Returns { notes, week, season, energyDelta }.
  function tick(state, opts) {
    opts = opts || {}; const notes = [];
    if (state.ended) return { notes: [note(null, state.ended.key)], week: state.week, season: state.season, ended: state.ended };
    const budget = state.budget; const cl = cal();
    const seasonEnded = state.week >= WEEKS;
    if (seasonEnded) { scheduleQuarterACIfDue(state, notes); seasonEnd(state, notes); } else state.week++;
    state.weekDelta = { confidence: 0 };
    const abs = absWeek(state); const onLeave = state.leaveUntil > abs;
    fireQueue(state, abs, notes);                                        // 1
    advanceEngagements(state, notes);                                    // 2
    autoResolveMatches(state, notes); placeMatches(state);               // 3
    const energyDelta = onLeave ? (state.player.energy = clamp(state.player.energy + 15, 0, 100), 15) : energyStep(state, budget); // 4
    mastery.decay(state, abs);                                           // 5
    pruneInbox(state);
    drawInbox(state, notes);                                             // 6 + 7
    decayTrust(state, abs);                                              // 8
    if (cl.quarters.includes(state.week)) quarterClose(state, notes);    // 9
    if (cl.quarters.includes(state.week + 1)) scheduleQuarterAC(state, notes);
    losingConditions(state, notes);
    if (state.player.scout > 0 && !C.events.some(e => e.scoutable)) state.player.scout = Math.min(state.player.scout, 4);
    state.budget = newBudget();
    state.stats.energyLog.push(state.player.energy); if (state.stats.energyLog.length > 500) state.stats.energyLog.shift();
    if (opts.storage) save(state, opts.storage, opts.slot);
    return { notes, week: state.week, season: state.season, energyDelta, ended: state.ended, milestone: state.milestone, report: seasonEnded ? state.report : null };
  }
  function scheduleQuarterACIfDue() { /* AC at week 48 is scheduled at the tick into 47 (quarters.includes(week+1)); nothing to do here */ }
  // Trust decay: −1/week after 6 idle weeks; floor 30 for colleagues at the current firm, 10 for everyone else.
  function decayTrust(state, abs) {
    const all = Object.assign({}, state.world.cast, state.world.contacts);
    for (const id of Object.keys(all)) {
      const p = all[id]; if (abs - num(p.idleSince) <= 6) continue;
      const def = personDef(id) || {}; const colleague = def.kind === 'cast' && (def.firmId === state.firm.id) && ['mentor', 'manager', 'rival', 'partner', 'junior'].includes(def.role);
      const floor = colleague ? 30 : 10; if (p.trust > floor) p.trust = Math.max(floor, round1(p.trust - 1));
    }
  }

  // ───────────────────────── save / load / migrate ─────────────────────────
  const migrations = []; // [{ from, to, fn }]
  function migrate(state, list) { list = list || migrations; let guard = 0; for (;;) { const m = list.find(x => x.from === state.v); if (!m || guard++ > 50) break; m.fn(state); state.v = m.to; } if (!state.budget) state.budget = newBudget(); if (!state.weekDelta) state.weekDelta = { confidence: 0 }; return state; }
  const exportJSON = state => JSON.stringify(state);
  // Import a save: parse, migrate, drop inbox/queue/match references to ids the installed content no longer has.
  function importJSON(text) {
    let s; try { s = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return err('toast.importFailed'); }
    if (!s || typeof s !== 'object' || !s.player || !s.world || !Array.isArray(s.inbox)) return err('toast.importFailed');
    migrate(s);
    let dropped = 0; const notes = [];
    if (C.scenarios.length || C.moments.length || C.events.length) {
      const known = id => !id || IDX.scenarios.has(id) || IDX.moments.has(id) || IDX.events.has(id);
      const n0 = s.inbox.length; s.inbox = s.inbox.filter(i => known(i.scenarioId) && known(i.eventId)); dropped += n0 - s.inbox.length;
      const q0 = s.queue.length; s.queue = s.queue.filter(q => known(q.scenarioId)); dropped += q0 - s.queue.length;
      s.scriptedLeft = listOf(s.scriptedLeft).filter(id => IDX.scenarios.has(id));
      for (const m of listOf(s.matches)) { const n = m.moments.length; m.moments = m.moments.filter(id => IDX.moments.has(id)); m.hostility = m.hostility.slice(0, m.moments.length); if (m.momentIdx > m.moments.length) m.momentIdx = m.moments.length; dropped += n - m.moments.length; }
    }
    if (dropped) notes.push({ key: 'toast.staleContent', params: { n: dropped } });
    return { ok: true, state: s, dropped, notes };
  }
  function save(state, storage, slot) { try { storage.setItem('mm.save.' + (slot || 1), exportJSON(state)); return true; } catch (e) { return false; } }
  function load(storage, slot) { try { const text = storage.getItem('mm.save.' + (slot || 1)); if (!text) return null; const r = importJSON(text); return r.ok ? r : null; } catch (e) { return null; } }
  function slotSummary(storage, slot) { try { const text = storage.getItem('mm.save.' + (slot || 1)); if (!text) return null; const s = JSON.parse(text); return { name: s.player.name, gender: s.player.gender, tier: s.player.tier, season: s.season, week: s.week, firmId: s.firm.id, ended: s.ended || null }; } catch (e) { return null; } }

  // ───────────────────────── views & misc helpers for the UI ─────────────────────────
  const tierKey = state => 'tier.' + clamp(state.player.tier, 1, 5) + '.title';
  const bandKey = m => 'band.' + band(m);
  const integrityKey = v => 'integrity.' + integrityBand(v);
  function trustUnlocks(state, id) { const tr = trustOf(state, id); const def = personDef(id) || {}; return { trust: tr, hostile: tr < 30, contactBonus: tr >= 60 && def.kind === 'contact', iaPlan: tr >= 60 && (def.role === 'clientIA' || id === (C.clients.find(c => c.iaId === id) || {}).iaId), sponsor: tr >= 60 && def.kind === 'cast' && ['mentor', 'manager', 'partner'].includes(def.role), mentorNote: tr >= 70 && def.role === 'mentor' }; }
  function calendarView(state) { const cl = cal(); const out = []; for (let w = 1; w <= WEEKS; w++) out.push({ week: w, month: Math.ceil(w / 4), holiday: cl.holidays.includes(w), light: cl.light.includes(w), august: cl.august.includes(w), crunch: cl.crunch.includes(w), quarter: cl.quarters.includes(w), window: w >= cl.window[0] && w <= cl.window[1], gate: w >= cl.gate[0] && w <= cl.gate[1], rollforward: w >= cl.rollforward[0] && w <= cl.rollforward[1], certification: w === cl.certification, deadlines: state.engagements.filter(e => e.season === state.season && e.deadline === w).map(e => e.id), matches: state.matches.filter(m => m.season === state.season && m.week === w).map(m => m.id), now: w === state.week }); return out; }

  // ───────────────────────── balance sim (also used by ?sim in the browser) ─────────────────────────
  // Plays N seasons with a policy ('best' | 'random' | 'lazy'); returns per-run metrics. Drives everything through the public API.
  function sim(opts) {
    opts = opts || {}; const seasons = num(opts.seasons, 1), policy = opts.policy || 'best', seed = opts.seed != null ? opts.seed : 1, runs = num(opts.runs, 1);
    const results = [];
    for (let r = 0; r < runs; r++) results.push(simRun(seed + r, seasons, policy, opts));
    return { policy, seasons, runs, results, summary: simSummary(results) };
  }
  function simRun(seed, seasons, policy, opts) {
    const st = newGame({ name: 'sim', gender: 'm', seed, firmId: opts.firmId });
    const rnd = { s: hashSeed(seed) ^ 0x9e3779b9 }; const R = () => rand({ rng: rnd });
    const log = { energy: [], confidence: [], P: [], Q: [], weeksBelow30: 0, repeats: 0, drawn: {}, rungs: {}, rooms: 0, matches: 0, autoResolved: 0, promotions: 0, dismissals: 0, ended: null, tiers: [] };
    const target = seasons; let guard = 0;
    while (st.season <= target && !st.ended && guard++ < WEEKS * target + 5) {
      simWeek(st, policy, R, log);
      const res = tick(st);
      for (const n of res.notes) if (n.key === 'match.autoResolved') log.autoResolved++;
      log.energy.push(st.player.energy); log.confidence.push(st.player.confidence); if (st.player.energy < 30) log.weeksBelow30++;
    }
    for (const d of st.stats.draws) { const k = d.season + ':' + d.id; log.drawn[k] = (log.drawn[k] || 0) + 1; }
    log.repeats = Object.values(log.drawn).filter(n => n > 1).length;
    log.rungs = st.stats.drawRungs; log.promotions = st.stats.promotions.length; log.dismissals = st.stats.dismissals; log.ended = st.ended ? st.ended.key : null; log.tier = st.player.tier;
    log.P = st.journal.filter(e => e.kind !== 'moment').map(e => e.P); log.Q = st.stats.seasons.map(s => s.meanQ); log.seasonScores = st.stats.seasons.map(s => s.score);
    log.journal = st.journal.length; log.energyMean = round1(mean(log.energy)); log.energyMin = Math.min.apply(null, log.energy.length ? log.energy : [0]);
    log.rep = st.player.rep; log.confidenceEnd = st.player.confidence; log.seasonsPlayed = st.stats.seasons.length;
    return log;
  }
  // One simulated week: plan blocks, play the inbox, answer follow-ups, play matches.
  function simWeek(st, policy, R, log) {
    const act = activeEngs(st).sort((a, b) => a.deadline - b.deadline);
    const plan = policy === 'lazy' ? ['work', 'rest'] : policy === 'random' ? Array.from({ length: 5 }, () => ['work', 'work', 'learn', 'network', 'scout', 'rest'][Math.floor(R() * 6)]) : (st.player.energy < 40 ? ['work', 'work', 'rest', 'learn', 'network'] : ['work', 'work', 'work', 'learn', 'network']);
    for (const k of plan) {
      if (k === 'work') { if (act.length) spendBlock(st, 'work', { engId: act[Math.floor(R() * act.length)].id }); }
      else if (k === 'learn') { const r = spendBlock(st, 'learn', { skillId: CRAFT[Math.floor(R() * CRAFT.length)] }); if (r.ok && r.drill) runDrill(st, r.drill.id, r.drill.items.map(() => policy === 'best' ? 0 : Math.floor(R() * 4))); }
      else if (k === 'network') { const ids = [st.firm.mentorId, st.firm.managerId].concat(act.map(e => e.contactId)).filter(Boolean); if (ids.length) spendBlock(st, 'network', { personId: ids[Math.floor(R() * ids.length)] }); }
      else spendBlock(st, k, {});
    }
    for (const item of st.inbox.slice()) {
      if (item.type === 'decision') { simDecision(st, item, policy, R); log.rooms++; }
      else if (item.type === 'followup') answerFollowup(st, item.id, policy === 'best' ? true : R() < 0.5);
      else if (item.type === 'moment') { simMatch(st, item.matchId, policy, R); log.matches++; }
      else if (item.type === 'offer') { if (policy === 'best' && num(firmDef(item.firmId).prestige) > num(firmOf(st).prestige)) acceptOffer(st, item.id); }
      else markRead(st, item.id);
    }
    if (gateAvailable(st)) { const d = gateFor(st); if (d) submitDeliverable(st, d.id, simDeliverableAnswers(d, policy, R)); }
  }
  function simDecision(st, item, policy, R) {
    if (policy === 'lazy' && R() < 0.5) return;
    const room = openScenario(st, item.id); if (!room.ok) return; const s = scenarioById(room.scenarioId);
    const best = policy === 'best';
    if (room.framings.length) { const f = best ? listOf(s.framings).slice().sort((a, b) => num(b.quality) - num(a.quality))[0] : room.framings[Math.floor(R() * room.framings.length)]; chooseFraming(st, item.id, f.id); }
    for (const i of listOf(s.info)) { if (best ? i.kind === 'decisive' : (policy === 'random' && R() < 0.5)) buyInfo(st, item.id, i.id); }
    const view = roomView(st, item, s); const open = view.options.filter(o => !o.locked); if (!open.length) return;
    let opt;
    if (best) { const all = allOptions(s, item.draft.extraOptions).filter(o => open.some(x => x.id === o.id)); opt = all.sort((a, b) => num(b.quality) - num(a.quality))[0]; }
    else if (policy === 'random') opt = open[Math.floor(R() * open.length)]; else opt = open[0];
    const r = choose(st, item.id, opt.id); if (!r.ok || !r.pending) return;
    const fms = listOf(s.failureModes); const fm = best ? (fms.find(m => listOf(m.forOptions).includes(opt.id)) || fms[0]) : fms[Math.floor(R() * fms.length)]; if (fm) choosePremortem(st, item.id, fm.id);
    const rs = listOf(s.rationales); const ra = best ? (rs.find(x => listOf(x.fits).includes(opt.id)) || rs[0]) : rs[Math.floor(R() * rs.length)];
    submitMemo(st, item.id, { rationaleId: ra ? ra.id : null, followupWeeks: best ? num(s.followupWeeks, 4) : FOLLOWUP_LADDER[Math.floor(R() * 3)] });
  }
  function simMatch(st, matchId, policy, R) {
    if (policy === 'lazy' && R() < 0.5) return;
    const m = matchById(st, matchId); if (!m || m.played) return;
    startMatch(st, matchId); let guard = 0;
    while (!m.played && guard++ < 12) {
      const v = matchView(st, matchId); if (!v.moment) { resolveMatch(st, matchId); break; }
      const mom = momentById(v.moment.id); const open = v.moment.options.filter(o => !o.locked); if (!open.length) { resolveMatch(st, matchId, { auto: true }); break; }
      let opt; if (policy === 'best') opt = listOf(mom.options).filter(o => open.some(x => x.id === o.id)).sort((a, b) => num(b.quality) - num(a.quality))[0]; else if (policy === 'random') opt = open[Math.floor(R() * open.length)]; else opt = open[0];
      playMoment(st, matchId, opt.id);
    }
  }
  function simDeliverableAnswers(d, policy, R) {
    const ans = {}; const best = policy === 'best';
    for (const p of listOf(d.parts)) {
      let a = null;
      if (p.kind === 'slots') { a = {}; for (const sl of listOf(p.slots)) { const cs = listOf(sl.choices); if (!cs.length) continue; a[sl.id] = best ? cs.reduce((b, x, i) => num(x.quality) > num(cs[b].quality) ? i : b, 0) : Math.floor(R() * cs.length); } }
      else if (p.kind === 'ratings') { a = {}; const sc = p.scale || { min: 1, max: 5 }; for (const it of listOf(p.items)) { a[it.id] = {}; for (const layer of Object.keys(it.answer || {})) { const row = it.answer[layer]; if (row && typeof row === 'object') { a[it.id][layer] = {}; for (const dim of Object.keys(row)) a[it.id][layer][dim] = best ? row[dim] : num(sc.min, 1) + Math.floor(R() * (num(sc.max, 5) - num(sc.min, 1) + 1)); } else a[it.id][layer] = best ? row : num(sc.min, 1) + Math.floor(R() * (num(sc.max, 5) - num(sc.min, 1) + 1)); } } }
      else if (p.kind === 'order') { a = listOf(p.answer).slice(); if (!best) a.sort(() => R() - 0.5); }
      else if (p.kind === 'match') { a = {}; const ts = listOf(p.targets); for (const it of listOf(p.items)) { const rs = listOf(it.reasons); a[it.id] = { target: best ? it.answer : (ts[Math.floor(R() * ts.length)] || {}).id, reason: rs.length ? (best ? rs.findIndex(r => r.correct) : Math.floor(R() * rs.length)) : null }; } }
      ans[p.id] = a;
    }
    return ans;
  }
  function simSummary(rs) { const pct = f => rs.length ? Math.round(100 * rs.filter(f).length / rs.length) : 0; return { runs: rs.length, energyMean: round1(mean(rs.map(r => r.energyMean))), energyMin: Math.min.apply(null, rs.map(r => r.energyMin)), weeksBelow30: round1(mean(rs.map(r => r.weeksBelow30))), repeats: round1(mean(rs.map(r => r.repeats))), meanP: Math.round(mean(rs.flatMap(r => r.P))), meanQ: Math.round(mean(rs.flatMap(r => r.Q))), promotedPct: pct(r => r.promotions > 0), dismissedPct: pct(r => r.dismissals > 0), endedPct: pct(r => !!r.ended), autoResolved: round1(mean(rs.map(r => r.autoResolved))), rooms: round1(mean(rs.map(r => r.rooms))), matches: round1(mean(rs.map(r => r.matches))), tierRelaxDraws: rs.reduce((s, r) => s + num(r.rungs[5]) + num(r.rungs[6]), 0) }; }
  // Closed-form energy trajectory for a fixed weekly profile (used by the harness assertions).
  function energyTrajectory(profile, weeks, start, hoursPenalty) {
    let e = num(start, 80); const out = [e];
    for (let i = 0; i < weeks; i++) { const d = 10 - Math.round((e - 60) / 10) + 15 * num(profile.rest) + 2 * Math.floor(num(profile.unspent) / 4) - 2 * num(profile.work) - (num(profile.learn) + num(profile.network) + num(profile.scout)) - 3 * num(profile.rooms) - num(profile.light) - 4 * num(profile.matches) - 8 * num(profile.overdue) - num(hoursPenalty); e = clamp(e + d, 0, 100); out.push(round1(e)); }
    return out;
  }

  // ───────────────────────── public API ─────────────────────────
  const MM = {
    VERSION, WEEKS, SKILLS, CRAFT, PROCESS, PARTNER, PHASES, LADDER, FOLLOWUP_LADDER, RUBRIC_W, CAPS, TIER_CEIL, TRUST0, HOURS, DSL, calendar: cal,
    loadContent, content, scenario: scenarioById, moment: momentById, personDef, clientDef, firmDef, matchTypeDef, lessonDef, frameworkDef, scaleDef, tagDef, drillSkills,
    newGame, tick, draw: drawInbox, drawOne, openScenario, roomView: (state, inboxId) => { const i = inboxItem(state, inboxId); const s = i ? scenarioById(i.scenarioId) : null; return i && s ? roomView(state, i, s) : null; },
    buyInfo, chooseFraming, choose, choosePremortem, submitMemo, answerFollowup, setLearned, markRead, gateStatus, infoCost,
    scheduleMatch, placeMatches, startMatch, setApproach, matchView, playMoment, matchBreak, resolveMatch, computePrep,
    applyEffect, outcome, score, mastery, scheduler, skillNote, band, bandKey, integrityKey, tierKey, tierCeiling, patterns, metrics, exportJournal,
    spendBlock, energyStep, energyTrajectory, startDrill, runDrill, deliverable, gateFor, gateAvailable, submitDeliverable, scorePart,
    acceptOffer, declineOffer, rollOffers, seasonEnd, quarterClose, objectives, objectiveMetrics, findSponsor, dismiss, losingConditions,
    save, load, slotSummary, migrate, migrations, exportJSON, importJSON,
    t, fill, msg, render, ctxFor, roleIds, person, trustOf, trustUnlocks, absWeek, firmOf, engagement: engById, match: matchById, inboxItem, journalEntry: journalById,
    activeEngs, inboxCount, fullRooms, phaseKey, scaleFor, calendarView, isOverdue, requiresOk, pruneInbox, fireQueue, advanceEngagements, decayTrust, drawEvents,
    rand, sim, hashSeed
  };
  root.MM = MM;
  if (typeof module !== 'undefined') module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
