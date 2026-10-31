/* ui.js — מרקטינג מנג'ר: הדרך לשותפות
   Renders every screen (DESIGN.md §12) from the MM state and window.MM_CONTENT.
   No framework, no browser dialogs, no literal Hebrew: every string goes through t(key) → content.strings.
   Sections: 0 adapter · 1 strings · 2 storage · 3 ui state/render · 4 components · 5 screens ·
             6 decision room · 7 match / inbox item / follow-up · 8 builders & drills · 9 events · 10 boot */
(function () {
'use strict';

/* ───────────────────────── 0. ADAPTER (the only place that touches MM or content shapes) ─────────────────────────
   Engine API used (src/engine.js, DESIGN.md §15): loadContent, newGame, tick, openScenario, roomView, chooseFraming,
   buyInfo, choose, choosePremortem, submitMemo, answerFollowup, setLearned, markRead, startMatch, matchView, setApproach,
   playMoment, matchBreak, spendBlock, runDrill, deliverable, gateAvailable, submitDeliverable, acceptOffer, declineOffer,
   objectives, findSponsor, patterns, metrics, exportJournal, phaseKey, skillNote, calendarView, trustUnlocks, ctxFor, fill, t,
   save, load, slotSummary, exportJSON, importJSON, HOURS. Every call is guarded: a missing function degrades to «ui.soon». */
const MMx = () => (typeof window !== 'undefined' && window.MM) || {};
const has = (fn) => typeof MMx()[fn] === 'function';
function call(fn, ...args) { try { return MMx()[fn](...args); } catch (e) { console.warn('MM.' + fn + ' threw', e); return { ok: false, error: { key: 'ui.engineError', params: { fn } }, threw: true }; } }
const okRes = (r) => !!(r && r.ok !== false && !r.threw && !(r.error && r.ok === false));

const CT = {
  all: null, _idx: {},
  load() {
    const raw = (typeof window !== 'undefined' && window.MM_CONTENT) || {};
    /* The engine indexes its own copy; the UI reads the raw banks (keeps object-shaped banks such as lessons.json intact). */
    if (has('loadContent')) { try { MMx().loadContent(raw); } catch (e) { console.warn('loadContent failed', e); } }
    const loaded = Object.assign({}, raw); const sc = []; for (const k of Object.keys(raw)) if (/^scenarios\./.test(k) && Array.isArray(raw[k])) { sc.push(...raw[k]); delete loaded[k]; }
    loaded.scenarios = sc.filter(x => x && x.bank !== 'moment' && x.bank !== 'event'); loaded.moments = (Array.isArray(raw.moments) ? raw.moments : []).concat(sc.filter(x => x && x.bank === 'moment')); loaded.events = (Array.isArray(raw.events) ? raw.events : []).concat(sc.filter(x => x && x.bank === 'event'));
    CT.all = loaded; CT._idx = {}; return loaded;
  },
  bank(name) { return (CT.all && CT.all[name]) || null; },
  list(name) { const b = CT.bank(name); if (Array.isArray(b)) return b; if (b && typeof b === 'object') { if (Array.isArray(b[name])) return b[name]; return Object.keys(b).map(k => (b[k] && typeof b[k] === 'object') ? Object.assign({ id: k }, b[k]) : null).filter(Boolean); } return []; },
  byId(name, id) { if (!id) return null; if (!CT._idx[name]) { const m = {}; for (const it of CT.list(name)) if (it && it.id != null) m[it.id] = it; CT._idx[name] = m; } return CT._idx[name][id] || null; },
  strings() { const s = CT.bank('strings'); return (s && typeof s === 'object') ? s : {}; },
  scenario(id) { return CT.byId('scenarios', id) || CT.byId('moments', id) || CT.byId('events', id); },
  moment(id) { return CT.byId('moments', id) || CT.byId('scenarios', id); },
  firm(id) { return CT.byId('firms', id); },
  client(id) { return CT.byId('clients', id); },
  person(id) { return CT.byId('cast', id) || CT.byId('stakeholders', id); },
  personByRole(role) { return CT.list('cast').find(c => c.role === role) || null; },
  lesson(id) { return CT.byId('lessons', id); },
  lessons() { const l = CT.bank('lessons'); return Array.isArray(l) ? l : (l && Array.isArray(l.lessons)) ? l.lessons : []; },
  frameworkLabel(id) { const l = CT.bank('lessons'); const f = l && Array.isArray(l.frameworks) ? l.frameworks.find(x => x.id === id) : null; return f ? (f.he || f.hebrew || f.id) : id; },
  scale(id) { const rs = CT.bank('ratingScales'); const list = rs ? (Array.isArray(rs) ? rs : rs.scales || []) : []; return list.find(s => s.id === id) || null; },
  scaleFor(eng) { if (!eng) return null; if (eng.scale) return eng.scale; const rs = CT.bank('ratingScales'); return (rs && rs.byEngType && rs.byEngType[eng.type]) || null; },
  scalePills(scaleId) { const s = CT.scale(scaleId); if (!s) return []; return (s.pills || s.levels || []).map(x => typeof x === 'string' ? { id: x, label: x } : { id: x.id, label: x.he || x.hebrew || x.label || x.id, level: x.level }); },
  baseRate(id) { return CT.byId('baseRates', id); },
  matchType(id) { return CT.byId('matchTypes', id); },
  matchTypeLabel(type, engType) { const mt = CT.matchType(type); if (!mt) return type || ''; if (engType && mt.hebrewByEngType && mt.hebrewByEngType[engType]) return mt.hebrewByEngType[engType]; return mt.hebrew || mt.he || type; },
  tagLabel(id) { const tg = CT.bank('tags'); const l = tg && (Array.isArray(tg.tags) ? tg.tags : []); const x = l && l.find(o => o.id === id); return x ? (x.he || x.hebrew || x.label) : null; },
  biasLabel(id) { const tg = CT.bank('tags'); const l = tg && (Array.isArray(tg.biases) ? tg.biases : []); const x = l && l.find(o => o.id === id); return x ? (x.he || x.hebrew || x.label) : null; },
  awardLabel(key) { const a = CT.list('awards').find(x => x.key === key || 'award.' + x.id === key); return a ? (a.he || a.hebrew) : null; },
};

/* State accessors (engine state shape). */
const S = {
  engagements(st) { return Array.isArray(st?.engagements) ? st.engagements : []; },
  active(st) { return S.engagements(st).filter(e => e.status === 'active' && e.phase !== 'closed'); },
  pending(st) { return S.engagements(st).filter(e => e.status === 'pending' && e.season === st.season); },
  closed(st) { return S.engagements(st).filter(e => e.phase === 'closed'); },
  eng(st, id) { return id ? (S.engagements(st).find(e => e.id === id) || null) : null; },
  inbox(st) { return Array.isArray(st?.inbox) ? st.inbox.filter(i => !i.done) : []; },
  item(st, id) { return S.inbox(st).find(i => i.id === id) || null; },
  unread(st) { return S.inbox(st).filter(i => !i.read).length; },
  journal(st) { return Array.isArray(st?.journal) ? st.journal : []; },
  entry(st, id) { return S.journal(st).find(e => e.id === id) || null; },
  matches(st) { return Array.isArray(st?.matches) ? st.matches : []; },
  match(st, id) { return S.matches(st).find(m => m.id === id) || null; },
  skills(st) { return st?.player?.skills || {}; },
  skill(st, id) { return S.skills(st)[id] || { mastery: 1, obs: 0, peak: 1, lastPracticed: 0 }; },
  trust(st, id) { if (!id) return null; if (has('trustOf')) { const v = MMx().trustOf(st, id); return typeof v === 'number' ? v : null; } const r = (st.world.cast && st.world.cast[id]) || (st.world.contacts && st.world.contacts[id]); return r ? r.trust : null; },
  personRec(st, id) { return (st?.world?.cast && st.world.cast[id]) || (st?.world?.contacts && st.world.contacts[id]) || null; },
  week(st) { return st?.week ?? 1; }, season(st) { return st?.season ?? 1; }, tier(st) { return st?.player?.tier ?? 1; },
  firm(st) { return CT.firm(st?.firm?.id) || { id: st?.firm?.id, name: '' }; },
  budget(st) { return st?.budget || { hours: 40, log: [] }; },
  hoursLeft(st) { return Math.max(0, Number(S.budget(st).hours) || 0); },
  stats(st) { return st?.stats || {}; },
  ceiling(st) { return has('tierCeiling') ? MMx().tierCeiling(st) : ([12, 15, 17, 19, 20][S.tier(st) - 1] || 20); },
  report(st) { return st?.report || (Array.isArray(st?.stats?.seasons) && st.stats.seasons.length ? st.stats.seasons[st.stats.seasons.length - 1] : null); },
  offers(st) { return S.inbox(st).filter(i => i.type === 'offer'); },
};
const HOURS = () => (MMx().HOURS) || { work: 8, learn: 4, network: 4, scout: 4, rest: 8 };
const ENERGY_PRICE = { work: -2, learn: -1, network: -1, scout: -1, rest: 15 };
const SKILL_IDS = { craft: ['risk', 'controls', 'testing', 'evidence', 'writing', 'reg', 'interview', 'client', 'present', 'prio'], process: ['framing', 'gather', 'judgment', 'premortem', 'escalation', 'memo'], partner: ['bd', 'positioning', 'datastory'] };
const PHASES = ['planning', 'fieldwork', 'findings', 'report', 'present', 'closed'];

/* Context for placeholders/gender tokens: the engine's ctx when present, else a local one. */
function ctxFor(st, engId) {
  if (st && has('ctxFor')) { try { return MMx().ctxFor(st, engId || null); } catch (e) { /* fall through */ } }
  const ctx = { gender: st?.player?.gender || 'm', genders: {}, params: { player: st?.player?.name || '', firm: S.firm(st).name || '' } };
  for (const p of CT.list('cast').concat(CT.list('stakeholders'))) { ctx.genders[p.id] = p.gender || 'm'; ctx.params[p.id] = p.name || ''; }
  const eng = S.eng(st, engId); const roles = { contact: eng && eng.contactId, manager: (eng && eng.managerId) || (CT.personByRole('manager') || {}).id, mentor: (CT.personByRole('mentor') || {}).id, regulator: (CT.personByRole('regulator') || {}).id, ia: eng && eng.iaId, rival: (CT.personByRole('rival') || {}).id };
  for (const r of Object.keys(roles)) { const p = roles[r] ? CT.person(roles[r]) : null; ctx.genders[r] = p ? p.gender || 'm' : 'm'; ctx.params[r] = p ? p.name : ''; }
  const cl = eng ? CT.client(eng.clientId) : null; ctx.params.client = cl ? cl.name : ''; ctx.params.week = st?.week; ctx.params.season = st?.season;
  return ctx;
}
function personName(id, ctx) { if (!id) return ''; if (id === 'system') return tp('inbox.system'); const c = ctx || curCtx(); if (c && c.params && c.params[id]) return c.params[id]; const p = CT.person(id) || CT.personByRole(id); return p ? p.name : id; }
function defaultState(opts) {
  const skills = {}; for (const id of SKILL_IDS.craft.concat(SKILL_IDS.process, SKILL_IDS.partner)) skills[id] = { mastery: 5, obs: 0, peak: 5, lastPracticed: 1, decayed: false };
  return { v: 1, season: 1, week: 1, player: { name: opts.name || '', gender: opts.gender || 'm', tier: 1, energy: 80, confidence: 55, rep: 20, integrity: 85, flags: {}, skills, ladder: {}, scout: 0, approach: { basis: 'risk', transparency: 'full', escalation: 'low' } }, firm: { id: opts.firmId || 'ofek', confidenceHistory: [], sponsorId: null, market: [] }, world: { cast: {}, contacts: {}, firmHistory: {} }, engagements: [], matches: [], inbox: [], queue: [], journal: [], stats: { ratings: [], awards: [], seasons: [], energyLog: [], skillsAtSeasonStart: {} }, cv: [], budget: { hours: 40, log: [] }, local: true };
}

/* ───────────────────────── 1. STRINGS & FORMATTING ─────────────────────────
   t(key, params, ctx) → escaped HTML with numbers/Latin wrapped in <bdi>; tp() → plain text (attributes, params);
   tx(raw, ctx, params) → a raw content string resolved (placeholders, gender tokens). Missing key → the key is shown. */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function bdiWrap(html) {
  if (!html || html.indexOf('<bdi') !== -1) return html;
  return html.split(/(<[^>]+>|&[#\w]+;)/g).map(part => (part[0] === '<' || part[0] === '&') ? part : part.replace(/(\d[\d.,:%\/−–-]*|[A-Za-z][A-Za-z0-9.\-]*)/g, '<bdi>$1</bdi>')).join('');
}
function localFill(str, params, ctx) {
  params = params || {}; ctx = ctx || { gender: 'm', genders: {}, params: {} };
  return String(str == null ? '' : str).replace(/\{([^{}]*)\}/g, (m, inner) => {
    const bar = inner.indexOf('|');
    if (bar >= 0) { let prefix = null, body = inner; const colon = inner.indexOf(':'); if (colon > 0 && colon < bar) { prefix = inner.slice(0, colon); body = inner.slice(colon + 1); } const alts = body.split('|'); const g = prefix ? (ctx.genders[prefix] || 'm') : (ctx.gender || 'm'); return g === 'f' ? (alts[1] != null ? alts[1] : alts[0]) : alts[0]; }
    const k = inner.trim(); if (params[k] != null) return String(params[k]); if (ctx.params && ctx.params[k] != null) return String(ctx.params[k]); return '';
  });
}
function fillRaw(str, params, ctx) { if (str == null) return ''; if (has('fill')) { try { return MMx().fill(str, params || {}, ctx); } catch (e) { /* fall through */ } } return localFill(str, params, ctx); }
function tp(key, params, ctx) { const tpl = CT.strings()[key]; if (tpl == null) return key; return fillRaw(tpl, params, ctx || curCtx()); }
function hasKey(key) { return CT.strings()[key] != null; }
function t(key, params, ctx) { if (!hasKey(key)) return '<span class="faint">' + esc(key) + '</span>'; return bdiWrap(esc(tp(key, params, ctx))); }
function tx(str, ctx, params) { return bdiWrap(esc(fillRaw(str, params, ctx || curCtx()))); }
function txp(str, ctx, params) { return fillRaw(str, params, ctx || curCtx()); }
function tm(m, ctx) { if (!m) return ''; if (typeof m === 'string') return tx(m, ctx); return m.key ? t(m.key, m.params, ctx) : ''; }
function n(v, d) { if (v == null || v === '' || (typeof v === 'number' && isNaN(v))) return '<bdi>–</bdi>'; const x = typeof v === 'number' ? (typeof d === 'number' ? v.toFixed(d) : String(Math.round(v))) : String(v); return '<bdi class="num">' + esc(x) + '</bdi>'; }
function signed(v) { const r = Math.round(v * 10) / 10; return (r > 0 ? '+' : '') + r; }
function pct(v) { return Math.max(0, Math.min(100, Number(v) || 0)); }
function band(m) { return has('band') ? MMx().band(m) : (m <= 7 ? 1 : m <= 13 ? 2 : m <= 17 ? 3 : 4); }
function colorBand(m) { return m <= 5 ? 1 : m <= 10 ? 2 : m <= 15 ? 3 : 4; }
function initials(name) { const w = String(name || '?').replace(/["'״׳]/g, '').split(/\s+/).filter(Boolean); return (w[0] ? w[0][0] : '?') + (w[1] ? w[1][0] : ''); }
function curCtx() { if (!ui.ctxCache || ui.ctxCache.engId !== ui.engId || ui.ctxCache.week !== (state && state.week)) ui.ctxCache = { engId: ui.engId, week: state && state.week, ctx: state ? ctxFor(state, ui.engId) : { gender: 'm', genders: {}, params: {} } }; return ui.ctxCache.ctx; }
function skillName(id) { return hasKey('skill.' + id) ? t('skill.' + id) : esc(id); }
function phaseLabel(st, eng, ph) { if (ph == null || ph === eng.phase) { if (has('phaseKey')) return t(MMx().phaseKey(st, eng)); ph = eng.phase; } const k = 'phase.' + eng.type + '.' + ph; return t(hasKey(k) ? k : 'phase.' + ph); }
function weekChip(st) { return t('ui.weekChip', { week: S.week(st), month: tp('month.' + (Math.min(12, Math.ceil(S.week(st) / 4)) || 1)), season: S.season(st) }); }
function tierTitle(st, tier) { return t('tier.' + (tier || S.tier(st)) + '.title'); }
function roleLabel(p) { if (!p) return ''; const g = p.gender === 'f' ? 'f' : 'm'; if (p.role && hasKey('role.' + p.role + '.' + g)) return t('role.' + p.role + '.' + g); if (p.role && hasKey('role.' + p.role)) return t('role.' + p.role); return p.role ? tx(p.role) : ''; }

/* ───────────────────────── 2. STORAGE (localStorage in try/catch; the engine gets this adapter) ───────────────────────── */
const storage = {
  getItem(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  setItem(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  removeItem(k) { try { window.localStorage.removeItem(k); return true; } catch (e) { return false; } },
};
const SLOT_KEY = (i) => 'mm.save.' + i;
function saveSlot(i, st) {
  if (!st) return false; st.savedAt = Date.now();
  let ok = false;
  if (has('save')) { const r = call('save', st, storage, i); ok = r === true; }
  if (!ok) { let text = ''; try { text = has('exportJSON') ? MMx().exportJSON(st) : JSON.stringify(st); } catch (e) { return false; } ok = storage.setItem(SLOT_KEY(i), text); }
  if (ok) storage.setItem('mm.slot', String(i));
  return ok;
}
function loadSlot(i) {
  if (has('load')) { const r = call('load', storage, i); if (r && r.ok && r.state) { showMessages(r.notes); return r.state; } if (r && r.player) return r; return null; }
  const raw = storage.getItem(SLOT_KEY(i)); if (!raw) return null;
  try { const s = JSON.parse(raw); return s && s.player ? s : null; } catch (e) { return null; }
}
function slotMeta(i) {
  if (has('slotSummary')) { const r = call('slotSummary', storage, i); return r && !r.threw ? r : null; }
  const raw = storage.getItem(SLOT_KEY(i)); if (!raw) return null;
  try { const s = JSON.parse(raw); return { name: s.player?.name, season: s.season, week: s.week, tier: s.player?.tier, firmId: s.firm?.id }; } catch (e) { return { corrupt: true }; }
}
function autosave() { if (state) saveSlot(ui.slot || 1, state); }

/* ───────────────────────── 3. UI STATE, ROUTING, RENDER ───────────────────────── */
let state = null;
const ui = { screen: 'open', slot: 1, sheet: null, toasts: [], engId: null, ctxCache: null, filters: { skill: '', domain: '' }, open: { name: '', gender: 'f', firmId: null }, sheetScroll: 0, exportMd: '', exportJson: '' };
const root = document.getElementById('app');
const TABS = [['dash', 'nav.board', '▦'], ['inbox', 'nav.inbox', '✉'], ['files', 'nav.cases', '▤'], ['journal', 'nav.journal', '✎'], ['more', 'nav.more', '⋯']];
const MORE = [['profile', 'nav.profile', '◉'], ['people', 'nav.people', '☺'], ['learn', 'nav.library', '✦'], ['calendar', 'nav.calendar', '▦'], ['firm', 'nav.firm', '⌂'], ['offers', 'nav.offers', '✉'], ['season', 'screen.season', '★'], ['cv', 'nav.cv', '▤'], ['settings', 'nav.settings', '⚙']];

function go(screen) { ui.screen = screen; render(); try { window.scrollTo(0, 0); } catch (e) { /* noop */ } }
function render() {
  if (!root) return;
  if (!state || ui.screen === 'open') { root.innerHTML = '<div class="content">' + safe(screenOpen) + '</div>' + toastsHTML(); renderSheet(); return; }
  const navId = MORE.some(m => m[0] === ui.screen) ? 'more' : ui.screen;
  const unread = S.unread(state);
  const navBtn = (id, key, ico) => '<button type="button" data-act="nav" data-screen="' + id + '"' + (navId === id || ui.screen === id ? ' aria-current="page"' : '') + '><span class="ico" aria-hidden="true">' + ico + '</span><span>' + t(key) + '</span>' + (id === 'inbox' && unread ? '<span class="badge">' + n(unread) + '</span>' : '') + '</button>';
  const side = '<nav class="sidenav" aria-label="' + esc(tp('app.title')) + '"><div class="brand">' + t('app.title') + '</div>' + TABS.filter(x => x[0] !== 'more').map(x => navBtn(x[0], x[1], x[2])).join('') + '<div class="sep"></div>' + MORE.map(x => navBtn(x[0], x[1], x[2])).join('') + '</nav>';
  const tabs = '<nav class="tabbar" aria-label="' + esc(tp('app.title')) + '">' + TABS.map(x => navBtn(x[0], x[1], x[2])).join('') + '</nav>';
  const screens = { dash: screenDash, inbox: screenInbox, files: screenFiles, journal: screenJournal, more: screenMore, profile: screenProfile, people: screenPeople, learn: screenLearn, calendar: screenCalendar, firm: screenFirm, offers: screenOffers, season: screenSeason, cv: screenCV, settings: screenSettings };
  root.innerHTML = '<div class="shell">' + side + '<div class="content">' + topbar(state) + safe(screens[ui.screen] || screenDash, state) + '</div></div>' + tabs + toastsHTML();
  renderSheet();
}
function safe(fn, arg) { try { return fn(arg); } catch (e) { console.warn('render failed', e); return '<div class="empty">' + t('ui.renderError') + '<div class="xs faint">' + esc(e && e.message) + '</div></div>'; } }
function topbar(st) { const e = st.player.energy ?? 0; return '<header class="topbar"><span class="week-chip">' + weekChip(st) + '</span><span class="grow"></span><span class="energy-mini"><span>' + t('board.energy') + '</span>' + barHTML(e, e < 30 ? 'danger' : 'ok') + n(e) + '</span></header>'; }
function toastsHTML() { return '<div class="toasts" aria-live="polite">' + ui.toasts.map(x => '<div class="toast">' + x.html + '</div>').join('') + '</div>'; }
function toast(key, params, ctx) { pushToast(t(key, params, ctx)); }
function pushToast(html) { if (!html) return; const o = { html }; ui.toasts.push(o); if (ui.toasts.length > 3) ui.toasts.shift(); refreshToasts(); setTimeout(() => { ui.toasts = ui.toasts.filter(x => x !== o); refreshToasts(); }, 2800); }
function refreshToasts() { const el = root && root.querySelector('.toasts'); if (el) el.outerHTML = toastsHTML(); }
const QUIET_NOTES = new Set(['eng.started', 'season.newPortfolio', 'scout.ahead', 'toast.followupDue', 'offers.window']);
function showMessages(list) { for (const m of (list || []).slice(0, 4)) if (m && m.key && !QUIET_NOTES.has(m.key) && hasKey(m.key)) pushToast(t(m.key, m.params, m.engId ? ctxFor(state, m.engId) : undefined)); }
function errToast(r) { const k = r && r.error && r.error.key; if (k && hasKey(k)) toast(k, r.error.params); else toast('ui.engineError'); }

/* Sheet (bottom sheet on phone, dialog on desktop). The body's scroll position survives re-renders unless resetScroll is set. */
function openSheet(sheet) { ui.sheet = sheet; ui.sheetScroll = 0; sheet.resetScroll = true; renderSheet(); }
function closeSheet() { const sh = ui.sheet; ui.sheet = null; renderSheet(); if (sh && sh.onClose) sh.onClose(); render(); }
function renderSheet() {
  let host = root.querySelector('.sheet-root');
  if (!ui.sheet) { if (host) host.remove(); return; }
  const prev = host && host.querySelector('.sheet-body'); if (prev) ui.sheetScroll = prev.scrollTop;
  if (!host) { host = document.createElement('div'); host.className = 'sheet-root'; root.appendChild(host); }
  let c; try { c = sheetContent(ui.sheet); } catch (e) { console.warn('sheet failed', e); c = { title: t('ui.renderError'), body: '<div class="empty">' + esc(e && e.message) + '</div>', footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.close') + '</button>' }; }
  host.innerHTML = '<div class="sheet-backdrop" data-act="' + (c.noClose ? 'noop' : 'sheet-close') + '"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(c.titleText || '') + '"><div class="sheet-h"><h2>' + (c.title || '') + '</h2>' + (c.noClose ? '' : '<button type="button" class="close" data-act="sheet-close" aria-label="' + esc(tp('ui.close')) + '">✕</button>') + '</div>' + (c.stepper || '') + '<div class="sheet-body">' + (c.body || '') + '</div>' + (c.footer ? '<div class="sheet-f">' + c.footer + '</div>' : '') + '</div>';
  const body = host.querySelector('.sheet-body'); if (body && !ui.sheet.resetScroll) body.scrollTop = ui.sheetScroll;
  ui.sheet.resetScroll = false;
  const curStep = host.querySelector('.stepper .step.cur'); const sp = curStep && curStep.parentElement;
  if (sp) { const sr = sp.getBoundingClientRect(), cr = curStep.getBoundingClientRect(); sp.scrollLeft += (cr.left + cr.width / 2) - (sr.left + sr.width / 2); }
}
function sheetContent(sh) {
  switch (sh.kind) {
    case 'room': return sheetRoom(sh); case 'match': return sheetMatch(sh); case 'item': return sheetItem(sh); case 'followup': return sheetFollowup(sh); case 'entry': return sheetEntry(sh);
    case 'confirm': return sheetConfirm(sh); case 'picker': return sheetPicker(sh); case 'lesson': return sheetLesson(sh); case 'builder': return sheetBuilder(sh); case 'drill': return sheetDrill(sh); case 'offer': return sheetOffer(sh);
    default: return { title: '', body: soon(), footer: closeBtn() };
  }
}
function closeBtn(primary) { return '<button type="button" class="btn' + (primary ? ' btn-primary' : '') + '" data-act="sheet-close">' + t('ui.close') + '</button>'; }
function confirmBox(html, onYes, danger) { openSheet({ kind: 'confirm', html, onYes, danger }); }
function sheetConfirm(sh) { return { title: t('ui.confirm'), body: '<div class="confirm-box"><p>' + sh.html + '</p></div>', footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.cancel') + '</button><button type="button" class="btn ' + (sh.danger ? 'btn-danger' : 'btn-primary') + '" data-act="confirm-yes">' + t('ui.confirm') + '</button>' }; }

/* ───────────────────────── 4. COMPONENTS ───────────────────────── */
function barHTML(v, cls, marks) { return '<span class="bar ' + (cls || '') + '" role="img" aria-label="' + Math.round(pct(v)) + '%"><i style="inline-size:' + pct(v) + '%"></i>' + (marks || '') + '</span>'; }
function gauge(labelKey, v, cls) { return '<div class="gauge"><div class="lbl"><span>' + t(labelKey) + '</span><span class="gauge-n">' + n(v) + '</span></div>' + barHTML(v, 'thin ' + (cls || '')) + '</div>'; }
function pill(html, cls) { return '<span class="pill ' + (cls || '') + '">' + html + '</span>'; }
function avatar(name, cls) { return '<span class="avatar ' + (cls || '') + '" aria-hidden="true">' + esc(initials(name)) + '</span>'; }
function integrityWord(v) { return t(has('integrityKey') ? MMx().integrityKey(v) : (v >= 80 ? 'integrity.1' : v >= 50 ? 'integrity.2' : v >= 20 ? 'integrity.3' : 'integrity.4')); }
function attrRow(st, id, locked) {
  const sk = S.skill(st, id); const m = Number(sk.mastery) || 1; const b = colorBand(m);
  const start = S.stats(st).skillsAtSeasonStart && S.stats(st).skillsAtSeasonStart[id]; const diff = start != null ? m - start : 0;
  const arrow = sk.decayed ? '<span class="arrow down">▼</span>' : diff > 0.05 ? '<span class="arrow up">▲</span>' : diff < -0.05 ? '<span class="arrow down">▼</span>' : '<span class="arrow flat">·</span>';
  const note = has('skillNote') ? MMx().skillNote(st, id) : null;
  const ceil = S.ceiling(st);
  return '<div class="attr-row' + (locked ? ' locked' : '') + '"><span class="name">' + skillName(id) + (note ? pill(t(note.key, note.params), 'pill-danger') : '') + '</span>' + barHTML(m / 20 * 100, 'b' + b, '<span class="mark" style="inset-inline-start:' + (ceil / 20 * 100) + '%"></span>') + '<span class="chip-num b' + b + '" title="' + esc(tp('profile.obs', { n: sk.obs ?? 0 })) + '">' + n(m, 1) + '</span>' + arrow + '</div>';
}
function deltaPills(applied, ctx) {
  if (!applied) return '';
  const out = []; const push = (k, v) => { if (typeof v === 'number' && Math.abs(v) >= 0.05) out.push('<span class="delta ' + (v > 0 ? 'pos' : 'neg') + '">' + t('journal.applied.' + k, { n: signed(v) }) + '</span>'); };
  push('confidence', applied.confidence); push('rep', applied.rep); push('engQuality', applied.engQuality); push('integrity', applied.integrity);
  for (const id of Object.keys(applied.trust || {})) { const v = applied.trust[id]; if (Math.abs(v) >= 0.05) out.push('<span class="delta ' + (v > 0 ? 'pos' : 'neg') + '">' + t('journal.applied.trust', { name: personName(id, ctx), n: signed(v) }) + '</span>'); }
  return out.length ? '<div class="deltas">' + out.join('') + '</div>' : '';
}
function ratingPill(scaleId, ratingId) { const pills = CT.scalePills(scaleId); const i = pills.findIndex(p => p.id === ratingId); const p = pills[i]; const cls = i < 0 ? '' : i >= pills.length - 1 ? 'pill-danger' : i === 0 ? 'pill-ok' : 'pill-gold'; return pill(p ? esc(p.label) : esc(ratingId || ''), cls); }
function lineBadge(eng) { return (eng && eng.line ? pill(t('eng.line.' + eng.line), eng.line === 3 ? 'pill-navy' : 'pill-outline') : '') + (eng && eng.short ? pill(t('eng.short'), 'pill-outline') : ''); }
function engTitle(eng) { const c = eng ? CT.client(eng.clientId) : null; return esc(c ? c.name : (eng && eng.clientId) || ''); }
function engTypeLabel(eng) { return t('engType.' + (eng.type || 'audit')); }
function empty(key) { return '<div class="empty">' + t(key) + '</div>'; }
function soon() { return '<div class="soon">' + t('ui.soon') + '</div>'; }
function findingRow(f, eng, ctx) { return '<div class="finding">' + ratingPill(f.scale || CT.scaleFor(eng), f.rating) + '<span>' + tx(f.title || f.text || f.id || '', ctx) + (f.week ? ' <span class="xs faint">' + t('ui.week', { n: f.week }) + '</span>' : '') + '</span></div>'; }

/* ───────────────────────── 5. SCREENS ───────────────────────── */
function screenOpen() {
  const firms = CT.list('firms'); const o = ui.open;
  if (!o.firmId) { const rec = firms.find(f => f.recommendedStart) || firms.find(f => f.id === 'ofek') || firms[0]; o.firmId = rec ? rec.id : null; }
  const cards = firms.length ? firms.map(f => '<button type="button" class="firm-card' + (o.firmId === f.id ? ' sel' : '') + '" data-act="open-firm" data-id="' + esc(f.id) + '" aria-pressed="' + (o.firmId === f.id) + '">' + (f.recommendedStart || (f.id === 'ofek' && !firms.some(x => x.recommendedStart)) ? '<span class="rec">' + pill(t('newgame.recommended'), 'pill-gold') + '</span>' : '') + '<h3>' + esc(f.name) + '</h3><div class="row small muted">' + pill(t('newgame.firmPrestige', { n: f.prestige })) + pill(t('newgame.firmPay', { n: f.pay })) + '</div><p class="phil">' + tx(f.philosophy) + '</p>' + (f.culture ? '<p class="xs gold-ink">' + tx(f.culture) + '</p>' : '') + '</button>').join('') : empty('ui.none');
  const slots = [1, 2, 3].map(i => { const m = slotMeta(i); const firm = m && (CT.firm(m.firmId || m.firm) || {}).name; return '<div class="slot">' + avatar(m && m.name ? m.name : String(i), m ? '' : 'muted') + '<div class="grow">' + (m ? '<div>' + t('newgame.slot.summary', { name: m.name || '', firm: firm || '', season: m.season, week: m.week }) + '</div><div class="small muted">' + tierTitle(null, m.tier || 1) + (m.ended ? ' · ' + t(m.ended.key || 'ending.title') : '') + '</div>' : '<span class="muted">' + t('newgame.slot.label', { n: i }) + ' · ' + t('newgame.slot.empty') + '</span>') + '</div>' + (m ? '<button type="button" class="btn btn-sm btn-navy" data-act="open-load" data-slot="' + i + '">' + t('newgame.slot.load') + '</button><button type="button" class="btn btn-sm btn-ghost" data-act="open-delete" data-slot="' + i + '">' + t('newgame.slot.delete') + '</button>' : '') + '</div>'; }).join('');
  return '<section data-screen="open"><div class="open-hero"><h1 class="title">' + t('app.title') + '</h1><div class="tag">' + t('app.tagline') + '</div></div>' +
    '<div class="card"><h2 class="mb">' + t('newgame.title') + '</h2><div class="field"><label for="pname">' + t('newgame.name') + '</label><input id="pname" type="text" data-act="open-name" value="' + esc(o.name) + '" placeholder="' + esc(tp('newgame.namePlaceholder')) + '" autocomplete="name" maxlength="40"></div>' +
    '<div class="field"><span class="muted small">' + t('newgame.gender') + '</span><div class="seg" role="group"><button type="button" data-act="open-gender" data-g="f" aria-pressed="' + (o.gender === 'f') + '">' + t('newgame.gender.f') + '</button><button type="button" data-act="open-gender" data-g="m" aria-pressed="' + (o.gender === 'm') + '">' + t('newgame.gender.m') + '</button></div><span class="xs faint">' + t('newgame.grammarNote') + '</span></div>' +
    '<h3 class="mb mt">' + t('newgame.pickFirm') + '</h3><div class="grid-cards">' + cards + '</div><div class="btns end mt"><button type="button" class="btn btn-primary" data-act="open-start">' + t('newgame.start') + '</button></div>' + (has('newGame') ? '' : '<p class="soon mt">' + t('ui.soon') + '</p>') + '</div>' +
    '<div class="section-title"><h2>' + t('newgame.slots') + '</h2></div><div class="stack">' + slots + '</div></section>';
}

function screenDash(st) {
  const p = st.player; const b = S.budget(st); const left = S.hoursLeft(st); const used = 40 - left; const H = HOURS();
  const chips = Object.keys(H).map(k => '<button type="button" class="chip" data-act="block-add" data-kind="' + k + '"' + (left < H[k] ? ' disabled' : '') + '>' + t('budget.' + k) + ' <span class="cost">' + t('budget.chipHours', { n: H[k] }) + ' · ' + t('budget.energyPrice', { n: ENERGY_PRICE[k] }) + '</span></button>').join('');
  const log = Array.isArray(b.log) ? b.log : [];
  const logList = log.length ? '<div class="plan-list">' + log.map(x => { const eng = S.eng(st, x.target); const who = !eng && x.target ? (hasKey('skill.' + x.target) ? skillName(x.target) : esc(personName(x.target))) : (eng ? engTitle(eng) : ''); return '<div class="plan-item"><span class="grow">' + t('budget.' + x.kind) + (who ? ' · ' + who : '') + '</span><span class="xs faint">' + t('budget.chipHours', { n: x.hours }) + '</span></div>'; }).join('') + '</div>' : '<div class="xs faint">' + t('budget.unspent') + '</div>';
  const engs = S.active(st);
  const notices = [];
  if (p.energy < 30) notices.push('<div class="notice notice-danger">' + t('toast.energyLow') + '</div>');
  const matchItem = S.inbox(st).find(i => i.type === 'moment'); if (matchItem) { const m = S.match(st, matchItem.matchId); const e = m && S.eng(st, m.engId); notices.push('<div class="notice">' + t('board.matchThisWeek', { type: m ? CT.matchTypeLabel(m.type, e && e.type) : '', client: e ? (CT.client(e.clientId) || {}).name : '' }) + ' · ' + t('inbox.matchUnplayed') + '</div>'); }
  if ([12, 24, 36, 48].includes(S.week(st))) notices.push('<div class="notice">' + t(S.week(st) === 48 ? 'board.seasonEnd' : 'board.quarterClose') + '</div>');
  if (has('gateAvailable') && MMx().gateAvailable(st)) { const d = CT.list('deliverables').find(x => (x.kind || 'gate') === 'gate' && x.tier === S.tier(st)); notices.push('<div class="notice notice-ok"><div class="row between"><span>' + t('board.gateOpen') + ' · ' + t('deliverable.window') + '</span>' + (d ? '<button type="button" class="btn btn-sm btn-primary" data-act="builder-open" data-id="' + esc(d.id) + '">' + t('deliverable.title') + '</button>' : '') + '</div></div>'); }
  if (st.ended) notices.push('<div class="notice notice-danger"><b>' + t(st.ended.key) + '</b>' + (hasKey(st.ended.key + '.body') ? '<div class="small">' + t(st.ended.key + '.body') + '</div>' : '') + '</div>');
  const unread = S.unread(st);
  return '<section data-screen="dash"><div class="card-h"><h1 class="screen-title">' + t('board.title') + '</h1>' + pill(tierTitle(st), 'pill-navy') + pill(esc(S.firm(st).name || ''), 'pill-outline') + '</div>' + (notices.length ? '<div class="stack mb">' + notices.join('') + '</div>' : '') +
    '<div class="grid-2"><div class="card"><div class="gauges">' + gauge('board.energy', p.energy, p.energy < 30 ? 'danger' : 'ok') + gauge('board.confidence', p.confidence, p.confidence < 40 ? 'danger' : '') + gauge('board.rep', p.rep, 'gold') + '<div class="gauge"><div class="lbl"><span>' + t('profile.integrity') + '</span><span class="gauge-n">' + integrityWord(p.integrity) + '</span></div></div></div>' + (p.scout ? '<p class="xs muted mt">' + t('budget.scoutPoints', { n: Math.min(2, p.scout) }) + '</p>' : '') + '</div>' +
    '<div class="card"><div class="card-h"><h2>' + t('budget.title') + '</h2><span class="muted small">' + t('budget.left', { n: left }) + '</span></div>' + barHTML(used / 40 * 100, 'gold') + '<div class="xs faint mt">' + t('budget.hours', { used, total: 40 }) + '</div><div class="budget mt"><div class="budget-chips">' + chips + '</div>' + logList + '</div></div></div>' +
    '<div class="section-title"><h2>' + t('board.engagements') + '</h2><button type="button" class="btn btn-sm btn-ghost" data-act="nav" data-screen="files">' + t('ui.all') + '</button></div>' + (engs.length ? '<div class="grid-2">' + engs.map(e => engCard(st, e, true)).join('') + '</div>' : empty('eng.empty')) +
    '<div class="section-title"><h2>' + t('nav.inbox') + '</h2>' + (unread ? pill(t('board.inboxUnread', { n: unread }), 'pill-gold') : '') + '<button type="button" class="btn btn-sm btn-ghost" data-act="nav" data-screen="inbox">' + t('ui.all') + '</button></div>' + inboxList(st, S.inbox(st).filter(i => !i.read).slice(0, 4)) +
    '<div class="sticky-end"><button type="button" class="btn btn-primary" data-act="end-week"' + (st.ended ? ' disabled' : '') + '>' + t('ui.endWeek') + '</button></div></section>';
}
function engCard(st, e, compact) {
  const need = (e.phaseWork && e.phaseWork[e.phase]) || 1; const wk = S.week(st);
  const overdue = has('isOverdue') ? MMx().isOverdue(st, e) : (e.status === 'active' && wk > e.deadline && e.phase !== 'closed');
  const dl = e.phase === 'closed' ? t('eng.closed', { n: Math.round(e.quality || 0) }) : e.status === 'pending' ? t('eng.started', { n: e.startWeek }) : overdue ? t('eng.overdue', { n: wk - e.deadline }) : (e.deadline === wk ? t('eng.deadline.thisWeek') : t('eng.deadline.left', { n: e.deadline - wk }));
  const pi = PHASES.indexOf(e.phase); const client = CT.client(e.clientId);
  const track = '<div class="phase-track">' + PHASES.map((ph, i) => '<span class="' + (i < pi ? 'done' : i === pi ? 'cur' : '') + '"></span>').join('') + '</div><div class="phase-labels">' + PHASES.map((ph, i) => '<span class="' + (i === pi ? 'cur' : '') + '">' + phaseLabel(st, e, ph) + '</span>').join('') + '</div>';
  return '<div class="eng-card"><div class="card-h"><h3>' + engTitle(e) + '</h3>' + pill(engTypeLabel(e), 'pill-navy') + lineBadge(e) + (e.selfReview ? pill(t('independence.flag'), 'pill-danger') : '') + '</div>' +
    '<div class="row small muted">' + pill(phaseLabel(st, e), 'pill-gold') + (e.phase !== 'closed' ? '<span>' + t('eng.work', { work: e.work ?? 0, total: need }) + '</span>' : '') + (e.matchDue ? pill(t('eng.matchPending', { type: CT.matchTypeLabel(e.matchType, e.type) }), 'pill-gold') : '') + '</div>' + track +
    '<div class="row between mt"><span class="dl' + (overdue ? ' over' : '') + '">' + dl + '</span><span class="row small"><span class="muted">' + t('eng.quality', { n: Math.round(e.quality || 0) }) + '</span>' + barHTML(e.quality, (e.quality || 0) >= 60 ? 'ok' : (e.quality || 0) < 40 ? 'danger' : '') + '</span></div>' +
    (compact ? '' : engDetail(st, e, client)) + '</div>';
}
function engDetail(st, e, client) {
  const ctx = ctxFor(st, e.id);
  const findings = (e.findings || []).length ? e.findings.map(f => findingRow(f, e, ctx)).join('') : '<div class="xs faint mt">' + t('eng.findings.none') + '</div>';
  const people = [e.contactId, e.iaId, e.managerId].filter((v, i, a) => v && a.indexOf(v) === i).map(id => { const p = CT.person(id); const tr = S.trust(st, id); return '<div class="contact-row">' + avatar(p ? p.name : id, 'sm') + '<span class="grow">' + esc(p ? p.name : id) + (p ? ' <span class="xs muted">' + roleLabel(p) + '</span>' : '') + '</span><span class="xs muted">' + t('people.trust', { n: tr ?? '–' }) + '</span>' + barHTML(tr ?? 0, 'thin ' + ((tr ?? 0) >= 60 ? 'ok' : (tr ?? 0) < 30 ? 'danger' : '')) + '</div>'; }).join('');
  const regs = client && client.regulator ? [].concat(client.regulator) : [];
  return '<hr class="divider"><dl class="kv">' + (e.process ? '<dt>' + t('eng.process', { process: (client && (client.processes || []).find(x => x.id === e.process) || {}).name || e.process }) + '</dt><dd></dd>' : '') + (regs.length ? '<dt>' + t('eng.regulator') + '</dt><dd>' + regs.map(r => pill(bdiWrap(esc(r)), 'pill-outline')).join(' ') + '</dd>' : '') + '<dt>' + t('eng.line.' + e.line) + '</dt><dd class="small muted">' + t('eng.line.' + e.line + '.long') + '</dd></dl>' +
    '<h4 class="small muted mt">' + t('eng.findings') + '</h4>' + findings + '<h4 class="small muted mt">' + t('eng.contacts') + '</h4>' + (people || '<div class="xs faint">' + t('ui.none') + '</div>') +
    (e.status === 'active' && e.phase !== 'closed' ? '<div class="btns mt"><button type="button" class="btn btn-sm" data-act="block-add" data-kind="work" data-eng="' + esc(e.id) + '"' + (S.hoursLeft(st) < HOURS().work ? ' disabled' : '') + '>' + t('budget.work') + ' <span class="xs faint">' + t('budget.chipHours', { n: HOURS().work }) + '</span></button></div>' : '');
}

/* Inbox */
function itemInfo(st, item) {
  const type = item.type || 'news'; const ctx = ctxFor(st, item.engId); let subject = ''; let senderId = item.sender || null; let danger = false;
  const sc = item.scenarioId ? CT.scenario(item.scenarioId) : null;
  if (item.key && hasKey(item.key) && type === 'news') subject = tp(item.key, item.params || {}, ctx);
  else if (type === 'decision') subject = sc ? txp(sc.title, ctx) : (item.scenarioId || '');
  else if (type === 'moment') { const m = S.match(st, item.matchId); const e = m && S.eng(st, m.engId); subject = CT.matchTypeLabel(m ? m.type : item.matchType, e && e.type) + (e ? ' · ' + ((CT.client(e.clientId) || {}).name || '') : ''); }
  else if (type === 'consequence') { const e = S.entry(st, item.journalId); subject = item.text ? txp(item.text, ctx) : item.key && hasKey(item.key) ? tp(item.key, item.params || {}, ctx) : tp('consequence.landed', { week: e ? e.week : '', title: e ? txp(e.title, ctx) : '' }, ctx); danger = true; }
  else if (type === 'followup') { const e = S.entry(st, item.journalId); subject = tp('followup.title') + (e ? ' · ' + txp(e.title, ctx) : ''); }
  else if (type === 'offer') { const f = CT.firm(item.firmId); subject = tp('offers.role', { title: tp('tier.' + S.tier(st) + '.title'), firm: f ? f.name : item.firmId || '' }); }
  else subject = sc ? txp(sc.title, ctx) : item.title ? txp(item.title, ctx) : tp('inbox.type.' + type);
  if (sc && sc.sender && !senderId) senderId = sc.sender;
  if (!senderId && (type === 'decision' || type === 'moment')) { const e = S.eng(st, item.engId); senderId = e ? (e.contactId || e.managerId) : null; }
  if (senderId && !CT.person(senderId)) { const byRole = CT.personByRole(senderId); if (byRole) senderId = byRole.id; else if (senderId !== 'system') senderId = (ctx.params && ctx.params[senderId]) ? senderId : 'system'; }
  const name = senderId && senderId !== 'system' ? personName(senderId, ctx) : tp('inbox.system');
  subject = subject.length > 110 ? subject.slice(0, 108) + '…' : subject;
  return { type, subject, name, danger, repeat: !!(item.repeat || item.variantOf), card: !!item.card, scouted: !!item.scouted };
}
function inboxRow(st, item) {
  const info = itemInfo(st, item); const typeKey = 'inbox.type.' + (info.type === 'news' && (CT.scenario(item.scenarioId) || {}).type === 'circular' ? 'regulation' : info.type);
  const cls = { decision: 'pill-navy', moment: 'pill-gold', consequence: 'pill-danger', followup: 'pill-ok', offer: 'pill-gold' }[info.type] || '';
  return '<button type="button" class="inbox-row' + (item.read ? '' : ' unread') + '" data-act="item-open" data-id="' + esc(item.id) + '">' + avatar(info.name, info.danger ? 'muted' : info.type === 'moment' ? 'gold' : '') + '<span class="subj"><span>' + bdiWrap(esc(info.subject)) + '</span><span class="meta">' + pill(t(hasKey(typeKey) ? typeKey : 'inbox.type.news'), cls) + (info.repeat ? pill(t('repeat.label'), 'pill-outline') : '') + (info.scouted ? pill(t('calendar.now'), 'pill-ok') : '') + '<span>' + esc(info.name) + '</span></span></span><span class="row"><span class="wk">' + t('ui.week', { n: item.week ?? S.week(st) }) + '</span><span class="dot' + (item.read ? ' off' : '') + '"></span></span></button>';
}
function inboxList(st, items) { return items.length ? '<div class="inbox-list">' + items.map(i => inboxRow(st, i)).join('') + '</div>' : empty('empty.inbox'); }
function screenInbox(st) {
  const items = S.inbox(st).slice().sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
  const cards = items.filter(i => i.card).map(i => '<div class="notice">' + t(i.key, i.params) + '</div>');
  return '<section data-screen="inbox"><div class="card-h"><h1 class="screen-title">' + t('screen.inbox') + '</h1>' + (S.unread(st) ? pill(t('board.inboxUnread', { n: S.unread(st) }), 'pill-gold') : '') + '</div>' + (cards.length ? '<div class="stack mb">' + cards.join('') + '</div>' : '') + inboxList(st, items.filter(i => !i.card)) + '</section>';
}

function screenFiles(st) {
  const groups = [['board.engagements', S.active(st)], ['eng.started', S.pending(st)], ['phase.closed', S.closed(st)]];
  return '<section data-screen="files"><h1 class="screen-title mb">' + t('screen.cases') + '</h1>' + groups.map(([k, list], gi) => '<div class="section-title"><h2>' + (k === 'eng.started' ? t('calendar.title') : t(k)) + '</h2><span class="muted small">' + n(list.length) + '</span></div>' + (list.length ? '<div class="stack">' + list.map(e => '<details class="acc eng-card"' + (gi === 0 ? ' open' : '') + '><summary><b>' + engTitle(e) + '</b>' + pill(engTypeLabel(e), 'pill-navy') + lineBadge(e) + pill(phaseLabel(st, e), 'pill-gold') + '</summary>' + engCard(st, e, false) + '</details>').join('') + '</div>' : empty('empty.engagements'))).join('') + '</section>';
}
function screenMore(st) { return '<section data-screen="more"><h1 class="screen-title mb">' + t('nav.more') + '</h1><div class="more-grid">' + MORE.map(m => '<button type="button" class="btn" data-act="nav" data-screen="' + m[0] + '"><span class="ico" aria-hidden="true">' + m[2] + '</span>' + t(m[1]) + '</button>').join('') + '</div></section>'; }

function screenProfile(st) {
  const p = st.player; const tier = S.tier(st);
  const avg = (ids) => ids.reduce((a, id) => a + (Number(S.skill(st, id).mastery) || 1), 0) / ids.length;
  const group = (key, ids, locked) => '<div class="card attr-group' + (locked ? ' locked' : '') + '"><div class="card-h"><h2>' + t(key) + '</h2>' + pill(t('profile.band') + ': ' + t('band.' + band(avg(ids))), 'pill-outline') + (locked ? pill(t('profile.group.partnerLocked'), 'pill-danger') : '') + '</div>' + ids.map(id => attrRow(st, id, locked)).join('') + '</div>';
  return '<section data-screen="profile"><div class="card-h"><h1 class="screen-title">' + t('profile.title') + '</h1>' + pill(tierTitle(st), 'pill-navy') + '</div>' +
    '<div class="card mb"><div class="row between"><span><b>' + esc(p.name || '') + '</b> · ' + tierTitle(st) + ' · ' + esc(S.firm(st).name || '') + '</span><span class="small muted">' + t('profile.ceiling', { n: S.ceiling(st) }) + '</span></div><div class="gauges mt">' + gauge('profile.energy', p.energy) + gauge('profile.confidence', p.confidence) + gauge('profile.rep', p.rep, 'gold') + '<div class="gauge"><div class="lbl"><span>' + t('profile.integrity') + '</span><span class="gauge-n">' + integrityWord(p.integrity) + '</span></div></div></div></div>' +
    group('profile.group.craft', SKILL_IDS.craft, false) + group('profile.group.process', SKILL_IDS.process, false) + group('profile.group.partner', SKILL_IDS.partner, tier < 5) + '</section>';
}

function screenPeople(st) {
  const groups = []; const put = (key, label, p) => { let g = groups.find(x => x.key === key); if (!g) { g = { key, label, people: [] }; groups.push(g); } g.people.push(p); };
  const firmName = S.firm(st).name || tp('people.org.firm');
  for (const c of CT.list('cast')) { if (c.role === 'regulator') put('reg', tp('people.org.regulators'), c); else if (c.firmId || ['mentor', 'manager', 'rival', 'junior', 'partner'].includes(c.role)) put('firm:' + (c.firmId || 'x'), c.firmId === S.firm(st).id || !c.firmId ? firmName : ((CT.firm(c.firmId) || {}).name || c.firmId), c); else if (c.clientId) { const cl = CT.client(c.clientId); put('c:' + c.clientId, cl ? cl.name : c.clientId, c); } else put('other', tp('people.org.clients'), c); }
  for (const c of CT.list('stakeholders')) { const cl = CT.client(c.clientId); put('c:' + (c.clientId || 'x'), cl ? cl.name : tp('people.org.clients'), c); }
  const icon = { blunt: '◆', political: '◇', supportive: '♥', absent: '○', charming: '✧' };
  const card = (p) => { const tr = S.trust(st, p.id); const rec = S.personRec(st, p.id); const mem = rec && rec.memory ? Object.keys(rec.memory) : []; const un = has('trustUnlocks') ? MMx().trustUnlocks(st, p.id) : null; const left = st.player.flags && st.player.flags[p.id + '.left'];
    const unlocks = un ? [un.contactBonus && 'people.unlock.contact', un.iaPlan && 'people.unlock.clientIA', un.sponsor && 'people.unlock.sponsor', un.mentorNote && 'people.unlock.mentor', un.hostile && 'people.hostile'].filter(Boolean) : [];
    return '<div class="card"><div class="person">' + avatar(p.name, (tr ?? 0) >= 60 ? 'gold' : (tr ?? 50) < 30 ? 'muted' : '') + '<div class="grow"><div class="row"><b>' + esc(p.name) + '</b>' + (p.role ? pill(roleLabel(p), 'pill-outline') : '') + (p.temper ? '<span class="temper">' + (icon[p.temper] || '') + ' ' + t('temper.' + p.temper) + '</span>' : '') + (left ? pill(t('people.left'), 'pill-danger') : '') + '</div>' + (p.title ? '<div class="small muted">' + tx(p.title) + '</div>' : '') +
      '<div class="row mt"><span class="xs muted">' + t('people.trust', { n: tr ?? '–' }) + '</span>' + barHTML(tr ?? 0, 'thin ' + ((tr ?? 0) >= 60 ? 'ok' : (tr ?? 0) < 30 ? 'danger' : '')) + '</div>' + (unlocks.length ? '<div class="pills mt">' + unlocks.map(k => pill(t(k), k === 'people.hostile' ? 'pill-danger' : 'pill-ok')).join('') + '</div>' : '') +
      (mem.length ? mem.map(k => '<div class="memory-line">' + t('people.memoryLine', { text: hasKey('memory.' + p.id + '.' + k) ? tp('memory.' + p.id + '.' + k) : k.replace(/_/g, ' '), season: rec.memory[k] }) + '</div>').join('') : '<div class="xs faint mt">' + t('people.memory.none') + '</div>') + '</div></div></div>'; };
  return '<section data-screen="people"><h1 class="screen-title mb">' + t('people.title') + '</h1>' + (groups.length ? groups.map(g => '<div class="section-title"><h2>' + esc(g.label) + '</h2></div><div class="grid-cards">' + g.people.map(card).join('') + '</div>').join('') : empty('empty.people')) + '</section>';
}

/* Journal */
function entryTitle(st, e) { return txp(e.title || (CT.scenario(e.scenarioId) || {}).title || e.scenarioId || '', ctxFor(st, e.engId)); }
function jRow(st, e) {
  return '<button type="button" class="j-row" data-act="entry-open" data-id="' + esc(e.id) + '"><span class="t"><span>' + bdiWrap(esc(entryTitle(st, e))) + '</span><span class="m">' + pill(t('ui.week', { n: e.week })) + (e.kind ? pill(t('journal.kind.' + e.kind), e.kind === 'moment' ? 'pill-gold' : 'pill-navy') : '') + (e.domain && hasKey('domain.' + e.domain) ? pill(t('domain.' + e.domain), 'pill-outline') : '') + (e.calibration && e.calibration !== 'right' ? pill(t('journal.calibration.' + e.calibration), 'pill-danger') : '') + '</span></span>' +
    '<span class="j-bars"><span class="lab"><span>' + t('journal.P') + '</span><b>' + n(e.P) + '</b></span>' + barHTML(e.P ?? 0) + '<span class="lab"><span>' + t('journal.O') + '</span><b>' + n(e.O, 1) + '</b></span>' + barHTML((e.O ?? 0) * 10, 'gold') + '</span></button>';
}
function screenJournal(st) {
  const all = S.journal(st); const f = ui.filters; const skillsIn = new Set(); const domains = new Set();
  for (const e of all) { if (e.domain) domains.add(e.domain); for (const s of Object.keys(e.skills || {})) skillsIn.add(s); }
  const list = all.filter(e => (!f.skill || (e.skills && e.skills[f.skill] != null)) && (!f.domain || e.domain === f.domain)).slice().reverse();
  const sel = (name, opts, cur, lab) => '<select data-act="filter" data-f="' + name + '" aria-label="' + esc(tp(lab)) + '"><option value="">' + t(lab) + ' · ' + t('ui.all') + '</option>' + opts.map(o => '<option value="' + esc(o) + '"' + (o === cur ? ' selected' : '') + '>' + (name === 'skill' ? skillName(o) : (hasKey('domain.' + o) ? t('domain.' + o) : esc(o))) + '</option>').join('') + '</select>';
  const pats = has('patterns') ? call('patterns', st) : null; const main = all.filter(e => e.kind !== 'moment');
  const patHTML = !Array.isArray(pats) ? soon() : pats.length ? pats.map(p => '<div class="pattern">' + t(p.key || 'pattern.' + p.id, p.params) + '</div>').join('') : '<div class="xs faint">' + t(main.length < 4 ? 'journal.patterns.empty' : 'journal.patterns.none') + '</div>';
  const met = has('metrics') ? call('metrics', st) : null;
  const metHTML = met && !met.threw && met.n ? '<dl class="kv small mt">' + [['journal.metric.processMean', n(met.processMean)], ['journal.metric.trend', n(signed(met.trend))], ['journal.metric.infoRate', met.infoRate != null ? n(met.infoRate) + '%' : '–'], ['journal.metric.noiseRate', met.noiseRate != null ? n(met.noiseRate) + '%' : '–'], ['journal.metric.calibration', n(met.calibration.right) + ' · ' + t('journal.calibration.early') + ' ' + n(met.calibration.early) + ' · ' + t('journal.calibration.late') + ' ' + n(met.calibration.late)], ['journal.metric.premortemHit', met.premortemHit != null ? n(met.premortemHit) + '%' : '–'], ['journal.metric.followupDone', met.followupDone != null ? n(met.followupDone) + '%' : '–'], ['journal.divergence.goodBad', n(met.goodProcessBadOutcome)], ['journal.divergence.badGood', n(met.badProcessGoodOutcome)]].map(([k, v]) => '<dt>' + t(k) + '</dt><dd>' + v + '</dd>').join('') + '</dl>' : '';
  const notes = S.inbox(st).filter(i => i.key === 'mentor.note' || i.key === 'quarter.talk'); const lastNote = notes.length ? notes[notes.length - 1] : null;
  return '<section data-screen="journal"><div class="card-h"><h1 class="screen-title">' + t('journal.title') + '</h1>' + (met && met.n ? pill(t('journal.metric.processMean') + ' ' + n(met.processMean), 'pill-navy') : '') + '</div>' +
    '<div class="grid-2"><div><h2 class="mb">' + t('journal.timeline') + '</h2><div class="filters">' + sel('skill', [...skillsIn], f.skill, 'journal.filter.skill') + sel('domain', [...domains], f.domain, 'journal.filter.domain') + '</div>' + (list.length ? '<div class="j-list">' + list.map(e => jRow(st, e)).join('') + '</div>' : empty('journal.empty')) + '</div>' +
    '<div class="stack"><div class="card"><h2 class="mb">' + t('journal.patterns') + '</h2>' + patHTML + metHTML + '</div>' +
    '<div class="card"><h2 class="mb">' + t('journal.coach') + '</h2>' + (lastNote ? '<div class="mentor-note">' + t(lastNote.key, lastNote.params, ctxFor(st, lastNote.engId)) + '</div>' : '<div class="xs faint">' + t('journal.coach.empty') + '</div>') + '</div>' +
    '<div class="card"><div class="card-h"><h2>' + t('journal.export') + '</h2><button type="button" class="btn btn-sm" data-act="journal-export">' + t('journal.export.md') + '</button></div><p class="xs faint">' + t('journal.export.hint') + '</p><textarea class="mono" dir="auto" readonly aria-label="' + esc(tp('journal.export')) + '" data-role="export-md">' + esc(ui.exportMd || '') + '</textarea></div></div></div></section>';
}
function journalMarkdown(st) {
  if (has('exportJournal')) { const r = call('exportJournal', st); if (typeof r === 'string') return r; }
  return S.journal(st).map(e => '## ' + tp('ui.week', { n: e.week }) + ' · ' + entryTitle(st, e) + '\n- ' + tp('journal.export.decided') + ': ' + (e.option ? txp(e.option.label, ctxFor(st, e.engId)) : '') + ' (P ' + e.P + ' · O ' + e.O + ')\n').join('\n');
}
function feedbackHTML(fb, ctx) {
  if (!fb) return ''; const part = (k, cls) => { const v = fb[k] ? tx(fb[k], ctx) : (fb[k + 'Key'] ? t(fb[k + 'Key'], {}, ctx) : ''); return v ? '<div class="fb ' + (cls || '') + '"><b>' + t('room.feedback.' + k) + '</b>' + v + '</div>' : ''; };
  return '<div class="feedback">' + part('why') + part('expert') + part('bias') + part('rule', 'rule') + '</div>';
}
function sheetEntry(sh) {
  const e = S.entry(state, sh.id); if (!e) return { title: '', body: empty('journal.empty'), footer: closeBtn() };
  const sc = CT.scenario(e.scenarioId) || {}; const ctx = ctxFor(state, e.engId); const opt = e.option || {};
  const scOpt = (sc.options || []).find(o => o.id === opt.id) || {}; const fr = e.framing ? (sc.framings || []).find(x => x.id === e.framing.id) : null; const fm = e.failureMode ? (sc.failureModes || []).find(x => x.id === e.failureMode) : null; const rat = e.rationale ? (sc.rationales || []).find(x => x.id === e.rationale) : null;
  const rub = e.rubric && typeof e.rubric === 'object' ? '<div class="rubric">' + Object.keys(e.rubric).map(k => { const v = e.rubric[k]; return '<span>' + t('room.rubric.' + k) + '</span><span class="n">' + n(v.pts, 1) + ' / ' + n(v.w) + '</span>'; }).join('') + '</div>' : '';
  const infoPills = (ids, cls) => ids.map(id => { const i = (sc.info || []).find(x => x.id === id); return pill(i ? tx(i.label, ctx) : esc(id), cls); }).join('');
  const cons = (e.consequences || []).map(c => '<div class="finding">' + pill(t('ui.week', { n: c.week }), 'pill-danger') + '<span>' + (c.text ? tx(c.text, ctx) : c.key ? t(c.key, {}, ctx) : '') + (c.premortemHit ? ' <span class="xs ok">' + t('consequence.premortemHit') + '</span>' : '') + deltaPills(c.applied, ctx) + '</span></div>').join('') + (e.delayed || []).filter(d => d.rolled && !d.landed).map(d => '<div class="finding">' + pill(t('journal.entry.consequence.pending', { n: Math.max(0, d.due - ((state.season - 1) * 48 + state.week)) })) + '<span class="muted">' + (d.text ? tx(d.text, ctx) : '') + '</span></div>').join('');
  const luck = e.luck ? t(e.luck.good ? 'luck.good' : 'luck.bad', { p: Math.round((e.luck.good ? e.luck.pGood : 1 - e.luck.pGood) * 100) }, ctx) : '';
  const body = '<div class="friday"><span>' + t('friday.line', { o: e.O, p: Math.round((e.P || 0) / 10), O: e.O, P: e.P }) + '</span>' + (e.calibration ? pill(t('journal.calibration.' + e.calibration), e.calibration === 'right' ? 'pill-ok' : 'pill-danger') : '') + '</div>' +
    '<div class="j-bars mb"><span class="lab"><span>' + t('journal.P') + '</span><b>' + n(e.P) + '</b></span>' + barHTML(e.P ?? 0) + '<span class="lab"><span>' + t('journal.O') + '</span><b>' + n(e.O, 1) + '</b></span>' + barHTML((e.O ?? 0) * 10, 'gold') + '</div>' +
    '<dl class="kv"><dt>' + t('ui.week', { n: e.week }) + '</dt><dd>' + t('journal.entry.energy', { n: e.energy }) + (e.kind === 'moment' ? ' · ' + t('match.hostility.' + (e.hostility || 'neutral')) : '') + '</dd>' +
    (fr ? '<dt>' + t('journal.entry.framing') + '</dt><dd>' + tx(fr.text, ctx) + '</dd>' : '') +
    (e.info && (e.info.bought || []).length ? '<dt>' + t('journal.entry.info') + '</dt><dd><span class="pills">' + infoPills(e.info.bought, 'pill-ok') + '</span></dd>' : '') +
    (e.info && (e.info.missed || []).length ? '<dt>' + t('journal.entry.missed') + '</dt><dd><span class="pills">' + infoPills(e.info.missed, 'pill-outline') + '</span></dd>' : '') +
    (e.info && (e.info.noise || []).length ? '<dt>' + t('journal.entry.noise') + '</dt><dd><span class="pills">' + infoPills(e.info.noise, 'pill-danger') + '</span></dd>' : '') +
    '<dt>' + t('journal.entry.option') + '</dt><dd>' + (opt.label ? tx(opt.label, ctx) : opt.labelKey ? t(opt.labelKey) : esc(opt.id || '')) + ' ' + pill(t(opt.reversible === false ? 'journal.irreversible' : 'journal.reversible'), 'pill-outline') + pill(t('journal.escalation.' + (opt.escalation || 'none')), 'pill-outline') + ((opt.tags || []).length ? '<div class="tag-list mt">' + opt.tags.map(tg => pill(esc(CT.tagLabel(tg) || tg), 'pill-outline')).join('') + '</div>' : '') + '</dd>' +
    (fm ? '<dt>' + t('journal.entry.premortem') + '</dt><dd>' + tx(fm.text, ctx) + '<div class="xs muted">' + t('room.memo.signal') + ': ' + tx(fm.signal, ctx) + '</div></dd>' : '') +
    (rat ? '<dt>' + t('journal.entry.memo') + '</dt><dd>' + tx(rat.text, ctx) + (e.note ? '<div class="xs muted">' + esc(e.note) + '</div>' : '') + '</dd>' : '') +
    (e.followupWeeks ? '<dt>' + t('journal.entry.followup') + '</dt><dd>' + t('room.followup.' + e.followupWeeks) + (e.followup && e.followup.answer != null ? ' · ' + t('followup.yourAnswer') + ': ' + t(e.followup.answer ? 'followup.yes' : 'followup.no') + (e.followup.late ? ' · ' + t('followup.late') : '') : e.followup && e.followup.ignored ? ' · ' + t('followup.unanswered') : '') + '</dd>' : '') +
    (luck ? '<dt>' + t('journal.entry.luck') + '</dt><dd>' + luck + '</dd>' : '') +
    ((opt.biasTags || []).length ? '<dt>' + t('journal.entry.biases') + '</dt><dd>' + opt.biasTags.map(b => pill(esc(CT.biasLabel(b) || b), 'pill-gold')).join(' ') + '</dd>' : '') + '</dl>' +
    (rub ? '<h3 class="mt mb">' + t('journal.entry.rubric') + '</h3>' + rub : '') + '<h3 class="mt mb">' + t('journal.entry.applied') + '</h3>' + (deltaPills(e.applied, ctx) || '<span class="xs faint">' + t('ui.none') + '</span>') +
    (cons ? '<h3 class="mt mb">' + t('journal.entry.consequences') + '</h3>' + cons : '') + (scOpt.feedback ? feedbackHTML(scOpt.feedback, ctx) : '') +
    '<div class="memo-field mt"><label for="learned">' + t('journal.entry.learned') + '</label><textarea id="learned" data-act="learned" data-id="' + esc(e.id) + '" rows="2" placeholder="' + esc(tp('journal.entry.learnedPlaceholder')) + '">' + esc(e.learned || '') + '</textarea></div>';
  return { title: bdiWrap(esc(entryTitle(state, e))), titleText: entryTitle(state, e), body, footer: closeBtn() };
}

function screenLearn(st) {
  const drills = CT.list('drills'); const lessons = CT.lessons(); const delivs = CT.list('deliverables');
  const seen = new Set(Object.keys(S.stats(st).lessons || {})); for (const e of S.journal(st)) { const sc = CT.scenario(e.scenarioId); if (sc && sc.lesson) seen.add(sc.lesson); }
  const drillCards = drills.length ? drills.map(d => '<div class="card"><div class="card-h"><h3>' + tx(d.title || d.id) + '</h3></div><div class="pills">' + (d.skills || []).map(s => pill(skillName(typeof s === 'string' ? s : s.id), 'pill-navy')).join('') + '</div><p class="small muted mt">' + t('library.drill.cost') + ' · ' + t('ui.of', { a: Math.min(5, (d.items || []).length), b: 5 }) + '</p><button type="button" class="btn btn-sm btn-navy" data-act="drill-open" data-id="' + esc(d.id) + '"' + (S.hoursLeft(st) < HOURS().learn ? ' disabled' : '') + '>' + t('budget.learn') + '</button></div>').join('') : empty('library.empty');
  const practice = delivs.filter(d => d.kind === 'practice' || d.practice); const builders = (practice.length ? practice : delivs).map(d => '<div class="card"><h3>' + tx(d.title || d.id) + '</h3>' + (d.tier ? pill(t('ui.tier', { n: d.tier }), 'pill-outline') : '') + '<p class="small muted mt">' + (d.description ? tx(d.description) : '') + '</p><button type="button" class="btn btn-sm" data-act="builder-open" data-id="' + esc(d.id) + '" data-practice="1">' + t('deliverable.practice') + '</button></div>').join('') || empty('library.empty');
  const isReg = (l) => l.kind === 'regulation' || l.type === 'regulation' || /^(pcbb|law|reg|aml|privacy|isox|muni|govco|gias|coso|iso)/.test(l.id || ''); const regs = lessons.filter(isReg), gloss = lessons.filter(l => !isReg(l));
  const row = (l) => { const locked = !seen.has(l.id); return '<div class="lesson' + (locked ? ' locked' : '') + '"><button type="button" class="btn btn-ghost btn-sm" data-act="lesson-open" data-id="' + esc(l.id) + '">' + tx(l.title || l.id) + '</button>' + (locked ? pill(t('library.lessons.locked'), 'pill-outline') : '') + '</div>'; };
  return '<section data-screen="learn"><h1 class="screen-title mb">' + t('library.title') + '</h1><div class="section-title"><h2>' + t('library.drills') + '</h2><span class="small muted">' + t('budget.left', { n: S.hoursLeft(st) }) + '</span></div><div class="grid-cards">' + drillCards + '</div>' +
    '<div class="section-title"><h2>' + t('library.builders') + '</h2></div><div class="grid-cards">' + builders + '</div>' +
    '<div class="grid-2 mt"><div class="card"><h2 class="mb">' + t('library.lessons') + '</h2>' + (gloss.length ? gloss.map(row).join('') : '<div class="xs faint">' + t('empty.lessons') + '</div>') + '</div><div class="card"><h2 class="mb">' + t('library.regs') + '</h2>' + (regs.length ? regs.map(row).join('') : '<div class="xs faint">' + t('empty.lessons') + '</div>') + '</div></div></section>';
}
function sheetLesson(sh) {
  const l = CT.lesson(sh.id) || { id: sh.id }; const ctx = curCtx();
  const body = '<div class="body-text">' + tx(l.body || l.text || '', ctx) + '</div>' + ((l.frameworks || []).length ? '<div class="pills mt"><span class="xs muted">' + t('library.lesson.frameworks') + '</span>' + l.frameworks.map(f => pill(bdiWrap(esc(CT.frameworkLabel(f))), 'pill-outline')).join('') + '</div>' : '') + ((l.skills || []).length ? '<div class="pills mt"><span class="xs muted">' + t('library.lesson.skills') + '</span>' + l.skills.map(s => pill(skillName(typeof s === 'string' ? s : s.id), 'pill-navy')).join('') + '</div>' : '') + (l.rule ? '<div class="fb rule mt"><b>' + t('room.feedback.rule') + '</b>' + tx(l.rule, ctx) + '</div>' : '') + (l.source ? '<p class="xs faint mt">' + t('library.lesson.source') + ': ' + bdiWrap(esc(l.source)) + '</p>' : '');
  return { title: tx(l.title || sh.id), titleText: txp(l.title || sh.id), body, footer: closeBtn() };
}

function screenCalendar(st) {
  const view = has('calendarView') ? call('calendarView', st) : null; const wk = S.week(st);
  const weeks = Array.from({ length: 48 }, (_, i) => { const w = i + 1; const v = Array.isArray(view) ? view[i] : { week: w, holiday: [15, 36, 37].includes(w), light: [18, 22].includes(w), august: w >= 29 && w <= 32, quarter: w % 12 === 0, window: w <= 6, gate: w >= 44 && w <= 47, rollforward: w >= 41 && w <= 44, certification: w === 10, deadlines: S.engagements(st).filter(e => e.deadline === w).map(e => e.id), matches: S.matches(st).filter(m => m.week === w).map(m => m.id), now: w === wk };
    const marks = []; if (v.quarter) marks.push('<i class="mk q"></i>'); if (v.deadlines.length) marks.push('<i class="mk d"></i>'); if (v.matches.length) marks.push('<i class="mk m"></i>'); if (v.window) marks.push('<i class="mk w"></i>'); if (v.rollforward) marks.push('<i class="mk r"></i>'); if (v.certification) marks.push('<i class="mk q"></i>'); if (v.gate) marks.push('<i class="mk w"></i>');
    const title = [tp('ui.week', { n: w }), v.holiday && tp('calendar.holiday'), v.light && tp('calendar.light'), v.august && tp('calendar.august'), v.crunch && tp('calendar.afterHolidays'), v.quarter && tp('calendar.quarter'), v.certification && tp('calendar.certification'), v.rollforward && tp('calendar.rollforward'), v.gate && tp('calendar.gateWindow'), v.window && tp('calendar.window')].filter(Boolean).join(' · ');
    return '<div class="wk' + (v.now ? ' cur' : '') + (v.holiday ? ' holiday' : '') + (v.light || v.august ? ' light' : '') + '" title="' + esc(title) + '"><span>' + n(w) + '</span><span class="marks">' + marks.join('') + '</span></div>'; }).join('');
  const months = Array.from({ length: 12 }, (_, i) => '<span>' + t('month.' + (i + 1)) + '</span>').join('');
  const legend = [['navy', 'calendar.quarter'], ['danger', 'calendar.deadline'], ['gold', 'calendar.match'], ['ok', 'calendar.window'], ['muted', 'calendar.rollforward']].map(([c, k]) => '<span><span class="mk" style="background:var(--' + c + ')"></span>' + t(k, { client: '', type: '' }) + '</span>').join('') + '<span><span class="mk" style="background:var(--navy-soft);border:1px solid var(--line-strong)"></span>' + t('calendar.holiday') + '</span>';
  const upcoming = S.engagements(st).filter(e => e.phase !== 'closed' && e.season === st.season && e.deadline >= wk).sort((a, b) => a.deadline - b.deadline).map(e => '<div class="feed-item">' + pill(t('ui.week', { n: e.deadline }), 'pill-danger') + ' ' + t('calendar.deadline', { client: (CT.client(e.clientId) || {}).name || '' }) + '</div>').join('') + S.matches(st).filter(m => !m.played && m.season === st.season && m.week >= wk).map(m => { const e = S.eng(st, m.engId); return '<div class="feed-item">' + pill(t('ui.week', { n: m.week }), 'pill-gold') + ' ' + t('calendar.match', { type: CT.matchTypeLabel(m.type, e && e.type) }) + (e ? ' · ' + engTitle(e) : '') + '</div>'; }).join('');
  return '<section data-screen="calendar"><h1 class="screen-title mb">' + t('calendar.title') + '</h1><div class="card"><div class="cal-wrap"><div class="cal-months">' + months + '</div><div class="cal">' + weeks + '</div></div><div class="legend">' + legend + '</div></div><div class="section-title"><h2>' + t('calendar.upcoming') + '</h2></div><div class="card">' + (upcoming || '<div class="xs faint">' + t('empty.calendar') + '</div>') + '</div></section>';
}

function screenFirm(st) {
  const f = S.firm(st); const hist = (st.firm && st.firm.confidenceHistory) || []; const ctx = curCtx();
  const spark = hist.length ? '<div class="spark" role="img" aria-label="' + esc(tp('firm.confidenceHistory')) + '">' + hist.slice(-24).map(h => { const v = typeof h === 'number' ? h : h.value; return '<i style="block-size:' + pct(v) + '%" title="' + Math.round(v) + '"></i>'; }).join('') + '</div>' : '<div class="xs faint">' + t('ui.none') + '</div>';
  const objs = has('objectives') ? call('objectives', st) : []; const objHTML = Array.isArray(objs) && objs.length ? objs.map(o => '<div class="objective"><div class="row between"><span>' + (o.hebrew ? tx(o.hebrew) : t('firm.metric.' + o.metric)) + '</span>' + pill(t(o.met ? 'firm.objective.met' : 'firm.objective.missed'), o.met ? 'pill-ok' : 'pill-danger') + '</div><div class="row">' + barHTML(Math.min(100, (o.value || 0) / Math.max(1, o.target) * 100), o.met ? 'ok' : 'thin') + '<span class="small num">' + t('firm.objective.progress', { current: o.value, target: o.target }) + '</span></div></div>').join('') : '<div class="xs faint">' + t('ui.none') + '</div>';
  const rival = CT.personByRole('rival'); const sponsorId = (st.firm && st.firm.sponsorId) || (has('findSponsor') ? MMx().findSponsor(st) : null); const sponsor = sponsorId ? CT.person(sponsorId) : null;
  const feed = ((st.firm && st.firm.market) || []).slice(0, 8).map(h => '<div class="feed-item">' + pill(t('ui.week', { n: h.week })) + ' ' + (h.key && hasKey(h.key) ? t(h.key, h.params, ctx) : h.text ? tx(h.text, ctx) : esc(h.key || '')) + '</div>').join('') || '<div class="xs faint">' + t('firm.market.empty') + '</div>';
  return '<section data-screen="firm"><div class="card-h"><h1 class="screen-title">' + esc(f.name || tp('firm.title')) + '</h1>' + pill(t('firm.prestige', { n: f.prestige }), 'pill-outline') + '</div>' +
    '<div class="grid-2"><div class="card"><h2 class="mb">' + t('firm.confidence') + ' · ' + n(st.player.confidence) + '</h2>' + spark + '<p class="xs faint mt">' + t('firm.confidenceHistory') + '</p></div><div class="card"><h2 class="mb">' + t('firm.objectives') + '</h2>' + objHTML + '</div>' +
    '<div class="card"><h2 class="mb">' + t('people.sponsor') + '</h2>' + (sponsor ? '<div class="row">' + avatar(sponsor.name, 'gold') + t('firm.sponsor', { name: sponsor.name }) + '</div>' : '<div class="small danger">' + t('firm.sponsor.none') + '</div><div class="xs muted">' + t('people.sponsorPossible') + '</div>') + (rival ? '<hr class="divider"><div class="row">' + avatar(rival.name) + '<div>' + t('firm.rival', { name: rival.name }) + (st.player.flags && st.player.flags[rival.id + '.promoted_first'] ? '<div class="xs danger">' + t('season.rivalPromoted', { rival: rival.name }) + '</div>' : '') + '</div></div>' : '') + '</div>' +
    '<div class="card"><h2 class="mb">' + t('firm.culture') + '</h2><p>' + tx(f.philosophy || '') + '</p>' + (f.culture ? '<p class="small gold-ink">' + tx(f.culture) + '</p>' : '') + (f.hoursPenalty ? pill(t('firm.hoursCulture', { n: f.hoursPenalty }), 'pill-danger') : '') + '</div></div>' +
    '<div class="section-title"><h2>' + t('firm.market') + '</h2></div><div class="card">' + feed + '</div></section>';
}

function screenOffers(st) {
  const offers = S.offers(st); const open = S.week(st) <= 6;
  const cards = offers.map(o => { const f = CT.firm(o.firmId) || {}; return '<div class="card"><div class="card-h"><h3>' + esc(f.name || o.firmId || '') + '</h3>' + pill(tierTitle(st), 'pill-navy') + '</div><div class="row small muted">' + pill(t('offers.pay', { n: f.pay })) + pill(t('firm.prestige', { n: f.prestige })) + (f.prestige < (S.firm(st).prestige || 0) ? pill(t('offers.smallFirm'), 'pill-outline') : '') + '</div><h4 class="small muted mt">' + t('offers.philosophy') + '</h4><p class="small">' + tx(f.philosophy || '') + '</p><h4 class="small muted mt">' + t('offers.objectives') + '</h4><ul class="small">' + (f.boardObjectives || []).map(x => '<li>' + tx(x.hebrew) + '</li>').join('') + '</ul>' + (o.scouted && f.culture ? '<div class="notice small">' + t('offers.scoutLine', { text: txp(f.culture) }) + '</div>' : '') + '<div class="btns mt"><button type="button" class="btn btn-primary" data-act="offer-accept" data-id="' + esc(o.id) + '">' + t('offers.accept') + '</button><button type="button" class="btn" data-act="offer-decline" data-id="' + esc(o.id) + '">' + t('offers.decline') + '</button></div></div>'; }).join('');
  return '<section data-screen="offers"><div class="card-h"><h1 class="screen-title">' + t('offers.title') + '</h1>' + pill(t(open ? 'offers.window' : 'offers.closed'), open ? 'pill-ok' : '') + '</div>' + (cards || empty('offers.empty')) + '</section>';
}
function sheetOffer(sh) { const f = CT.firm(sh.item.firmId) || {}; return { title: t('offers.title'), body: '<p>' + t('offers.role', { title: tp('tier.' + S.tier(state) + '.title'), firm: f.name || '' }) + '</p><p class="small muted">' + t('offers.sponsorWarning') + '</p>', footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.cancel') + '</button><button type="button" class="btn btn-primary" data-act="offer-accept-yes" data-id="' + esc(sh.item.id) + '">' + t('offers.accept') + '</button>' }; }

function screenSeason(st) {
  const s = S.report(st); const ctx = curCtx();
  if (!s) return '<section data-screen="season"><h1 class="screen-title mb">' + t('screen.season') + '</h1>' + empty('awards.empty') + '</section>';
  const milestone = st.milestone && st.milestone.season === s.season && !st.milestoneSeen;
  const awards = (s.awards || []).map(a => '<div class="award' + (a.shame ? ' wolf' : '') + '"><span class="ico" aria-hidden="true">' + (a.shame ? '🐺' : '🏆') + '</span><div><b>' + t(a.key, a.params, ctx) + '</b><div class="small muted">' + t('awards.winner', { award: tp(a.key, a.params, ctx), name: a.winner === 'player' ? tp('awards.you') : personName(a.winner, ctx) }) + '</div></div></div>').join('');
  const top = (s.topDecisions || []).map(d => { const e = S.entry(st, d.journalId); return '<div class="decision-top"><div class="row between"><b>' + (e ? '<button type="button" class="btn btn-ghost btn-sm" data-act="entry-open" data-id="' + esc(e.id) + '">' + bdiWrap(esc(entryTitle(st, e))) + '</button>' : tx(d.title, ctx)) + '</b>' + pill(t('friday.line', { o: d.O, p: Math.round((d.P || 0) / 10) })) + '</div>' + (e ? deltaPills(e.applied, ctx) : '') + (d.branch ? '<div class="branch"><b class="small muted">' + t('season.branch') + '</b><div>' + tx(d.branch.label, ctx) + '</div>' + (d.branch.why ? '<div class="small muted">' + tx(d.branch.why, ctx) + '</div>' : '') + '</div>' : '') + '</div>'; }).join('');
  const attrs = s.attrDeltas ? Object.keys(s.attrDeltas).filter(id => Math.abs(s.attrDeltas[id]) >= 0.05).map(id => '<span class="delta ' + (s.attrDeltas[id] > 0 ? 'pos' : 'neg') + '">' + skillName(id) + ' ' + (s.attrDeltas[id] > 0 ? '▲' : '▼') + n(Math.abs(s.attrDeltas[id]), 1) + '</span>').join('') : '';
  const reasons = (s.reasons || []).map(k => tp(k, { n: 62 + 4 * ((s.tier || 1) - 1), list: '' })).join(', ');
  const objs = (s.objectives || []).map(o => '<div class="objective"><div class="row between"><span>' + (o.hebrew ? tx(o.hebrew) : t('firm.metric.' + o.metric)) + '</span>' + pill(t(o.met ? 'firm.objective.met' : 'firm.objective.missed'), o.met ? 'pill-ok' : 'pill-danger') + '</div></div>').join('');
  const sponsor = s.sponsorId ? CT.person(s.sponsorId) : null; const sponsorText = sponsor && sponsor.lines && (sponsor.lines.quarter || sponsor.lines.note) ? tx(sponsor.lines.quarter || sponsor.lines.note, ctx) : null;
  return '<section data-screen="season"><h1 class="screen-title mb">' + (milestone ? t('ending.v1Milestone') : t('season.title', { season: s.season })) + '</h1>' + (milestone ? '<div class="notice mb">' + t('ending.v1Milestone.body') + '</div>' : '') +
    '<div class="grid-2"><div class="card"><h2 class="mb">' + t('season.score', { n: Math.round(s.score || 0) }) + '</h2><div class="score-big">' + n(s.score) + '</div><div class="xs faint">' + t('season.score.formula') + '</div><dl class="kv mt"><dt>' + t('season.meanQ') + '</dt><dd>' + n(s.meanQ) + '</dd><dt>' + t('season.meanP') + '</dt><dd>' + n(s.meanP) + '</dd><dt>' + t('season.confidence') + '</dt><dd>' + n(s.confidence) + '</dd></dl><div class="verdict mt">' + t(s.verdict || 'season.verdict.stay', { tier: s.promoted ? (s.tier || 1) + 1 : s.tier, reasons }) + '</div>' + (s.gate != null ? '<div class="small muted">' + t('season.gateScore', { n: s.gate }) + '</div>' : '') + (s.rivalPromoted ? '<div class="small danger">' + t('season.rivalPromoted', { rival: personName((CT.personByRole('rival') || {}).id, ctx) }) + '</div>' : '') + '</div>' +
    '<div class="card"><h2 class="mb">' + t('season.sponsorVerdict') + '</h2>' + (sponsor ? '<div class="row">' + avatar(sponsor.name, 'gold') + '<b>' + esc(sponsor.name) + '</b></div>' + (sponsorText ? '<p class="mt">' + sponsorText + '</p>' : '') : '<p class="muted">' + t('season.noSponsor') + '</p>') + '<h3 class="mt mb">' + t('firm.objectives') + '</h3>' + (objs || '<div class="xs faint">' + t('ui.none') + '</div>') + '</div></div>' +
    '<div class="section-title"><h2>' + t('season.threeDecisions') + '</h2></div>' + (top || '<div class="xs faint">' + t('ui.none') + '</div>') + (attrs ? '<div class="section-title"><h2>' + t('season.attrs') + '</h2></div><div class="deltas">' + attrs + '</div>' : '') +
    '<div class="section-title"><h2>' + t('awards.title') + '</h2></div><div class="stack">' + (awards || '<div class="xs faint">' + t('awards.none') + '</div>') + '</div>' + ((s.patterns || []).length ? '<div class="section-title"><h2>' + t('journal.patterns') + '</h2></div>' + s.patterns.map(p => '<div class="pattern">' + t(p.key || 'pattern.' + p.id, p.params) + '</div>').join('') : '') +
    (milestone ? '<div class="section-title"><h2>' + t('cv.title') + '</h2></div>' + cvTable(st) : '') + '<div class="btns mt"><button type="button" class="btn btn-primary" data-act="season-continue">' + t(milestone ? 'ending.continue' : 'season.continue', { n: S.season(st) }) + '</button>' + (milestone ? '<button type="button" class="btn" data-act="new-career">' + t('ending.newCareer') + '</button>' : '') + '</div></section>';
}
function cvTable(st) {
  const rows = (st.cv || []); if (!rows.length) return empty('cv.empty');
  const ctx = curCtx();
  return '<table class="table"><thead><tr><th>' + t('cv.seasons') + '</th><th>' + t('cv.firms') + '</th><th>' + t('cv.awards') + '</th></tr></thead><tbody>' + rows.map(r => { const firm = (CT.firm(r.firm || r.to || r.firmId) || {}).name || ''; const main = r.kind === 'season' ? t('cv.season.line', { season: r.season, firm, tier: r.tier, score: Math.round(r.score || 0) }) : r.kind === 'move' ? t('offers.accepted', { firm }) : t(r.key || 'cv.endings', { firm }); return '<tr><td data-l="' + esc(tp('cv.seasons')) + '">' + t('ui.season', { n: r.season }) + '</td><td data-l="' + esc(tp('cv.firms')) + '">' + main + (r.promoted ? ' ' + pill(t('season.verdict.promoted', { tier: (r.tier || 1) + 1 }), 'pill-ok') : '') + '</td><td data-l="' + esc(tp('cv.awards')) + '">' + ((r.awards || []).map(a => t(a.key || a, {}, ctx)).join(', ') || '–') + '</td></tr>'; }).join('') + '</tbody></table>';
}
function screenCV(st) { return '<section data-screen="cv"><h1 class="screen-title mb">' + t('cv.title') + '</h1><div class="card mb"><div class="row">' + avatar(st.player.name, 'gold') + '<div><b>' + esc(st.player.name || '') + '</b><div class="small muted">' + tierTitle(st) + ' · ' + esc(S.firm(st).name || '') + '</div></div></div></div>' + cvTable(st) + '</section>'; }

function screenSettings(st) {
  const theme = storage.getItem('mm.theme') || 'auto'; const size = storage.getItem('mm.size') || 'md';
  const seg = (act, key, v, cur) => '<button type="button" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + (cur === v) + '">' + t(key) + '</button>';
  const slots = [1, 2, 3].map(i => { const m = slotMeta(i); const firm = m && (CT.firm(m.firmId || m.firm) || {}).name; return '<div class="slot' + (ui.slot === i ? ' sel' : '') + '">' + avatar(m && m.name ? m.name : String(i), m ? '' : 'muted') + '<div class="grow">' + t('newgame.slot.label', { n: i }) + (ui.slot === i ? ' ' + pill('●', 'pill-gold') : '') + '<div class="small muted">' + (m ? t('newgame.slot.summary', { name: m.name || '', firm: firm || '', season: m.season, week: m.week }) : t('newgame.slot.empty')) + '</div></div><button type="button" class="btn btn-sm btn-navy" data-act="slot-save" data-slot="' + i + '">' + t('ui.save') + '</button>' + (m ? '<button type="button" class="btn btn-sm" data-act="slot-load" data-slot="' + i + '">' + t('ui.load') + '</button>' : '') + '</div>'; }).join('');
  return '<section data-screen="settings"><h1 class="screen-title mb">' + t('settings.title') + '</h1><div class="card"><h2 class="mb">' + t('settings.theme') + '</h2><div class="seg">' + seg('theme', 'settings.theme.auto', 'auto', theme) + seg('theme', 'settings.theme.light', 'light', theme) + seg('theme', 'settings.theme.dark', 'dark', theme) + '</div><h2 class="mb mt">' + t('settings.textSize') + '</h2><div class="seg">' + seg('size', 'settings.textSize.small', 'sm', size) + seg('size', 'settings.textSize.normal', 'md', size) + seg('size', 'settings.textSize.large', 'lg', size) + '</div></div>' +
    '<div class="card"><h2 class="mb">' + t('settings.slots') + '</h2><p class="xs faint">' + t('settings.autosave') + '</p><div class="stack">' + slots + '</div>' + (storage.setItem('mm.probe', '1') ? '' : '<p class="small danger mt">' + t('toast.saveFailed') + '</p>') + '</div>' +
    '<div class="card"><div class="card-h"><h2>' + t('settings.export') + '</h2><button type="button" class="btn btn-sm" data-act="export">' + t('journal.export') + '</button></div><p class="xs faint">' + t('settings.export.hint') + '</p><textarea class="mono" readonly aria-label="' + esc(tp('settings.export')) + '" data-role="export-json">' + esc(ui.exportJson || '') + '</textarea><div class="card-h mt"><h2>' + t('settings.import') + '</h2><button type="button" class="btn btn-sm btn-navy" data-act="import">' + t('settings.import.go') + '</button></div><textarea class="mono" aria-label="' + esc(tp('settings.import')) + '" data-role="import-json" placeholder="' + esc(tp('settings.import.placeholder')) + '"></textarea></div>' +
    '<div class="card"><h2 class="mb">' + t('settings.reset') + '</h2><div class="btns"><button type="button" class="btn btn-danger" data-act="reset">' + t('settings.reset') + '</button><button type="button" class="btn" data-act="to-open">' + t('screen.start') + '</button></div><p class="xs faint mt">' + t('settings.simNote') + '</p><p class="xs faint">' + t('settings.version', { v: (MMx().VERSION || 1) }) + '</p></div></section>';
}

/* ───────────────────────── 6. DECISION ROOM (bottom sheet with a stepper, steps enforced in order) ───────────────────────── */
const FULL_STEPS = ['context', 'framing', 'info', 'options', 'premortem', 'memo', 'result'];
function roomSteps(room) { if (room.view.journal === 'full') return FULL_STEPS; const s = ['context']; if ((room.view.info || []).length) s.push('info'); s.push('options', 'result'); return s; }
function refreshView(room) { if (!has('roomView') || room.final) return; const v = call('roomView', state, room.inboxId); if (v && !v.threw && v.options) room.view = v; }
function openRoom(item) {
  if (!has('openScenario')) { toast('ui.soon'); return; }
  const v = call('openScenario', state, item.id);
  if (!okRes(v)) { errToast(v); return; }
  ui.engId = v.engId; ui.ctxCache = null;
  const d = v.draft || {};
  const room = { kind: 'room', inboxId: item.id, view: v, ctx: v.ctx || ctxFor(state, v.engId), step: 0, framingId: d.framingId || null, optionId: d.optionId || null, failureModeId: d.failureModeId || null, rationaleId: d.rationaleId || null, followup: d.followupWeeks || null, note: d.note || '', final: null };
  openSheet(room);
}
function stepperHTML(room) { const steps = roomSteps(room); return '<div class="stepper" role="list">' + steps.map((s, i) => '<span class="step' + (i < room.step ? ' done' : i === room.step ? ' cur' : '') + '" role="listitem" aria-current="' + (i === room.step ? 'step' : 'false') + '"><i>' + (i < room.step ? '✓' : (i + 1)) + '</i>' + t('room.step.' + s) + '</span>').join('') + '</div>'; }
function optionsHTML(opts, ctx, selId) {
  return '<div class="option-list">' + opts.map((o, i) => { const lockText = o.locked ? (o.lock && o.lock.text ? tx(o.lock.text, ctx) : o.lock && o.lock.key ? t(o.lock.key, o.lock.params, ctx) : t('gate.locked')) : ''; return '<button type="button" class="option' + (o.locked ? ' gated' : '') + (selId === o.id ? ' sel' : '') + '" data-act="room-option" data-id="' + esc(o.id) + '"' + (o.locked ? ' aria-disabled="true"' : '') + '><span class="ltr" aria-hidden="true">' + (i + 1) + '</span><span class="txt">' + (o.label ? tx(o.label, ctx) : o.labelKey ? t(o.labelKey, {}, ctx) : esc(o.id)) + (o.locked ? '<span class="gate">🔒 ' + t('room.options.gated', { reason: '' }).replace(/:?\s*$/, '') + ' ' + lockText + '</span>' : '') + '</span></button>'; }).join('') + '</div>';
}
function infoHTML(room) {
  const ctx = room.ctx; const left = S.hoursLeft(state);
  return '<div class="option-list">' + (room.view.info || []).map(i => { const can = left >= i.hours; return '<button type="button" class="option' + (i.bought ? ' bought' : '') + '" data-act="room-info" data-id="' + esc(i.id) + '"' + (i.bought || !can ? ' aria-disabled="true"' : '') + '><span class="txt">' + tx(i.label, ctx) + (i.bought && i.reveal ? '<span class="reveal">' + tx(i.reveal, ctx) + '</span>' : '') + '</span><span class="cost">' + (i.bought ? t('room.info.bought') : t('room.info.cost', { n: i.hours })) + '</span></button>'; }).join('') + '</div>' + '<p class="xs faint mt">' + t('budget.left', { n: left }) + (room.view.lowEnergy ? ' · ' + t('room.info.doubled') : '') + '</p>';
}
function baseRateCard(br, ctx) { if (!br) return ''; const text = br.he || br.text ? tx(br.he || br.text, ctx, br) : ''; return '<div class="baserate"><b class="small muted">' + t('room.baseRate') + '</b><div>' + text + '</div>' + (br.source ? '<div class="src">' + t('room.baseRate.source', { source: br.source }) + '</div>' : '') + '</div>'; }
function resultHTML(f, ctx, lessonId) {
  const fr = f.friday ? t(f.friday.key || 'friday.line', f.friday.params, ctx) : ''; const e = f.entry || {};
  return (f.luck ? '<div class="luck">' + tm(f.luck, ctx) + '</div>' : '') + (f.result ? '<div class="result-text ' + (f.result.good ? 'good' : 'bad') + '"><b class="small">' + t(f.result.good ? 'room.result.good' : 'room.result.bad') + '</b><div>' + (f.result.text ? tx(f.result.text, ctx) : f.result.key ? t(f.result.key, {}, ctx) : '') + '</div></div>' : '') +
    (fr ? '<div class="friday"><span>' + fr + '</span>' + (e.calibration ? pill(t('journal.calibration.' + e.calibration), e.calibration === 'right' ? 'pill-ok' : 'pill-danger') : '') + '</div>' : '') + deltaPills(e.applied, ctx) + ((e.delayed || []).some(d => d.rolled) ? '<p class="xs muted mt">' + t('room.result.delayed') + '</p>' : '') + feedbackHTML(f.feedback, ctx) +
    '<div class="btns mt">' + (lessonId ? '<button type="button" class="btn btn-sm" data-act="lesson-open" data-id="' + esc(lessonId) + '">' + t('room.lesson.link', { title: txp((CT.lesson(lessonId) || {}).title || lessonId) }) + '</button>' : '') + (e.id ? '<button type="button" class="btn btn-sm btn-ghost" data-act="entry-open" data-id="' + esc(e.id) + '">' + t('room.journal.show') + '</button>' : '') + '</div>';
}
function sheetRoom(room) {
  const v = room.view; const ctx = room.ctx; const steps = roomSteps(room); const cur = steps[room.step]; const eng = S.eng(state, v.engId);
  const next = (key, dis) => '<button type="button" class="btn btn-primary" data-act="room-next"' + (dis ? ' disabled' : '') + '>' + t(key || 'ui.continue') + '</button>';
  const back = room.step > 0 && cur !== 'result' && cur !== 'premortem' && cur !== 'memo' ? '<button type="button" class="btn btn-ghost" data-act="room-back">' + t('ui.back') + '</button>' : '';
  let body = '', footer = '';
  if (cur === 'context') {
    body = '<div class="row small muted mb">' + (eng ? pill(engTitle(eng), 'pill-navy') + pill(engTypeLabel(eng), 'pill-outline') : '') + (v.repeat ? pill(t('repeat.label'), 'pill-gold') : '') + pill(t(v.journal === 'full' ? 'room.energyFull' : 'room.energyLight'), 'pill-outline') + '</div><div class="body-text">' + tx(v.body, ctx) + '</div>' +
      (v.attachments || []).map(a => '<details class="attach"><summary>' + tx(a.label, ctx) + '</summary><div>' + tx(a.text, ctx) + '</div></details>').join('') + (v.pushback ? '<div class="body-text mt"><b class="xs muted">' + t('room.pushback') + '</b><div><i>' + tx(v.pushback, ctx) + '</i></div></div>' : '') +
      (v.hint ? '<div class="hint"><b class="small muted">' + t('room.hint') + '</b><div>' + tx(v.hint, ctx) + '</div></div>' : '') + baseRateCard(v.baseRate, ctx) + ((v.frameworks || []).length ? '<div class="pills mt">' + v.frameworks.map(f => pill(bdiWrap(esc(CT.frameworkLabel(f))), 'pill-outline')).join('') + '</div>' : '');
    footer = '<span class="grow"></span>' + next();
  } else if (cur === 'framing') {
    body = '<p class="muted small">' + t('room.framing.prompt') + '</p><div class="option-list">' + (v.framings || []).map((f, i) => '<button type="button" class="option' + (room.framingId === f.id ? ' sel' : '') + '" data-act="room-framing" data-id="' + esc(f.id) + '"><span class="ltr" aria-hidden="true">' + (i + 1) + '</span><span class="txt">' + tx(f.text, ctx) + '</span></button>').join('') + '</div>';
    footer = back + '<span class="grow"></span>' + next('ui.continue', !room.framingId);
  } else if (cur === 'info') { body = '<p class="muted small">' + t('room.info.prompt') + '</p>' + infoHTML(room); footer = back + '<span class="grow"></span>' + next((v.info || []).some(i => i.bought) ? 'ui.continue' : 'room.info.skip'); }
  else if (cur === 'options') { body = '<p class="muted small">' + t('room.options.prompt') + '</p>' + optionsHTML(v.options || [], ctx, room.optionId); footer = back + '<span class="grow"></span>'; }
  else if (cur === 'premortem') { body = '<p class="muted small">' + t('room.premortem.prompt') + '</p><div class="option-list">' + (v.failureModes || []).map((f, i) => '<button type="button" class="option' + (room.failureModeId === f.id ? ' sel' : '') + '" data-act="room-fm" data-id="' + esc(f.id) + '"><span class="ltr" aria-hidden="true">' + (i + 1) + '</span><span class="txt">' + tx(f.text, ctx) + '</span></button>').join('') + '</div>'; footer = '<span class="grow"></span>' + next('ui.continue', !room.failureModeId); }
  else if (cur === 'memo') {
    const opt = (v.options || []).find(o => o.id === room.optionId) || {}; const fm = (v.failureModes || []).find(f => f.id === room.failureModeId) || {};
    body = '<div class="memo-field"><span class="lbl">' + t('room.memo.what') + '</span><div class="auto">' + (opt.label ? tx(opt.label, ctx) : opt.labelKey ? t(opt.labelKey) : '') + '</div></div>' +
      '<div class="memo-field"><span class="lbl">' + t('room.memo.why') + '</span><div class="radio-list">' + (v.rationales || []).map(r => '<label><input type="radio" name="rationale" value="' + esc(r.id) + '" data-act="room-rationale"' + (room.rationaleId === r.id ? ' checked' : '') + '><span>' + tx(r.text, ctx) + '</span></label>').join('') + '</div><textarea data-act="room-note" rows="2" placeholder="' + esc(tp('room.memo.free')) + '" aria-label="' + esc(tp('room.memo.free')) + '">' + esc(room.note || '') + '</textarea></div>' +
      '<div class="memo-field"><span class="lbl">' + t('room.memo.signal') + '</span><div class="auto">' + tx(fm.signal || '', ctx) + '</div></div>' +
      '<div class="memo-field"><span class="lbl">' + t('room.memo.when') + '</span><div class="seg" role="group">' + (v.followupChoices || [2, 4, 8]).map(w => '<button type="button" data-act="room-followup" data-w="' + w + '" aria-pressed="' + (room.followup === w) + '">' + t('room.followup.' + w) + '</button>').join('') + '</div><div class="xs faint mt">' + t('room.memo.cost') + '</div></div>';
    footer = '<span class="grow"></span><button type="button" class="btn btn-primary" data-act="room-submit"' + (room.rationaleId && room.followup ? '' : ' disabled') + '>' + t('room.memo.submit') + '</button>';
  } else { body = room.final ? resultHTML(room.final, ctx, room.final.lesson || v.lesson) : soon(); footer = closeBtn(true); }
  return { title: tx(v.title, ctx), titleText: txp(v.title, ctx), stepper: stepperHTML(room), body, footer, noClose: cur === 'premortem' || cur === 'memo' || cur === 'result' };
}
function roomGo(room, d) { const steps = roomSteps(room); room.step = Math.max(0, Math.min(steps.length - 1, room.step + d)); room.resetScroll = true; renderSheet(); }
function roomFinish(room, res) { room.final = res; room.step = roomSteps(room).indexOf('result'); room.resetScroll = true; autosave(); renderSheet(); render(); }

/* ───────────────────────── 7. MATCH («אירוע חי»), INBOX ITEM & FOLLOW-UP SHEETS ───────────────────────── */
function openMatch(item) {
  if (!has('matchView')) { toast('ui.soon'); return; }
  const v = call('matchView', state, item.matchId); if (!v || v.threw) { toast('toast.staleContent'); return; }
  ui.engId = v.engId; ui.ctxCache = null;
  const sh = { kind: 'match', inboxId: item.id, matchId: item.matchId, view: v, phase: v.played ? 'result' : v.started ? 'moment' : 'prep', line: 0, last: null, summary: null };
  if (sh.phase === 'moment') matchSettle(sh);
  openSheet(sh);
}
function refreshMatch(sh) { const v = call('matchView', state, sh.matchId); if (v && !v.threw) sh.view = v; }
function fitDots(type, k, v) { const mt = CT.matchType(type); const val = mt && mt.fit && mt.fit[k] ? (mt.fit[k][v] ?? 0) : 0; return '<span class="fit-dots" aria-label="' + val + '/3">' + [1, 2, 3].map(i => '<i class="' + (i <= val ? 'on' : '') + '"></i>').join('') + '</span>'; }
function togglesHTML(sh, act) {
  const ap = sh.view.approach || state.player.approach || {}; const rows = [['basis', ['risk', 'rules']], ['transparency', ['full', 'managed']], ['escalation', ['low', 'high']]];
  return '<div class="toggles">' + rows.map(([k, vals]) => '<div class="toggle-row"><span class="lbl">' + t('match.' + k) + '</span><span class="seg">' + vals.map(v => '<button type="button" data-act="' + act + '" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (ap[k] === v) + '">' + t('match.' + k + '.' + v) + ' ' + fitDots(sh.view.type, k, v) + '</button>').join('') + '</span></div>').join('') + '</div>';
}
function sheetMatch(sh) {
  const v = sh.view; const eng = S.eng(state, v.engId); const ctx = v.ctx || curCtx(); const label = CT.matchTypeLabel(v.type, eng && eng.type);
  const head = '<div class="match-h"><div class="row">' + pill(esc(label), 'pill-gold') + (eng ? pill(engTitle(eng), 'pill-navy') + lineBadge(eng) : '') + '</div><div class="row between"><div class="prep-n">' + n(v.prep) + '<small>' + t('match.prepScore', { n: v.prep }) + '</small></div><div class="small muted">' + t('match.fit', { n: v.fit }) + '</div></div></div>';
  let body = '', footer = '', noClose = false;
  if (sh.phase === 'prep') {
    body = head + '<div class="card mt"><h3 class="mb">' + t('match.teamSheet') + '</h3><div class="pills">' + (v.participants || []).map(p => pill(avatar(p.name, 'sm') + ' ' + esc(p.name) + ' · ' + n(p.trust), 'pill-outline')).join('') + '</div><dl class="kv mt"><dt>' + t('match.engQuality', { n: Math.round(v.engQuality || 0) }) + '</dt><dd>' + barHTML(v.engQuality) + '</dd><dt>' + t('match.findingsSoFar', { n: (v.findings || []).length }) + '</dt><dd></dd><dt>' + t('match.examined') + '</dt><dd>' + (v.revealedTopic ? t('match.revealedTopic', { name: personName(eng && eng.iaId, ctx), topic: txp(v.revealedTopic, ctx) }) : t('ui.none')) + '</dd></dl></div>' +
      '<div class="card mt"><h3 class="mb">' + t('match.approach') + '</h3>' + togglesHTML(sh, 'match-toggle') + '</div>';
    footer = '<span class="grow xs faint">' + t('match.energyCost') + '</span><button type="button" class="btn btn-primary" data-act="match-start">' + t('match.play') + '</button>';
  } else if (sh.phase === 'moment') {
    const mo = v.moment; const lines = mo ? mo.ticker || [] : []; const shown = lines.slice(0, sh.line + 1); const all = sh.line >= lines.length - 1; const last = sh.last; noClose = !!(mo || last);
    body = '<div class="moment"><span class="stamp">' + t('match.moment', { i: Math.min(v.index + (last ? 0 : 1), v.total), n: v.total }) + '</span>' + head +
      (last ? '<div class="card mt"><h3 class="mb">' + tx(last.title, ctx) + '</h3><div class="result-text ' + (last.result && last.result.good ? 'good' : 'bad') + '">' + (last.result && last.result.text ? tx(last.result.text, ctx) : t(last.result && last.result.good ? 'room.result.good' : 'room.result.bad')) + '</div>' + (last.feedback && (last.feedback.rule || last.feedback.why) ? '<div class="fb rule mt"><b>' + t('room.feedback.rule') + '</b>' + tx(last.feedback.rule || last.feedback.why, ctx) + '</div>' : '') + deltaPills(last.entry && last.entry.applied, ctx) + '</div>' :
        mo ? '<div class="ticker mt">' + shown.map(l => '<div class="ticker-line ' + (mo.hostility || 'neutral') + '">' + tx(l, ctx) + '</div>').join('') + '</div>' + (all ? '<div class="card mt"><div class="row small muted mb">' + pill(t('match.hostility.' + (mo.hostility || 'neutral')), mo.hostility === 'hostile' ? 'pill-danger' : mo.hostility === 'friendly' ? 'pill-ok' : '') + '</div><h3 class="mb">' + tx(mo.title, ctx) + '</h3><div class="body-text small">' + tx(mo.body, ctx) + '</div>' + (mo.colleagueHint ? '<div class="hint">' + t('match.colleagueHint', { name: personName(S.match(state, sh.matchId)?.colleagueId, ctx), hint: txp(mo.colleagueHint, ctx) }) + '</div>' : '') + '<div class="mt">' + optionsHTML(mo.options || [], ctx, null) + '</div></div>' : '') : soon()) + '</div>';
    footer = last ? '<button type="button" class="btn btn-primary" data-act="match-next">' + t('ui.continue') + '</button>' : (!all && mo ? '<button type="button" class="btn btn-navy" data-act="match-tick">' + t('match.ticker.continue') + '</button>' : '<span class="xs faint">' + t('room.options.prompt') + '</span>');
  } else if (sh.phase === 'break') {
    const m = S.match(state, sh.matchId); const colleagues = CT.list('cast').filter(c => c.firmId === state.firm.id && c.id !== (m && m.colleagueId) && (S.trust(state, c.id) ?? 0) >= 60);
    body = head + '<div class="card mt"><h3 class="mb">' + t('match.break') + '</h3><p class="small muted">' + t('match.break.toggle') + '</p>' + togglesHTML(sh, 'match-break-toggle') + '</div><div class="card mt"><h3 class="mb">' + t('match.break.colleague', { name: '' }) + '</h3>' + (colleagues.length ? '<div class="btns">' + colleagues.map(c => '<button type="button" class="btn btn-sm" data-act="match-break-colleague" data-id="' + esc(c.id) + '">' + t('match.break.colleague', { name: c.name }) + '</button>').join('') + '</div>' : '<div class="xs faint">' + t('match.break.colleagueLocked', { name: (CT.personByRole('mentor') || {}).name || '' }) + '</div>') + '</div>'; noClose = true;
    footer = '<button type="button" class="btn btn-primary" data-act="match-resume">' + t('ui.continue') + '</button>';
  } else {
    const s = sh.summary || {}; const r = s.ratings || (S.match(state, sh.matchId) || {}).ratings || {}; const scale = CT.scaleFor(eng);
    const rows = [['player', r.player]].concat(Object.keys(r.participants || {}).map(id => [id, r.participants[id]]));
    body = head + (s.note ? '<div class="notice mb">' + tm(s.note, ctx) + '</div>' : '') + (s.headline ? '<div class="mt"><span class="xs muted">' + t('match.headline') + '</span><div class="headline">' + (hasKey(s.headline.key) ? t(s.headline.key, s.headline.params, ctx) : t('match.tone') + ': ' + esc(s.tone || '')) + '</div></div>' : '') +
      '<div class="card mt"><h3 class="mb">' + t('match.findingsSheet') + '</h3>' + ((s.findings || (eng && eng.findings) || []).length ? (s.findings || eng.findings).map(f => findingRow(f, eng, ctx)).join('') : '<div class="xs faint">' + t('eng.findings.none') + '</div>') + '</div>' +
      '<div class="card mt"><h3 class="mb">' + t('match.ratings') + '</h3><div class="ratings">' + rows.filter(x => x[1] != null).map(([id, val]) => { const name = id === 'player' ? (state.player.name || tp('awards.you')) : personName(id, ctx); return '<div class="rating-row">' + avatar(name, id === 'player' ? 'gold' : '') + '<span class="grow">' + esc(name) + (id === 'player' ? ' ' + pill(t('match.rating.you'), 'pill-gold') : '') + '</span><span class="rating-n ' + (val >= 7 ? 'b4' : val >= 5 ? 'b3' : val >= 3 ? 'b2' : 'b1') + '">' + n(val) + '</span></div>'; }).join('') + '</div>' + (s.deltas ? '<div class="mt">' + deltaPills({ confidence: s.deltas.confidence, rep: s.deltas.rep }, ctx) + '</div>' : '') + (s.engQuality != null ? '<p class="small mt">' + t('match.deltaQuality', { n: Math.round(s.engQuality) }) + '</p>' : '') + '</div>';
    footer = closeBtn(true);
  }
  return { title: esc(label), titleText: label, body, footer, noClose };
}
function matchChoose(sh, optId) {
  const r = call('playMoment', state, sh.matchId, optId); if (!okRes(r)) { errToast(r); return; }
  sh.last = Object.assign({ title: (sh.view.moment || {}).title }, r); sh.pendingBreak = !!r.breakNow; sh.pendingSummary = r.done ? r.summary : null; if (r.done && r.summary) { const it = S.item(state, sh.inboxId); if (it) it.done = true; }
  autosave(); sh.resetScroll = true; renderSheet();
}
function matchSettle(sh) {
  /* A match with no current moment (nothing drawn, or already done) goes straight to the result sheet. */
  if (sh.last || (sh.view && sh.view.moment)) return false;
  const m = S.match(state, sh.matchId);
  if (m && !m.played && has('resolveMatch')) { const r = call('resolveMatch', state, sh.matchId); if (okRes(r)) sh.summary = r; }
  if (!sh.summary && m && m.played) sh.summary = { ratings: m.ratings, findings: (S.eng(state, m.engId) || {}).findings || [] };
  const it = S.item(state, sh.inboxId); if (it) it.done = true;
  sh.phase = 'result'; sh.resetScroll = true; autosave(); return true;
}
function matchNext(sh) {
  sh.last = null; sh.line = 0;
  if (sh.pendingSummary) { sh.summary = sh.pendingSummary; sh.phase = 'result'; }
  else { refreshMatch(sh); sh.phase = sh.pendingBreak ? 'break' : 'moment'; if (!sh.pendingBreak) matchSettle(sh); }
  sh.pendingBreak = false; sh.resetScroll = true; renderSheet(); render();
}

function sheetItem(sh) {
  const item = sh.item; const info = itemInfo(state, item); const ctx = ctxFor(state, item.engId); const sc = item.scenarioId ? CT.scenario(item.scenarioId) : null;
  let body = '';
  if (item.scouted) body += '<div class="notice mb">' + t('scout.ahead', item.params, ctx) + '</div>';
  if (sc) body += '<div class="body-text">' + tx(sc.body || sc.text || '', ctx) + '</div>' + (sc.attachments || []).map(a => '<details class="attach"><summary>' + tx(a.label, ctx) + '</summary><div>' + tx(a.text, ctx) + '</div></details>').join('') + (sc.lesson ? '<div class="btns mt"><button type="button" class="btn btn-sm" data-act="lesson-open" data-id="' + esc(sc.lesson) + '">' + t('room.lesson.link', { title: txp((CT.lesson(sc.lesson) || {}).title || sc.lesson) }) + '</button></div>' : '');
  else if (item.key && hasKey(item.key)) body += '<div class="body-text">' + t(item.key, item.params, ctx) + '</div>' + (hasKey(item.key + '.body') ? '<p class="small muted mt">' + t(item.key + '.body', item.params, ctx) + '</p>' : '');
  else if (item.text) body += '<div class="body-text">' + tx(item.text, ctx) + '</div>';
  if (item.type === 'consequence' && item.failureMode) { const e = S.entry(state, item.journalId); if (e && e.failureMode === item.failureMode) body += '<p class="small ok mt">' + t('consequence.premortemHit') + '</p>'; }
  body += deltaPills(item.applied, ctx);
  const jids = [].concat(item.journalId || [], item.journalIds || []); if (jids.length) body += '<div class="stack mt">' + jids.map(id => { const e = S.entry(state, id); return e ? '<button type="button" class="j-row" data-act="entry-open" data-id="' + esc(e.id) + '"><span class="t">' + bdiWrap(esc(entryTitle(state, e))) + '<span class="m">' + pill(t('ui.week', { n: e.week })) + '</span></span><span class="j-bars"><span class="lab"><span>' + t('journal.P') + '</span><b>' + n(e.P) + '</b></span>' + barHTML(e.P) + '</span></button>' : ''; }).join('') + '</div>';
  if (item.type === 'offer') body += '<div class="btns mt"><button type="button" class="btn btn-sm btn-navy" data-act="nav" data-screen="offers">' + t('offers.title') + '</button></div>';
  if (item.key === 'quarter.talk' || (item.key && /^season\.verdict|^dismissal|^ending/.test(item.key))) body += '<div class="btns mt"><button type="button" class="btn btn-sm btn-primary" data-act="nav" data-screen="season">' + t('screen.season') + '</button></div>';
  return { title: bdiWrap(esc(info.subject)), titleText: info.subject, body: '<div class="row small muted mb">' + avatar(info.name, 'sm') + '<span>' + esc(info.name) + '</span>' + pill(t('ui.week', { n: item.week })) + '</div>' + body, footer: closeBtn(true) };
}
function sheetFollowup(sh) {
  const item = sh.item; const e = S.entry(state, item.journalId); if (!e) return { title: t('followup.title'), body: empty('journal.empty'), footer: closeBtn() };
  const ctx = ctxFor(state, e.engId); const sc = CT.scenario(e.scenarioId) || {}; const fm = (sc.failureModes || []).find(f => f.id === e.failureMode);
  const landed = e.consequences || []; const res = sh.result;
  const body = '<p class="small muted">' + bdiWrap(esc(entryTitle(state, e))) + ' · ' + t('ui.week', { n: e.week }) + '</p><div class="memo-field"><span class="lbl">' + t('room.memo.signal') + '</span><div class="auto">' + tx(fm ? fm.signal : '', ctx) + '</div></div>' +
    '<h3 class="mb">' + t('followup.whatHappened') + '</h3>' + (landed.length ? landed.map(c => '<div class="finding">' + pill(t('ui.week', { n: c.week }), 'pill-danger') + '<span>' + (c.text ? tx(c.text, ctx) : c.key ? t(c.key, {}, ctx) : '') + '</span></div>').join('') : '<div class="xs faint">' + t('followup.record.nothing') + '</div>') +
    '<h3 class="mt mb">' + t('followup.question') + '</h3>' + (res ? '<div class="notice"><div>' + t('followup.yourAnswer') + ': ' + t(res.answer ? 'followup.yes' : 'followup.no') + '</div><div>' + t('followup.record') + ': ' + t(res.recordKey || 'followup.record.nothing', { text: (res.consequences || []).map(c => txp(c.text || '', ctx)).join('; ') }, ctx) + '</div>' + (res.anyLanded ? '<div class="small mt">' + (res.record ? t('followup.premortemHit') : t('followup.premortemMiss', { mode: fm ? txp(fm.text, ctx) : '' })) + '</div>' : '') + '</div>' : '<div class="btns"><button type="button" class="btn btn-navy" data-act="followup-answer" data-a="1">' + t('followup.yes') + '</button><button type="button" class="btn" data-act="followup-answer" data-a="0">' + t('followup.no') + '</button></div>') +
    '<div class="btns mt"><button type="button" class="btn btn-sm btn-ghost" data-act="entry-open" data-id="' + esc(e.id) + '">' + t('room.journal.show') + '</button></div>';
  return { title: t('followup.title'), body, footer: closeBtn() };
}
function openInboxItem(id) {
  const item = S.item(state, id); if (!item) return;
  const type = item.type || 'news';
  if (type === 'decision') { openRoom(item); render(); return; }
  if (type === 'moment') { if (has('markRead')) call('markRead', state, id); else item.read = true; openMatch(item); render(); return; }
  if (has('markRead')) call('markRead', state, id); else item.read = true;
  if (type === 'followup') { openSheet({ kind: 'followup', item, result: null }); render(); return; }
  if (type === 'offer') { go('offers'); return; }
  openSheet({ kind: 'item', item }); render();
}

/* ───────────────────────── 8. BUILDERS (gate deliverables & practice), DRILLS, PICKERS ───────────────────────── */
function deliverableDef(id) { if (has('deliverable')) { const d = call('deliverable', state, id); if (d && !d.threw) return d; } return CT.byId('deliverables', id); }
function sheetBuilder(sh) {
  const d = sh.deliverable; const parts = Array.isArray(d.parts) ? d.parts : []; const ctx = curCtx(); const ans = sh.answers;
  let body = d.intro || d.description ? '<p class="small muted">' + tx(d.intro || d.description, ctx) + '</p>' : '';
  if (sh.result) {
    const r = sh.result;
    body += '<div class="center mb"><div class="score-big">' + n(r.score) + '</div><div class="small muted">' + t('deliverable.score', { n: r.score }) + ' · ' + t(sh.practice || !r.gate ? 'deliverable.practice' : (r.pass ? 'deliverable.pass' : 'deliverable.fail')) + '</div></div>' + (r.parts || []).map((p, i) => { const fb = Array.isArray(p.feedback) ? p.feedback : (p.feedback ? [p.feedback] : []); return '<div class="objective"><div class="row between"><span>' + t('deliverable.part', { i: i + 1, name: txp((parts[i] || {}).title || tp('deliverable.kind.' + p.kind), ctx), w: Math.round(p.weight) }) + '</span>' + pill(n(p.score) + '%', p.score >= 65 ? 'pill-ok' : 'pill-danger') + '</div>' + fb.map(f => '<div class="small muted">' + (typeof f === 'string' ? tx(f, ctx) : f && f.key ? t(f.key, f.params, ctx) : f && (f.text || f.feedback) ? tx(f.text || f.feedback, ctx) : '') + '</div>').join('') + '</div>'; }).join('');
    return { title: tx(d.title || d.id), titleText: txp(d.title || d.id), body, footer: closeBtn(true) };
  }
  parts.forEach((p, pi) => {
    const pid = p.id || String(pi); const a = ans[pid] || (ans[pid] = p.kind === 'order' ? { order: (p.items || []).map(x => typeof x === 'string' ? x : x.id) } : p.kind === 'match' ? { pairs: [] } : {});
    body += '<div class="card mb"><div class="card-h"><h3>' + t('deliverable.part', { i: pi + 1, name: txp(p.title || tp('deliverable.kind.' + p.kind), ctx), w: Math.round(p.weight || 100 / parts.length) }) + '</h3></div>' + (p.prompt || p.body ? '<p class="small muted">' + tx(p.prompt || p.body, ctx) + '</p>' : '');
    if (p.kind === 'slots') body += '<p class="xs faint">' + t('deliverable.slot.pick') + '</p>' + (p.slots || []).map(sl => '<div class="slot-pick"><h4>' + (hasKey(sl.label) ? t(sl.label) : tx(sl.label, ctx)) + '</h4><div class="radio-list">' + (sl.candidates || []).map(c => '<label><input type="radio" name="s_' + esc(pid) + '_' + esc(sl.id) + '" data-act="b-slot" data-p="' + esc(pid) + '" data-s="' + esc(sl.id) + '" value="' + esc(c.id) + '"' + (a[sl.id] === c.id ? ' checked' : '') + '><span>' + tx(c.text, ctx) + '</span></label>').join('') + '</div></div>').join('');
    else if (p.kind === 'ratings') { const max = p.max || 5, min = p.min || 1; body += (p.items || []).map(it => '<div class="slot-pick"><h4>' + tx(it.text || it.label || it.id, ctx) + '</h4><div class="rate-grid">' + (it.cells || Object.keys(it.answer || {})).map(cell => '<label class="small">' + (hasKey('deliverable.' + cell) ? t('deliverable.' + cell) : esc(cell)) + '</label><select data-act="b-rate" data-p="' + esc(pid) + '" data-i="' + esc(it.id) + '" data-c="' + esc(cell) + '"><option value="">–</option>' + Array.from({ length: max - min + 1 }, (_, k) => k + min).map(v => '<option value="' + v + '"' + (a[it.id] && a[it.id][cell] === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>').join('') + '</div></div>').join(''); }
    else if (p.kind === 'order') { const byId = {}; for (const x of (p.items || [])) if (typeof x === 'object') byId[x.id] = x; body += '<div class="order-list">' + a.order.map((id, i) => '<div class="order-item"><span class="chip-num b2">' + n(i + 1) + '</span><span class="grow">' + tx((byId[id] || {}).text || (byId[id] || {}).label || id, ctx) + '</span><button type="button" class="btn btn-sm btn-icon" data-act="b-move" data-p="' + esc(pid) + '" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="' + esc(tp('ui.prev')) + '">▲</button><button type="button" class="btn btn-sm btn-icon" data-act="b-move" data-p="' + esc(pid) + '" data-i="' + i + '" data-d="1"' + (i === a.order.length - 1 ? ' disabled' : '') + ' aria-label="' + esc(tp('ui.next')) + '">▼</button></div>').join('') + '</div>'; }
    else if (p.kind === 'match') { const lefts = p.lefts || (p.pairs || []).map(x => ({ id: x.left, text: x.leftText || x.left })); const rights = p.rights || (p.pairs || []).map(x => ({ id: x.right, text: x.rightText || x.right })); const reasons = p.reasons || [];
      body += lefts.map(l => { const cur = a.pairs.find(x => x.left === l.id) || {}; return '<div class="slot-pick"><h4>' + tx(l.text, ctx) + '</h4><select data-act="b-pair" data-p="' + esc(pid) + '" data-l="' + esc(l.id) + '" data-f="right"><option value="">–</option>' + rights.map(r => '<option value="' + esc(r.id) + '"' + (cur.right === r.id ? ' selected' : '') + '>' + tx(r.text, ctx) + '</option>').join('') + '</select>' + (reasons.length ? '<select class="mt" data-act="b-pair" data-p="' + esc(pid) + '" data-l="' + esc(l.id) + '" data-f="reason"><option value="">' + t('deliverable.response.reason') + '</option>' + reasons.map(r => { const id = typeof r === 'string' ? r : r.id; return '<option value="' + esc(id) + '"' + (cur.reason === id ? ' selected' : '') + '>' + tx(typeof r === 'string' ? r : r.text, ctx) + '</option>'; }).join('') + '</select>' : '') + '</div>'; }).join(''); }
    else body += soon();
    body += '</div>';
  });
  return { title: tx(d.title || d.id), titleText: txp(d.title || d.id), body: body || soon(), footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.cancel') + '</button><button type="button" class="btn btn-primary" data-act="b-submit">' + t('deliverable.submit') + '</button>' };
}
function drillItems(d) { return (d.items || []).slice(0, 5).map(it => { const opts = (it.options || []).map(o => typeof o === 'string' ? { text: o } : { text: o.t || o.text || o.label, quality: o.quality, correct: !!o.correct }); const maxQ = Math.max(...opts.map(o => typeof o.quality === 'number' ? o.quality : -1)); return { q: it.q || it.question || it.text || '', options: opts, answer: it.answer, why: it.why || it.explain || it.explanation || '', right: opts.map((o, k) => o.correct || (typeof it.answer === 'number' ? it.answer === k : (typeof o.quality === 'number' && maxQ >= 0 && o.quality === maxQ))) }; }); }
function drillSkill(d) { return d.skill || (Array.isArray(d.skills) && d.skills.length ? (typeof d.skills[0] === 'string' ? d.skills[0] : d.skills[0].id) : null); }
function sheetDrill(sh) {
  const d = sh.drill; const items = drillItems(d); const ctx = curCtx(); const it = items[sh.i];
  if (sh.done) { const r = sh.result || {}; const correct = r.correct != null && r.correct >= sh.correct ? r.correct : sh.correct; const score = Math.round(correct / Math.max(1, items.length) * 100); return { title: tx(d.title || d.id), body: '<div class="center"><div class="score-big">' + n(score) + '%</div><p class="muted">' + t('library.drill.result', { k: correct, n: items.length, skill: tp('skill.' + drillSkill(d)) }) + '</p>' + (r.delta ? '<p class="small">' + t(r.delta > 0 ? 'skill.gain' : 'skill.loss', { skill: tp('skill.' + drillSkill(d)), n: Math.abs(r.delta) }) + '</p>' : '') + '</div>', footer: closeBtn(true) }; }
  if (!it) return { title: '', body: empty('library.empty'), footer: closeBtn() };
  const picked = sh.picked;
  const body = '<p class="xs faint">' + t('ui.of', { a: sh.i + 1, b: items.length }) + '</p><div class="drill-q">' + tx(it.q, ctx) + '</div><div class="option-list">' + it.options.map((o, k) => '<button type="button" class="option' + (picked != null ? (it.right[k] ? ' sel' : picked === k ? ' gated' : '') : '') + '" data-act="drill-pick" data-k="' + k + '"' + (picked != null ? ' aria-disabled="true"' : '') + '><span class="ltr" aria-hidden="true">' + (k + 1) + '</span><span class="txt">' + tx(o.text, ctx) + '</span></button>').join('') + '</div>' + (picked != null ? '<div class="fb mt"><b>' + t(it.right[picked] ? 'library.drill.correct' : 'library.drill.wrong') + '</b>' + tx(it.why, ctx) + '</div>' : '');
  return { title: tx(d.title || d.id), body, footer: picked != null ? '<button type="button" class="btn btn-primary" data-act="drill-next">' + t('ui.continue') + '</button>' : '', noClose: true };
}
function startDrillFromContent(d) {
  const skillId = drillSkill(d); if (!skillId) { toast('budget.pickSkill'); return; }
  if (has('spendBlock')) { const r = call('spendBlock', state, 'learn', { skillId }); if (!okRes(r)) { errToast(r); return; } }
  openSheet({ kind: 'drill', drill: d, i: 0, picked: null, correct: 0, answers: [], done: false });
}
function sheetPicker(sh) {
  const kind = sh.kindBlock; let opts = [];
  if (kind === 'work') opts = S.active(state).map(e => ({ id: e.id, label: engTitle(e) + ' · ' + txp(tp(has('phaseKey') ? MMx().phaseKey(state, e) : 'phase.' + e.phase)), sub: (S.trust(state, e.contactId) ?? 0) >= 60 ? tp('budget.workBonus') : '' }));
  else if (kind === 'learn') opts = CT.list('drills').map(d => ({ id: d.id, label: txp(d.title || d.id), sub: (d.skills || []).map(s => tp('skill.' + (typeof s === 'string' ? s : s.id))).join(' · ') }));
  else if (kind === 'network') { const ids = new Set(CT.list('cast').filter(c => !c.firmId || c.firmId === state.firm.id).map(c => c.id)); for (const e of S.active(state)) { if (e.contactId) ids.add(e.contactId); if (e.iaId) ids.add(e.iaId); } opts = [...ids].map(id => { const p = CT.person(id); return p ? { id, label: p.name, sub: tp('people.trust', { n: S.trust(state, id) ?? '–' }) + (p.role ? ' · ' + txp(roleLabelPlain(p)) : '') } : null; }).filter(Boolean); }
  const title = t(kind === 'work' ? 'budget.pickEngagement' : kind === 'learn' ? 'budget.pickSkill' : 'budget.pickPerson');
  const body = opts.length ? '<div class="option-list">' + opts.map(o => '<button type="button" class="option" data-act="block-pick" data-kind="' + kind + '" data-id="' + esc(o.id) + '"><span class="txt">' + bdiWrap(esc(o.label)) + (o.sub ? '<span class="xs muted"> · ' + bdiWrap(esc(o.sub)) + '</span>' : '') + '</span></button>').join('') + '</div>' : empty(kind === 'work' ? 'budget.needsEngagement' : kind === 'learn' ? 'library.empty' : 'empty.people');
  return { title, body, footer: '<button type="button" class="btn" data-act="sheet-close">' + t('ui.cancel') + '</button>' };
}
function roleLabelPlain(p) { const g = p.gender === 'f' ? 'f' : 'm'; return hasKey('role.' + p.role + '.' + g) ? tp('role.' + p.role + '.' + g) : p.role; }
function spend(kind, target) {
  if (!has('spendBlock')) { toast('ui.soon'); return; }
  const r = call('spendBlock', state, kind, target || {}); if (!okRes(r)) { errToast(r); return; }
  const eng = target && S.eng(state, target.engId);
  if (kind === 'work' && eng) toast('budget.workDone', { client: (CT.client(eng.clientId) || {}).name || '' }); else if (kind === 'network') toast('budget.networkDone', { name: personName(target.personId), n: r.gain }); else if (kind === 'rest') toast('budget.restDone'); else if (r.note) pushToast(tm(r.note));
  if (kind === 'learn') { const d = (r.drill && CT.byId('drills', r.drill.id)) || null; if (d) { openSheet({ kind: 'drill', drill: d, i: 0, picked: null, correct: 0, answers: [], done: false }); } else toast('library.empty'); }
  autosave(); render();
}

/* ───────────────────────── 9. EVENTS (delegated on #app) ───────────────────────── */
function endWeek() {
  if (!has('tick')) { toast('ui.soon'); return; }
  const unplayed = S.inbox(state).filter(i => i.type === 'moment').length; const unopened = S.inbox(state).filter(i => i.type === 'decision').length;
  if ((unplayed || unopened) && !ui.endWeekConfirmed) { ui.endWeekConfirmed = true; confirmBox((unplayed ? t('board.endWeekBlocked') + ' ' : '') + (unopened ? t('board.endWeekUnread', { n: unopened }) : ''), () => { endWeek(); ui.endWeekConfirmed = false; }); ui.endWeekConfirmed = false; ui.pendingEnd = true; return; }
  const r = call('tick', state, { storage, slot: ui.slot }); ui.ctxCache = null;
  if (!r || r.threw) { errToast(r); return; }
  showMessages(r.notes); toast('toast.weekEnded', { week: r.week });
  ui.sheet = null; autosave();
  if (r.report) { state.milestoneSeen = false; go('season'); } else go('dash');
}
function applyTheme(v) { const h = document.documentElement; if (v === 'light' || v === 'dark') h.setAttribute('data-theme', v); else h.removeAttribute('data-theme'); storage.setItem('mm.theme', v); }
function applySize(v) { const h = document.documentElement; if (v === 'sm' || v === 'lg') h.setAttribute('data-size', v); else h.removeAttribute('data-size'); storage.setItem('mm.size', v); }
function startNewGame() {
  const o = ui.open; if (!o.name.trim()) { toast('newgame.nameRequired'); return; }
  let st = null;
  if (has('newGame')) { st = call('newGame', { name: o.name.trim(), gender: o.gender, firmId: o.firmId }); if (!st || st.threw || !st.player) { errToast(st); return; } }
  else { st = defaultState({ name: o.name.trim(), gender: o.gender, firmId: o.firmId }); toast('ui.soon'); }
  state = st; ui.ctxCache = null; const free = [1, 2, 3].find(i => !slotMeta(i)); ui.slot = free || 1; autosave(); ui.sheet = null; go('dash');
}
const actions = {
  'noop': () => {},
  'nav': (el) => go(el.dataset.screen),
  'sheet-close': () => closeSheet(),
  'confirm-yes': () => { const fn = ui.sheet && ui.sheet.onYes; ui.sheet = null; renderSheet(); if (fn) { ui.endWeekConfirmed = true; fn(); ui.endWeekConfirmed = false; } render(); },
  'open-name': (el) => { ui.open.name = el.value; },
  'open-gender': (el) => { ui.open.gender = el.dataset.g; render(); },
  'open-firm': (el) => { ui.open.firmId = el.dataset.id; render(); },
  'open-start': () => startNewGame(),
  'open-load': (el) => { const st = loadSlot(Number(el.dataset.slot)); if (!st) { toast('toast.importFailed'); return; } state = st; ui.ctxCache = null; ui.slot = Number(el.dataset.slot); storage.setItem('mm.slot', String(ui.slot)); toast('toast.loaded'); go('dash'); },
  'open-delete': (el) => { const i = Number(el.dataset.slot); confirmBox(t('newgame.slot.delete') + ' · ' + t('newgame.slot.label', { n: i }), () => { storage.removeItem(SLOT_KEY(i)); render(); }, true); },
  'end-week': () => endWeek(),
  'block-add': (el) => { const kind = el.dataset.kind; if (el.disabled) return; if (kind === 'work' && el.dataset.eng) return spend('work', { engId: el.dataset.eng }); if (kind === 'work' || kind === 'learn' || kind === 'network') { openSheet({ kind: 'picker', kindBlock: kind }); return; } spend(kind, {}); },
  'block-pick': (el) => { const kind = el.dataset.kind, id = el.dataset.id; ui.sheet = null; if (kind === 'work') spend('work', { engId: id }); else if (kind === 'network') spend('network', { personId: id }); else if (kind === 'learn') { const d = CT.byId('drills', id); if (d) startDrillFromContent(d); } render(); },
  'item-open': (el) => openInboxItem(el.dataset.id),
  'entry-open': (el) => { const parent = ui.sheet && ui.sheet.kind !== 'entry' ? ui.sheet : null; openSheet({ kind: 'entry', id: el.dataset.id, onClose: parent ? () => { ui.sheet = parent; parent.resetScroll = true; renderSheet(); } : null }); },
  'learned': (el) => { if (has('setLearned')) call('setLearned', state, el.dataset.id, el.value); else { const e = S.entry(state, el.dataset.id); if (e) e.learned = el.value; } },
  'filter': (el) => { ui.filters[el.dataset.f] = el.value; render(); },
  'journal-export': () => { ui.exportMd = journalMarkdown(state); render(); const ta = root.querySelector('[data-role="export-md"]'); if (ta) { ta.focus(); try { ta.select(); } catch (e) { /* noop */ } } },
  'lesson-open': (el) => { const parent = ui.sheet; openSheet({ kind: 'lesson', id: el.dataset.id, onClose: parent ? () => { ui.sheet = parent; parent.resetScroll = true; renderSheet(); } : null }); },
  'drill-open': (el) => { const d = CT.byId('drills', el.dataset.id); if (!d) return; if (S.hoursLeft(state) < HOURS().learn) { toast('budget.notEnough'); return; } startDrillFromContent(d); },
  'drill-pick': (el) => { const sh = ui.sheet; if (!sh || sh.picked != null) return; const it = drillItems(sh.drill)[sh.i]; const k = Number(el.dataset.k); sh.picked = k; sh.answers[sh.i] = k; if (it.right[k]) sh.correct++; renderSheet(); },
  'drill-next': () => { const sh = ui.sheet; sh.i++; sh.picked = null; if (sh.i >= drillItems(sh.drill).length) { sh.done = true; if (has('runDrill')) { const r = call('runDrill', state, sh.drill.id, sh.answers); if (okRes(r)) sh.result = r; } autosave(); } sh.resetScroll = true; renderSheet(); if (sh.done) render(); },
  'builder-open': (el) => { const d = deliverableDef(el.dataset.id); if (!d) { toast('toast.staleContent'); return; } openSheet({ kind: 'builder', deliverable: d, answers: {}, practice: !!el.dataset.practice }); },
  'b-slot': (el) => { const a = ui.sheet.answers; (a[el.dataset.p] = a[el.dataset.p] || {})[el.dataset.s] = el.value; },
  'b-rate': (el) => { const a = ui.sheet.answers; const p = a[el.dataset.p] = a[el.dataset.p] || {}; const it = p[el.dataset.i] = p[el.dataset.i] || {}; it[el.dataset.c] = el.value === '' ? null : Number(el.value); },
  'b-move': (el) => { const ord = ui.sheet.answers[el.dataset.p].order; const i = Number(el.dataset.i), j = i + Number(el.dataset.d); if (j < 0 || j >= ord.length) return; [ord[i], ord[j]] = [ord[j], ord[i]]; renderSheet(); },
  'b-pair': (el) => { const a = ui.sheet.answers[el.dataset.p]; let pr = a.pairs.find(x => x.left === el.dataset.l); if (!pr) { pr = { left: el.dataset.l }; a.pairs.push(pr); } pr[el.dataset.f] = el.value || null; },
  'b-submit': () => { const sh = ui.sheet; if (!has('submitDeliverable')) { toast('ui.soon'); return; } const ans = {}; for (const k of Object.keys(sh.answers)) { const a = sh.answers[k]; ans[k] = a.order ? a.order : a; } const r = call('submitDeliverable', state, sh.deliverable.id, ans); if (!okRes(r)) { errToast(r); return; } sh.result = r; sh.resetScroll = true; autosave(); renderSheet(); render(); },
  'room-next': () => roomGo(ui.sheet, 1),
  'room-back': () => roomGo(ui.sheet, -1),
  'room-framing': (el) => { const room = ui.sheet; const r = has('chooseFraming') ? call('chooseFraming', state, room.inboxId, el.dataset.id) : { ok: true }; if (!okRes(r)) { errToast(r); return; } room.framingId = el.dataset.id; renderSheet(); },
  'room-info': (el) => { const room = ui.sheet; if (el.getAttribute('aria-disabled') === 'true') return; const r = call('buyInfo', state, room.inboxId, el.dataset.id); if (!okRes(r)) { errToast(r); return; } refreshView(room); autosave(); renderSheet(); },
  'room-option': (el) => { const sh = ui.sheet; if (el.getAttribute('aria-disabled') === 'true') { toast('gate.locked'); return; } if (sh.kind === 'match') return matchChoose(sh, el.dataset.id); if (sh.kind === 'drill') return; const r = call('choose', state, sh.inboxId, el.dataset.id); if (!okRes(r)) { errToast(r); if (r && r.lock) refreshView(sh); renderSheet(); return; } sh.optionId = el.dataset.id; if (r.pending) { sh.step = roomSteps(sh).indexOf('premortem'); sh.resetScroll = true; renderSheet(); } else roomFinish(sh, r); },
  'room-fm': (el) => { const room = ui.sheet; const r = has('choosePremortem') ? call('choosePremortem', state, room.inboxId, el.dataset.id) : { ok: true }; if (!okRes(r)) { errToast(r); return; } room.failureModeId = el.dataset.id; renderSheet(); },
  'room-rationale': (el) => { ui.sheet.rationaleId = el.value; renderSheet(); },
  'room-note': (el) => { ui.sheet.note = el.value; },
  'room-followup': (el) => { ui.sheet.followup = Number(el.dataset.w); renderSheet(); },
  'room-submit': () => { const room = ui.sheet; const r = call('submitMemo', state, room.inboxId, { rationaleId: room.rationaleId, followupWeeks: room.followup, note: room.note || '' }); if (!okRes(r)) { errToast(r); return; } roomFinish(room, r); },
  'match-toggle': (el) => { const sh = ui.sheet; const ap = Object.assign({}, sh.view.approach || state.player.approach); ap[el.dataset.k] = el.dataset.v; if (has('setApproach')) call('setApproach', state, ap); refreshMatch(sh); renderSheet(); },
  'match-start': () => { const sh = ui.sheet; const r = call('startMatch', state, sh.matchId); if (!okRes(r)) { errToast(r); return; } sh.view = r; sh.phase = 'moment'; sh.line = 0; sh.resetScroll = true; matchSettle(sh); autosave(); renderSheet(); render(); },
  'match-tick': () => { ui.sheet.line++; renderSheet(); const b = root.querySelector('.sheet-body'); if (b) b.scrollTop = b.scrollHeight; },
  'match-next': () => matchNext(ui.sheet),
  'match-break-toggle': (el) => { const sh = ui.sheet; const r = call('matchBreak', state, sh.matchId, { toggle: el.dataset.k, value: el.dataset.v }); if (!okRes(r)) { errToast(r); return; } sh.view = r; toast('match.break.changed', { prep: r.prep, fit: r.fit }); sh.phase = 'moment'; sh.resetScroll = true; renderSheet(); },
  'match-break-colleague': (el) => { const sh = ui.sheet; const r = call('matchBreak', state, sh.matchId, { colleague: el.dataset.id }); if (!okRes(r)) { errToast(r); return; } sh.view = r; sh.phase = 'moment'; sh.resetScroll = true; renderSheet(); },
  'match-resume': () => { const sh = ui.sheet; refreshMatch(sh); sh.phase = 'moment'; matchSettle(sh); sh.resetScroll = true; renderSheet(); },
  'followup-answer': (el) => { const sh = ui.sheet; const r = call('answerFollowup', state, sh.item.id, el.dataset.a === '1'); if (!okRes(r)) { errToast(r); return; } sh.result = Object.assign({ answer: el.dataset.a === '1' }, r); autosave(); renderSheet(); render(); },
  'offer-accept': (el) => { const item = S.item(state, el.dataset.id); if (item) openSheet({ kind: 'offer', item }); },
  'offer-accept-yes': (el) => { ui.sheet = null; const r = call('acceptOffer', state, el.dataset.id); if (!okRes(r)) { errToast(r); render(); return; } ui.ctxCache = null; if (r.note) pushToast(tm(r.note)); autosave(); go('dash'); },
  'offer-decline': (el) => { const r = call('declineOffer', state, el.dataset.id); if (!okRes(r)) errToast(r); autosave(); render(); },
  'season-continue': () => { if (state.milestone && !state.milestoneSeen) state.milestoneSeen = true; autosave(); go('dash'); },
  'new-career': () => confirmBox(t('settings.reset.confirm'), () => { state = null; ui.sheet = null; go('open'); }, true),
  'theme': (el) => { applyTheme(el.dataset.v); render(); },
  'size': (el) => { applySize(el.dataset.v); render(); },
  'slot-save': (el) => { const i = Number(el.dataset.slot); if (saveSlot(i, state)) { ui.slot = i; toast('toast.saved'); } else toast('toast.saveFailed'); render(); },
  'slot-load': (el) => { const i = Number(el.dataset.slot); confirmBox(t('ui.load') + ' · ' + t('newgame.slot.label', { n: i }), () => { const st = loadSlot(i); if (st) { state = st; ui.ctxCache = null; ui.slot = i; storage.setItem('mm.slot', String(i)); toast('toast.loaded'); go('dash'); } else toast('toast.importFailed'); }); },
  'export': () => { try { ui.exportJson = has('exportJSON') ? MMx().exportJSON(state) : JSON.stringify(state); } catch (e) { ui.exportJson = ''; } render(); toast('toast.exported'); const ta = root.querySelector('[data-role="export-json"]'); if (ta) { ta.focus(); try { ta.select(); } catch (e) { /* noop */ } } },
  'import': () => { const ta = root.querySelector('[data-role="import-json"]'); const text = ta ? ta.value.trim() : ''; if (!text) return; let st = null, notes = []; if (has('importJSON')) { const r = call('importJSON', text); if (!okRes(r) || !r.state) { errToast(r); return; } st = r.state; notes = r.notes || []; } else { try { st = JSON.parse(text); } catch (e) { toast('toast.importFailed'); return; } } if (!st || !st.player) { toast('toast.importFailed'); return; } state = st; ui.ctxCache = null; showMessages(notes); toast('toast.imported'); autosave(); go('dash'); },
  'reset': () => confirmBox(t('settings.reset.confirm'), () => { storage.removeItem(SLOT_KEY(ui.slot)); state = null; ui.sheet = null; toast('toast.reset'); go('open'); }, true),
  'to-open': () => { autosave(); state = null; ui.sheet = null; go('open'); },
};
function onEvent(ev) {
  const el = ev.target.closest('[data-act]'); if (!el || !root.contains(el)) return;
  const fn = actions[el.dataset.act]; if (!fn) return;
  const isField = el.matches('input, textarea, select');
  if (ev.type === 'click' && isField) return;
  if (ev.type !== 'click' && !isField) return;
  if (ev.type === 'input' && !el.matches('input[type="text"], textarea')) return;
  if (ev.type === 'change' && el.matches('input[type="text"], textarea')) return;
  try { fn(el, ev); } catch (e) { console.warn('action failed', el.dataset.act, e); toast('ui.engineError'); }
}
root.addEventListener('click', onEvent); root.addEventListener('input', onEvent); root.addEventListener('change', onEvent);
root.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && ui.sheet) { let c; try { c = sheetContent(ui.sheet); } catch (e) { c = {}; } if (!c.noClose) closeSheet(); } });

/* ───────────────────────── 10. BOOT ───────────────────────── */
function snapshot() { return { state, ui: { screen: ui.screen, slot: ui.slot, filters: ui.filters } }; }
function start(data) {
  CT.load(); applyTheme(storage.getItem('mm.theme') || 'auto'); applySize(storage.getItem('mm.size') || 'md');
  if (data && data.state && data.state.player) { state = data.state; Object.assign(ui, data.ui || {}); ui.sheet = null; if (ui.screen === 'open') ui.screen = 'dash'; }
  else { const slot = Number(storage.getItem('mm.slot')) || 0; const st = slot ? loadSlot(slot) : null; if (st) { state = st; ui.slot = slot; ui.screen = 'dash'; } else ui.screen = 'open'; }
  render();
}
window.MM_UI = { snapshot, render, go, t, get state() { return state; }, set state(s) { state = s; ui.ctxCache = null; render(); } };
const hot = window.claude && window.claude.hot;
if (hot && typeof hot.onSnapshot === 'function') { try { hot.onSnapshot(snapshot); } catch (e) { /* noop */ } }
if (hot && typeof hot.ready === 'function') hot.ready(start); else start((hot && hot.data) || {});
})();
