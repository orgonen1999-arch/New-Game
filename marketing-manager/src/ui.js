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
    let loaded = null;
    if (has('loadContent')) { try { loaded = MMx().loadContent(raw); } catch (e) { console.warn('loadContent failed', e); loaded = null; } }
    if (!loaded) { loaded = Object.assign({}, raw); const sc = []; for (const k of Object.keys(raw)) if (/^scenarios\./.test(k) && Array.isArray(raw[k])) { sc.push(...raw[k]); delete loaded[k]; } loaded.scenarios = sc; }
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
  return html.split(/(<[^>]+>)/g).map(part => part[0] === '<' ? part : part.replace(/(\d[\d.,:%\/−–-]*|[A-Za-z][A-Za-z0-9.\-]*)/g, '<bdi>$1</bdi>')).join('');
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
function pushToast(html) { if (!html) return; const o = { html }; ui.toasts.push(o); if (ui.toasts.length > 4) ui.toasts.shift(); refreshToasts(); setTimeout(() => { ui.toasts = ui.toasts.filter(x => x !== o); refreshToasts(); }, 3600); }
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
function lineBadge(eng) { return eng && eng.line ? pill(t('eng.line.' + eng.line), eng.line === 3 ? 'pill-navy' : 'pill-outline') : ''; }
function engTitle(eng) { const c = eng ? CT.client(eng.clientId) : null; return esc(c ? c.name : (eng && eng.clientId) || ''); }
function engTypeLabel(eng) { return t('engType.' + (eng.type || 'audit')); }
function empty(key) { return '<div class="empty">' + t(key) + '</div>'; }
function soon() { return '<div class="soon">' + t('ui.soon') + '</div>'; }
function findingRow(f, eng, ctx) { return '<div class="finding">' + ratingPill(f.scale || CT.scaleFor(eng), f.rating) + '<span>' + tx(f.title || f.text || f.id || '', ctx) + (f.week ? ' <span class="xs faint">' + t('ui.week', { n: f.week }) + '</span>' : '') + '</span></div>'; }

