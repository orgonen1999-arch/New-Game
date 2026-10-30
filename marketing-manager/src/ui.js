/* ui.js — מרקטינג מנג'ר: הדרך לשותפות
   Renders every screen (DESIGN.md §12) from the MM state and window.MM_CONTENT.
   No framework, no dialogs, no literal Hebrew: every string goes through t(key).
   Sections: 0 adapter · 1 strings · 2 storage · 3 ui state/render · 4 components ·
             5 screens · 6 decision room · 7 match · 8 builders/drills · 9 events · 10 boot */
(function () {
'use strict';

/* ───────────────────────── 0. ADAPTER (engine + content accessors) ─────────────────────────
   Everything that touches MM or the content shape lives here, so integration touches one place.
   Expected MM API (DESIGN.md §15): loadContent, newGame, tick, openScenario, buyInfo, choose,
   submitMemo, playMoment, resolveMatch, patterns, save, load, exportJSON, importJSON, t.
   Optional extras used when present: prepMatch, answerFollowup, offers, acceptOffer, declineOffer,
   seasonSummary, scoreDeliverable, drill, readItem, addBlock, removeBlock, messages. */
const MMx = () => (typeof window !== 'undefined' && window.MM) || (typeof globalThis !== 'undefined' && globalThis.MM) || {};
const has = (fn) => typeof MMx()[fn] === 'function';
const call = (fn, ...args) => { try { return MMx()[fn](...args); } catch (e) { console.warn('MM.' + fn + ' failed', e); return { error: e }; } };

/* Engine functions may return a new state, {state, ...}, or mutate in place. adopt() normalises. */
function adopt(res) {
  if (res && typeof res === 'object') {
    if (res.player && res.world) { state = res; return res; }
    if (res.state && res.state.player) { state = res.state; return res; }
  }
  return res;
}

const CT = {
  all: null,
  load() {
    const raw = (typeof window !== 'undefined' && window.MM_CONTENT) || {};
    let loaded = null;
    if (has('loadContent')) { const r = call('loadContent', raw); if (r && !r.error) loaded = r; }
    if (!loaded) {
      loaded = {}; const scenarios = [];
      for (const k of Object.keys(raw)) { if (/^scenarios\./.test(k) && Array.isArray(raw[k])) scenarios.push(...raw[k]); else loaded[k] = raw[k]; }
      loaded.scenarios = scenarios.length ? scenarios : (Array.isArray(raw.scenarios) ? raw.scenarios : []);
    }
    CT.all = loaded; CT._idx = {};
    return loaded;
  },
  bank(name) { return (CT.all && CT.all[name]) || null; },
  list(name) { const b = CT.bank(name); if (Array.isArray(b)) return b; if (b && typeof b === 'object') return Object.keys(b).map(k => Object.assign({ id: k }, b[k])); return []; },
  byId(name, id) {
    if (!id) return null;
    if (!CT._idx[name]) { const m = {}; for (const it of CT.list(name)) if (it && it.id != null) m[it.id] = it; CT._idx[name] = m; }
    return CT._idx[name][id] || null;
  },
  strings() { const s = CT.bank('strings'); return (s && typeof s === 'object') ? s : {}; },
  scenario(id) { return CT.byId('scenarios', id) || CT.byId('moments', id); },
  moment(id) { return CT.byId('moments', id) || CT.byId('scenarios', id); },
  firm(id) { return CT.byId('firms', id); },
  client(id) { return CT.byId('clients', id); },
  cast(id) { return CT.byId('cast', id); },
  contact(id) { return CT.byId('stakeholders', id) || CT.byId('contacts', id); },
  person(id) { return CT.cast(id) || CT.contact(id); },
  lesson(id) { return CT.byId('lessons', id); },
  scale(id) { return CT.byId('ratingScales', id); },
  baseRate(id) { return CT.byId('baseRates', id); },
  matchType(id) { return CT.byId('matchTypes', id); },
  tagLabel(id) { const t = CT.bank('tags'); const x = t && (t.tags ? (Array.isArray(t.tags) ? t.tags.find(o => o.id === id) : t.tags[id]) : t[id]); return x ? (x.hebrew || x.label || x) : null; },
  biasLabel(id) { const t = CT.bank('tags'); const b = t && t.biases; const x = b && (Array.isArray(b) ? b.find(o => o.id === id) : b[id]); return x ? (x.hebrew || x.label || x) : null; },
  lessonsList() { const l = CT.bank('lessons'); if (Array.isArray(l)) return l; if (l && Array.isArray(l.lessons)) return l.lessons; if (l && typeof l === 'object') return Object.keys(l).filter(k => k !== 'frameworks').map(k => Object.assign({ id: k }, typeof l[k] === 'object' ? l[k] : { text: l[k] })); return []; },
  scalePills(scaleId) { const s = CT.scale(scaleId); if (!s) return []; const p = s.pills || s.levels || s.values || []; return p.map(x => typeof x === 'string' ? { id: x, label: x } : { id: x.id || x.label, label: x.hebrew || x.label || x.id }); },
};

/* State accessors (DESIGN.md §15 state shape). Kept tolerant of missing pieces. */
const S = {
  engagements(st) { return Array.isArray(st?.engagements) ? st.engagements : []; },
  activeEngagements(st) { return S.engagements(st).filter(e => e.phase !== 'closed'); },
  eng(st, id) { return S.engagements(st).find(e => e.id === id) || null; },
  inbox(st) { return Array.isArray(st?.inbox) ? st.inbox : []; },
  unread(st) { return S.inbox(st).filter(i => !i.read && !i.done).length; },
  journal(st) { return Array.isArray(st?.journal) ? st.journal : []; },
  entry(st, id) { return S.journal(st).find(e => e.id === id) || null; },
  matches(st) { return Array.isArray(st?.matches) ? st.matches : []; },
  match(st, id) { return S.matches(st).find(m => m.id === id) || null; },
  skills(st) { return st?.player?.skills || {}; },
  skill(st, id) { return S.skills(st)[id] || { mastery: 1, obs: 0, peak: 1, lastPracticed: 0 }; },
  castEntry(st, id) { return (st?.world?.cast && st.world.cast[id]) || (st?.world?.contacts && st.world.contacts[id]) || null; },
  trust(st, id) { const c = S.castEntry(st, id); return c ? (c.trust ?? 0) : null; },
  week(st) { return st?.week ?? 1; },
  season(st) { return st?.season ?? 1; },
  tier(st) { return st?.player?.tier ?? 1; },
  firmId(st) { return st?.firm?.id; },
  firm(st) { return CT.firm(S.firmId(st)) || {}; },
  plan(st) { if (!st.plan || typeof st.plan !== 'object') st.plan = { blocks: [], extraHours: 0 }; if (!Array.isArray(st.plan.blocks)) st.plan.blocks = []; return st.plan; },
  hoursUsed(st) { const p = S.plan(st); return p.blocks.reduce((a, b) => a + (b.hours || 0), 0) + (p.extraHours || 0); },
  hoursLeft(st) { return Math.max(0, 40 - S.hoursUsed(st)); },
  stats(st) { return st?.stats || {}; },
  ceiling(st) { return [12, 12, 15, 17, 19, 20][S.tier(st)] || 20; },
  lastSeason(st) { const s = S.stats(st).seasons; return Array.isArray(s) && s.length ? s[s.length - 1] : null; },
};

/* Engine wrappers — each degrades to a local fallback and returns a normalised result object. */
const A = {
  newGame(opts) { if (has('newGame')) { const r = adopt(call('newGame', opts)); if (r && !r.error) return state; } return defaultState(opts); },
  tick(st, plan) { if (!has('tick')) return { ok: false, soon: true }; const r = adopt(call('tick', st, plan)); return r && r.error ? { ok: false, error: r.error } : { ok: true, res: r }; },
  openItem(st, item) {
    let res = null;
    if (has('openScenario')) res = adopt(call('openScenario', st, item.id, item));
    if (res && res.error) res = null;
    if (!has('readItem')) item.read = true; else adopt(call('readItem', st, item.id));
    return res && typeof res === 'object' ? res : null;
  },
  buyInfo(st, room, infoId) {
    const info = (room.scenario.info || []).find(i => i.id === infoId);
    if (!info) return { ok: false };
    let res = null;
    if (has('buyInfo')) { res = adopt(call('buyInfo', st, room.engineRoom || room, infoId)); if (res && res.error) return { ok: false, error: res.error }; }
    if (!room.bought.includes(infoId)) room.bought.push(infoId);
    if (info.sets && !room.sets.includes(info.sets)) room.sets.push(info.sets);
    const hours = (res && typeof res.hours === 'number') ? res.hours : A.infoCost(st, info);
    if (!(res && res.charged)) S.plan(st).extraHours = (S.plan(st).extraHours || 0) + hours;
    room.hoursSpent = (room.hoursSpent || 0) + hours;
    return { ok: true, reveal: (res && res.reveal) || info.reveal, hours };
  },
  infoCost(st, info) { let h = info.hours || 1; if ((st?.player?.energy ?? 100) < 30) h *= 2; return h; },
  gateCheck(st, room, opt) {
    /* returns null when open, or the reason text (resolved) when gated */
    const need = opt.needsInfo ? [].concat(opt.needsInfo) : (opt.gate && opt.gate.info ? [].concat(opt.gate.info) : []);
    for (const n of need) if (!room.sets.includes(n)) {
      if (opt.gateText) return tx(opt.gateText, room.ctx);
      const inf = (room.scenario.info || []).find(i => i.sets === n);
      return t('gate.info', { info: inf ? tx(inf.label, room.ctx) : n }, room.ctx);
    }
    if (opt.gate && opt.gate.prep != null) { const p = room.match ? (room.match.prep || 0) : 0; if (p < opt.gate.prep) return opt.gateText ? tx(opt.gateText, room.ctx) : t('gate.prep', { prep: opt.gate.prep }, room.ctx); }
    if (opt.gate && opt.gate.trust) { const id = resolvePersonId(st, room, opt.gate.trust.id); const tr = S.trust(st, id) ?? 0; if (tr < opt.gate.trust.min) return opt.gateText ? tx(opt.gateText, room.ctx) : t('gate.trust', { name: personName(id, room.ctx), min: opt.gate.trust.min }, room.ctx); }
    return null;
  },
  choose(st, room, optId) {
    const opt = (room.scenario.options || []).find(o => o.id === optId);
    if (!opt) return { ok: false };
    let res = null;
    if (has('choose')) { res = adopt(call('choose', st, room.engineRoom || room, optId)); if (res && res.error) return { ok: false, error: res.error }; }
    room.optionId = optId;
    if (res && typeof res === 'object') room.engineResult = res;
    room.result = normaliseResult(res, opt, room);
    return { ok: true, res: room.result };
  },
  submitMemo(st, room, memo) {
    let res = null;
    if (has('submitMemo')) { res = adopt(call('submitMemo', st, room.engineRoom || room, memo)); if (res && res.error) return { ok: false, error: res.error }; }
    room.memo = memo;
    if (res && typeof res === 'object') {
      room.engineMemo = res;
      if (res.entry) room.entryId = res.entry.id;
      else if (res.journalId) room.entryId = res.journalId;
      if (res.result || res.luck) room.result = normaliseResult(res, (room.scenario.options || []).find(o => o.id === room.optionId), room);
    }
    if (!room.entryId) { const j = S.journal(st); const last = j.length ? j[j.length - 1] : null; if (last && last.scenarioId === room.scenario.id) room.entryId = last.id; }
    return { ok: true };
  },
  prepMatch(st, match, approach) {
    st.player.approach = Object.assign({}, st.player.approach || {}, approach);
    if (has('prepMatch')) { const r = adopt(call('prepMatch', st, match.id, approach)); if (r && !r.error) return; }
    match.fit = computeFit(match.type, approach);
  },
  playMoment(st, match, idx, optId) {
    const mid = match.moments && match.moments[idx]; const mo = momentOf(mid); const opt = mo && (mo.options || []).find(o => o.id === optId);
    if (!opt) return { ok: false };
    let res = null;
    if (has('playMoment')) { res = adopt(call('playMoment', st, match.id, idx, optId)); if (res && res.error) return { ok: false, error: res.error }; }
    match.played = match.played || [];
    if (!Array.isArray(match.played)) match.played = [];
    const good = res && typeof res.good === 'boolean' ? res.good : (opt.result ? Math.random() < (opt.result.pGood ?? .5) : true);
    const rec = { idx, optionId: optId, quality: opt.quality, good, text: (res && res.text) || (opt.result ? (good ? opt.result.good?.text : opt.result.bad?.text) : ''), feedback: opt.feedback || null, delta: res && res.delta };
    match.played[idx] = rec;
    return { ok: true, rec };
  },
  resolveMatch(st, match) {
    let res = null;
    if (has('resolveMatch')) { res = adopt(call('resolveMatch', st, match.id)); if (res && res.error) res = null; }
    match.playedAll = true;
    const r = res && typeof res === 'object' ? res : {};
    const ratings = r.ratings || match.ratings || {};
    return { ratings, headline: r.headline, tone: r.tone, findings: r.findings || (S.eng(st, match.engId) || {}).findings || [], delta: r.delta, soon: !res };
  },
  patterns(st) { if (!has('patterns')) return null; const r = call('patterns', st); return Array.isArray(r) ? r : (r && Array.isArray(r.patterns) ? r.patterns : []); },
  answerFollowup(st, item, entry, answer) {
    if (has('answerFollowup')) { const r = adopt(call('answerFollowup', st, item.id, answer)); if (r && !r.error) { item.done = true; return r; } }
    if (entry) { entry.followupAnswer = answer; entry.followupWeek = S.week(st); }
    item.done = true; item.read = true;
    return null;
  },
  offers(st) { if (has('offers')) { const r = call('offers', st); if (Array.isArray(r)) return r; } return Array.isArray(st?.offers) ? st.offers : []; },
  acceptOffer(st, offer) { if (has('acceptOffer')) { const r = adopt(call('acceptOffer', st, offer.firmId || offer.id)); return !(r && r.error); } return false; },
  declineOffer(st, offer) { if (has('declineOffer')) { adopt(call('declineOffer', st, offer.firmId || offer.id)); return true; } if (Array.isArray(st.offers)) st.offers = st.offers.filter(o => o !== offer); return true; },
  seasonSummary(st) { if (has('seasonSummary')) { const r = call('seasonSummary', st); if (r && !r.error) return r; } return S.lastSeason(st); },
  scoreDeliverable(st, deliverable, answers) { if (has('scoreDeliverable')) { const r = adopt(call('scoreDeliverable', st, deliverable.id, answers)); if (r && !r.error && typeof r.score === 'number') return r; } return scoreDeliverableLocal(deliverable, answers); },
  drillDone(st, drill, score) { if (has('drill')) { adopt(call('drill', st, drill.id, score)); return true; } return false; },
  exportJSON(st) { if (has('exportJSON')) { const r = call('exportJSON', st); if (typeof r === 'string') return r; } try { return JSON.stringify(st, null, 1); } catch (e) { return ''; } },
  importJSON(text) {
    if (has('importJSON')) { const r = call('importJSON', text, CT.all); if (r && !r.error) { const s = r.state && r.state.player ? r.state : (r.player ? r : null); return { state: s, messages: r.messages || [] }; } return { error: true }; }
    try { const s = JSON.parse(text); if (s && s.player) return { state: s, messages: [] }; } catch (e) { /* fallthrough */ }
    return { error: true };
  },
  messages(st, res) {
    /* collect {key, params} messages the engine wants shown as toasts */
    const out = [];
    const take = (arr) => { if (Array.isArray(arr)) for (const m of arr) if (m && m.key) out.push(m); };
    if (res && typeof res === 'object') { take(res.messages); take(res.toasts); }
    if (st) { take(st.messages); take(st.toasts); if (Array.isArray(st.messages)) st.messages.length = 0; if (Array.isArray(st.toasts)) st.toasts.length = 0; }
    return out;
  },
};

function normaliseResult(res, opt, room) {
  const r = res && typeof res === 'object' ? res : {};
  const inner = r.result && typeof r.result === 'object' ? r.result : r;
  const good = typeof inner.good === 'boolean' ? inner.good : (typeof inner.outcome === 'string' ? inner.outcome === 'good' : null);
  const luck = inner.luck && inner.luck.key ? inner.luck : (r.luck && r.luck.key ? r.luck : null);
  const text = inner.text || (opt && opt.result && good != null ? (good ? opt.result.good?.text : opt.result.bad?.text) : null);
  return {
    good, luck, text,
    P: numOr(inner.P ?? inner.process ?? r.P ?? r.process, null),
    O: numOr(inner.O ?? inner.outcomeScore ?? r.O ?? r.outcomeScore, null),
    feedback: inner.feedback || (opt && opt.feedback) || null,
    rubric: inner.rubric || r.rubric || null,
    applied: inner.applied || r.applied || null,
    pGood: opt && opt.result ? opt.result.pGood : null,
    pending: !res && has('choose') ? false : !res,
  };
}
function numOr(v, d) { return typeof v === 'number' && !isNaN(v) ? v : d; }

function computeFit(type, approach) {
  const mt = CT.matchType(type); if (!mt || !mt.fit || !approach) return 0;
  const vals = ['basis', 'transparency', 'escalation'].map(k => (mt.fit[k] && mt.fit[k][approach[k]]) ?? 0);
  return Math.round((vals.reduce((a, b) => a + b, 0) / 3) * 10) / 10;
}
function momentOf(ref) { if (!ref) return null; if (typeof ref === 'object') return ref.scenario || ref; return CT.moment(ref); }

function resolvePersonId(st, room, id) {
  if (!id) return null;
  const ctx = room.ctx || {};
  if (id === 'contact' || id === 'manager' || id === 'mentor' || id === 'regulator') return ctx[id] && ctx[id].id;
  return id;
}

/* Build the placeholder/gender context for an engagement (§7). */
function ctxFor(st, engId) {
  const ctx = { player: st?.player || {}, firm: S.firm(st) };
  const eng = S.eng(st, engId) || S.activeEngagements(st)[0] || S.engagements(st).slice(-1)[0];
  if (eng) {
    ctx.eng = eng; ctx.client = CT.client(eng.clientId) || { name: eng.clientId };
    ctx.contact = CT.person(eng.contactId); ctx.manager = CT.person(eng.managerId); ctx.ia = CT.person(eng.iaId);
  }
  const castList = CT.list('cast');
  for (const c of castList) { ctx[c.id] = c; if (c.role === 'mentor' && !ctx.mentor) ctx.mentor = c; if (c.role === 'regulator' && !ctx.regulator) ctx.regulator = c; if (c.role === 'manager' && !ctx.manager) ctx.manager = c; }
  if (!ctx.contact && eng) ctx.contact = CT.person(eng.contactId);
  return ctx;
}
function personName(id, ctx) { const p = (ctx && ctx[id]) || CT.person(id); return p ? (p.name || id) : (id || ''); }

/* Local default state used only when MM.newGame is absent, so every screen still renders. */
function defaultState(opts) {
  const skills = {};
  for (const id of SKILL_IDS.craft.concat(SKILL_IDS.process, SKILL_IDS.partner)) skills[id] = { mastery: 5, obs: 0, peak: 5, lastPracticed: 0 };
  return {
    v: 1, seed: Date.now() % 1e9, rng: { s: 1 }, season: 1, week: 1,
    player: { name: (opts && opts.name) || '', gender: (opts && opts.gender) || 'f', tier: 1, energy: 80, confidence: 55, rep: 20, integrity: 85, flags: {}, skills, ladder: {}, scout: 0, approach: { basis: 'risk', transparency: 'full', escalation: 'low' } },
    firm: { id: (opts && opts.firmId) || 'ofek', confidenceHistory: [55], sponsorId: null, objectivesMet: {} },
    world: { cast: {}, contacts: {}, firmHistory: {} },
    engagements: [], matches: [], inbox: [], queue: [], journal: [], seen: {}, familySeen: {}, scriptedLeft: [],
    stats: { ratings: [], awards: [], seasons: [], energyLog: [] }, cv: [], contentEndShown: false,
    plan: { blocks: [], extraHours: 0 }, local: true,
  };
}
const SKILL_IDS = {
  craft: ['risk', 'controls', 'testing', 'evidence', 'writing', 'reg', 'interview', 'client', 'present', 'prio'],
  process: ['framing', 'gather', 'judgment', 'premortem', 'escalation', 'memo'],
  partner: ['bd', 'positioning', 'datastory'],
};
const PHASES = ['planning', 'fieldwork', 'findings', 'report', 'present', 'closed'];
const BLOCKS = { work: { hours: 8, energy: -2 }, learn: { hours: 4, energy: -1 }, network: { hours: 4, energy: -1 }, scout: { hours: 4, energy: -1 }, rest: { hours: 8, energy: 15 } };
const HOLIDAYS = [15, 36, 37]; const LIGHT_WEEKS = [18, 22, 29, 30, 31, 32]; const QUARTERS = [12, 24, 36, 48];

/* ───────────────────────── 1. STRINGS & FORMATTING ─────────────────────────
   t(key, params, ctx)  → resolved HTML (escaped, numbers/Latin wrapped in <bdi>), via MM.t when present.
   tx(template, ctx, params) → resolve a raw content string (placeholders + gender tokens).
   tp(key, …) → plain text for attributes. Missing key → the key itself is shown. */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function bdiWrap(html) {
  if (!html || html.indexOf('<bdi') !== -1) return html;
  /* only touch text nodes, never tags */
  return html.split(/(<[^>]+>)/g).map(part => (part[0] === '<') ? part :
    part.replace(/(\d[\d.,:%\/−–-]*|[A-Za-z][A-Za-z0-9.\-]*)/g, '<bdi>$1</bdi>')).join('');
}
function resolveTemplate(str, params, ctx) {
  let s = String(str == null ? '' : str);
  const player = (ctx && ctx.player) || (state && state.player) || {};
  const pg = player.gender === 'm' ? 0 : 1;
  /* gender tokens: {who:masc|fem} and {masc|fem} */
  s = s.replace(/\{([A-Za-z_][\w-]*):([^{}|]*)\|([^{}|]*)\}/g, (m, who, a, b) => {
    const p = (ctx && ctx[who]) || CT.person(who);
    const g = p && p.gender === 'm' ? 0 : (p && p.gender === 'f' ? 1 : pg);
    return g === 0 ? a : b;
  });
  s = s.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (m, a, b) => pg === 0 ? a : b);
  /* placeholders: params first, then ctx names */
  s = s.replace(/\{([A-Za-z_][\w.-]*)\}/g, (m, k) => {
    if (params && params[k] != null) return String(params[k]);
    if (ctx) {
      const v = ctx[k];
      if (v != null) return typeof v === 'object' ? (v.name || v.id || '') : String(v);
    }
    if (k === 'player' && player.name) return player.name;
    return m;
  });
  return s;
}
function t(key, params, ctx) {
  const c = ctx || curCtx();
  let out = null;
  if (has('t')) { try { out = MMx().t(key, params || {}, c); } catch (e) { out = null; } }
  if (out == null || out === key || out === '') {
    const tpl = CT.strings()[key];
    out = tpl == null ? null : resolveTemplate(tpl, params, c);
  }
  if (out == null) return '<span class="faint">' + esc(key) + '</span>';
  return bdiWrap(esc(out));
}
function tp(key, params, ctx) { const c = ctx || curCtx(); const tpl = CT.strings()[key]; return tpl == null ? key : resolveTemplate(tpl, params, c); }
function tx(str, ctx, params) { if (str == null) return ''; return bdiWrap(esc(resolveTemplate(str, params, ctx || curCtx()))); }
function txp(str, ctx, params) { return str == null ? '' : resolveTemplate(str, params, ctx || curCtx()); }
function hasKey(key) { return CT.strings()[key] != null; }
function n(v, d) { if (v == null || isNaN(v)) return '<bdi>–</bdi>'; const x = typeof d === 'number' ? Number(v).toFixed(d) : String(Math.round(Number(v))); return '<bdi class="num">' + x + '</bdi>'; }
function pct(v) { return Math.max(0, Math.min(100, Number(v) || 0)); }
function band(m) { return m <= 5 ? 1 : m <= 10 ? 2 : m <= 15 ? 3 : 4; }
function initials(name) { const w = String(name || '?').replace(/["'״׳]/g, '').split(/\s+/).filter(Boolean); return (w[0] ? w[0][0] : '?') + (w[1] ? w[1][0] : ''); }
function curCtx() { return ui.ctx || (state ? ctxFor(state, ui.engId) : {}); }
function skillName(id) { return hasKey('skill.' + id) ? t('skill.' + id) : esc(id); }
function phaseName(eng, ph) { const k = eng && eng.type && hasKey('phase.' + eng.type + '.' + ph) ? 'phase.' + eng.type + '.' + ph : 'phase.' + ph; if (eng && eng.type === 'isox' && ph === 'report' && S.week(state) >= 41 && S.week(state) <= 44 && hasKey('phase.isox.rollforward')) return t('phase.isox.rollforward'); return t(k); }
function monthName(w) { return t('month.' + (Math.min(12, Math.ceil(w / 4)) || 1)); }
function weekChip(st) { return t('ui.weekChip', { week: S.week(st), month: tp('month.' + (Math.min(12, Math.ceil(S.week(st) / 4)) || 1)), season: S.season(st) }); }
function tierTitle(st) { return t('tier.' + S.tier(st) + '.title'); }

/* ───────────────────────── 2. STORAGE (localStorage in try/catch) ───────────────────────── */
const storage = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  remove(k) { try { window.localStorage.removeItem(k); return true; } catch (e) { return false; } },
};
const SLOT_KEY = (i) => 'mm.save.' + i;
function saveSlot(i, st) {
  if (!st) return false;
  if (has('save')) { const r = call('save', st, storage, i); if (r && r.error) { /* fall through */ } else if (r !== false) { storage.set('mm.slot', String(i)); return true; } }
  const ok = storage.set(SLOT_KEY(i), A.exportJSON(st));
  if (ok) storage.set('mm.slot', String(i));
  return ok;
}
function loadSlot(i) {
  if (has('load')) { const r = call('load', storage, i); if (r && !r.error && r.player) return r; if (r && r.state && r.state.player) return r.state; }
  const raw = storage.get(SLOT_KEY(i)); if (!raw) return null;
  const r = A.importJSON(raw); return r.state || null;
}
function slotMeta(i) {
  const raw = storage.get(SLOT_KEY(i)); if (!raw) return null;
  try { const s = JSON.parse(raw); const st = s.state && s.state.player ? s.state : s; return { name: st.player?.name, season: st.season, week: st.week, tier: st.player?.tier, firm: st.firm?.id, savedAt: st.savedAt }; } catch (e) { return { corrupt: true }; }
}
function autosave() { if (state) { state.savedAt = Date.now(); saveSlot(ui.slot || 1, state); } }

/* ───────────────────────── 3. UI STATE, ROUTING, RENDER ───────────────────────── */
let state = null;
const ui = { screen: 'open', slot: 1, sheet: null, toasts: [], engId: null, ctx: null, filters: { skill: '', domain: '' }, open: { name: '', gender: 'f', firmId: 'ofek' }, confirm: null, more: false, journalId: null, picker: null, sheetScroll: 0 };
const root = document.getElementById('app');
const TABS = [['dash', 'nav.dash', '▦'], ['inbox', 'nav.inbox', '✉'], ['files', 'nav.files', '▤'], ['journal', 'nav.journal', '✎'], ['more', 'nav.more', '⋯']];
const MORE = [['profile', 'nav.profile', '◉'], ['people', 'nav.people', '☺'], ['learn', 'nav.learn', '✦'], ['calendar', 'nav.calendar', '▦'], ['firm', 'nav.firm', '⌂'], ['offers', 'nav.offers', '✉'], ['season', 'nav.season', '★'], ['cv', 'nav.cv', '▤'], ['settings', 'nav.settings', '⚙']];

function go(screen) { ui.screen = screen; ui.more = false; render(); try { window.scrollTo(0, 0); } catch (e) { /* noop */ } }

function render() {
  if (!root) return;
  if (!state || ui.screen === 'open') { root.innerHTML = '<div class="content">' + screenOpen() + '</div>' + toastsHTML(); renderSheet(); return; }
  const nav = ui.screen === 'more' ? 'more' : (MORE.some(m => m[0] === ui.screen) ? 'more' : ui.screen);
  const unread = S.unread(state);
  const navBtn = (id, key, ico, side) => '<button type="button" data-act="nav" data-screen="' + id + '"' + (nav === id || ui.screen === id ? ' aria-current="page"' : '') + '><span class="ico" aria-hidden="true">' + ico + '</span><span>' + t(key) + '</span>' + (id === 'inbox' && unread ? '<span class="badge">' + n(unread) + '</span>' : '') + '</button>';
  const side = '<nav class="sidenav" aria-label="' + esc(tp('nav.main')) + '"><div class="brand">' + t('app.title') + '</div>' + TABS.filter(x => x[0] !== 'more').map(x => navBtn(x[0], x[1], x[2])).join('') + '<div class="sep"></div>' + MORE.map(x => navBtn(x[0], x[1], x[2])).join('') + '</nav>';
  const tabs = '<nav class="tabbar" aria-label="' + esc(tp('nav.main')) + '">' + TABS.map(x => navBtn(x[0], x[1], x[2])).join('') + '</nav>';
  const screens = { dash: screenDash, inbox: screenInbox, files: screenFiles, journal: screenJournal, more: screenMore, profile: screenProfile, people: screenPeople, learn: screenLearn, calendar: screenCalendar, firm: screenFirm, offers: screenOffers, season: screenSeason, cv: screenCV, settings: screenSettings };
  let body = '';
  try { body = (screens[ui.screen] || screenDash)(state); } catch (e) { console.warn('render failed', e); body = '<div class="empty">' + t('ui.renderError') + '</div>'; }
  root.innerHTML = '<div class="shell">' + side + '<div class="content">' + topbar(state) + body + '</div></div>' + tabs + toastsHTML();
  renderSheet();
}
function topbar(st) {
  const e = st.player.energy ?? 0;
  return '<header class="topbar"><span class="week-chip">' + weekChip(st) + '</span><span class="grow"></span>' +
    '<span class="energy-mini"><span>' + t('meter.energy') + '</span>' + barHTML(e, e < 30 ? 'danger' : 'ok') + n(e) + '</span></header>';
}
function toastsHTML() { return '<div class="toasts" aria-live="polite">' + ui.toasts.map(x => '<div class="toast">' + x.html + '</div>').join('') + '</div>'; }
function toast(key, params, ctx) { pushToast(t(key, params, ctx)); }
function pushToast(html) { const o = { html }; ui.toasts.push(o); refreshToasts(); setTimeout(() => { ui.toasts = ui.toasts.filter(x => x !== o); refreshToasts(); }, 3200); }
function refreshToasts() { const el = root && root.querySelector('.toasts'); if (el) el.outerHTML = toastsHTML(); }
function showMessages(list) { for (const m of list || []) if (m && m.key) toast(m.key, m.params || {}); }

/* Sheet (bottom sheet / dialog). Body scroll position survives re-renders. */
function openSheet(sheet) { ui.sheet = sheet; ui.sheetScroll = 0; renderSheet(); }
function closeSheet() { ui.sheet = null; renderSheet(); render(); }
function renderSheet() {
  let host = root.querySelector('.sheet-root');
  if (!ui.sheet) { if (host) host.remove(); return; }
  const prev = host && host.querySelector('.sheet-body');
  if (prev) ui.sheetScroll = prev.scrollTop;
  if (!host) { host = document.createElement('div'); host.className = 'sheet-root'; root.appendChild(host); }
  let content;
  try { content = sheetContent(ui.sheet); } catch (e) { console.warn('sheet failed', e); content = { title: t('ui.renderError'), body: '<div class="empty">' + esc(String(e && e.message || e)) + '</div>' }; }
  host.innerHTML = '<div class="sheet-backdrop" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(content.titleText || '') + '">' +
    '<div class="sheet-h"><h2>' + (content.title || '') + '</h2>' + (content.noClose ? '' : '<button type="button" class="close" data-act="sheet-close" aria-label="' + esc(tp('ui.close')) + '">✕</button>') + '</div>' +
    (content.stepper || '') + '<div class="sheet-body">' + (content.body || '') + '</div>' + (content.footer ? '<div class="sheet-f">' + content.footer + '</div>' : '') + '</div>';
  const body = host.querySelector('.sheet-body');
  if (body && ui.sheetScroll && !ui.sheet.resetScroll) body.scrollTop = ui.sheetScroll;
  ui.sheet.resetScroll = false;
}
function sheetContent(sh) {
  switch (sh.kind) {
    case 'room': return sheetRoom(sh);
    case 'match': return sheetMatch(sh);
    case 'item': return sheetItem(sh);
    case 'followup': return sheetFollowup(sh);
    case 'entry': return sheetEntry(sh);
    case 'confirm': return sheetConfirm(sh);
    case 'picker': return sheetPicker(sh);
    case 'lesson': return sheetLesson(sh);
    case 'builder': return sheetBuilder(sh);
    case 'drill': return sheetDrill(sh);
    case 'offer': return sheetOffer(sh);
    case 'text': return { title: sh.title || '', body: sh.body || '' };
    default: return { title: '', body: '<div class="soon">' + t('ui.soon') + '</div>' };
  }
}
function confirmBox(key, params, onYes, danger) { openSheet({ kind: 'confirm', key, params, onYes, danger }); }
function sheetConfirm(sh) {
  return { title: t('ui.confirmTitle'), body: '<div class="confirm-box"><p>' + t(sh.key, sh.params) + '</p></div>',
    footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.cancel') + '</button><button type="button" class="btn ' + (sh.danger ? 'btn-danger' : 'btn-primary') + '" data-act="confirm-yes">' + t('ui.confirm') + '</button>' };
}

/* ───────────────────────── 4. COMPONENTS ───────────────────────── */
function barHTML(v, cls, marks) { return '<span class="bar ' + (cls || '') + '" role="img" aria-label="' + Math.round(pct(v)) + '%"><i style="inline-size:' + pct(v) + '%"></i>' + (marks || '') + '</span>'; }
function gauge(labelKey, v, cls) { return '<div class="gauge"><div class="lbl"><span>' + t(labelKey) + '</span><span class="gauge-n">' + n(v) + '</span></div>' + barHTML(v, 'thin ' + (cls || '')) + '</div>'; }
function pill(html, cls) { return '<span class="pill ' + (cls || '') + '">' + html + '</span>'; }
function avatar(name, cls) { return '<span class="avatar ' + (cls || '') + '" aria-hidden="true">' + esc(initials(name)) + '</span>'; }
function attrRow(st, id, locked) {
  const sk = S.skill(st, id); const m = Number(sk.mastery) || 1; const b = band(m);
  const snap = (st.uiSnap && st.uiSnap.skills && st.uiSnap.skills[id]);
  const diff = snap != null ? m - snap : 0;
  const arrow = diff > 0.05 ? '<span class="arrow up" aria-label="▲">▲</span>' : diff < -0.05 ? '<span class="arrow down">▼</span>' : '<span class="arrow flat">·</span>';
  const idle = sk.lastPracticed != null ? (S.week(st) + 48 * (S.season(st) - 1)) - (sk.lastPracticedAbs ?? sk.lastPracticed) : 0;
  const decayed = idle >= 8 && (sk.obs || 0) > 0 ? pill(t('skill.decayed', { n: idle }), 'pill-danger') : '';
  const ceil = S.ceiling(st);
  return '<div class="attr-row' + (locked ? ' locked' : '') + '"><span class="name">' + skillName(id) + decayed + '</span>' +
    barHTML(m / 20 * 100, 'b' + b, '<span class="mark" style="inset-inline-start:' + (ceil / 20 * 100) + '%"></span>') +
    '<span class="chip-num b' + b + '">' + n(m, 1) + '</span>' + arrow + '</div>';
}
function deltaPills(applied) {
  if (!applied) return '';
  const items = []; const push = (k, v) => { if (typeof v === 'number' && v !== 0) items.push('<span class="delta ' + (v > 0 ? 'pos' : 'neg') + '">' + t('delta.' + k) + ' ' + n(v > 0 ? '+' + v : v) + '</span>'); };
  push('confidence', applied.confidence); push('rep', applied.rep); push('engQuality', applied.engQuality); push('integrity', applied.integrity);
  if (applied.trust) for (const id of Object.keys(applied.trust)) { const v = applied.trust[id]; if (v) items.push('<span class="delta ' + (v > 0 ? 'pos' : 'neg') + '">' + t('delta.trust', { name: personName(id) }) + ' ' + n(v > 0 ? '+' + v : v) + '</span>'); }
  return items.length ? '<div class="deltas">' + items.join('') + '</div>' : '';
}
function ratingPill(scaleId, ratingId) { const pills = CT.scalePills(scaleId); const i = pills.findIndex(p => p.id === ratingId); const p = pills[i]; const cls = i < 0 ? '' : i >= pills.length - 1 ? 'pill-danger' : i === 0 ? 'pill-ok' : 'pill-gold'; return pill(p ? esc(p.label) : esc(ratingId || ''), cls); }
function scaleFor(eng) { const map = { isox: 'icfr', audit: 'severity', compliance: 'compliance', 'risk-survey': 'riskBands', 'control-review': 'designOp', 'policy-writing': 'docStatus' }; return (eng && (eng.scale || map[eng.type])) || 'severity'; }
function lineBadge(eng) { return eng && eng.line ? pill(t('line.' + eng.line), eng.line === 3 ? 'pill-navy' : 'pill-outline') : ''; }
function engTitle(eng) { const c = CT.client(eng.clientId); return esc(c ? c.name : (eng.clientId || '')); }
function engTypeLabel(eng) { return t('engType.' + (eng.type || 'audit')); }
function empty(key) { return '<div class="empty">' + t(key) + '</div>'; }
function soon() { return '<div class="soon">' + t('ui.soon') + '</div>'; }

/* ───────────────────────── 5. SCREENS ───────────────────────── */
function screenOpen() {
  const firms = CT.list('firms');
  const o = ui.open;
  const firmCards = firms.length ? firms.map(f => '<button type="button" class="firm-card' + (o.firmId === f.id ? ' sel' : '') + '" data-act="open-firm" data-id="' + esc(f.id) + '" aria-pressed="' + (o.firmId === f.id) + '">' +
    (f.id === 'ofek' ? '<span class="rec">' + pill(t('open.recommended'), 'pill-gold') + '</span>' : '') +
    '<h3>' + esc(f.name) + '</h3><div class="row small muted">' + pill(t('firm.prestige') + ' ' + n(f.prestige)) + pill(t('firm.pay') + ' ×' + n(f.pay, 1)) + '</div>' +
    '<p class="phil">' + tx(f.philosophy) + '</p></button>').join('') : empty('open.noFirms');
  const slots = [1, 2, 3].map(i => { const m = slotMeta(i); return '<div class="slot">' + avatar(m && m.name ? m.name : String(i), m ? '' : 'muted') + '<div class="grow">' +
    (m && !m.corrupt ? '<div><b>' + esc(m.name || '') + '</b> · ' + t('open.slotMeta', { season: m.season, week: m.week, tier: m.tier }) + '</div><div class="small muted">' + esc((CT.firm(m.firm) || {}).name || m.firm || '') + '</div>' : '<span class="muted">' + t(m ? 'open.slotCorrupt' : 'open.slotEmpty') + '</span>') + '</div>' +
    (m && !m.corrupt ? '<button type="button" class="btn btn-sm btn-navy" data-act="open-load" data-slot="' + i + '">' + t('open.load') + '</button><button type="button" class="btn btn-sm btn-ghost" data-act="open-delete" data-slot="' + i + '">' + t('ui.delete') + '</button>' : '') + '</div>'; }).join('');
  return '<section data-screen="open"><div class="open-hero"><h1 class="title">' + t('app.title') + '</h1><div class="tag">' + t('app.tagline') + '</div></div>' +
    '<div class="card"><h2 class="mb">' + t('open.newCareer') + '</h2>' +
    '<div class="field"><label for="pname">' + t('open.name') + '</label><input id="pname" type="text" data-act="open-name" value="' + esc(o.name) + '" autocomplete="name" maxlength="40"></div>' +
    '<div class="field"><span class="muted small">' + t('open.gender') + '</span><div class="seg" role="group"><button type="button" data-act="open-gender" data-g="f" aria-pressed="' + (o.gender === 'f') + '">' + t('open.genderF') + '</button><button type="button" data-act="open-gender" data-g="m" aria-pressed="' + (o.gender === 'm') + '">' + t('open.genderM') + '</button></div><span class="xs faint">' + t('open.grammarNote') + '</span></div>' +
    '<h3 class="mb mt">' + t('open.pickFirm') + '</h3><div class="grid-cards">' + firmCards + '</div>' +
    '<div class="btns end mt"><button type="button" class="btn btn-primary" data-act="open-start"' + (has('newGame') ? '' : ' title="' + esc(tp('ui.soon')) + '"') + '>' + t('open.start') + '</button></div>' +
    (has('newGame') ? '' : '<p class="soon mt">' + t('ui.engineMissing') + '</p>') + '</div>' +
    '<div class="section-title"><h2>' + t('open.slots') + '</h2></div><div class="stack">' + slots + '</div></section>';
}

function screenDash(st) {
  const p = st.player; const plan = S.plan(st); const used = S.hoursUsed(st); const left = 40 - used;
  const chips = Object.keys(BLOCKS).map(k => { const b = BLOCKS[k]; const dis = left < b.hours; return '<button type="button" class="chip" data-act="block-add" data-kind="' + k + '"' + (dis ? ' disabled' : '') + '>' + t('block.' + k) + ' <span class="cost">' + t('ui.hoursShort', { n: b.hours }) + ' · ' + t('ui.energyCost', { n: b.energy }) + '</span></button>'; }).join('');
  const planList = plan.blocks.length ? '<div class="plan-list">' + plan.blocks.map((b, i) => '<div class="plan-item"><span class="grow">' + t('block.' + b.kind) + (b.engId ? ' · ' + engTitle(S.eng(st, b.engId) || { clientId: b.engId }) : '') + (b.skillId ? ' · ' + skillName(b.skillId) : '') + (b.castId ? ' · ' + esc(personName(b.castId)) : '') + (b.score != null ? ' · ' + n(b.score) + '%' : '') + '</span><span class="xs faint">' + t('ui.hoursShort', { n: b.hours }) + '</span><button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="block-remove" data-i="' + i + '" aria-label="' + esc(tp('ui.remove')) + '">✕</button></div>').join('') + '</div>' : '<div class="xs faint">' + t('dash.planEmpty') + '</div>';
  const engs = S.activeEngagements(st);
  const engCards = engs.length ? engs.map(e => engCard(st, e, true)).join('') : empty('dash.noEngagements');
  const unread = S.unread(st);
  const notices = [];
  if (p.energy < 30) notices.push('<div class="notice notice-danger">' + t('dash.lowEnergy') + '</div>');
  if (st.contentEndPending) notices.push('<div class="notice">' + t('content.endsHere') + '</div>');
  return '<section data-screen="dash"><div class="card-h"><h1 class="screen-title">' + t('nav.dash') + '</h1>' + pill(tierTitle(st), 'pill-navy') + pill(esc(S.firm(st).name || ''), 'pill-outline') + '</div>' +
    (notices.length ? '<div class="stack mb">' + notices.join('') + '</div>' : '') +
    '<div class="grid-2"><div class="card"><div class="gauges">' + gauge('meter.energy', p.energy, p.energy < 30 ? 'danger' : 'ok') + gauge('meter.confidence', p.confidence, p.confidence < 40 ? 'danger' : '') + gauge('meter.rep', p.rep, 'gold') + '<div class="gauge"><div class="lbl"><span>' + t('meter.integrity') + '</span><span class="gauge-n">' + integrityWord(p.integrity) + '</span></div></div></div></div>' +
    '<div class="card"><div class="card-h"><h2>' + t('dash.budget') + '</h2><span class="muted small">' + t('dash.hoursLeft', { n: left }) + '</span></div>' + barHTML(used / 40 * 100, 'gold') + '<div class="budget mt"><div class="budget-chips">' + chips + '</div>' + planList + '</div></div></div>' +
    '<div class="section-title"><h2>' + t('dash.engagements') + '</h2><button type="button" class="btn btn-sm btn-ghost" data-act="nav" data-screen="files">' + t('ui.all') + '</button></div><div class="grid-2">' + engCards + '</div>' +
    '<div class="section-title"><h2>' + t('nav.inbox') + '</h2>' + (unread ? pill(t('inbox.unread', { n: unread }), 'pill-gold') : '') + '<button type="button" class="btn btn-sm btn-ghost" data-act="nav" data-screen="inbox">' + t('ui.all') + '</button></div>' + inboxList(st, S.inbox(st).filter(i => !i.read && !i.done).slice(0, 4), true) +
    '<div class="sticky-end"><button type="button" class="btn btn-primary" data-act="end-week">' + t('ui.endWeek') + '</button></div></section>';
}
function integrityWord(v) { return t(v >= 80 ? 'integrity.1' : v >= 50 ? 'integrity.2' : v >= 20 ? 'integrity.3' : 'integrity.4'); }
function engCard(st, e, compact) {
  const pw = (e.phaseWork && e.phaseWork[e.phase]) || { planning: 1, fieldwork: 4, findings: 2, report: 2, present: 1 }[e.phase] || 1;
  const overdue = S.week(st) > e.deadline && e.phase !== 'closed';
  const dl = e.phase === 'closed' ? t('eng.closed') : overdue ? t('eng.overdue', { n: S.week(st) - e.deadline }) : t('eng.deadlineIn', { n: e.deadline - S.week(st) });
  const pi = PHASES.indexOf(e.phase);
  const track = '<div class="phase-track">' + PHASES.map((ph, i) => '<span class="' + (i < pi ? 'done' : i === pi ? 'cur' : '') + '"></span>').join('') + '</div><div class="phase-labels">' + PHASES.map((ph, i) => '<span class="' + (i === pi ? 'cur' : '') + '">' + phaseName(e, ph) + '</span>').join('') + '</div>';
  const client = CT.client(e.clientId);
  return '<div class="eng-card"><div class="card-h"><h3>' + engTitle(e) + '</h3>' + pill(engTypeLabel(e), 'pill-navy') + lineBadge(e) + (e.selfReview ? pill(t('eng.selfReview'), 'pill-danger') : '') + '</div>' +
    '<div class="row small muted">' + pill(phaseName(e, e.phase), 'pill-gold') + '<span>' + t('eng.work', { work: e.work ?? 0, total: pw }) + '</span>' + (client && client.regulator ? '<span>· ' + esc(client.regulator) + '</span>' : '') + '</div>' + track +
    '<div class="row between mt"><span class="dl' + (overdue ? ' over' : '') + '">' + dl + '</span><span class="row small"><span class="muted">' + t('eng.quality') + '</span>' + barHTML(e.quality, (e.quality || 0) >= 60 ? 'ok' : (e.quality || 0) < 40 ? 'danger' : '') + n(e.quality) + '</span></div>' +
    (compact ? '' : engDetail(st, e)) + '</div>';
}
function engDetail(st, e) {
  const findings = Array.isArray(e.findings) && e.findings.length ? e.findings.map(f => '<div class="finding">' + ratingPill(scaleFor(e), f.rating) + '<span>' + tx(f.title || f.text || f.id) + '</span></div>').join('') : '<div class="xs faint mt">' + t('eng.noFindings') + '</div>';
  const people = [e.contactId, e.iaId, e.managerId].filter(Boolean).map(id => { const p = CT.person(id); const tr = S.trust(st, id); return '<div class="contact-row">' + avatar(p ? p.name : id, 'sm') + '<span class="grow">' + esc(p ? p.name : id) + (p && p.title ? ' <span class="xs muted">' + tx(p.title) + '</span>' : '') + '</span>' + barHTML(tr ?? 0, 'thin ' + ((tr ?? 0) >= 60 ? 'ok' : (tr ?? 0) < 30 ? 'danger' : '')) + n(tr) + '</div>'; }).join('');
  return '<hr class="divider"><h4 class="small muted">' + t('eng.findings') + '</h4>' + findings + '<h4 class="small muted mt">' + t('eng.contacts') + '</h4>' + (people || '<div class="xs faint">' + t('ui.none') + '</div>') + '<div class="btns mt"><button type="button" class="btn btn-sm" data-act="block-add" data-kind="work" data-eng="' + esc(e.id) + '"' + (S.hoursLeft(st) < 8 || e.phase === 'closed' ? ' disabled' : '') + '>' + t('block.work') + ' <span class="xs faint">' + t('ui.hoursShort', { n: 8 }) + '</span></button></div>';
}

function inboxList(st, items, compact) {
  if (!items.length) return empty('inbox.empty');
  return '<div class="inbox-list">' + items.map(i => inboxRow(st, i)).join('') + '</div>';
}
function itemInfo(st, item) {
  const type = item.type || 'news'; let subject = ''; let sender = null; let danger = false;
  if (type === 'decision' || type === 'news' || type === 'repeat') { const sc = CT.scenario(item.scenarioId); subject = sc ? txp(sc.title, ctxFor(st, item.engId)) : (item.title || item.scenarioId || ''); sender = sc && sc.sender && sc.sender !== 'system' ? CT.person(sc.sender) : (sc ? contactOf(st, item.engId) : null); }
  else if (type === 'moment' || type === 'match') { const m = S.match(st, item.matchId); const mt = m && CT.matchType(m.type); const eng = m && S.eng(st, m.engId); subject = (mt ? mt.hebrew : tp('inbox.type.moment')) + (eng ? ' · ' + (CT.client(eng.clientId) || {}).name : ''); sender = eng ? contactOf(st, eng.id) : null; }
  else if (type === 'consequence') { subject = item.text ? txp(item.text, ctxFor(st, item.engId)) : tp('inbox.type.consequence'); sender = contactOf(st, item.engId); danger = true; }
  else if (type === 'followup') { const e = S.entry(st, item.journalId); subject = tp('inbox.followupSubject', { title: e ? e.title || (CT.scenario(e.scenarioId) || {}).title || '' : '' }); sender = mentorOf(); }
  else if (type === 'offer') { const f = CT.firm(item.firmId); subject = tp('inbox.offerSubject', { firm: f ? f.name : item.firmId || '' }); }
  else if (type === 'overdue') { const e = S.eng(st, item.engId); subject = tp('overdue', { client: e ? (CT.client(e.clientId) || {}).name : '' }); danger = true; }
  else if (type === 'quarter') { subject = tp('quarter.talk'); sender = managerOf(st, item.engId); }
  else if (type === 'holiday') { subject = tp('holiday.greeting'); sender = mentorOf(); }
  else if (type === 'deliverable') { subject = tp('deliverable.gate'); sender = mentorOf(); }
  else if (type === 'summary' || type === 'season') { subject = tp('nav.season'); }
  else if (type === 'card') { subject = item.key ? tp(item.key) : ''; }
  else subject = item.title ? txp(item.title) : tp('inbox.type.' + type);
  if (item.subject) subject = txp(item.subject, ctxFor(st, item.engId));
  if (item.senderId) sender = CT.person(item.senderId) || sender;
  const name = sender ? sender.name : tp('inbox.system');
  return { type, subject, name, danger, repeat: !!item.variantOf || type === 'repeat' };
}
function contactOf(st, engId) { const e = S.eng(st, engId); return e ? CT.person(e.contactId) : null; }
function managerOf(st, engId) { const e = S.eng(st, engId); const m = e && CT.person(e.managerId); return m || CT.list('cast').find(c => c.role === 'manager') || null; }
function mentorOf() { return CT.list('cast').find(c => c.role === 'mentor') || null; }
function inboxRow(st, item) {
  const info = itemInfo(st, item);
  const typeKey = 'inbox.type.' + ({ match: 'moment', repeat: 'decision', overdue: 'consequence', quarter: 'news', holiday: 'news', deliverable: 'decision', card: 'news', summary: 'news', season: 'news' }[info.type] || info.type);
  const cls = { decision: 'pill-navy', moment: 'pill-gold', consequence: 'pill-danger', followup: 'pill-ok', offer: 'pill-gold' }[info.type] || '';
  return '<button type="button" class="inbox-row' + (item.read ? '' : ' unread') + (item.done ? ' done' : '') + '" data-act="item-open" data-id="' + esc(item.id) + '">' + avatar(info.name, info.danger ? 'muted' : (info.type === 'moment' || info.type === 'match') ? 'gold' : '') +
    '<span class="subj"><span>' + bdiWrap(esc(info.subject)) + '</span><span class="meta">' + pill(t(typeKey), cls) + (info.repeat ? pill(t('repeat.label'), 'pill-outline') : '') + '<span>' + esc(info.name) + '</span></span></span>' +
    '<span class="row"><span class="wk">' + t('ui.weekN', { n: item.week ?? S.week(st) }) + '</span><span class="dot' + (item.read ? ' off' : '') + '"></span></span></button>';
}
function screenInbox(st) {
  const items = S.inbox(st).slice().sort((a, b) => (a.read === b.read ? (b.week || 0) - (a.week || 0) : a.read ? 1 : -1));
  const cards = [];
  if (st.contentEndPending || st.showContentEnd) cards.push('<div class="notice">' + t('content.endsHere') + '</div>');
  return '<section data-screen="inbox"><div class="card-h"><h1 class="screen-title">' + t('nav.inbox') + '</h1>' + (S.unread(st) ? pill(t('inbox.unread', { n: S.unread(st) }), 'pill-gold') : '') + '</div>' + (cards.length ? '<div class="stack mb">' + cards.join('') + '</div>' : '') + inboxList(st, items) + '</section>';
}

function screenFiles(st) {
  const engs = S.engagements(st);
  const groups = [[t('files.active'), engs.filter(e => e.phase !== 'closed')], [t('files.closed'), engs.filter(e => e.phase === 'closed')]];
  return '<section data-screen="files"><h1 class="screen-title mb">' + t('nav.files') + '</h1>' + groups.map(([label, list]) => '<div class="section-title"><h2>' + label + '</h2><span class="muted small">' + n(list.length) + '</span></div>' + (list.length ? '<div class="stack">' + list.map(e => '<details class="acc eng-card"' + (e.phase !== 'closed' ? ' open' : '') + '><summary><b>' + engTitle(e) + '</b>' + pill(engTypeLabel(e), 'pill-navy') + lineBadge(e) + pill(phaseName(e, e.phase), 'pill-gold') + '</summary>' + engCard(st, e, false) + '</details>').join('') + '</div>' : empty('files.none'))).join('') + '</section>';
}

function screenMore(st) {
  return '<section data-screen="more"><h1 class="screen-title mb">' + t('nav.more') + '</h1><div class="more-grid">' + MORE.map(m => '<button type="button" class="btn" data-act="nav" data-screen="' + m[0] + '"><span class="ico" aria-hidden="true">' + m[2] + '</span>' + t(m[1]) + '</button>').join('') + '</div></section>';
}

function screenProfile(st) {
  const p = st.player; const tier = S.tier(st);
  const avg = (ids) => ids.reduce((a, id) => a + (Number(S.skill(st, id).mastery) || 1), 0) / ids.length;
  const bandOf = (m) => t('band.' + band(m));
  const group = (key, ids, locked) => '<div class="card attr-group' + (locked ? ' locked' : '') + '"><div class="card-h"><h2>' + t(key) + '</h2>' + pill(bandOf(avg(ids)), 'pill-outline') + (locked ? pill(t('profile.tier5only'), 'pill-danger') : '') + '</div>' + ids.map(id => attrRow(st, id, locked)).join('') + '</div>';
  return '<section data-screen="profile"><div class="card-h"><h1 class="screen-title">' + t('nav.profile') + '</h1>' + pill(tierTitle(st), 'pill-navy') + '</div>' +
    '<div class="card mb"><div class="row between"><span><b>' + esc(p.name || '') + '</b> · ' + tierTitle(st) + '</span><span class="small muted">' + t('profile.ceiling', { n: S.ceiling(st) }) + '</span></div><div class="gauges mt">' + gauge('meter.energy', p.energy) + gauge('meter.confidence', p.confidence) + gauge('meter.rep', p.rep, 'gold') + '<div class="gauge"><div class="lbl"><span>' + t('meter.integrity') + '</span><span class="gauge-n">' + integrityWord(p.integrity) + '</span></div></div></div><p class="xs faint mt">' + t('profile.bandsNote') + '</p></div>' +
    group('profile.craft', SKILL_IDS.craft, false) + group('profile.process', SKILL_IDS.process, false) + group('profile.partner', SKILL_IDS.partner, tier < 5) + '</section>';
}

function screenPeople(st) {
  const cast = CT.list('cast'); const contacts = CT.list('stakeholders').concat(CT.list('contacts'));
  const groups = {};
  const put = (orgKey, orgLabel, person) => { if (!groups[orgKey]) groups[orgKey] = { label: orgLabel, people: [] }; groups[orgKey].people.push(person); };
  const firmName = S.firm(st).name || '';
  for (const c of cast) {
    if (c.role === 'regulator') put('reg', tp('people.regulators'), c);
    else if (['mentor', 'manager', 'rival', 'junior'].includes(c.role)) put('firm', firmName || tp('people.firm'), c);
    else if (c.clientId) { const cl = CT.client(c.clientId); put('c:' + c.clientId, cl ? cl.name : c.clientId, c); }
    else put('other', tp('people.others'), c);
  }
  for (const c of contacts) { const cl = CT.client(c.clientId); put('c:' + (c.clientId || 'x'), cl ? cl.name : (c.org || tp('people.others')), c); }
  const temperIcon = { blunt: '◆', political: '◇', supportive: '♥', absent: '○', charming: '✧' };
  const card = (p) => { const tr = S.trust(st, p.id); const ce = S.castEntry(st, p.id); const mem = ce && ce.memory ? Object.keys(ce.memory).filter(k => ce.memory[k]) : [];
    return '<div class="card"><div class="person">' + avatar(p.name, tr != null && tr >= 60 ? 'gold' : '') + '<div class="grow"><div class="row"><b>' + esc(p.name) + '</b>' + (p.role ? pill(t('role.' + p.role), 'pill-outline') : '') + (p.temper ? '<span class="temper" title="' + esc(tp('temper.' + p.temper)) + '">' + (temperIcon[p.temper] || '') + ' ' + t('temper.' + p.temper) + '</span>' : '') + '</div>' + (p.title ? '<div class="small muted">' + tx(p.title) + '</div>' : '') +
      '<div class="row mt"><span class="xs muted">' + t('people.trust') + '</span>' + barHTML(tr ?? 0, 'thin ' + ((tr ?? 0) >= 60 ? 'ok' : (tr ?? 0) < 30 ? 'danger' : '')) + n(tr) + '</div>' +
      mem.map(k => '<div class="memory-line">' + (hasKey('memory.' + k) ? t('memory.' + k, {}, Object.assign({ who: p }, curCtx())) : esc(k)) + '</div>').join('') + '</div></div></div>'; };
  const keys = Object.keys(groups);
  return '<section data-screen="people"><h1 class="screen-title mb">' + t('nav.people') + '</h1>' + (keys.length ? keys.map(k => '<div class="section-title"><h2>' + esc(groups[k].label) + '</h2></div><div class="grid-cards">' + groups[k].people.map(card).join('') + '</div>').join('') : empty('people.none')) + '</section>';
}

function journalTitle(st, e) { const sc = CT.scenario(e.scenarioId); return e.title ? txp(e.title) : sc ? txp(sc.title, ctxFor(st, e.engId)) : (e.scenarioId || ''); }
function jRow(st, e) {
  const P = numOr(e.P ?? e.process, null); const O = numOr(e.O ?? e.outcome, null);
  return '<button type="button" class="j-row" data-act="entry-open" data-id="' + esc(e.id) + '"><span class="t"><span>' + bdiWrap(esc(journalTitle(st, e))) + '</span><span class="m">' + pill(t('ui.weekN', { n: e.week })) + (e.kind ? pill(t('journal.kind.' + e.kind), e.kind === 'moment' ? 'pill-gold' : 'pill-navy') : '') + (e.domain ? pill(t('domain.' + e.domain), 'pill-outline') : '') + (e.calibration && e.calibration !== 'right' ? pill(t('journal.cal.' + e.calibration), 'pill-danger') : '') + '</span></span>' +
    '<span class="j-bars"><span class="lab"><span>' + t('journal.P') + '</span><b>' + n(P) + '</b></span>' + barHTML(P ?? 0, '') + '<span class="lab"><span>' + t('journal.O') + '</span><b>' + n(O, 1) + '</b></span>' + barHTML((O ?? 0) * 10, 'gold') + '</span></button>';
}
function screenJournal(st) {
  const all = S.journal(st); const f = ui.filters;
  const skillsIn = new Set(); const domains = new Set();
  for (const e of all) { domains.add(e.domain); for (const s of (e.skills || [])) skillsIn.add(typeof s === 'string' ? s : s.id); }
  const list = all.filter(e => (!f.skill || (e.skills || []).some(s => (typeof s === 'string' ? s : s.id) === f.skill)) && (!f.domain || e.domain === f.domain)).slice().reverse();
  const sel = (name, opts, cur, allKey, lab) => '<select data-act="filter" data-f="' + name + '" aria-label="' + esc(tp(lab)) + '"><option value="">' + t(allKey) + '</option>' + opts.map(o => '<option value="' + esc(o) + '"' + (o === cur ? ' selected' : '') + '>' + (name === 'skill' ? skillName(o) : t('domain.' + o)) + '</option>').join('') + '</select>';
  const pats = A.patterns(st);
  const patHTML = pats === null ? soon() : pats.length ? pats.slice(0, 5).map(p => '<div class="pattern">' + t('pattern.' + (p.id || p.key), p.params || p) + '</div>').join('') : '<div class="xs faint">' + t('journal.noPatterns') + '</div>';
  const notes = (S.stats(st).mentorNotes || st.mentorNotes || []); const lastNote = notes.length ? notes[notes.length - 1] : null;
  const mean = list.length ? list.reduce((a, e) => a + (numOr(e.P, 0)), 0) / list.length : null;
  return '<section data-screen="journal"><div class="card-h"><h1 class="screen-title">' + t('nav.journal') + '</h1>' + (mean != null ? pill(t('journal.meanP', { n: Math.round(mean) }), 'pill-navy') : '') + '</div>' +
    '<div class="grid-2"><div><div class="filters">' + sel('skill', [...skillsIn].filter(Boolean), f.skill, 'journal.allSkills', 'journal.filterSkill') + sel('domain', [...domains].filter(Boolean), f.domain, 'journal.allDomains', 'journal.filterDomain') + '</div>' +
    (list.length ? '<div class="j-list">' + list.map(e => jRow(st, e)).join('') + '</div>' : empty('journal.empty')) + '</div>' +
    '<div class="stack"><div class="card"><h2 class="mb">' + t('journal.patterns') + '</h2>' + patHTML + '</div>' +
    '<div class="card"><h2 class="mb">' + t('journal.mentorNote') + '</h2>' + (lastNote ? '<div class="mentor-note">' + (lastNote.key ? t(lastNote.key, lastNote.params) : tx(lastNote.text || lastNote)) + '</div>' : '<div class="xs faint">' + t('ui.none') + '</div>') + '</div>' +
    '<div class="card"><div class="card-h"><h2>' + t('journal.export') + '</h2><button type="button" class="btn btn-sm" data-act="journal-export">' + t('journal.exportBtn') + '</button></div><textarea class="mono" dir="auto" readonly aria-label="' + esc(tp('journal.export')) + '" data-role="export-md">' + esc(ui.exportMd || '') + '</textarea></div></div></div></section>';
}
function journalMarkdown(st) {
  const lines = ['# ' + tp('nav.journal') + ' · ' + (st.player.name || ''), ''];
  for (const e of S.journal(st)) {
    const sc = CT.scenario(e.scenarioId) || {}; const ctx = ctxFor(st, e.engId);
    const opt = (sc.options || []).find(o => o.id === e.optionId) || {}; const fr = (sc.framings || []).find(x => x.id === e.framingId) || {};
    const rat = (sc.rationales || []).find(x => x.id === e.rationaleId) || {}; const fm = (sc.failureModes || []).find(x => x.id === e.failureModeId) || {};
    lines.push('## ' + tp('ui.weekN', { n: e.week }) + ' · ' + (ctx.client ? ctx.client.name : '') + ' · ' + journalTitle(st, e));
    lines.push('- **' + tp('md.question') + '**: ' + txp(fr.text || e.framingText || '', ctx));
    lines.push('- **' + tp('md.knew') + '**: ' + (e.infoBought || []).map(id => { const i = (sc.info || []).find(x => x.id === id); return i ? txp(i.label, ctx) : id; }).join('; '));
    lines.push('- **' + tp('md.options') + '**: ' + (sc.options || []).map(o => txp(o.label, ctx)).join(' | '));
    lines.push('- **' + tp('md.decided') + '**: ' + txp(opt.label || e.optionId || '', ctx) + (rat.text ? ' — ' + txp(rat.text, ctx) : ''));
    lines.push('- **' + tp('md.signal') + '**: ' + txp(fm.signal || '', ctx));
    lines.push('- **' + tp('md.when') + '**: ' + (e.followup ?? e.followupWeeks ?? '') + ' · ' + tp('friday.line', { O: numOr(e.O, '–'), P: numOr(e.P, '–') }));
    if (e.learned) lines.push('- **' + tp('md.learned') + '**: ' + e.learned);
    lines.push('');
  }
  return lines.join('\n');
}
function sheetEntry(sh) {
  const e = S.entry(state, sh.id); if (!e) return { title: '', body: empty('journal.empty') };
  const sc = CT.scenario(e.scenarioId) || {}; const ctx = ctxFor(state, e.engId);
  const opt = (sc.options || []).find(o => o.id === e.optionId) || {}; const fr = (sc.framings || []).find(x => x.id === e.framingId); const fm = (sc.failureModes || []).find(x => x.id === e.failureModeId); const rat = (sc.rationales || []).find(x => x.id === e.rationaleId);
  const rub = e.rubric && typeof e.rubric === 'object' ? '<div class="rubric">' + Object.keys(e.rubric).map(k => { const v = e.rubric[k]; const pts = typeof v === 'object' ? v.points : v; const w = typeof v === 'object' ? v.w : null; return '<span>' + t('rubric.' + k) + '</span><span class="n">' + n(pts, 1) + (w != null ? ' / ' + n(w) : '') + '</span>'; }).join('') + '</div>' : '';
  const info = (e.infoBought || []).length ? (e.infoBought || []).map(id => { const i = (sc.info || []).find(x => x.id === id); return pill(i ? tx(i.label, ctx) : esc(id), i && (i.kind === 'noise' || i.kind === 'trap') ? 'pill-danger' : 'pill-ok'); }).join('') : '<span class="xs faint">' + t('ui.none') + '</span>';
  const cons = (e.consequences || e.delayed || []).map(c => '<div class="finding">' + pill(c.landed ? t('journal.landed') : t('journal.pending'), c.landed ? 'pill-danger' : '') + '<span>' + tx(c.text, ctx) + (c.failureMode ? ' <span class="xs muted">(' + t('journal.failureMode') + ': ' + esc(c.failureMode) + ')</span>' : '') + '</span></div>').join('');
  const body = '<div class="friday"><span>' + t('friday.line', { O: numOr(e.O, '–'), P: numOr(e.P, '–') }) + '</span>' + (e.calibration ? pill(t('journal.cal.' + e.calibration), e.calibration === 'right' ? 'pill-ok' : 'pill-danger') : '') + '</div>' +
    '<div class="j-bars mb"><span class="lab"><span>' + t('journal.P') + '</span><b>' + n(e.P) + '</b></span>' + barHTML(e.P ?? 0) + '<span class="lab"><span>' + t('journal.O') + '</span><b>' + n(e.O, 1) + '</b></span>' + barHTML((e.O ?? 0) * 10, 'gold') + '</div>' +
    '<dl class="kv">' +
    '<dt>' + t('ui.week') + '</dt><dd>' + n(e.week) + (e.energy != null ? ' · ' + t('meter.energy') + ' ' + n(e.energy) : '') + '</dd>' +
    (fr ? '<dt>' + t('room.step.framing') + '</dt><dd>' + tx(fr.text, ctx) + '</dd>' : '') +
    '<dt>' + t('room.step.info') + '</dt><dd><span class="pills">' + info + '</span></dd>' +
    '<dt>' + t('room.step.options') + '</dt><dd>' + tx(opt.label || e.optionId, ctx) + (opt.tags && opt.tags.length ? ' <span class="tag-list">' + opt.tags.map(tg => pill(esc(CT.tagLabel(tg) || tg), 'pill-outline')).join('') + '</span>' : '') + '</dd>' +
    (fm ? '<dt>' + t('room.step.premortem') + '</dt><dd>' + tx(fm.text, ctx) + '</dd>' : '') +
    (rat ? '<dt>' + t('memo.why') + '</dt><dd>' + tx(rat.text, ctx) + '</dd>' : '') +
    (e.followup != null ? '<dt>' + t('memo.when') + '</dt><dd>' + t('memo.weeks', { n: e.followup }) + (e.followupAnswer != null ? ' · ' + t('followup.answered', { answer: tp(e.followupAnswer ? 'ui.yes' : 'ui.no') }) : '') + '</dd>' : '') +
    (e.luck ? '<dt>' + t('journal.luck') + '</dt><dd>' + (e.luck.key ? t(e.luck.key, e.luck.params) : (typeof e.luck === 'object' ? n(Math.round((e.luck.pGood || 0) * 100)) + '% · ' + t(e.luck.good ? 'luck.good' : 'luck.bad') : esc(e.luck))) + '</dd>' : '') +
    (opt.biasTags && opt.biasTags.length ? '<dt>' + t('journal.biases') + '</dt><dd>' + opt.biasTags.map(b => pill(esc(CT.biasLabel(b) || b), 'pill-gold')).join(' ') + '</dd>' : '') +
    '</dl>' + (rub ? '<h3 class="mt mb">' + t('journal.rubric') + '</h3>' + rub : '') +
    '<h3 class="mt mb">' + t('journal.applied') + '</h3>' + (deltaPills(e.applied) || '<span class="xs faint">' + t('ui.none') + '</span>') +
    (cons ? '<h3 class="mt mb">' + t('journal.consequences') + '</h3>' + cons : '') +
    (opt.feedback ? feedbackHTML(opt.feedback, ctx) : '') +
    '<div class="memo-field mt"><label for="learned">' + t('journal.learned') + '</label><textarea id="learned" data-act="learned" data-id="' + esc(e.id) + '" rows="3">' + esc(e.learned || '') + '</textarea></div>';
  return { title: bdiWrap(esc(journalTitle(state, e))), titleText: journalTitle(state, e), body, footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.close') + '</button>' };
}

function screenLearn(st) {
  const drills = CT.list('drills'); const lessons = CT.lessonsList(); const delivs = CT.list('deliverables');
  const seen = new Set(); for (const e of S.journal(st)) if (e.lesson) seen.add(e.lesson); for (const id of (st.player.lessons || [])) seen.add(id); for (const id of Object.keys(st.lessonsSeen || {})) seen.add(id);
  const drillCards = drills.length ? drills.map(d => '<div class="card"><div class="card-h"><h3>' + tx(d.title || d.name || d.id) + '</h3>' + (d.skillId || d.skill ? pill(skillName(d.skillId || d.skill), 'pill-navy') : '') + '</div><p class="small muted">' + t('learn.drillMeta', { n: (d.items || []).length }) + '</p><button type="button" class="btn btn-sm btn-navy" data-act="drill-open" data-id="' + esc(d.id) + '"' + (S.hoursLeft(st) < 4 ? ' disabled' : '') + '>' + t('block.learn') + ' <span class="xs">' + t('ui.hoursShort', { n: 4 }) + '</span></button></div>').join('') : empty('learn.noDrills');
  const practice = delivs.filter(d => d.practice || /practice|finding-t1|report-t2|procedure/.test(d.id || ''));
  const builders = (practice.length ? practice : delivs).map(d => '<div class="card"><h3>' + tx(d.title || d.id) + '</h3><p class="small muted">' + (d.description ? tx(d.description) : '') + '</p><button type="button" class="btn btn-sm" data-act="builder-open" data-id="' + esc(d.id) + '" data-practice="1">' + t('learn.practice') + '</button></div>').join('') || empty('learn.noBuilders');
  const regs = lessons.filter(l => l.kind === 'regulation' || l.type === 'regulation'); const gloss = lessons.filter(l => !(l.kind === 'regulation' || l.type === 'regulation'));
  const lessonRow = (l) => { const locked = !seen.has(l.id) && !l.always; return '<div class="lesson' + (locked ? ' locked' : '') + '"><button type="button" class="btn btn-ghost btn-sm" data-act="lesson-open" data-id="' + esc(l.id) + '">' + tx(l.title || l.id) + '</button>' + (locked ? pill(t('learn.locked'), 'pill-outline') : '') + '</div>'; };
  return '<section data-screen="learn"><h1 class="screen-title mb">' + t('nav.learn') + '</h1>' +
    '<div class="section-title"><h2>' + t('learn.drills') + '</h2><span class="small muted">' + t('dash.hoursLeft', { n: S.hoursLeft(st) }) + '</span></div><div class="grid-cards">' + drillCards + '</div>' +
    '<div class="section-title"><h2>' + t('learn.builders') + '</h2></div><div class="grid-cards">' + builders + '</div>' +
    '<div class="grid-2 mt"><div class="card"><h2 class="mb">' + t('learn.lessons') + '</h2>' + (gloss.length ? gloss.map(lessonRow).join('') : '<div class="xs faint">' + t('ui.none') + '</div>') + '</div>' +
    '<div class="card"><h2 class="mb">' + t('learn.regulation') + '</h2>' + (regs.length ? regs.map(lessonRow).join('') : '<div class="xs faint">' + t('ui.none') + '</div>') + '</div></div></section>';
}
function sheetLesson(sh) {
  const l = CT.lesson(sh.id) || {}; const ctx = curCtx();
  const body = '<div class="body-text">' + tx(l.body || l.text || l.summary || '', ctx) + '</div>' + (l.frameworks && l.frameworks.length ? '<div class="pills mt">' + l.frameworks.map(f => pill(esc(f), 'pill-outline')).join('') + '</div>' : '') + (l.rule ? '<div class="fb rule mt"><b>' + t('feedback.rule') + '</b>' + tx(l.rule, ctx) + '</div>' : '');
  return { title: tx(l.title || sh.id), titleText: txp(l.title || sh.id), body, footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.close') + '</button>' };
}

function screenCalendar(st) {
  const wk = S.week(st); const engs = S.engagements(st); const matches = S.matches(st);
  const months = Array.from({ length: 12 }, (_, i) => '<span>' + t('month.' + (i + 1)) + '</span>').join('');
  const weeks = Array.from({ length: 48 }, (_, i) => { const w = i + 1; const marks = [];
    if (QUARTERS.includes(w)) marks.push('<i class="mk q" title="' + esc(tp('cal.quarter')) + '"></i>');
    if (engs.some(e => e.deadline === w)) marks.push('<i class="mk d" title="' + esc(tp('cal.deadline')) + '"></i>');
    if (matches.some(m => m.week === w)) marks.push('<i class="mk m" title="' + esc(tp('cal.match')) + '"></i>');
    if (w <= 6) marks.push('<i class="mk w" title="' + esc(tp('cal.window')) + '"></i>');
    if (w >= 41 && w <= 44) marks.push('<i class="mk r" title="' + esc(tp('cal.rollforward')) + '"></i>');
    if (w === 10) marks.push('<i class="mk q" title="' + esc(tp('cal.certification')) + '"></i>');
    if (w >= 44 && w <= 47) marks.push('<i class="mk w" title="' + esc(tp('cal.gate')) + '"></i>');
    const cls = (w === wk ? ' cur' : '') + (HOLIDAYS.includes(w) ? ' holiday' : '') + (LIGHT_WEEKS.includes(w) ? ' light' : '');
    return '<div class="wk' + cls + '" title="' + esc(tp('ui.weekN', { n: w })) + (HOLIDAYS.includes(w) ? ' · ' + esc(tp('cal.holiday')) : '') + '"><span>' + n(w) + '</span><span class="marks">' + marks.join('') + '</span></div>'; }).join('');
  const legend = [['q', 'cal.quarter'], ['d', 'cal.deadline'], ['m', 'cal.match'], ['w', 'cal.window'], ['r', 'cal.rollforward']].map(([c, k]) => '<span><span class="mk ' + c + '" style="background:var(--' + ({ q: 'navy', d: 'danger', m: 'gold', w: 'ok', r: 'muted' }[c]) + ')"></span>' + t(k) + '</span>').join('');
  const upcoming = engs.filter(e => e.phase !== 'closed' && e.deadline >= wk).sort((a, b) => a.deadline - b.deadline).map(e => '<div class="feed-item">' + pill(t('ui.weekN', { n: e.deadline }), 'pill-danger') + ' ' + engTitle(e) + ' · ' + t('cal.deadline') + '</div>').join('') + matches.filter(m => !m.playedAll && m.week >= wk).map(m => { const mt = CT.matchType(m.type); const e = S.eng(st, m.engId); return '<div class="feed-item">' + pill(t('ui.weekN', { n: m.week }), 'pill-gold') + ' ' + esc(mt ? mt.hebrew : m.type) + (e ? ' · ' + engTitle(e) : '') + '</div>'; }).join('');
  return '<section data-screen="calendar"><h1 class="screen-title mb">' + t('nav.calendar') + '</h1><div class="card"><div class="cal-wrap"><div class="cal-months">' + months + '</div><div class="cal">' + weeks + '</div></div><div class="legend">' + legend + '<span><span class="mk" style="background:var(--navy-soft);border:1px solid var(--line-strong)"></span>' + t('cal.holiday') + '</span></div></div>' +
    '<div class="section-title"><h2>' + t('cal.upcoming') + '</h2></div><div class="card">' + (upcoming || '<div class="xs faint">' + t('ui.none') + '</div>') + '</div></section>';
}

function objectiveProgress(st, o) {
  const engs = S.engagements(st); const closed = engs.filter(e => e.phase === 'closed'); const J = S.journal(st);
  const mean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  switch (o.metric) {
    case 'meanQ': return mean(engs.map(e => e.quality || 0));
    case 'meanP': return mean(J.map(e => numOr(e.P, 0)));
    case 'confidence': return st.player.confidence;
    case 'rep': return st.player.rep;
    case 'onTime': return closed.length ? 100 * closed.filter(e => (e.closedWeek ?? e.deadline) <= e.deadline).length / closed.length : 0;
    case 'findings': return engs.reduce((a, e) => a + ((e.findings || []).length), 0);
    default: return null;
  }
}
function screenFirm(st) {
  const f = S.firm(st); const hist = (st.firm && st.firm.confidenceHistory) || [];
  const spark = hist.length ? '<div class="spark" role="img" aria-label="' + esc(tp('firm.confidenceHistory')) + '">' + hist.slice(-24).map(v => '<i style="block-size:' + pct(v) + '%" title="' + Math.round(v) + '"></i>').join('') + '</div>' : '<div class="xs faint">' + t('ui.none') + '</div>';
  const objs = (f.boardObjectives || []).map(o => { const v = objectiveProgress(st, o); const target = o.target || 0; const met = v != null && v >= target; const isPct = o.metric !== 'findings'; return '<div class="objective"><div class="row between"><span>' + tx(o.hebrew) + '</span>' + pill(met ? t('firm.met') : t('firm.notMet'), met ? 'pill-ok' : 'pill-danger') + '</div>' + (v != null ? '<div class="row">' + barHTML(isPct ? Math.min(100, v / Math.max(1, target) * 100) : Math.min(100, v / Math.max(1, target) * 100), met ? 'ok' : 'thin') + '<span class="small num">' + n(v, isPct && o.metric !== 'findings' ? 0 : 0) + ' / ' + n(target) + '</span></div>' : '') + '</div>'; }).join('') || '<div class="xs faint">' + t('ui.none') + '</div>';
  const cast = CT.list('cast'); const rival = cast.find(c => c.role === 'rival'); const sponsorId = st.firm && st.firm.sponsorId; const sponsor = sponsorId ? CT.person(sponsorId) : null;
  const candidates = cast.filter(c => (c.role === 'mentor' || c.role === 'manager') && (S.trust(st, c.id) ?? 0) >= 60);
  const feed = (S.stats(st).headlines || st.feed || []).slice(-8).reverse().map(h => '<div class="feed-item">' + pill(t('ui.weekN', { n: h.week })) + ' ' + (h.key ? t(h.key, h.params) : tx(h.text || h)) + '</div>').join('') || '<div class="xs faint">' + t('firm.noFeed') + '</div>';
  return '<section data-screen="firm"><div class="card-h"><h1 class="screen-title">' + esc(f.name || tp('nav.firm')) + '</h1>' + pill(t('firm.prestige') + ' ' + n(f.prestige), 'pill-outline') + '</div>' +
    '<div class="grid-2"><div class="card"><h2 class="mb">' + t('meter.confidence') + ' · ' + n(st.player.confidence) + '</h2>' + spark + '<p class="xs faint mt">' + t('firm.confidenceHistory') + '</p></div>' +
    '<div class="card"><h2 class="mb">' + t('firm.objectives') + '</h2>' + objs + '</div>' +
    '<div class="card"><h2 class="mb">' + t('firm.sponsor') + '</h2>' + (sponsor ? '<div class="row">' + avatar(sponsor.name, 'gold') + '<b>' + esc(sponsor.name) + '</b></div>' : candidates.length ? '<div class="row">' + avatar(candidates[0].name, 'gold') + esc(candidates[0].name) + '</div>' : '<div class="small danger">' + t('firm.noSponsor') + '</div>') +
    (rival ? '<hr class="divider"><div class="row">' + avatar(rival.name) + '<div><b>' + esc(rival.name) + '</b> · ' + t('role.rival') + '<div class="xs muted">' + t(st.player.confidence < 65 ? 'firm.rivalAhead' : 'firm.rivalBehind') + '</div></div></div>' : '') + '</div>' +
    '<div class="card"><h2 class="mb">' + t('firm.culture') + '</h2><p>' + tx(f.philosophy || '') + '</p><div class="pills mt">' + (f.hoursPenalty ? pill(t('firm.hoursPenalty', { n: f.hoursPenalty }), 'pill-danger') : '') + (f.trustMult && f.trustMult !== 1 ? pill(t('firm.trustMult', { n: f.trustMult }), 'pill-ok') : '') + (f.promoDelta ? pill(t('firm.promoDelta', { n: f.promoDelta }), 'pill-outline') : '') + '</div></div></div>' +
    '<div class="section-title"><h2>' + t('firm.market') + '</h2></div><div class="card">' + feed + '</div></section>';
}

function screenOffers(st) {
  const offers = A.offers(st); const open = S.week(st) <= 6;
  const cards = offers.map((o, i) => { const f = CT.firm(o.firmId || o.id) || {}; return '<div class="card"><div class="card-h"><h3>' + esc(f.name || o.firmId || '') + '</h3>' + pill(t('tier.' + (o.tier || S.tier(st)) + '.title'), 'pill-navy') + '</div><div class="row small muted">' + pill(t('firm.pay') + ' ×' + n(o.pay ?? f.pay, 1)) + pill(t('firm.prestige') + ' ' + n(f.prestige)) + '</div><p class="small mt">' + tx(f.philosophy || '') + '</p>' +
    '<h4 class="small muted mt">' + t('firm.objectives') + '</h4><ul class="small">' + (f.boardObjectives || []).map(x => '<li>' + tx(x.hebrew) + '</li>').join('') + '</ul>' + (o.scout ? '<div class="notice small">' + tx(o.scout) + '</div>' : '') +
    '<div class="btns mt"><button type="button" class="btn btn-primary" data-act="offer-accept" data-i="' + i + '">' + t('offers.accept') + '</button><button type="button" class="btn" data-act="offer-decline" data-i="' + i + '">' + t('offers.decline') + '</button></div></div>'; }).join('');
  return '<section data-screen="offers"><div class="card-h"><h1 class="screen-title">' + t('nav.offers') + '</h1>' + pill(open ? t('offers.open') : t('offers.closed'), open ? 'pill-ok' : '') + '</div>' + (has('offers') || Array.isArray(st.offers) ? (cards || empty('offers.none')) : soon()) + '</section>';
}
function sheetOffer(sh) { return { title: t('nav.offers'), body: '<p>' + t('offers.confirmAccept', { firm: (CT.firm(sh.offer.firmId || sh.offer.id) || {}).name || '' }) + '</p><p class="small muted">' + t('offers.acceptNote') + '</p>', footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.cancel') + '</button><button type="button" class="btn btn-primary" data-act="offer-accept-yes" data-i="' + sh.i + '">' + t('offers.accept') + '</button>' }; }

function screenSeason(st) {
  const s = A.seasonSummary(st);
  if (!s) return '<section data-screen="season"><h1 class="screen-title mb">' + t('nav.season') + '</h1>' + empty('season.notYet') + '</section>';
  const milestone = s.ending === 'v1Milestone' || s.milestone === true;
  const ctx = curCtx();
  const awards = (s.awards || []).map(a => { const id = a.id || a; const key = 'award.' + id; return '<div class="award' + (id === 'wolf' ? ' wolf' : '') + '"><span class="ico" aria-hidden="true">' + (id === 'wolf' ? '🐺' : '🏆') + '</span><div><b>' + t(key) + '</b>' + (a.text ? '<div class="small muted">' + tx(a.text, ctx) + '</div>' : '') + '</div></div>'; }).join('');
  const top = (s.topDecisions || s.decisions || []).map(d => { const e = typeof d === 'string' ? S.entry(st, d) : (d.entryId ? S.entry(st, d.entryId) : d); if (!e) return ''; const sc = CT.scenario(e.scenarioId) || {}; const chosen = (sc.options || []).find(o => o.id === e.optionId); const branch = d.branch || (sc.options || []).filter(o => o.id !== e.optionId).sort((a, b) => (b.quality || 0) - (a.quality || 0))[0];
    return '<div class="decision-top"><div class="row between"><b>' + bdiWrap(esc(journalTitle(st, e))) + '</b>' + pill(t('ui.weekN', { n: e.week })) + '</div><div class="small">' + (chosen ? tx(chosen.label, ctx) : '') + '</div>' + deltaPills(e.applied) + (branch ? '<div class="branch"><b class="small muted">' + t('season.branch') + '</b><div>' + tx(branch.label, ctx) + '</div>' + (branch.feedback && branch.feedback.why ? '<div class="small muted">' + tx(branch.feedback.why, ctx) + '</div>' : '') + '</div>' : '') + '</div>'; }).join('');
  const attrs = s.skillDeltas ? Object.keys(s.skillDeltas).map(id => '<span class="delta ' + (s.skillDeltas[id] > 0 ? 'pos' : s.skillDeltas[id] < 0 ? 'neg' : '') + '">' + skillName(id) + ' ' + (s.skillDeltas[id] > 0 ? '▲' : s.skillDeltas[id] < 0 ? '▼' : '·') + n(Math.abs(s.skillDeltas[id]), 1) + '</span>').join('') : '';
  const verdictKey = s.verdict === 'promoted' ? 'season.promoted' : s.verdict === 'warning' ? 'season.warning' : s.verdict === 'dismissed' ? 'season.dismissed' : 'season.stay';
  return '<section data-screen="season"><h1 class="screen-title mb">' + (milestone ? t('ending.v1Milestone') : t('season.title', { season: s.season ?? S.season(st) })) + '</h1>' +
    (milestone ? '<div class="notice mb">' + t('season.milestoneNote') + '</div>' : '') +
    '<div class="grid-2"><div class="card"><h2 class="mb">' + t('season.score') + '</h2><div class="score-big">' + n(s.score) + '</div><dl class="kv mt"><dt>' + t('season.meanQ') + '</dt><dd>' + n(s.meanQ) + '</dd><dt>' + t('season.meanP') + '</dt><dd>' + n(s.meanP) + '</dd><dt>' + t('meter.confidence') + '</dt><dd>' + n(s.confidence ?? st.player.confidence) + '</dd></dl><div class="verdict mt">' + t(verdictKey) + '</div>' + (s.gateScore != null ? '<div class="small muted">' + t('season.gateScore', { n: s.gateScore }) + '</div>' : '') + '</div>' +
    '<div class="card"><h2 class="mb">' + t('season.sponsorVerdict') + '</h2><p>' + (s.sponsorText ? tx(s.sponsorText, ctx) : (s.sponsorKey ? t(s.sponsorKey, s.sponsorParams) : '<span class="faint">' + t('firm.noSponsor') + '</span>')) + '</p></div></div>' +
    '<div class="section-title"><h2>' + t('season.topDecisions') + '</h2></div>' + (top || '<div class="xs faint">' + t('ui.none') + '</div>') +
    (attrs ? '<div class="section-title"><h2>' + t('season.attrDeltas') + '</h2></div><div class="deltas">' + attrs + '</div>' : '') +
    '<div class="section-title"><h2>' + t('season.awards') + '</h2></div><div class="stack">' + (awards || '<div class="xs faint">' + t('ui.none') + '</div>') + '</div>' +
    (s.patterns && s.patterns.length ? '<div class="section-title"><h2>' + t('journal.patterns') + '</h2></div>' + s.patterns.map(p => '<div class="pattern">' + t('pattern.' + (p.id || p.key), p.params || p) + '</div>').join('') : '') +
    (milestone ? '<div class="section-title"><h2>' + t('nav.cv') + '</h2></div>' + cvTable(st) + '<div class="btns mt"><button type="button" class="btn btn-primary" data-act="season-continue">' + t('season.continue') + '</button><button type="button" class="btn" data-act="new-career">' + t('season.newCareer') + '</button></div>' : '<div class="btns mt"><button type="button" class="btn btn-primary" data-act="season-continue">' + t('season.continue') + '</button></div>') + '</section>';
}
function cvTable(st) {
  const rows = (st.cv || []).concat(S.stats(st).seasons && !st.cv?.length ? S.stats(st).seasons : []);
  if (!rows.length) return empty('cv.empty');
  return '<table class="table"><thead><tr><th>' + t('cv.season') + '</th><th>' + t('cv.firm') + '</th><th>' + t('cv.tier') + '</th><th>' + t('cv.score') + '</th><th>' + t('cv.objectives') + '</th><th>' + t('cv.awards') + '</th></tr></thead><tbody>' + rows.map(r => '<tr><td data-l="' + esc(tp('cv.season')) + '">' + n(r.season) + '</td><td data-l="' + esc(tp('cv.firm')) + '">' + esc((CT.firm(r.firmId || r.firm) || {}).name || r.firm || '') + '</td><td data-l="' + esc(tp('cv.tier')) + '">' + t('tier.' + (r.tier || 1) + '.title') + '</td><td data-l="' + esc(tp('cv.score')) + '" class="n">' + n(r.score) + '</td><td data-l="' + esc(tp('cv.objectives')) + '">' + (r.objectivesMet != null ? n(r.objectivesMet) + '/' + n(r.objectivesTotal ?? '') : '–') + '</td><td data-l="' + esc(tp('cv.awards')) + '">' + ((r.awards || []).map(a => t('award.' + (a.id || a))).join(', ') || '–') + (r.ending ? ' · ' + t('ending.' + r.ending) : '') + '</td></tr>').join('') + '</tbody></table>';
}
function screenCV(st) { return '<section data-screen="cv"><h1 class="screen-title mb">' + t('nav.cv') + '</h1><div class="card mb"><div class="row">' + avatar(st.player.name, 'gold') + '<div><b>' + esc(st.player.name || '') + '</b><div class="small muted">' + tierTitle(st) + ' · ' + esc(S.firm(st).name || '') + '</div></div></div></div>' + cvTable(st) + '</section>'; }

function screenSettings(st) {
  const theme = storage.get('mm.theme') || 'auto'; const size = storage.get('mm.size') || 'md';
  const segBtn = (act, key, val, cur) => '<button type="button" data-act="' + act + '" data-v="' + val + '" aria-pressed="' + (cur === val) + '">' + t(key) + '</button>';
  const slots = [1, 2, 3].map(i => { const m = slotMeta(i); return '<div class="slot">' + avatar(m && m.name ? m.name : String(i), m ? '' : 'muted') + '<div class="grow">' + (m && !m.corrupt ? '<b>' + esc(m.name || '') + '</b> · ' + t('open.slotMeta', { season: m.season, week: m.week, tier: m.tier }) : '<span class="muted">' + t(m ? 'open.slotCorrupt' : 'open.slotEmpty') + '</span>') + (ui.slot === i ? ' ' + pill(t('settings.currentSlot'), 'pill-gold') : '') + '</div><button type="button" class="btn btn-sm btn-navy" data-act="slot-save" data-slot="' + i + '">' + t('settings.save') + '</button>' + (m && !m.corrupt ? '<button type="button" class="btn btn-sm" data-act="slot-load" data-slot="' + i + '">' + t('open.load') + '</button>' : '') + '</div>'; }).join('');
  return '<section data-screen="settings"><h1 class="screen-title mb">' + t('nav.settings') + '</h1>' +
    '<div class="card"><h2 class="mb">' + t('settings.theme') + '</h2><div class="seg">' + segBtn('theme', 'settings.themeAuto', 'auto', theme) + segBtn('theme', 'settings.themeLight', 'light', theme) + segBtn('theme', 'settings.themeDark', 'dark', theme) + '</div>' +
    '<h2 class="mb mt">' + t('settings.textSize') + '</h2><div class="seg">' + segBtn('size', 'settings.sizeSm', 'sm', size) + segBtn('size', 'settings.sizeMd', 'md', size) + segBtn('size', 'settings.sizeLg', 'lg', size) + '</div></div>' +
    '<div class="card"><h2 class="mb">' + t('open.slots') + '</h2><div class="stack">' + slots + '</div>' + (storage.set('mm.probe', '1') ? '' : '<p class="small danger mt">' + t('settings.storageUnavailable') + '</p>') + '</div>' +
    '<div class="card"><div class="card-h"><h2>' + t('settings.export') + '</h2><button type="button" class="btn btn-sm" data-act="export">' + t('settings.exportBtn') + '</button></div><textarea class="mono" readonly aria-label="' + esc(tp('settings.export')) + '" data-role="export-json">' + esc(ui.exportJson || '') + '</textarea>' +
    '<div class="card-h mt"><h2>' + t('settings.import') + '</h2><button type="button" class="btn btn-sm btn-navy" data-act="import">' + t('settings.importBtn') + '</button></div><textarea class="mono" aria-label="' + esc(tp('settings.import')) + '" data-role="import-json" placeholder="{ … }"></textarea></div>' +
    '<div class="card"><h2 class="mb">' + t('settings.danger') + '</h2><div class="btns"><button type="button" class="btn btn-danger" data-act="reset">' + t('settings.reset') + '</button><button type="button" class="btn" data-act="to-open">' + t('settings.backToOpen') + '</button></div><p class="xs faint mt">' + t('settings.simNote') + '</p></div></section>';
}

/* ───────────────────────── 6. DECISION ROOM (bottom sheet with a stepper) ───────────────────────── */
const FULL_STEPS = ['context', 'framing', 'info', 'options', 'premortem', 'memo', 'result'];
function roomSteps(room) { if (room.light) { const s = ['context']; if ((room.scenario.info || []).length) s.push('info'); s.push('options', 'result'); return s; } return FULL_STEPS.slice(); }
function openRoom(item, scenario, engineRes) {
  const engId = item.engId || (engineRes && engineRes.engId);
  const ctx = ctxFor(state, engId); ui.engId = engId; ui.ctx = ctx;
  const room = { kind: 'room', item, scenario, engId, ctx, step: 0, maxStep: 0, bought: [], sets: [], hoursSpent: 0, light: scenario.journal !== 'full', engineRoom: engineRes && (engineRes.room || engineRes), resetScroll: true };
  if (engineRes && Array.isArray(engineRes.sets)) room.sets = engineRes.sets.slice();
  if (engineRes && Array.isArray(engineRes.bought)) room.bought = engineRes.bought.slice();
  openSheet(room);
}
function roomMastery(room) { const sk = room.scenario.skills || []; if (!sk.length) return 10; const id = typeof sk[0] === 'string' ? sk[0] : sk[0].id; return Number(S.skill(state, id).mastery) || 1; }
function stepperHTML(room) {
  const steps = roomSteps(room);
  return '<div class="stepper" role="list">' + steps.map((s, i) => '<span class="step' + (i < room.step ? ' done' : i === room.step ? ' cur' : '') + '" role="listitem" aria-current="' + (i === room.step ? 'step' : 'false') + '"><i>' + (i < room.step ? '✓' : (i + 1)) + '</i>' + t('room.step.' + s) + '</span>').join('') + '</div>';
}
function feedbackHTML(fb, ctx) {
  if (!fb) return '';
  const part = (k, cls) => fb[k] ? '<div class="fb ' + (cls || '') + '"><b>' + t('feedback.' + k) + '</b>' + tx(fb[k], ctx) + '</div>' : '';
  return '<div class="feedback">' + part('why') + part('expert') + part('bias') + part('rule', 'rule') + '</div>';
}
function baseRateCard(sc, ctx) {
  if (!sc.baseRate) return '';
  const r = CT.baseRate(sc.baseRate); if (!r) return '';
  const text = r.text ? tx(r.text, ctx, r) : t('baseRate.card', { n: r.n, dev: r.dev, conf: r.conf, upper: r.upper }, ctx);
  return '<div class="baserate"><b class="small muted">' + t('baseRate.title') + '</b><div>' + text + '</div>' + (r.source ? '<div class="src">' + bdiWrap(esc(r.source)) + '</div>' : '') + '</div>';
}
function optionsHTML(room) {
  const sc = room.scenario; const ctx = room.ctx; let opts = (sc.options || []).slice();
  if ((state.player.energy ?? 100) < 30 && !room.light) {
    const sh = sc.shortcutOption ? Object.assign({ id: 'shortcut' }, sc.shortcutOption) : { id: 'shortcut', label: tp('shortcut.option'), quality: 0, generic: true };
    if (!opts.some(o => o.id === sh.id)) opts.push(sh);
  }
  return '<div class="option-list">' + opts.map((o, i) => { const gate = A.gateCheck(state, room, o); const sel = room.optionId === o.id;
    return '<button type="button" class="option' + (gate ? ' gated' : '') + (sel ? ' sel' : '') + '" data-act="room-option" data-id="' + esc(o.id) + '"' + (gate ? ' aria-disabled="true"' : '') + '><span class="ltr" aria-hidden="true">' + (i + 1) + '</span><span class="txt">' + tx(o.label, ctx) + (gate ? '<span class="gate">🔒 ' + gate + '</span>' : '') + '</span></button>'; }).join('') + '</div>';
}
function infoHTML(room) {
  const ctx = room.ctx; const list = room.scenario.info || [];
  return '<div class="option-list">' + list.map(i => { const bought = room.bought.includes(i.id); const cost = A.infoCost(state, i); const can = S.hoursLeft(state) >= cost;
    return '<button type="button" class="option' + (bought ? ' bought' : '') + '" data-act="room-info" data-id="' + esc(i.id) + '"' + (bought || !can ? ' aria-disabled="true"' : '') + '><span class="txt">' + tx(i.label, ctx) + (bought ? '<span class="reveal">' + tx(i.reveal, ctx) + '</span>' : '') + '</span><span class="cost">' + (bought ? '✓' : t('ui.hours', { n: cost })) + '</span></button>'; }).join('') + '</div>' +
    '<p class="xs faint mt">' + t('room.infoNote', { n: S.hoursLeft(state) }) + ((state.player.energy ?? 100) < 30 ? ' · ' + t('room.lowEnergyCosts') : '') + '</p>';
}
function luckLine(room) {
  const r = room.result || {}; if (r.luck && r.luck.key) return t(r.luck.key, r.luck.params, room.ctx);
  if (r.good == null) return '';
  const P = numOr(r.P, null); const p = Math.round((r.pGood ?? .5) * 100);
  const key = r.good ? (P != null && P <= 40 ? 'luck.badProcessGoodOutcome' : 'luck.good') : (P != null && P >= 70 ? 'luck.goodProcessBadOutcome' : 'luck.bad');
  return t(key, { p }, room.ctx);
}
function sheetRoom(room) {
  const sc = room.scenario; const ctx = room.ctx; const steps = roomSteps(room); const cur = steps[room.step]; const m = roomMastery(room);
  const title = tx(sc.title, ctx); let body = ''; let footer = '';
  const next = (key, act) => '<button type="button" class="btn btn-primary" data-act="' + (act || 'room-next') + '">' + t(key || 'ui.continue') + '</button>';
  const back = room.step > 0 && cur !== 'result' ? '<button type="button" class="btn btn-ghost" data-act="room-back">' + t('ui.back') + '</button>' : '';
  const eng = S.eng(state, room.engId);
  const head = '<div class="row small muted mb">' + (eng ? pill(engTitle(eng), 'pill-navy') + pill(engTypeLabel(eng), 'pill-outline') : '') + (sc.domain ? pill(t('domain.' + sc.domain)) : '') + (sc.difficulty ? pill(t('room.difficulty', { n: sc.difficulty }), 'pill-outline') : '') + (room.item && room.item.variantOf ? pill(t('repeat.label'), 'pill-gold') : '') + '</div>';
  if (cur === 'context') {
    body = head + '<div class="body-text">' + tx(sc.body, ctx) + '</div>' +
      (sc.attachments || []).map(a => '<details class="attach"><summary>' + tx(a.label, ctx) + '</summary><div>' + tx(a.text, ctx) + '</div></details>').join('') +
      (m >= 14 && sc.pushback ? '<div class="body-text mt"><i>' + tx(sc.pushback, ctx) + '</i></div>' : '') +
      (m <= 7 && sc.hint ? '<div class="hint"><b class="small muted">' + t('room.hint') + '</b><div>' + tx(sc.hint, ctx) + '</div></div>' : '') +
      (m <= 7 ? baseRateCard(sc, ctx) : '') +
      (sc.frameworks && sc.frameworks.length ? '<div class="pills mt">' + sc.frameworks.map(f => pill(bdiWrap(esc(f)), 'pill-outline')).join('') + '</div>' : '');
    footer = '<span class="grow xs faint">' + (room.light ? t('room.lightNote') : t('room.fullNote')) + '</span>' + next(room.light ? 'ui.continue' : 'room.toFraming');
  } else if (cur === 'framing') {
    body = '<p class="muted small">' + t('room.framingPrompt') + '</p><div class="option-list">' + (sc.framings || []).map((f, i) => '<button type="button" class="option' + (room.framingId === f.id ? ' sel' : '') + '" data-act="room-framing" data-id="' + esc(f.id) + '"><span class="ltr" aria-hidden="true">' + (i + 1) + '</span><span class="txt">' + tx(f.text, ctx) + '</span></button>').join('') + '</div>';
    footer = back + '<span class="grow"></span>' + '<button type="button" class="btn btn-primary" data-act="room-next"' + (room.framingId ? '' : ' disabled') + '>' + t('room.toInfo') + '</button>';
  } else if (cur === 'info') {
    body = '<p class="muted small">' + t('room.infoPrompt') + '</p>' + infoHTML(room);
    footer = back + '<span class="grow"></span>' + next('room.toOptions');
  } else if (cur === 'options') {
    body = '<p class="muted small">' + t('room.optionsPrompt') + '</p>' + optionsHTML(room);
    footer = back + '<span class="grow xs faint">' + t('room.gateNote') + '</span>';
  } else if (cur === 'premortem') {
    body = '<p class="muted small">' + t('room.premortemPrompt') + '</p><div class="option-list">' + (sc.failureModes || []).map((f, i) => '<button type="button" class="option' + (room.failureModeId === f.id ? ' sel' : '') + '" data-act="room-fm" data-id="' + esc(f.id) + '"><span class="ltr" aria-hidden="true">' + (i + 1) + '</span><span class="txt">' + tx(f.text, ctx) + '</span></button>').join('') + '</div>';
    footer = '<span class="grow"></span><button type="button" class="btn btn-primary" data-act="room-next"' + (room.failureModeId ? '' : ' disabled') + '>' + t('room.toMemo') + '</button>';
  } else if (cur === 'memo') {
    const opt = (sc.options || []).find(o => o.id === room.optionId) || (sc.shortcutOption ? Object.assign({ id: 'shortcut' }, sc.shortcutOption) : { label: tp('shortcut.option') });
    const fm = (sc.failureModes || []).find(f => f.id === room.failureModeId) || {};
    body = '<div class="memo-field"><span class="lbl">' + t('memo.what') + '</span><div class="auto">' + tx(opt.label, ctx) + '</div></div>' +
      '<div class="memo-field"><span class="lbl">' + t('memo.why') + '</span><div class="radio-list">' + (sc.rationales || []).map(r => '<label><input type="radio" name="rationale" value="' + esc(r.id) + '" data-act="room-rationale"' + (room.rationaleId === r.id ? ' checked' : '') + '><span>' + tx(r.text, ctx) + '</span></label>').join('') + '</div><textarea data-act="room-whytext" rows="2" placeholder="' + esc(tp('memo.whyFree')) + '" aria-label="' + esc(tp('memo.whyFree')) + '">' + esc(room.whyText || '') + '</textarea></div>' +
      '<div class="memo-field"><span class="lbl">' + t('memo.signal') + '</span><div class="auto">' + tx(fm.signal || '', ctx) + '</div></div>' +
      '<div class="memo-field"><span class="lbl">' + t('memo.when') + '</span><div class="seg" role="group">' + [2, 4, 8].map(w => '<button type="button" data-act="room-followup" data-w="' + w + '" aria-pressed="' + (room.followup === w) + '">' + t('memo.weeks', { n: w }) + '</button>').join('') + '</div><div class="xs faint mt">' + t('memo.whenNote') + ' · ' + t('ui.hours', { n: 1 }) + '</div></div>';
    footer = '<span class="grow"></span><button type="button" class="btn btn-primary" data-act="room-submit"' + (room.rationaleId && room.followup ? '' : ' disabled') + '>' + t('memo.submit') + '</button>';
  } else if (cur === 'result') {
    const r = room.result || {}; const opt = (sc.options || []).find(o => o.id === room.optionId) || sc.shortcutOption || {};
    const entry = room.entryId ? S.entry(state, room.entryId) : null;
    const P = numOr(r.P ?? (entry && entry.P), null); const O = numOr(r.O ?? (entry && entry.O), null);
    body = (r.pending ? '<div class="soon mb">' + t('ui.soon') + '</div>' : '') +
      (luckLine(room) ? '<div class="luck">' + luckLine(room) + '</div>' : '') +
      (r.text ? '<div class="result-text ' + (r.good === false ? 'bad' : r.good ? 'good' : '') + '">' + tx(r.text, ctx) + '</div>' : '') +
      '<div class="friday"><span>' + t('friday.line', { O: O != null ? O.toFixed(1) : '–', P: P != null ? Math.round(P) : '–' }) + '</span></div>' +
      deltaPills(r.applied || (entry && entry.applied)) +
      feedbackHTML(r.feedback || opt.feedback, ctx) +
      '<div class="btns mt">' + (sc.lesson ? '<button type="button" class="btn btn-sm" data-act="lesson-open" data-id="' + esc(sc.lesson) + '">' + t('room.lesson') + '</button>' : '') + (room.entryId ? '<button type="button" class="btn btn-sm btn-ghost" data-act="room-journal">' + t('room.showInJournal') + '</button>' : '') + '</div>';
    footer = '<button type="button" class="btn btn-primary" data-act="sheet-close">' + t('ui.close') + '</button>';
  }
  return { title, titleText: txp(sc.title, ctx), stepper: stepperHTML(room), body, footer, noClose: cur === 'memo' || cur === 'premortem' };
}
function roomGo(room, delta) { const steps = roomSteps(room); room.step = Math.max(0, Math.min(steps.length - 1, room.step + delta)); room.maxStep = Math.max(room.maxStep, room.step); room.resetScroll = true; renderSheet(); }
function roomChoose(room, optId) {
  const opt = (room.scenario.options || []).find(o => o.id === optId) || (optId === 'shortcut' ? { id: 'shortcut' } : null);
  if (!opt) return;
  if (A.gateCheck(state, room, opt)) { toast('room.gatedToast'); return; }
  const r = A.choose(state, room, optId);
  if (!r.ok) { toast('ui.engineError'); return; }
  if (room.light) { const m = A.submitMemo(state, room, {}); if (!m.ok) toast('ui.engineError'); if (room.item) room.item.done = true; autosave(); room.step = roomSteps(room).indexOf('result'); }
  else room.step = roomSteps(room).indexOf('premortem');
  room.resetScroll = true; renderSheet(); render();
}
function roomSubmit(room) {
  const memo = { what: room.optionId, rationaleId: room.rationaleId, whyText: room.whyText || '', failureModeId: room.failureModeId, signal: ((room.scenario.failureModes || []).find(f => f.id === room.failureModeId) || {}).signal, followup: room.followup, framingId: room.framingId, infoBought: room.bought.slice() };
  const r = A.submitMemo(state, room, memo);
  if (!r.ok) { toast('ui.engineError'); return; }
  S.plan(state).extraHours = (S.plan(state).extraHours || 0) + 1;
  if (room.item) room.item.done = true;
  autosave();
  room.step = roomSteps(room).indexOf('result'); room.resetScroll = true; renderSheet(); render();
}

/* ───────────────────────── 7. MATCH («אירוע חי»), INBOX ITEM & FOLLOW-UP SHEETS ───────────────────────── */
function openMatch(item, match) {
  const eng = S.eng(state, match.engId); ui.engId = match.engId; ui.ctx = ctxFor(state, match.engId);
  const sh = { kind: 'match', item, match, eng, phase: match.playedAll ? 'result' : 'prep', idx: 0, line: 0, broke: false, resetScroll: true };
  if (Array.isArray(match.played) && match.played.length && !match.playedAll) { sh.phase = 'moment'; sh.idx = match.played.filter(Boolean).length; }
  openSheet(sh);
}
function fitDots(type, k, v) { const mt = CT.matchType(type); const val = mt && mt.fit && mt.fit[k] ? (mt.fit[k][v] ?? 0) : 0; return '<span class="fit-dots" aria-label="' + val + '/3">' + [1, 2, 3].map(i => '<i class="' + (i <= val ? 'on' : '') + '"></i>').join('') + '</span>'; }
function togglesHTML(sh, lockOne) {
  const ap = state.player.approach || { basis: 'risk', transparency: 'full', escalation: 'low' }; const type = sh.match.type;
  const rows = [['basis', ['risk', 'rules']], ['transparency', ['full', 'managed']], ['escalation', ['low', 'high']]];
  return '<div class="toggles">' + rows.map(([k, vals]) => '<div class="toggle-row"><span class="lbl">' + t('approach.' + k) + '</span><span class="seg">' + vals.map(v => '<button type="button" data-act="match-toggle" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (ap[k] === v) + '"' + (lockOne && sh.toggled && sh.toggled !== k ? ' disabled' : '') + '>' + t('approach.' + k + '.' + v) + ' ' + fitDots(type, k, v) + '</button>').join('') + '</span></div>').join('') + '</div>';
}
function matchHeader(sh) {
  const m = sh.match; const mt = CT.matchType(m.type); const eng = sh.eng; const client = eng && CT.client(eng.clientId);
  const label = (mt ? (eng && eng.type === 'policy-writing' && hasKey('matchType.' + m.type + '.policy') ? tp('matchType.' + m.type + '.policy') : mt.hebrew) : m.type);
  return { label, html: '<div class="match-h"><div class="row">' + pill(esc(label), 'pill-gold') + (client ? pill(esc(client.name), 'pill-navy') : '') + (eng ? lineBadge(eng) : '') + '</div><div class="row between"><div class="prep-n">' + n(m.prep) + '<small>' + t('match.prep') + '</small></div><div class="small muted">' + t('match.fit') + ' ' + n(m.fit, 1) + '</div></div></div>' };
}
function sheetMatch(sh) {
  const m = sh.match; const mt = CT.matchType(m.type) || { moments: (m.moments || []).length }; const total = (m.moments || []).length || mt.moments || 3; const ctx = ui.ctx;
  const H = matchHeader(sh); let body = ''; let footer = '';
  if (sh.phase === 'prep') {
    const attendees = (m.attendees || [sh.eng && sh.eng.contactId, sh.eng && sh.eng.iaId, sh.eng && sh.eng.managerId]).filter(Boolean);
    const first = momentOf(m.moments && m.moments[0]);
    body = H.html + '<div class="card mt"><h3 class="mb">' + t('match.teamSheet') + '</h3><div class="pills">' + attendees.map(id => { const p = CT.person(id); return pill(avatar(p ? p.name : id, 'sm') + ' ' + esc(p ? p.name : id), 'pill-outline'); }).join('') + '</div>' +
      '<dl class="kv mt"><dt>' + t('eng.quality') + '</dt><dd>' + n(sh.eng && sh.eng.quality) + '</dd><dt>' + t('eng.findings') + '</dt><dd>' + n(sh.eng ? (sh.eng.findings || []).length : 0) + '</dd><dt>' + t('match.examined') + '</dt><dd>' + (m.revealFirst && first ? tx(first.title, ctx) : (m.topic ? tx(m.topic, ctx) : t('match.unknown'))) + '</dd></dl></div>' +
      '<div class="card mt"><h3 class="mb">' + t('match.approach') + '</h3>' + togglesHTML(sh, false) + '</div>' + (m.colleagueId ? '<p class="xs faint mt">' + t('match.colleague', { name: personName(m.colleagueId) }) + '</p>' : '');
    footer = '<span class="grow xs faint">' + t('match.energyNote') + '</span><button type="button" class="btn btn-primary" data-act="match-start">' + t('match.start') + '</button>';
  } else if (sh.phase === 'moment') {
    const mo = momentOf(m.moments[sh.idx]); const host = (m.hostility && m.hostility[sh.idx]) || 'neutral';
    const lines = mo && mo.ticker ? (mo.ticker[host] || mo.ticker.neutral || []) : [];
    const shown = lines.slice(0, sh.line + 1);
    const allShown = sh.line >= lines.length - 1;
    const rec = Array.isArray(m.played) ? m.played[sh.idx] : null;
    body = '<div class="moment"><span class="stamp">' + t('match.stamp', { i: sh.idx + 1, n: total }) + '</span>' + H.html + '<div class="ticker mt">' + shown.map(l => '<div class="ticker-line ' + host + '">' + tx(l, ctx) + '</div>').join('') + '</div>' +
      (allShown && mo ? '<div class="card mt"><h3 class="mb">' + tx(mo.title, ctx) + '</h3><div class="body-text small">' + tx(mo.body, ctx) + '</div>' + (sh.hint ? '<div class="hint">' + tx(sh.hint, ctx) + '</div>' : '') +
        (rec ? '<div class="moment-res"><div class="result-text ' + (rec.good === false ? 'bad' : 'good') + '">' + tx(rec.text, ctx) + '</div>' + (rec.feedback ? '<div class="fb rule mt"><b>' + t('feedback.rule') + '</b>' + tx(rec.feedback.rule, ctx) + '</div>' : '') + '</div>' : '<div class="mt">' + optionsHTML({ scenario: mo, ctx, light: true, bought: [], sets: m.sets || [], match: m, optionId: null }) + '</div>') + '</div>' : '') + '</div>';
    footer = (!allShown ? '<button type="button" class="btn btn-navy" data-act="match-tick">' + t('ui.continue') + ' ▸</button>' : rec ? '<button type="button" class="btn btn-primary" data-act="match-next">' + t('ui.continue') + '</button>' : '<span class="xs faint">' + t('room.gateNote') + '</span>');
  } else if (sh.phase === 'break') {
    const col = m.colleagueId && (S.trust(state, m.colleagueId) ?? 0) >= 60; const nextMo = momentOf(m.moments[sh.idx]);
    body = H.html + '<div class="card mt"><h3 class="mb">' + t('match.break') + '</h3><p class="small muted">' + t('match.breakNote') + '</p>' + togglesHTML(sh, true) + '</div>' +
      '<div class="card mt"><h3 class="mb">' + t('match.askColleague') + '</h3>' + (col ? (sh.hint ? '<div class="hint">' + tx(sh.hint, ctx) + '</div>' : '<button type="button" class="btn btn-sm" data-act="match-colleague"' + (nextMo && nextMo.colleagueHint ? '' : ' disabled') + '>' + t('match.askColleagueBtn', { name: personName(m.colleagueId) }) + '</button>') : '<div class="xs faint">' + t('match.noColleague') + '</div>') + '</div>';
    footer = '<button type="button" class="btn btn-primary" data-act="match-resume">' + t('ui.continue') + '</button>';
  } else {
    const r = sh.result || (sh.result = A.resolveMatch(state, m));
    const ratings = Array.isArray(r.ratings) ? r.ratings : Object.keys(r.ratings || {}).map(id => ({ id, rating: r.ratings[id] }));
    const rrow = (x) => { const v = Number(x.rating ?? x.value) || 0; const name = x.id === 'player' ? (state.player.name || tp('match.you')) : personName(x.id); return '<div class="rating-row">' + avatar(name, x.id === 'player' ? 'gold' : '') + '<span class="grow">' + esc(name) + (x.id === 'player' ? ' ' + pill(t('match.you'), 'pill-gold') : '') + '</span><span class="rating-n ' + (v >= 7 ? 'b4' : v >= 5 ? 'b3' : v >= 3 ? 'b2' : 'b1') + '">' + n(v) + '</span></div>'; };
    const scale = scaleFor(sh.eng);
    body = H.html + (r.soon ? '<div class="soon mt">' + t('ui.soon') + '</div>' : '') + (r.headline ? '<div class="headline mt">' + (r.headline.key ? t(r.headline.key, r.headline.params) : tx(r.headline, ctx)) + '</div>' : '') + (r.tone ? '<p class="small muted">' + (hasKey('match.tone.' + r.tone) ? t('match.tone.' + r.tone) : tx(r.tone, ctx)) + '</p>' : '') +
      '<div class="card mt"><h3 class="mb">' + t('match.findingsSheet') + '</h3>' + ((r.findings || []).length ? (r.findings || []).map(f => '<div class="finding">' + ratingPill(scale, f.rating) + '<span>' + tx(f.title || f.text || f.id, ctx) + '</span></div>').join('') : '<div class="xs faint">' + t('eng.noFindings') + '</div>') + '</div>' +
      '<div class="card mt"><h3 class="mb">' + t('match.ratings') + '</h3><div class="ratings">' + (ratings.length ? ratings.map(rrow).join('') : '<div class="xs faint">' + t('ui.none') + '</div>') + '</div></div>' + (r.delta != null ? '<p class="small mt">' + t('match.qualityDelta', { n: r.delta }) + '</p>' : '');
    footer = '<button type="button" class="btn btn-primary" data-act="match-close">' + t('ui.close') + '</button>';
  }
  return { title: esc(H.label), titleText: H.label, body, footer, noClose: sh.phase === 'moment' };
}
function matchMomentChoose(sh, optId) {
  const m = sh.match; const mo = momentOf(m.moments[sh.idx]); const opt = mo && (mo.options || []).find(o => o.id === optId); if (!opt) return;
  const gate = A.gateCheck(state, { scenario: mo, ctx: ui.ctx, sets: m.sets || [], match: m }, opt); if (gate) { toast('room.gatedToast'); return; }
  const r = A.playMoment(state, m, sh.idx, optId); if (!r.ok) { toast('ui.engineError'); return; }
  sh.hint = null; autosave(); renderSheet();
}
function matchNext(sh) {
  const m = sh.match; const total = (m.moments || []).length;
  if (sh.idx + 1 >= total) { sh.phase = 'result'; sh.result = A.resolveMatch(state, m); if (sh.item) sh.item.done = true; autosave(); sh.resetScroll = true; renderSheet(); render(); return; }
  sh.idx += 1; sh.line = 0; sh.hint = null;
  if (total >= 5 && sh.idx === 2 && !sh.broke) { sh.phase = 'break'; sh.broke = true; sh.toggled = null; }
  else sh.phase = 'moment';
  sh.resetScroll = true; renderSheet();
}

function sheetItem(sh) {
  const item = sh.item; const info = itemInfo(state, item); const ctx = ctxFor(state, item.engId); const sc = item.scenarioId ? CT.scenario(item.scenarioId) : null;
  let body = '';
  if (sc) body = '<div class="body-text">' + tx(sc.body, ctx) + '</div>' + (sc.attachments || []).map(a => '<details class="attach"><summary>' + tx(a.label, ctx) + '</summary><div>' + tx(a.text, ctx) + '</div></details>').join('');
  else if (item.key) body = '<div class="body-text">' + t(item.key, item.params, ctx) + '</div>';
  else body = '<div class="body-text">' + tx(item.body || item.text || '', ctx) + '</div>';
  if (item.scoutable || item.ahead) body = '<div class="notice mb">' + t('scout.ahead') + '</div>' + body;
  if (info.type === 'consequence' && item.failureMode) body += '<p class="small muted mt">' + t('journal.failureMode') + ': ' + esc(item.failureMode) + '</p>';
  body += deltaPills(item.applied || item.effectApplied);
  if (item.journalId && S.entry(state, item.journalId)) body += '<div class="btns mt"><button type="button" class="btn btn-sm btn-ghost" data-act="entry-open" data-id="' + esc(item.journalId) + '">' + t('room.showInJournal') + '</button></div>';
  if (info.type === 'offer') body += '<div class="btns mt"><button type="button" class="btn btn-sm btn-navy" data-act="nav" data-screen="offers">' + t('nav.offers') + '</button></div>';
  if (info.type === 'deliverable' && item.deliverableId) body += '<div class="btns mt"><button type="button" class="btn btn-sm btn-primary" data-act="builder-open" data-id="' + esc(item.deliverableId) + '" data-item="' + esc(item.id) + '">' + t('deliverable.open') + '</button></div>';
  if (info.type === 'quarter' && Array.isArray(item.lowest)) body += '<div class="stack mt">' + item.lowest.map(id => { const e = S.entry(state, id); return e ? '<div class="pattern">' + bdiWrap(esc(journalTitle(state, e))) + ' · ' + t('journal.P') + ' ' + n(e.P) + (e.rule ? '<div class="small muted">' + tx(e.rule, ctx) + '</div>' : '') + '</div>' : ''; }).join('') + '</div>';
  if (info.type === 'summary' || info.type === 'season') body += '<div class="btns mt"><button type="button" class="btn btn-sm btn-primary" data-act="nav" data-screen="season">' + t('nav.season') + '</button></div>';
  return { title: bdiWrap(esc(info.subject)), titleText: info.subject, body: '<div class="row small muted mb">' + avatar(info.name, 'sm') + '<span>' + esc(info.name) + '</span>' + pill(t('ui.weekN', { n: item.week })) + '</div>' + body, footer: '<button type="button" class="btn btn-primary" data-act="sheet-close">' + t('ui.close') + '</button>' };
}
function sheetFollowup(sh) {
  const item = sh.item; const e = S.entry(state, item.journalId); const ctx = e ? ctxFor(state, e.engId) : curCtx();
  if (!e) return { title: t('inbox.type.followup'), body: empty('journal.empty') };
  const sc = CT.scenario(e.scenarioId) || {}; const fm = (sc.failureModes || []).find(f => f.id === e.failureModeId);
  const landed = (e.consequences || e.delayed || []).filter(c => c.landed);
  const record = landed.length ? (landed.some(c => c.failureMode && c.failureMode === e.failureModeId) ? 'hit' : 'miss') : 'none';
  const answered = e.followupAnswer != null || item.done;
  const body = '<p class="small muted">' + bdiWrap(esc(journalTitle(state, e))) + ' · ' + t('ui.weekN', { n: e.week }) + '</p>' +
    '<div class="memo-field"><span class="lbl">' + t('memo.signal') + '</span><div class="auto">' + tx(fm ? fm.signal : (e.signal || ''), ctx) + '</div></div>' +
    '<h3 class="mb">' + t('followup.whatHappened') + '</h3>' + (landed.length ? landed.map(c => '<div class="finding">' + pill(t('journal.landed'), 'pill-danger') + '<span>' + tx(c.text, ctx) + '</span></div>').join('') : '<div class="xs faint">' + t('followup.nothingYet') + '</div>') +
    '<h3 class="mt mb">' + t('followup.question') + '</h3>' + (answered ? '<div class="notice">' + t('followup.answered', { answer: tp(e.followupAnswer ? 'ui.yes' : 'ui.no') }) + ' · ' + t('followup.record.' + record) + '</div>' : '<div class="btns"><button type="button" class="btn btn-navy" data-act="followup-answer" data-a="1">' + t('ui.yes') + '</button><button type="button" class="btn" data-act="followup-answer" data-a="0">' + t('ui.no') + '</button></div>') +
    '<div class="btns mt"><button type="button" class="btn btn-sm btn-ghost" data-act="entry-open" data-id="' + esc(e.id) + '">' + t('room.showInJournal') + '</button></div>';
  return { title: t('inbox.type.followup'), body, footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.close') + '</button>' };
}
function openInboxItem(id) {
  const item = S.inbox(state).find(i => i.id === id); if (!item) return;
  const type = item.type || 'news';
  const res = A.openItem(state, item);
  if (type === 'decision' || type === 'repeat') {
    const sc = (res && res.scenario) || CT.scenario(item.scenarioId);
    if (!sc) { toast('toast.staleContent'); item.done = true; render(); return; }
    if (sc.journal === 'none' || !(sc.options && sc.options.length)) { item.done = true; openSheet({ kind: 'item', item }); render(); return; }
    openRoom(item, sc, res); render(); return;
  }
  if (type === 'moment' || type === 'match') { const m = S.match(state, item.matchId); if (!m) { toast('toast.staleContent'); item.done = true; render(); return; } openMatch(item, m); render(); return; }
  if (type === 'followup') { openSheet({ kind: 'followup', item }); render(); return; }
  if (type === 'news' && item.scenarioId) { const sc = CT.scenario(item.scenarioId); if (sc && sc.options && sc.options.length && sc.journal !== 'none') { openRoom(item, sc, res); render(); return; } }
  item.done = item.done || type !== 'offer';
  openSheet({ kind: 'item', item }); render();
}

/* ───────────────────────── 8. BUILDERS, DRILLS, PICKERS ───────────────────────── */
function deliverableParts(d) { if (Array.isArray(d.parts)) return d.parts; if (d.kind) return [Object.assign({ weight: 100 }, d)]; return []; }
function partCands(slot) { return (slot.candidates || slot.options || []).map(c => typeof c === 'string' ? { text: c, pts: 0 } : { text: c.text || c.label, pts: c.pts ?? c.points ?? c.score ?? 0, feedback: c.feedback }); }
function kendall(order, answer) {
  const pos = {}; answer.forEach((id, i) => { pos[id] = i; }); let c = 0, d = 0;
  for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) { const a = pos[order[i]], b = pos[order[j]]; if (a == null || b == null) continue; if (a < b) c++; else if (a > b) d++; }
  const tot = c + d; return tot ? (c - d) / tot : 0;
}
function scoreDeliverableLocal(d, answers) {
  const parts = deliverableParts(d); let total = 0, wsum = 0; const perPart = [];
  parts.forEach((p, pi) => {
    const a = answers[pi] || {}; let s = 0; const w = p.weight || (100 / parts.length);
    if (p.kind === 'slots') { const slots = p.slots || []; let sum = 0; slots.forEach((sl, si) => { const c = partCands(sl)[a.slots ? a.slots[si] : -1]; sum += c ? c.pts : 0; }); s = slots.length ? sum / (20 * slots.length) * 100 : 0; }
    else if (p.kind === 'ratings') { const items = p.items || []; let acc = 0, cnt = 0; items.forEach((it, ii) => { (it.scales || p.scales || []).forEach(sc => { const max = sc.max || 5, min = sc.min || 1; const ans = it.answer ? it.answer[sc.id] : null; const v = a.ratings && a.ratings[ii] ? a.ratings[ii][sc.id] : null; if (ans != null) { cnt++; acc += v == null ? 0 : 1 - Math.abs(v - ans) / Math.max(1, max - min); } }); }); s = cnt ? acc / cnt * 100 : 0; }
    else if (p.kind === 'order') { const ans = p.answerOrder || p.answer || (p.items || []).map(x => x.id); const ord = a.order || (p.items || []).map(x => x.id); s = 100 * (1 + kendall(ord, ans)) / 2; }
    else if (p.kind === 'match') { const pairs = p.pairs || p.items || []; let pts = 0; pairs.forEach((pr, i) => { const ap = a.pairs && a.pairs[i]; if (!ap) return; const base = 20; const hasReason = Array.isArray(pr.reasons) && pr.reasons.length; const right = ap.choice != null && String(ap.choice) === String(pr.answer); if (hasReason) { if (right) pts += base / 2; if (ap.reason != null && String(ap.reason) === String(pr.reasonAnswer ?? pr.answerReason)) pts += base / 2; } else if (right) pts += base; }); s = Math.min(100, pts); }
    perPart.push(Math.round(s)); total += s * w; wsum += w;
  });
  return { score: wsum ? Math.round(total / wsum) : 0, parts: perPart };
}
function sheetBuilder(sh) {
  const d = sh.deliverable; const parts = deliverableParts(d); const ctx = curCtx(); const ans = sh.answers;
  let body = d.intro || d.description ? '<p class="small muted">' + tx(d.intro || d.description, ctx) + '</p>' : '';
  if (sh.result) {
    body += '<div class="center mb"><div class="score-big">' + n(sh.result.score) + '</div><div class="small muted">' + t(sh.practice ? 'deliverable.practiceScore' : (sh.result.score >= 65 ? 'deliverable.pass' : 'deliverable.fail')) + '</div></div>';
    parts.forEach((p, pi) => { body += '<div class="card mb"><div class="row between"><b>' + tx(p.title || tp('deliverable.kind.' + p.kind), ctx) + '</b>' + pill(n(sh.result.parts[pi]) + '%', sh.result.parts[pi] >= 65 ? 'pill-ok' : 'pill-danger') + '</div>' + (p.kind === 'slots' ? (p.slots || []).map((sl, si) => { const c = partCands(sl)[ans[pi] && ans[pi].slots ? ans[pi].slots[si] : -1]; return '<div class="finding"><span class="small">' + tx(sl.label, ctx) + ': ' + (c ? tx(c.text, ctx) : '–') + (c && c.feedback ? '<div class="xs muted">' + tx(c.feedback, ctx) + '</div>' : '') + '</span></div>'; }).join('') : '') + '</div>'; });
    return { title: tx(d.title || d.id), body, footer: '<button type="button" class="btn btn-primary" data-act="sheet-close">' + t('ui.close') + '</button>' };
  }
  parts.forEach((p, pi) => {
    const a = ans[pi] || (ans[pi] = {});
    body += '<div class="card mb"><div class="card-h"><h3>' + tx(p.title || tp('deliverable.kind.' + p.kind), ctx) + '</h3>' + pill(t('deliverable.weight', { n: p.weight || Math.round(100 / parts.length) }), 'pill-outline') + '</div>' + (p.prompt ? '<p class="small muted">' + tx(p.prompt, ctx) + '</p>' : '');
    if (p.kind === 'slots') body += (p.slots || []).map((sl, si) => '<div class="slot-pick"><h4>' + tx(sl.label, ctx) + '</h4><div class="radio-list">' + partCands(sl).map((c, ci) => '<label><input type="radio" name="s' + pi + '_' + si + '" data-act="b-slot" data-p="' + pi + '" data-s="' + si + '" value="' + ci + '"' + ((a.slots || [])[si] === ci ? ' checked' : '') + '><span>' + tx(c.text, ctx) + '</span></label>').join('') + '</div></div>').join('');
    else if (p.kind === 'ratings') body += (p.items || []).map((it, ii) => '<div class="slot-pick"><h4>' + tx(it.label || it.text, ctx) + '</h4><div class="rate-grid">' + (it.scales || p.scales || []).map(sc => '<label class="small">' + tx(sc.label || sc.id, ctx) + '</label><select data-act="b-rate" data-p="' + pi + '" data-i="' + ii + '" data-sc="' + esc(sc.id) + '"><option value="">–</option>' + Array.from({ length: (sc.max || 5) - (sc.min || 1) + 1 }, (_, k) => k + (sc.min || 1)).map(v => '<option value="' + v + '"' + (a.ratings && a.ratings[ii] && a.ratings[ii][sc.id] === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>').join('') + '</div></div>').join('');
    else if (p.kind === 'order') { const ord = a.order || (a.order = (p.items || []).map(x => x.id)); const byId = {}; (p.items || []).forEach(x => { byId[x.id] = x; }); body += '<div class="order-list">' + ord.map((id, i) => '<div class="order-item"><span class="chip-num b2">' + n(i + 1) + '</span><span class="grow">' + tx((byId[id] || {}).text || (byId[id] || {}).label || id, ctx) + '</span><button type="button" class="btn btn-sm btn-icon" data-act="b-move" data-p="' + pi + '" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="' + esc(tp('ui.up')) + '">▲</button><button type="button" class="btn btn-sm btn-icon" data-act="b-move" data-p="' + pi + '" data-i="' + i + '" data-d="1"' + (i === ord.length - 1 ? ' disabled' : '') + ' aria-label="' + esc(tp('ui.down')) + '">▼</button></div>').join('') + '</div>'; }
    else if (p.kind === 'match') body += (p.pairs || p.items || []).map((pr, i) => { const ap = (a.pairs || [])[i] || {}; const opts = pr.options || pr.rightOptions || p.options || []; return '<div class="slot-pick"><h4>' + tx(pr.left || pr.label || pr.text, ctx) + '</h4><select data-act="b-pair" data-p="' + pi + '" data-i="' + i + '" data-f="choice"><option value="">–</option>' + opts.map(o => { const id = typeof o === 'string' ? o : o.id; const text = typeof o === 'string' ? o : o.text || o.label; return '<option value="' + esc(id) + '"' + (String(ap.choice) === String(id) ? ' selected' : '') + '>' + tx(text, ctx) + '</option>'; }).join('') + '</select>' + (Array.isArray(pr.reasons) && pr.reasons.length ? '<select class="mt" data-act="b-pair" data-p="' + pi + '" data-i="' + i + '" data-f="reason"><option value="">' + t('deliverable.reason') + '</option>' + pr.reasons.map(r => { const id = typeof r === 'string' ? r : r.id; const text = typeof r === 'string' ? r : r.text; return '<option value="' + esc(id) + '"' + (String(ap.reason) === String(id) ? ' selected' : '') + '>' + tx(text, ctx) + '</option>'; }).join('') + '</select>' : '') + '</div>'; }).join('');
    else body += soon();
    body += '</div>';
  });
  return { title: tx(d.title || d.id), titleText: txp(d.title || d.id), body: body || soon(), footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.cancel') + '</button><button type="button" class="btn btn-primary" data-act="b-submit">' + t('deliverable.submit') + '</button>' };
}
function drillItems(d) { return (d.items || d.questions || []).map(it => ({ q: it.q || it.question || it.text || '', options: (it.options || it.choices || []).map(o => typeof o === 'string' ? { text: o } : { text: o.text || o.label, correct: !!o.correct, id: o.id }), answer: it.answer ?? it.correct, why: it.why || it.explanation || '' })); }
function sheetDrill(sh) {
  const d = sh.drill; const items = drillItems(d); const ctx = curCtx(); const i = sh.i;
  if (sh.done) { const score = Math.round(sh.correct / Math.max(1, items.length) * 100); return { title: tx(d.title || d.name || d.id), body: '<div class="center"><div class="score-big">' + n(score) + '%</div><p class="muted">' + t('drill.done', { k: sh.correct, n: items.length }) + '</p></div>', footer: '<button type="button" class="btn btn-primary" data-act="sheet-close">' + t('ui.close') + '</button>' }; }
  const it = items[i]; if (!it) return { title: '', body: empty('learn.noDrills') };
  const picked = sh.picked; const isRight = (o, k) => o.correct || (typeof it.answer === 'number' ? it.answer === k : it.answer != null && (it.answer === o.id || it.answer === o.text));
  const body = '<p class="xs faint">' + t('drill.progress', { i: i + 1, n: items.length }) + '</p><div class="drill-q">' + tx(it.q, ctx) + '</div><div class="option-list">' + it.options.map((o, k) => '<button type="button" class="option' + (picked != null ? (isRight(o, k) ? ' sel' : (picked === k ? ' gated' : '')) : '') + '" data-act="drill-pick" data-k="' + k + '"' + (picked != null ? ' aria-disabled="true"' : '') + '><span class="ltr" aria-hidden="true">' + (k + 1) + '</span><span class="txt">' + tx(o.text, ctx) + '</span></button>').join('') + '</div>' + (picked != null ? '<div class="fb mt"><b>' + t(isRight(it.options[picked], picked) ? 'drill.right' : 'drill.wrong') + '</b>' + tx(it.why, ctx) + '</div>' : '');
  return { title: tx(d.title || d.name || d.id), body, footer: picked != null ? '<button type="button" class="btn btn-primary" data-act="drill-next">' + t('ui.continue') + '</button>' : '', noClose: true };
}
function sheetPicker(sh) {
  const kind = sh.kindBlock; let opts = [];
  if (kind === 'work') opts = S.activeEngagements(state).map(e => ({ id: e.id, label: engTitle(e) + ' · ' + txp(tp('phase.' + e.phase)), sub: (S.trust(state, e.contactId) ?? 0) >= 60 ? tp('block.workBonus') : '' }));
  else if (kind === 'learn') opts = CT.list('drills').map(d => ({ id: d.id, label: txp(d.title || d.name || d.id), sub: d.skillId || d.skill ? txp(tp('skill.' + (d.skillId || d.skill))) : '' }));
  else if (kind === 'network') opts = CT.list('cast').concat(CT.list('stakeholders')).filter(p => S.castEntry(state, p.id) || p.role).map(p => ({ id: p.id, label: p.name, sub: tp('people.trust') + ' ' + (S.trust(state, p.id) ?? '–') }));
  const body = opts.length ? '<div class="option-list">' + opts.map(o => '<button type="button" class="option" data-act="block-pick" data-kind="' + kind + '" data-id="' + esc(o.id) + '"><span class="txt">' + bdiWrap(esc(o.label)) + (o.sub ? '<span class="xs muted"> · ' + bdiWrap(esc(o.sub)) + '</span>' : '') + '</span></button>').join('') + '</div>' : empty(kind === 'work' ? 'dash.noEngagements' : kind === 'learn' ? 'learn.noDrills' : 'people.none');
  return { title: t('block.' + kind), body, footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.cancel') + '</button>' };
}
function addBlock(kind, extra) {
  const b = BLOCKS[kind]; if (!b) return;
  if (S.hoursLeft(state) < b.hours) { toast('dash.noHours'); return; }
  const block = Object.assign({ kind, hours: b.hours, energy: b.energy }, extra || {});
  if (has('addBlock')) { const r = adopt(call('addBlock', state, block)); if (r && r.error) { toast('ui.engineError'); return; } }
  S.plan(state).blocks.push(block);
  autosave(); render();
}

/* ───────────────────────── 9. EVENTS (delegated on #app) ───────────────────────── */
function endWeek() {
  const plan = S.plan(state);
  state.uiSnap = { skills: {} }; for (const id of Object.keys(S.skills(state))) state.uiSnap.skills[id] = Number(S.skill(state, id).mastery) || 1;
  const r = A.tick(state, plan);
  if (!r.ok) { toast(r.soon ? 'ui.soon' : 'ui.engineError'); return; }
  state.plan = { blocks: [], extraHours: 0 };
  showMessages(A.messages(state, r.res));
  autosave(); ui.sheet = null; go('dash');
  if (r.res && r.res.ending) go('season');
  else if (S.week(state) === 1 && S.lastSeason(state) && !state.seasonShown) { state.seasonShown = S.season(state); go('season'); }
}
function applyTheme(v) { const h = document.documentElement; if (v === 'light' || v === 'dark') h.setAttribute('data-theme', v); else h.removeAttribute('data-theme'); storage.set('mm.theme', v); }
function applySize(v) { const h = document.documentElement; if (v === 'sm' || v === 'lg') h.setAttribute('data-size', v); else h.removeAttribute('data-size'); storage.set('mm.size', v); }
function startNewGame() {
  const o = ui.open; if (!o.name.trim()) { toast('open.nameRequired'); return; }
  if (!has('newGame')) { toast('ui.soon'); }
  const st = A.newGame({ name: o.name.trim(), gender: o.gender, firmId: o.firmId });
  if (!st) { toast('ui.engineError'); return; }
  state = st; state.plan = state.plan || { blocks: [], extraHours: 0 };
  const free = [1, 2, 3].find(i => !slotMeta(i)); ui.slot = free || 1;
  autosave(); ui.sheet = null; go('dash');
}

const actions = {
  'nav': (el) => go(el.dataset.screen),
  'sheet-close': () => closeSheet(),
  'confirm-yes': () => { const fn = ui.sheet && ui.sheet.onYes; ui.sheet = null; renderSheet(); if (fn) fn(); render(); },
  'open-name': (el) => { ui.open.name = el.value; },
  'open-gender': (el) => { ui.open.gender = el.dataset.g; render(); },
  'open-firm': (el) => { ui.open.firmId = el.dataset.id; render(); },
  'open-start': () => startNewGame(),
  'open-load': (el) => { const st = loadSlot(Number(el.dataset.slot)); if (!st) { toast('open.loadFailed'); return; } state = st; ui.slot = Number(el.dataset.slot); storage.set('mm.slot', String(ui.slot)); go('dash'); },
  'open-delete': (el) => { const i = Number(el.dataset.slot); confirmBox('open.confirmDelete', { n: i }, () => { storage.remove(SLOT_KEY(i)); render(); }, true); },
  'end-week': () => endWeek(),
  'block-add': (el) => { const kind = el.dataset.kind; if (el.disabled) return; if (kind === 'work' && el.dataset.eng) return addBlock('work', { engId: el.dataset.eng }); if (kind === 'work' || kind === 'learn' || kind === 'network') { if (S.hoursLeft(state) < BLOCKS[kind].hours) { toast('dash.noHours'); return; } openSheet({ kind: 'picker', kindBlock: kind }); return; } addBlock(kind); },
  'block-pick': (el) => { const kind = el.dataset.kind; const id = el.dataset.id; ui.sheet = null; if (kind === 'work') addBlock('work', { engId: id }); else if (kind === 'network') addBlock('network', { castId: id }); else if (kind === 'learn') { const d = CT.byId('drills', id); if (d) openSheet({ kind: 'drill', drill: d, i: 0, picked: null, correct: 0, done: false, fromBlock: true }); } render(); },
  'block-remove': (el) => { const i = Number(el.dataset.i); const p = S.plan(state); const b = p.blocks[i]; if (!b) return; if (b.kind === 'learn' && b.score != null) { toast('dash.drillLocked'); return; } if (has('removeBlock')) adopt(call('removeBlock', state, i)); p.blocks.splice(i, 1); autosave(); render(); },
  'item-open': (el) => openInboxItem(el.dataset.id),
  'entry-open': (el) => { openSheet({ kind: 'entry', id: el.dataset.id }); },
  'learned': (el) => { const e = S.entry(state, el.dataset.id); if (e) { e.learned = el.value; } },
  'filter': (el) => { ui.filters[el.dataset.f] = el.value; render(); },
  'journal-export': () => { ui.exportMd = journalMarkdown(state); render(); const ta = root.querySelector('[data-role="export-md"]'); if (ta) { ta.focus(); try { ta.select(); } catch (e) { /* noop */ } } },
  'lesson-open': (el) => { state.lessonsSeen = state.lessonsSeen || {}; state.lessonsSeen[el.dataset.id] = 1; openSheet({ kind: 'lesson', id: el.dataset.id, parent: ui.sheet }); },
  'drill-open': (el) => { const d = CT.byId('drills', el.dataset.id); if (!d) return; if (S.hoursLeft(state) < 4) { toast('dash.noHours'); return; } openSheet({ kind: 'drill', drill: d, i: 0, picked: null, correct: 0, done: false, fromBlock: true }); },
  'drill-pick': (el) => { const sh = ui.sheet; if (!sh || sh.picked != null) return; const items = drillItems(sh.drill); const it = items[sh.i]; const k = Number(el.dataset.k); const o = it.options[k]; const right = o.correct || (typeof it.answer === 'number' ? it.answer === k : it.answer != null && (it.answer === o.id || it.answer === o.text)); sh.picked = k; if (right) sh.correct++; renderSheet(); },
  'drill-next': () => { const sh = ui.sheet; const items = drillItems(sh.drill); sh.i++; sh.picked = null; if (sh.i >= items.length) { sh.done = true; const score = Math.round(sh.correct / Math.max(1, items.length) * 100); const skillId = sh.drill.skillId || sh.drill.skill; if (sh.fromBlock) { S.plan(state).blocks.push({ kind: 'learn', hours: 4, energy: -1, skillId, drillId: sh.drill.id, score }); } A.drillDone(state, sh.drill, score); autosave(); } sh.resetScroll = true; renderSheet(); if (sh.done) render(); },
  'builder-open': (el) => { const d = CT.byId('deliverables', el.dataset.id); if (!d) { toast('toast.staleContent'); return; } openSheet({ kind: 'builder', deliverable: d, answers: {}, practice: !!el.dataset.practice, itemId: el.dataset.item }); },
  'b-slot': (el) => { const a = ui.sheet.answers; const p = Number(el.dataset.p), s = Number(el.dataset.s); a[p] = a[p] || {}; a[p].slots = a[p].slots || []; a[p].slots[s] = Number(el.value); },
  'b-rate': (el) => { const a = ui.sheet.answers; const p = Number(el.dataset.p), i = Number(el.dataset.i); a[p] = a[p] || {}; a[p].ratings = a[p].ratings || []; a[p].ratings[i] = a[p].ratings[i] || {}; a[p].ratings[i][el.dataset.sc] = el.value === '' ? null : Number(el.value); },
  'b-move': (el) => { const a = ui.sheet.answers; const p = Number(el.dataset.p), i = Number(el.dataset.i), d = Number(el.dataset.d); const ord = a[p].order; const j = i + d; if (j < 0 || j >= ord.length) return; [ord[i], ord[j]] = [ord[j], ord[i]]; renderSheet(); },
  'b-pair': (el) => { const a = ui.sheet.answers; const p = Number(el.dataset.p), i = Number(el.dataset.i); a[p] = a[p] || {}; a[p].pairs = a[p].pairs || []; a[p].pairs[i] = a[p].pairs[i] || {}; a[p].pairs[i][el.dataset.f] = el.value; },
  'b-submit': () => { const sh = ui.sheet; sh.result = A.scoreDeliverable(state, sh.deliverable, sh.answers); if (!sh.practice) { const item = S.inbox(state).find(i => i.id === sh.itemId); if (item) item.done = true; state.player.gateScore = sh.result.score; } sh.resetScroll = true; autosave(); renderSheet(); render(); },
  'room-next': () => roomGo(ui.sheet, 1),
  'room-back': () => roomGo(ui.sheet, -1),
  'room-framing': (el) => { const room = ui.sheet; room.framingId = el.dataset.id; if (has('chooseFraming')) adopt(call('chooseFraming', state, room.engineRoom || room, room.framingId)); renderSheet(); },
  'room-info': (el) => { const room = ui.sheet; if (el.getAttribute('aria-disabled') === 'true') { if (!room.bought.includes(el.dataset.id)) toast('dash.noHours'); return; } const r = A.buyInfo(state, room, el.dataset.id); if (!r.ok) { toast('ui.engineError'); return; } autosave(); renderSheet(); },
  'room-option': (el) => { if (el.getAttribute('aria-disabled') === 'true') { toast('room.gatedToast'); return; } const sh = ui.sheet; if (sh.kind === 'match') matchMomentChoose(sh, el.dataset.id); else roomChoose(sh, el.dataset.id); },
  'room-fm': (el) => { ui.sheet.failureModeId = el.dataset.id; renderSheet(); },
  'room-rationale': (el) => { ui.sheet.rationaleId = el.value; renderSheet(); },
  'room-whytext': (el) => { ui.sheet.whyText = el.value; },
  'room-followup': (el) => { ui.sheet.followup = Number(el.dataset.w); renderSheet(); },
  'room-submit': () => roomSubmit(ui.sheet),
  'room-journal': () => { const id = ui.sheet.entryId; ui.sheet = null; go('journal'); if (id) openSheet({ kind: 'entry', id }); },
  'match-toggle': (el) => { const sh = ui.sheet; if (el.disabled) return; const k = el.dataset.k, v = el.dataset.v; const ap = Object.assign({}, state.player.approach || {}); if (ap[k] === v) return; ap[k] = v; A.prepMatch(state, sh.match, ap); if (sh.phase === 'break') sh.toggled = k; renderSheet(); },
  'match-start': () => { const sh = ui.sheet; A.prepMatch(state, sh.match, state.player.approach || {}); if (has('startMatch')) adopt(call('startMatch', state, sh.match.id)); sh.phase = 'moment'; sh.idx = 0; sh.line = 0; sh.resetScroll = true; renderSheet(); },
  'match-tick': () => { ui.sheet.line++; renderSheet(); const b = root.querySelector('.sheet-body'); if (b) b.scrollTop = b.scrollHeight; },
  'match-next': () => matchNext(ui.sheet),
  'match-colleague': () => { const sh = ui.sheet; const mo = momentOf(sh.match.moments[sh.idx]); sh.hint = mo && mo.colleagueHint; renderSheet(); },
  'match-resume': () => { const sh = ui.sheet; sh.phase = 'moment'; sh.resetScroll = true; renderSheet(); },
  'match-close': () => { closeSheet(); },
  'followup-answer': (el) => { const sh = ui.sheet; const e = S.entry(state, sh.item.journalId); const r = A.answerFollowup(state, sh.item, e, el.dataset.a === '1'); showMessages(A.messages(state, r)); autosave(); renderSheet(); render(); },
  'offer-accept': (el) => { const offers = A.offers(state); const o = offers[Number(el.dataset.i)]; if (!o) return; openSheet({ kind: 'offer', offer: o, i: Number(el.dataset.i) }); },
  'offer-accept-yes': (el) => { const offers = A.offers(state); const o = offers[Number(el.dataset.i)]; ui.sheet = null; if (!o) return; if (A.acceptOffer(state, o)) { toast('offers.accepted', { firm: (CT.firm(o.firmId || o.id) || {}).name || '' }); autosave(); go('dash'); } else { toast('ui.soon'); render(); } },
  'offer-decline': (el) => { const offers = A.offers(state); const o = offers[Number(el.dataset.i)]; if (!o) return; A.declineOffer(state, o); autosave(); render(); },
  'season-continue': () => { if (has('continueSeason')) adopt(call('continueSeason', state)); autosave(); go('dash'); },
  'new-career': () => confirmBox('settings.confirmReset', {}, () => { state = null; ui.sheet = null; go('open'); }, true),
  'theme': (el) => { applyTheme(el.dataset.v); render(); },
  'size': (el) => { applySize(el.dataset.v); render(); },
  'slot-save': (el) => { const i = Number(el.dataset.slot); if (saveSlot(i, state)) { ui.slot = i; toast('settings.saved', { n: i }); } else toast('settings.storageUnavailable'); render(); },
  'slot-load': (el) => { const i = Number(el.dataset.slot); confirmBox('settings.confirmLoad', { n: i }, () => { const st = loadSlot(i); if (st) { state = st; ui.slot = i; storage.set('mm.slot', String(i)); go('dash'); } else toast('open.loadFailed'); }); },
  'export': () => { ui.exportJson = A.exportJSON(state); render(); const ta = root.querySelector('[data-role="export-json"]'); if (ta) { ta.focus(); try { ta.select(); } catch (e) { /* noop */ } } },
  'import': () => { const ta = root.querySelector('[data-role="import-json"]'); const text = ta ? ta.value.trim() : ''; if (!text) return; const r = A.importJSON(text); if (r.error || !r.state) { toast('settings.importFailed'); return; } state = r.state; state.plan = state.plan || { blocks: [], extraHours: 0 }; showMessages(r.messages); toast('settings.imported'); autosave(); go('dash'); },
  'reset': () => confirmBox('settings.confirmReset', {}, () => { storage.remove(SLOT_KEY(ui.slot)); state = null; ui.sheet = null; go('open'); }, true),
  'to-open': () => { autosave(); state = null; ui.sheet = null; go('open'); },
};
function onEvent(ev) {
  const el = ev.target.closest('[data-act]'); if (!el || !root.contains(el)) return;
  const act = el.dataset.act; const fn = actions[act]; if (!fn) return;
  const isField = el.matches('input, textarea, select');
  if (ev.type === 'click' && isField) return;
  if ((ev.type === 'input' || ev.type === 'change') && !isField) return;
  if (ev.type === 'input' && !el.matches('input[type="text"], textarea')) return;
  if (ev.type === 'change' && el.matches('input[type="text"], textarea')) return;
  try { fn(el, ev); } catch (e) { console.warn('action failed', act, e); toast('ui.engineError'); }
}
root.addEventListener('click', onEvent);
root.addEventListener('input', onEvent);
root.addEventListener('change', onEvent);
root.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && ui.sheet && !(sheetContent(ui.sheet).noClose)) closeSheet(); });

/* ───────────────────────── 10. BOOT ───────────────────────── */
function snapshot() { return { state, ui: { screen: ui.screen, slot: ui.slot, filters: ui.filters } }; }
function start(data) {
  CT.load();
  applyTheme(storage.get('mm.theme') || 'auto'); applySize(storage.get('mm.size') || 'md');
  if (data && data.state && data.state.player) { state = data.state; Object.assign(ui, data.ui || {}); ui.sheet = null; if (ui.screen === 'open') ui.screen = 'dash'; }
  else {
    const slot = Number(storage.get('mm.slot')) || 0;
    const st = slot ? loadSlot(slot) : null;
    if (st) { state = st; ui.slot = slot; ui.screen = 'dash'; } else ui.screen = 'open';
  }
  if (state) { state.plan = state.plan || { blocks: [], extraHours: 0 }; showMessages(A.messages(state, null)); }
  render();
}
window.MM_UI = { snapshot, render, get state() { return state; }, set state(s) { state = s; render(); }, t, go };
const hot = window.claude && window.claude.hot;
if (hot && typeof hot.onSnapshot === 'function') { try { hot.onSnapshot(snapshot); } catch (e) { /* noop */ } }
if (hot && typeof hot.ready === 'function') hot.ready(start); else start((hot && hot.data) || {});
})();
