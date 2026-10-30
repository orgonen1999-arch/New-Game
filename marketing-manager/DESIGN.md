# Marketing Manager — Game Design Document (final, revision 2)

Working title (user's): **Marketing Manager**. Player-facing Hebrew name: **«מרקטינג מנג'ר: הדרך לשותפות»**.
Tagline: **«כל החלטה נרשמת. כל ממצא זוכר.»**

Built on the *buildable-core* skeleton (engine, schema, tick order, validation, saves) with *learning-first*'s learning science (decision room, rubric, mastery, spaced repetition, journal), *career-narrative*'s world (firms, cast, ladder, gate deliverables, incident queue) and *fm-faithful*'s match-day texture (preparation, two-line feedback, follow-up, ratings, awards, scouting). English for the builder; every player-facing string is Hebrew and lives in content (`strings.json` or the banks), never in `engine.js`.

Revision 2 closes every gap found in design review: the engagement phase model, the match-engine numbers (מוכנות, fit, ratings), the computable rubric, energy drains, the three-lines model and independence rule, per-engType rating scales, the `policy-writing` engagement, the option/gate/flag/tag schema, the full `firms.json`, trust defaults, the twelve journal detectors, the draw budget, player-gender grammar, the scripted first season, the end of authored content, deliverable kinds, the string contract, and the scaffold details the repo actually has.

---

## 1. Vision & pillars

**Vision.** Football Manager for a junior analyst at an Israeli internal-audit / compliance / risk consulting firm. The player starts with no experience, serves banks, insurers, provident funds, ministries, local authorities and government companies, and climbs to partner. It is a trainer in disguise: every week the inbox delivers decisions from the real job (what to sample, when evidence is enough, how to rate a finding, how to handle a treasurer who says "we are a small council", what goes on slide one, how to write a procedure the owner will actually follow), and the game grades *how* the player decided, separately from how it turned out.

**Pillars** (every feature must serve at least one; features that serve none are cut):

1. **תהליך לפני תוצאה — process before outcome.** The decision journal scores the process with a measurable rubric. Luck is rolled in the open. Feedback always teaches the why and ends in a transferable rule. The journal line the player sees most: «תהליך טוב, תוצאה רעה: זה קורה. תהליך רע, תוצאה טובה: זה מזל.»
2. **העבודה האמיתית — the real job, really.** Engagements for real sector types under real Israeli regulation: הוראות ניהול בנקאי תקין 307/308/310/350/361, צווי איסור הלבנת הון, תיקון 13 לחוק הגנת הפרטיות, חוק הביקורת הפנימית התשנ"ב-1992, פקודת העיריות (סעיפים 170א–170ג) וחוזרי מנכ"ל משרד הפנים for local authorities, חוק החברות הממשלתיות וחוזרי רשות החברות הממשלתיות for government companies, מבקר המדינה, ISOX (SOX 404 as adopted by רשות ניירות ערך), GIAS 2024, COSO 2013, ISO 31000. The game teaches the **three lines model** (IIA 2020) explicitly: line 1 owns the risk, line 2 (compliance, risk, policy writing) advises and monitors, line 3 (internal audit) assures independently — and a firm that wrote the procedure cannot audit it (§8, §11 independence rule). The deliverables the player must learn to write (finding, risk survey report, procedure, management response, executive narrative) are practised as structured builders, not as multiple-choice trivia.
3. **אדם בתוך עולם — a person in a world.** Firms with culture, a persistent cast that remembers, a rival, a mentor who leaves, a regulator who reads your old reports, consequences that land seasons later. Reputation is a career, not a number.
4. **בנוי להרחבה — buildable and extensible.** One engine, never touched after v1. All content is validated JSON. The engine never references a scenario id. Adding a sector, a firm, a tier, a match type, a rating scale or a scenario family is adding files.

**Non-goals.** No multiplayer, backend, runtime AI, real-time timers, browser dialogs or frameworks.

---

## 2. Player fantasy & career arc

The fantasy: *I am the person in the room whose work the regulator trusts.* The arc runs from a fieldwork block inside someone else's engagement to running the practice.

| Tier | Hebrew title (`strings.json` key) | What a "match" is | What the player decides | Attribute ceiling | Gate deliverable |
|---|---|---|---|---|---|
| 1 | `tier.1.title` «{אנליסט\|אנליסטית}» | A fieldwork block and a findings-validation meeting inside the manager's engagement | What to ask, what to sample, what counts as evidence, when to escalate to the manager | 12 | ממצא כתוב (מצב · קריטריון · סיבה · השפעה · המלצה) |
| 2 | `tier.2.title` «{אנליסט בכיר\|אנליסטית בכירה}» | A full engagement run under a manager, first presentations to a CEO / מנכ"ל / מנכ"לית רשות | Scoping, finding rating, drafting the report, handling client pushback, writing a procedure end-to-end | 15 | דוח סקר סיכונים |
| 3 | `tier.3.title` «{מנהל\|מנהלת} פרויקטים» | 3–4 parallel engagements, one junior whose mistakes become your validation problems | Prioritisation across clients, staffing, management responses, the in-house crossroads | 17 | התאמת תגובות הנהלה לממצאים |
| 4 | `tier.4.title` «{מוביל\|מובילת} התקשרות» | Audit committees, boards, regulator inspections | Framing for executives, scope and fee negotiation, escalation to the partner | 19 | נרטיב לוועדת ביקורת |
| 5 | `tier.5.title` «{שותף\|שותפה} · {ראש\|ראשת} פרקטיקה» | Winning and keeping clients; the practice's name | Business development, positioning, which clients to refuse, hiring | 20 | ממו מיצוב הפרקטיקה |

Tier titles are gendered by the **player's** gender, picked on the opening screen (§7 token rules); the doc writes them with a slash only here, for the builder.

**What changes per tier.** The scenario banks are tier-tagged, so the inbox changes genre: tier 1 is 60% fieldwork; tier 2 adds scoping, rating, report and the owned `policy-writing` engagement; tier 3 adds portfolio and people; tier 4 is executive rooms and inspections; tier 5 unlocks the small BD bank (`domain: "marketing"`, `"strategy"`), the «הפרקטיקה שלי» screen and the option to found a two-person practice at prestige 20 (the Conference-South-to-Champions-League arc). Ceilings prevent grinding past what the job lets you practise. The tier-3 crossroads is a one-time in-house offer («לעבור לצד השני») with its own quiet ending.

**Pacing target.** ~4–5 hours per season; at least two seasons per tier at tiers 1–2 (the gate deliverable and the sponsor make the first attempt usually fail by design); partner in 8–10 seasons ≈ 40–50 hours. v1 content covers tiers 1–2 (seasons 1–4); tiers 3–5 are later JSON banks on the same engine.

**Start of the career (defaults, resolving §17 #1, #2, #6).** The opening screen asks for a name and the player's gender (`m|f`, used only for grammar), and shows the four firm cards with **אופק ביקורת פנימית** pre-selected and recommended («ההתחלה המומלצת»); the other three are selectable. **Season 1 at tier 1 is scripted**: the portfolio is fixed and the first six scenarios come in a fixed order from `seasons.json` (`scripted: [ids]`); from the seventh draw on, the inbox is drawn from the banks like every later season.

**Milestones and the end of authored content (v1).** The first promotion to tier 2 is a v1 milestone ending in its own right: the screen **«{אנליסט בכיר\|אנליסטית בכירה}»** (`ending.v1Milestone`) plays the awards ceremony, shows the «קורות חיים» screen with the two seasons, and offers «להמשיך» (play on at tier 2) or «קריירה חדשה». When a promotion reaches a tier whose banks are not authored in the installed build (tier 3 in v1), the inbox shows a one-time card **«התוכן של הגרסה הזו מסתיים כאן»** (`content.endsHere`) and the engine keeps drawing from the highest tier that has content (§14 draw fallback), so the game never goes silent.

---

## 3. Core loop

One in-game week = one press of **«סיום שבוע ▶»**. A season is 48 playable weeks (one calendar year, §11).

**Each week the player:**

1. Reads **תיבת הדואר** (2–5 items of the types החלטה, רגע מפתח, השלכה, מעקב, חדשות/רגולציה, הצעה). Moments (matches), events, delayed consequences and מעקב items all count toward the 2–5; scenario draws fill the rest (§14 draw budget).
2. Spends the **weekly budget: 40 שעות** (a bar with chips). Every block has an energy price (§14 energy):
   - **עבודה על תיק** — 8h → +1 work unit on one engagement's current phase (+1 extra when the client contact's trust ≥ 60); energy −2.
   - **החלטה** — opening a scenario is free; information actions cost their authored hours (1–6h); the memo costs 1h. A full decision room costs energy −3, a light one −1.
   - **לימוד** — 4h → a 5-item drill on one skill (mastery update at half strength); energy −1.
   - **קשרים** — 4h → trust +3 (× `firm.trustMult`) with one named person; energy −1.
   - **ניטור רגולטורי** (scouting) — 4h → **1 scouting point**; at 2 points the next `scoutable` event is revealed early (§8, §11); energy −1.
   - **מנוחה** — 8h → energy +15.
   Unspent hours convert to energy (+2 per 4h). The budget is hard: the player cannot work 60 hours; instead low energy makes decisions worse (§6) and a sustained crunch drains energy below 30 within 3–4 weeks (§14), which is where the 40h budget bites.
3. Presses «סיום שבוע». The tick (§14) fires queued consequences, advances engagement phases, schedules matches, draws the next inbox, runs the spaced-repetition scheduler, applies decay, and autosaves.

**Quarter close** (weeks 12, 24, 36, 48): audit committee set piece for one client — **the active financial-sector engagement with the earliest deadline; if none, any active engagement; if no engagement is active, the set piece is skipped** — and the **שיחת רבעון** with the engagement manager quoting the player's three lowest process scores back.

**Season end** (week 48): awards, gate deliverable (if eligible), annual review (promotion / warning / dismissal), season review with the three decisions that mattered most; the transfer window opens in weeks 1–6 of the next season and a new portfolio is drawn from `seasons.json`.

---

## 4. Attributes & skills

All attributes are 1–20 (FM scale), shown with one decimal in the profile as a bar + number chip, colour-banded by the repo palette (1–5 danger, 6–10 muted, 11–15 ok, 16–20 gold). They move slowly via the mastery model (§14). Each skill record is `{ mastery, obs, peak, lastPracticed }` — **`obs`** is the observation count (`obs += 1` per tagged decision, `+0.5` per drill) and is deliberately not called "confidence", which is reserved for the board meter `player.confidence`.

**מלאכה (craft) — 10**

| id | Hebrew | Gates / used by |
|---|---|---|
| risk | זיהוי והערכת סיכונים | risk-survey scenarios, heat-map ordering, moment hostility in risk presentations |
| controls | הבנת בקרות: תכנון מול תפעול | design-vs-operating scenarios, deficiency classification |
| testing | בדיקת בקרות ודגימה | sampling scenarios, ISOX moments |
| evidence | ראיות ותיעוד | evidence sufficiency, work-paper quality, inspection moments |
| writing | כתיבה מקצועית | report scenarios, procedure writing, gate deliverables (finding, report, procedure) |
| reg | ידע רגולטורי | regulatory items, scouting yield, inspection moments; sector familiarity shown as badges, not separate attributes |
| interview | ראיונות ותשאול | fieldwork interviews, what-to-ask scenarios |
| client | ליווי לקוח ועמידה בלחץ | validation meetings, pushback, procedure review rounds |
| present | הצגה לדרג בכיר | AC / board / CEO moments |
| prio | תעדוף וניהול זמן | portfolio scenarios, deadline pressure |

**Craft skillScore** for a decision is computed from the two rubric items that measure craft: `skillScore = (optionPts + infoPts) / (optionW + infoW) · 100` (with the scenario's rubric weights; in a light scenario without info actions it is `optionPts / optionW · 100`). Every craft skill tagged on the scenario (`skills[{id, w}]`) receives that same score weighted by its `w`.

**תהליך (decision process) — 6.** Each process skill's skillScore is the renormalised sum of the rubric items in its row (`Σpts / Σweights · 100`):

| id | Hebrew | Fed by rubric item(s) |
|---|---|---|
| framing | מסגור | framing |
| gather | איסוף מידע | info, noise |
| judgment | שיפוט ושיעורי בסיס | option |
| premortem | פרה-מורטם והפיכות | premortem, reversibility |
| escalation | הסלמה | escalation |
| memo | ממו ומעקב | memo, followup; plus a half-strength (`K·0.5`) observation of 100 or 0 when the מעקב answer matches or contradicts the record |

Process skills are updated on every full room; on a light scenario only the rows whose items exist are updated.

**שותפות (tier 5 only, greyed before) — 3:** `bd` פיתוח עסקי, `positioning` מיצוב ובידול, `datastory` סיפור בנתונים.

**Meters (0–100):** `energy` אנרגיה (visible), `confidence` אמון הפירמה (visible, the board), `rep` מוניטין מקצועי (visible), `integrity` יושרה (hidden; shown only as a word: «ללא רבב» ≥80, «תקין» 50–79, «מפוקפק» 20–49, «בבדיקה» <20). Reputation can only grow while integrity ≥ 60 (the single threshold used everywhere: §8, §10).

**Starting profile** for the real player's situation: craft 4–7, process 6–9, people-facing (interview, client, present) 5–7, `obs` 0 for every skill, energy 80, confidence 55, rep 20, integrity 85.

**Mastery bands** change the content, not the numbers: 1–7 «{מתחיל|מתחילה}» shows `hint` and base-rate cards; 8–13 «{מתפקד|מתפקדת}» hides hints; 14–17 «{מוסמך|מוסמכת}» appends `pushback` text and extra distractor options; 18–20 «{מומחה|מומחית}» serves `ambiguous: true` scenarios graded on process only. Decay shows as a red ▼ arrow with «לא תרגלת 8 שבועות» (`skill.decayed`, param `{n}` weeks).

---

## 5. Stakeholders & team

**Model.** One number per person: `trust` 0–100 toward the player. One `temper` tag (`blunt`, `political`, `supportive`, `absent`, `charming`) selects text variants. Everyone has `gender: "m"|"f"` so templates agree grammatically (§7). Every person has `memory` — flags written by scenarios (`dalia.downgraded`, `uri.shortcut_taken`) that later scenarios can `requires`. The cast lives in `world.cast`, keyed by id, independent of the current firm, so clients remember across firm moves and the mentor can leave.

**Starting trust** is authored per person as `trust0` in `cast.json` / `stakeholders.json`; when the key is missing the engine falls back by `role`:

| role | `trust0` default |
|---|---|
| mentor (partner at the starting firm) | 55 |
| engagement manager | 45 |
| rival | 40 |
| client contacts (control owners, treasurers, compliance officers, CFOs, CEOs, DPO, IT) | 35 |
| client internal auditor | 35 |
| regulator referent | 30 |
| juniors (tier 3+) | 50 |

So at game start no threshold below is met: the ≥ 60 unlocks must be earned (at +3 per קשרים block that is ≥ 2 blocks for the mentor, ≥ 5 for the manager, ≥ 9 for a client contact — or faster through scenario effects), and the `< 30` penalties start only after damage.

**Thresholds unlock concrete things** (compliance is a relationship business, taught mechanically):

| trust | effect |
|---|---|
| ≥ 60 control owner / client contact | evidence arrives on time: fieldwork work units +1 per 8h block on that engagement; evidence-type info actions cost half |
| ≥ 60 internal auditor at client | shares her plan: the next match's first moment is revealed in הכנה, and מוכנות +10 (§8) |
| ≥ 60 partner or manager at current firm | can be the player's **sponsor** for promotion |
| ≥ 60 colleague brought to a 5-moment match | in the הפסקה, the colleague's `colleagueHint` for the next moment is shown |
| ≥ 70 mentor | sends the two-line note (`mentor.note`) whenever a journal entry scores < 50 |
| < 30 anyone | hostile moment variants, info actions +50% cost, inbox friction items |

Trust moves ±2..±10 per authored effect, +3 (× `firm.trustMult`) per קשרים block, and decays −1/week after 6 **idle** weeks (floor 30 for colleagues at the current firm, floor 10 for everyone else). **Idle** = no scenario effect (`trust.<id>`), no קשרים block, no match attended by that person and no מעקב involving them for 6 consecutive weeks; any of these resets the idle counter.

**Persistent cast (v1, 8 people):**
- **נעמה שחר** — partner at אופק, the mentor (`role: "mentor"`, trust0 55). Leaves for גולדשטיין–ברק in season 3 (an `event` with `requires.season: 3`); chasing her is a career fork.
- **אורי לב** — first engagement manager (`role: "manager"`, trust0 45). Billable hours over rigour; his shortcuts raise confidence now and seed «ממצא שהוחמץ» incidents 2–4 seasons later.
- **תום אלקיים** — cohort rival (`role: "rival"`, trust0 40); promoted first when your confidence is low; occasionally your only ally in a hostile committee.
- **רו"ח דליה מזרחי** — audit-committee chair at a provident fund (trust0 35); remembers every finding you downgraded.
- **יוסי ברקת** — municipal treasurer (גזבר, trust0 35). Charming, obstructive, central to the public-sector track.
- **ענת קרן** — compliance officer at a mid-size bank (trust0 35); becomes your best client or your loudest critic.
- **הרפרנט/ית מבנק ישראל / רשות שוק ההון** — never named, always formal (`role: "regulator"`, trust0 30), appears in inspections and letters.
- **ד"ר מיכל אדרי** — internal auditor (מבקרת פנימית) at a government company (`role: "clientIA"`, trust0 35); shares her plan at trust ≥ 60.

**Client contacts** (`stakeholders.json`, ~28): 2–3 per client (מנהל/ת ביקורת פנימית, גזבר/ית, קצין/ת ציות, סמנכ"ל/ית כספים, מנכ"ל/ית, DPO, ראש/ת IT — written with tokens in content). **Juniors** (tier 3+) are cast entries with `attrs` assigned to engagements; v1 defines the field, v2 populates it.

---

## 6. Scenarios: the teaching unit

A scenario is one situation with trade-offs, delayed consequences and feedback that teaches the why. Three weights: `journal: "full"` (the decision room, ~2–4 minutes), `"light"` (context → optional info → options → feedback), `"none"` (news, letters). Full rooms are capped at 2 per week so the ritual stays special, not a form.

**Anatomy of a full decision room («חדר ההחלטה»), the steps the UI enforces in order:**

1. **ההקשר** — body (≤110 words) plus optional attachments (email, Excel excerpt, policy clause) that hold the critical detail. At band 1–7 a `hint` and a **base-rate card** are shown. A base-rate card is never free text with a number in it: the scenario names a row of `content/baseRates.json` (`"baseRate": "attr-25-1-90"`) and the card template fills `{n}`, `{dev}`, `{conf}`, `{upper}` from that row, e.g. «בתעשייה, בדגימת תכונות של {n} פריטים עם {dev} חריגה, הגבול העליון לשיעור החריגה באוכלוסייה הוא עד ~{upper}% ברמת ביטחון {conf}%» → «…של 25 פריטים עם חריגה אחת … עד ~15% ברמת ביטחון 90%» (0 deviations in 25 → ~9%; one deviation at 95% → ~19%). Each row cites its source (`source: "AICPA Audit Sampling, attribute table 10% risk of overreliance"` or `"Poisson upper bound"`), and `validate.mjs` recomputes the bound from `n`, `dev`, `conf` (binomial) and fails if the stored `upper` is off by more than one point.
2. **מסגור** — choose one of 3–4 framings. Each has `quality` 0–3 like an option; two can both be 3, so it is not a one-right-answer quiz. Typical set: correct / too narrow / political / non-problem.
3. **איסוף מידע** — 3–6 costed actions (`hours`). `kind`: `decisive` (sets a flag that unlocks options via `needsInfo` / `gate.info`), `noise`, `trap` (gossip; costs hours and may carry an effect). Energy < 30 doubles all costs. Gather-before-decide is enforced by the engine: gated options are shown greyed with their `gateText`, never hidden silently, and cannot be chosen until the gate is met.
4. **חלופות** — 3–5 options; usually one «להעלות ל{manager:מנהל|מנהלת} ההתקשרות» and often «לדחות בשבוע ולאסוף עוד». Hidden per option: `reversible`, `escalation` (`none|inform|escalate`), `tags` (closed vocabulary, `content/tags.json`, §7) for firm modifiers and detectors, `biasTags` (closed vocabulary) for the journal. Energy < 30 injects one extra tempting `quality: 0` «קיצור דרך» option (authored once per scenario as `shortcutOption`, or the engine's generic one from `strings.json` with no effects beyond `eng.work: 1`, `eng.quality: −4`).
5. **פרה-מורטם** — «אם זה ייכשל, זה כנראה כי…»: pick one of 3–5 authored failure modes. No free text, no keyword matching. The chosen mode's `signal` becomes memo field 3.
6. **ממו** — four fields: «מה החלטתי» (auto), «למה» (pick one of 3 authored rationales, each `fits` some options; optional free text), «מה יוכיח שטעיתי» (the signal from step 5), «מתי בודקים שוב» (2/4/8 weeks → schedules the **מעקב** item; the scenario's authored `followupWeeks` is the one that scores full marks, see the rubric — resolving §17 #3: free choice, graded).

Then **תוצאה**: the luck roll is shown («ההחלטה הייתה טובה; הפעם המזל לא שיחק לטובתך (25%)» — `luck.goodProcessBadOutcome` with `{p}`), immediate effects apply, the good/bad result appears, delayed consequences are enqueued (rolled now, stored), and the **feedback** opens.

**Feedback contract (required by the validator, per option):** `why` (principle + framework citation), `expert` («מה היה עושה אנליסט ותיק»), `bias` («הטיה לבדיקה», named), `rule` (one transferable line ≤ 15 words, e.g. «חריגה אחת היא שאלה, לא תשובה», «הפיך — פעל; בלתי הפיך — הסלם»). Never «נכון/לא נכון» alone. The Friday line always shows **«תוצאה X/10 · תהליך Y/10»** (`friday.line`). Light scenarios require `why` and `rule`; `expert` and `bias` are optional there.

**Process rubric (0–100), default weights, overridable per scenario.** Every item is computed by the engine from stored choices, never self-reported. With `W` the weight of each item:

| item | default W | points awarded |
|---|---|---|
| framing | 15 | `W · framingQuality / 3` |
| info (decisive) | 20 | `W · decisiveBought / decisiveTotal` (`W` if the scenario has no decisive info) |
| noise / trap avoided | 5 | `W` if no `noise` or `trap` action was bought; `W/2` if exactly one was bought and the scenario offers ≥ 2 such actions; else 0 |
| option quality | 20 | `W · optionQuality / 3` |
| pre-mortem fits | 10 | `W` if the chosen failure mode's `forOptions` includes the chosen option, else 0 |
| reversibility respected | 10 | `W` unless the chosen option is `reversible: false` **and** some `reversible: true` option exists with `quality ≥` the chosen option's quality; then 0 |
| escalation | 10 | ordinal `none=0 < inform=1 < escalate=2`; `d = chosen − rightEscalation`; `d = 0 → W`, `|d| = 1 → W/2`, `|d| = 2 → 0`; the journal records `calibration: "right" | "early" | "late"` (`d > 0` early = «זאב-זאב», `d < 0` late) |
| memo rationale fits | 5 | `W` if the chosen rationale's `fits` includes the chosen option, else 0 |
| follow-up date | 5 | `W` if the chosen window equals the scenario's `followupWeeks` (default 4); `W/2` if adjacent on the 2/4/8 ladder; else 0 |

`P = round(Σ points / Σ W · 100)`. Light scenarios use the subset of items that exists (info, noise, option, and escalation when `rightEscalation` is authored) and renormalise over those weights. **Validator invariant:** the option with the highest `quality` must have `escalation === rightEscalation` (two options tied at the top must both match), so the best play can never lose escalation points.

**Difficulty** 1–3 multiplies mastery gain, not damage. **Scenario-level tags**: `domain`, `sector` (ids or `"*"`), `engType` (ids or `"*"`), `phase` (id or `"*"`), `tier`, `skills[{id,w}]`, `family` (variant family for spaced repetition), `frameworks`, `lesson`, `baseRate`. **Option-level tags**: `tags`, `biasTags` (never on the scenario).

**Delayed consequences** carry `after` (weeks), `prob`, optional `recurring: {every, times}` for multi-season incidents (e.g. the regulator finds the downgraded finding, 35% per season for 3 seasons; all rolls are made at enqueue time and stored). A consequence can reference `failureMode` so the מעקב item can say whether the pre-mortem named the thing that bit. A consequence's `effect` is an ordinary DSL object, so flags are set with `flag.<name>`, never with a separate key.

**Rating scales are per engagement type** (`content/ratingScales.json`), because «ליקוי משמעותי / חולשה מהותית» is ICFR vocabulary and applying it to a council procurement audit teaches the wrong taxonomy:

| engType | scale id | pills (low → high) |
|---|---|---|
| isox | `icfr` | ליקוי · ליקוי משמעותי · חולשה מהותית |
| audit (חוק הביקורת הפנימית 1992 / פקודת העיריות / הוראה 307) | `severity` | חומרה נמוכה · חומרה בינונית · חומרה גבוהה |
| compliance | `compliance` | המלצה · אי-עמידה · הפרה |
| risk-survey | `riskBands` | נמוך · בינוני · גבוה · קריטי — shown as a pair (מובנה / שיורי = inherent / residual) |
| control-review | `designOp` | הערה · ליקוי תפעול · ליקוי תכנון |
| policy-writing | `docStatus` | טיוטה · בסבב הערות · מאושר (a status, not a severity) |

A scenario or moment that offers rating pills carries `"scale": "<scale id>"`; the validator checks that the scale exists and that it matches every `engType` the item is tagged with (a `"*"` engType requires the author to use `scaleByEngType: {…}` instead).

**Match moments** (`bank: "moment"`) are light scenarios with 3–6 ticker lines before the options and a `hostility` variant (`hostile|neutral|friendly`) chosen by the match engine (§8).

**Scenario families required in v1 beyond the original list:** `independence-self-review` (the firm wrote the procedure, now the audit plan includes it: disclose / decline / ring-fence / stay quiet) and `procedure-writing` (scope creep, who the owner is, approval flow, review cycle, controls that exist only on paper), both at tiers 1–2.

---

## 7. Scenario JSON schema

Exact shape; `content/scenarios.*.json` files are arrays of these objects. The validator (§15) enforces required keys per bank, ranges, text caps, that every `needsInfo`/`gate.info` matches an `info.sets`, every `failureMode` and `fits` id exists, every `lesson` exists in `lessons.json`, every `baseRate` exists in `baseRates.json`, every `scale` exists in `ratingScales.json`, every effect key is in the DSL, every option `tag` and `biasTag` is in `tags.json`, the top-quality option's `escalation` equals `rightEscalation`, that gendered tokens are well formed, and that **no slash form** (`[א-ת]/[א-ת]`) appears in any content string.

```json
{
  "id": "bank-aml-kyc-sample-v1",
  "family": "sampling-independence",
  "bank": "decision",
  "journal": "full",
  "tier": [1, 2],
  "difficulty": 2,
  "domain": "audit",
  "sector": ["bank"],
  "engType": ["audit", "compliance"],
  "phase": "fieldwork",
  "skills": [{ "id": "testing", "w": 0.5 }, { "id": "evidence", "w": 0.3 }, { "id": "gather", "w": 0.2 }],
  "frameworks": ["הוראת ניהול בנקאי תקין 308", "צו איסור הלבנת הון (חובות זיהוי)", "GIAS 2024 — ראיות מספיקות ומהימנות"],
  "cooldown": 30,
  "requires": { "flags": [], "notFlags": ["kyc_sample_done"], "minTrust": {}, "season": null },
  "rightEscalation": "inform",
  "followupWeeks": 4,
  "baseRate": "attr-25-1-90",
  "lesson": "sampling-population",

  "title": "המדגם שקצין הציות הכין",
  "body": "אתם בשבוע השני של ביקורת על תהליך \"הכר את הלקוח\" ב{client}, לפי צו איסור הלבנת הון והוראה 308. {contact} {contact:שלח|שלחה} מייל חביב: \"הכנתי לכם 15 תיקי לקוח מעודכנים, הכול מסודר, תחסכו זמן.\" עבודת השטח צריכה להסתיים בעוד שלושה שבועות ויש לכם עוד שני תיקים פתוחים.",
  "attachments": [{ "label": "המייל של {contact}", "text": "מצורפים 15 תיקים. כולם עודכנו ברבעון האחרון. בהצלחה!" }],
  "hint": "שאלה ראשונה בכל דגימה: מהי האוכלוסייה, ומי בחר את הפריטים?",
  "pushback": "{contact} {contact:מוסיף|מוסיפה}: \"בשנה שעברה הביקורת הסתפקה בזה.\"",

  "framings": [
    { "id": "f1", "text": "האם 15 התיקים האלה הם מדגם מייצג של האוכלוסייה שחייבת בעדכון?", "quality": 3 },
    { "id": "f2", "text": "האם אספיק לסיים את עבודת השטח בזמן?", "quality": 1 },
    { "id": "f3", "text": "האם קצין הציות מנסה להסתיר משהו?", "quality": 1 },
    { "id": "f4", "text": "אין כאן שאלה — קיבלתי חומר, בודקים אותו.", "quality": 0 }
  ],

  "info": [
    { "id": "pop", "kind": "decisive", "hours": 2, "label": "לבקש את רשימת האוכלוסייה המלאה של הלקוחות החייבים בעדכון", "reveal": "ברשימה 2,140 לקוחות; 190 מסווגים בסיכון גבוה; 15 התיקים שנשלחו כולם מסיכון נמוך.", "sets": "asked_population" },
    { "id": "method", "kind": "decisive", "hours": 1, "label": "לשאול את {manager:מנהל|מנהלת} ההתקשרות מה נהוג במשרד", "reveal": "\"מדגם מבוסס סיכון מתוך האוכלוסייה המלאה; המבוקר לא בוחר את המדגם. אבל זה התיק שלך.\"", "sets": "asked_method" },
    { "id": "gossip", "kind": "noise", "hours": 1, "label": "לשאול את תום מה הוא היה עושה", "reveal": "\"קח את ה-15, מי יבדוק? יש לך עוד שני תיקים.\"" },
    { "id": "lastyear", "kind": "trap", "hours": 2, "label": "לקרוא את דוח הביקורת של שנה שעברה", "reveal": "הדוח של שנה שעברה הסתמך על תיקים שהבנק בחר. אין ממצאים. (הרגולטור ביקר אותו על כך, אבל זה לא כתוב בדוח.)", "effect": { "energy": -2 } }
  ],

  "failureModes": [
    { "id": "m1", "text": "המדגם לא ייצג את הסיכון, והרגולטור ימצא מה שלא בדקנו.", "signal": "ממצא של בנק ישראל בלקוח בסיכון גבוה שלא היה במדגם שלנו", "forOptions": ["a"] },
    { "id": "m2", "text": "מדגם אקראי לא יתפוס אף לקוח בסיכון גבוה ונצטרך להרחיב.", "signal": "אפס לקוחות בסיכון גבוה במדגם", "forOptions": ["b"] },
    { "id": "m3", "text": "קצין הציות ייפגע ויעכב ראיות.", "signal": "ראיות מגיעות באיחור של יותר משבוע", "forOptions": ["c"] },
    { "id": "m4", "text": "{manager:המנהל יחשוב|המנהלת תחשוב} שאני לא {יודע|יודעת} לעבוד לבד.", "signal": "הערה על עצמאות בשיחת הרבעון", "forOptions": ["d"] }
  ],

  "rationales": [
    { "id": "r1", "text": "חיסכון בזמן חשוב יותר מהשלמות כשיש שני תיקים פתוחים.", "fits": ["a"] },
    { "id": "r2", "text": "עצמאות המדגם היא חלק מהראיה; כשהזמן קצר מקטינים מדגם, לא עצמאות.", "fits": ["b", "c"] },
    { "id": "r3", "text": "המתודולוגיה היא החלטה של {manager:המנהל|המנהלת}, לא שלי.", "fits": ["d"] }
  ],

  "options": [
    {
      "id": "a", "label": "לקבל את 15 התיקים ולהתקדם", "quality": 0,
      "tags": ["shortcut", "client-pleasing"], "biasTags": ["anchoring", "social-pressure"],
      "reversible": false, "escalation": "none",
      "immediate": { "energy": -1, "eng.quality": -4, "eng.work": 1, "trust.contact": 6, "flag.kyc_sample_done": 1 },
      "result": { "pGood": 0.3,
        "good": { "text": "15 התיקים תקינים. עבודת השטח נסגרת בזמן.", "effect": {} },
        "bad": { "text": "תוך כדי בדיקה אתם שמים לב שכל 15 התיקים הם לקוחות פרטיים קטנים.", "effect": { "confidence": -2 } } },
      "delayed": [
        { "after": 4, "prob": 0.7, "failureMode": "m1", "text": "בבדיקת בנק ישראל נמצא לקוח בסיכון גבוה ללא הצהרת נהנה. הממצא לא הופיע בדוח שלכם.", "effect": { "eng.quality": -15, "confidence": -8, "integrity": -4, "flag.kyc_missed_file": 1 } }
      ],
      "feedback": {
        "why": "המבוקר בחר את המדגם, ולכן הוא לא מדגם אלא מצגת. לפי GIAS 2024 ראיה צריכה להיות מספיקה ומהימנה, והוראה 308 מצפה שהביקורת תבחן את האוכלוסייה בסיכון, לא את מה שנוח.",
        "expert": "{מבקש|מבקשת} את האוכלוסייה, {מסווג|מסווגת} לפי סיכון, {בוחר|בוחרת} בעצמך, {ומתעד|ומתעדת} את השיטה בנייר העבודה לפני שנוגעים בתיק הראשון.",
        "bias": "עיגון: 15 התיקים שעל השולחן הפכו לברירת המחדל. ולחץ חברתי: המייל היה חביב.",
        "rule": "מדגם שהלקוח בחר הוא מצגת, לא מדגם."
      }
    },
    {
      "id": "b", "label": "לבקש את האוכלוסייה ולבחור מדגם אקראי של 25 תיקים", "quality": 2, "needsInfo": "asked_population",
      "tags": ["documentation"], "biasTags": ["procedure-bias"],
      "reversible": true, "escalation": "none",
      "immediate": { "energy": -1, "eng.quality": 4, "flag.kyc_sample_done": 1 },
      "result": { "pGood": 0.6,
        "good": { "text": "במדגם נפלו שני לקוחות בסיכון גבוה. אחד מהם ללא עדכון במועד — ממצא.", "effect": { "eng.quality": 3 } },
        "bad": { "text": "במדגם האקראי לא נפל אף לקוח בסיכון גבוה.", "effect": {} } },
      "delayed": [
        { "after": 3, "prob": 0.4, "failureMode": "m2", "text": "{manager} {manager:מבקש|מבקשת} להרחיב את המדגם ללקוחות בסיכון גבוה. שבוע עבודה נוסף.", "effect": { "eng.work": -1 } }
      ],
      "feedback": {
        "why": "טוב: המדגם שלכם, מתוך האוכלוסייה. חסר: אקראיות טהורה מפספסת את מה שהרגולטור מחפש, כי 9% מהאוכלוסייה מרכזים את רוב החשיפה. דגימה מבוססת סיכון היא הסטנדרט בביקורת ציות.",
        "expert": "{משלב|משלבת}: רוב הפריטים מהשכבה בסיכון גבוה, מיעוט אקראי מהשאר, {ומסביר|ומסבירה} את היחס בנייר העבודה.",
        "bias": "הטיית ההליך: 'אקראי' נשמע אובייקטיבי, אבל האובייקטיביות היא בשיטה המתועדת, לא במטבע.",
        "rule": "גודל מדגם הוא טיעון, לא מספר."
      }
    },
    {
      "id": "c", "label": "מדגם מבוסס סיכון: 20 תיקים בסיכון גבוה + 10 אקראיים, ולתעד את שיטת הבחירה", "quality": 3,
      "gate": { "info": ["asked_population"] }, "gateText": "דורש את רשימת האוכלוסייה המלאה",
      "tags": ["documentation", "initiative"], "biasTags": [],
      "reversible": true, "escalation": "inform",
      "immediate": { "energy": -2, "eng.quality": 8, "trust.contact": -3, "flag.kyc_sample_done": 1 },
      "result": { "pGood": 0.75,
        "good": { "text": "נמצאו 3 תיקים בסיכון גבוה ללא עדכון במועד. {contact} לא {contact:מרוצה|מרוצה}, אבל הממצא מבוסס.", "effect": { "rep": 3, "flag.finding_kyc_def": 1 } },
        "bad": { "text": "המדגם נקי. {contact} {contact:מזכיר|מזכירה} לכם בחיוך ש{contact:הוא אמר|היא אמרה}.", "effect": { "trust.contact": -2 } } },
      "delayed": [
        { "after": 6, "prob": 0.5, "failureMode": "m3", "text": "ראיות לתיקים הנוספים מגיעות באיחור. {contact} '{contact:עסוק|עסוקה}'.", "effect": { "eng.work": -1 } }
      ],
      "feedback": {
        "why": "זה הסטנדרט: אוכלוסייה → סיכון → מדגם → תיעוד, ושורה ל{manager:מנהל|מנהלת} ההתקשרות שמעדכנת (לא שואלת). אמון הלקוח ירד קצת, וזה בסדר; אמון נבנה על דוח שעומד מול הרגולטור, לא על נוחות.",
        "expert": "בדיוק זה, ובנוסף {שולח|שולחת} ל{contact} שורה אחת שמסבירה למה: 'המתודולוגיה שלנו, לא חוסר אמון'.",
        "bias": "אין הטיה לתקן כאן; הסיכון הוא ביישום — שלא תתעדו כי 'ברור'.",
        "rule": "מדגם מתחיל מהאוכלוסייה, לא מהתיקים שמישהו הביא."
      }
    },
    {
      "id": "d", "label": "להעלות ל{manager:מנהל|מנהלת} ההתקשרות ולבקש הנחיה", "quality": 1,
      "tags": ["escalate"], "biasTags": ["responsibility-transfer"],
      "reversible": true, "escalation": "escalate",
      "immediate": { "trust.manager": -2, "flag.kyc_sample_done": 1 },
      "result": { "pGood": 0.5,
        "good": { "text": "{manager} עונה בשורה: 'אוכלוסייה, סיכון, מדגם שלך. למה שאלת?'", "effect": {} },
        "bad": { "text": "{manager} בשטח אצל לקוח אחר. תשובה רק בעוד יומיים.", "effect": { "eng.work": -1 } } },
      "delayed": [],
      "feedback": {
        "why": "העלאה היא כלי, לא תחליף לשיקול דעת. כאן המתודולוגיה ברורה ואין צורך בסמכות; לשאול 'מה לעשות' בלי להציע מה היית עושה מוריד נקודות אצל {manager:המנהל|המנהלת}.",
        "expert": "אם כבר מעלים — {מגיע|מגיעה} עם הצעה: 'אני {מתכנן|מתכננת} מדגם מבוסס סיכון, 30 תיקים. {manager:מתנגד|מתנגדת}?'",
        "bias": "הימנעות מסיכון: העברת האחריות מרגישה בטוחה, אבל היא מתועדת כחוסר עצמאות.",
        "rule": "מסלימים כשחסר מידע או סמכות, לא כשחסר אומץ."
      }
    }
  ],

  "rubric": { "framing": 15, "info": 20, "noise": 5, "option": 20, "premortem": 10, "reversibility": 10, "escalation": 10, "memo": 5, "followup": 5 }
}
```

The worked example is internally consistent with the rubric: option **c** is the top-quality option and carries `escalation: "inform"` = `rightEscalation`, so a perfect play (f1 + pop + method, no noise, c, m3, r2, 4 weeks) scores P = 100.

**Placeholders**: `{client}`, `{contact}`, `{manager}`, `{mentor}`, `{regulator}`, `{firm}`, `{player}` are filled at draw time from the engagement, the cast and the player.

**Gendered tokens — two families, one rule each (resolves §17 #2):**
- `{masc|fem}` with **no prefix** resolves by the **player's** gender (chosen at new game). Use it for everything said to or about the player.
- `{<who>:masc|fem}` with a prefix resolves by that person's `gender`: `contact`, `manager`, `mentor`, `regulator`, or any cast/contact id (`{dalia:אומרת|אומר}` is rejected — order is always masc|fem). The old "nearest preceding placeholder" rule is gone; an unprefixed token never refers to an NPC.
- Plural/neutral forms («אתם», «לכם», «הצוות») are allowed and need no token.
- **Slash forms are forbidden** in every content file and in `strings.json` (`/[א-ת]\/[א-ת]/` fails validation), so «מנהל/ת», «אמר/ה» cannot slip through. The validator also rejects unbalanced braces, tokens with more or fewer than two alternatives, and unknown prefixes.

**Option gates.** An option may carry `needsInfo: string | string[]` (all listed `info.sets` flags must be bought) — this is the short form of `gate.info`. The general form is
`gate: { info?: string | string[], prep?: number, trust?: { id: castId | "contact" | "manager" | "mentor", min: number } }` with a sibling `gateText` (the greyed reason shown to the player; when omitted the engine uses `gate.info` / `gate.prep` / `gate.trust` from `strings.json` with the info label, the prep number or the person's name as params). `prep` gates are meaningful only in moments (§8); the validator warns on a `prep` gate in a decision bank. An option may use `needsInfo` or `gate`, not both.

**Required keys per `journal` weight:**
- `full`: everything in the example — `framings`, `info`, `failureModes`, `rationales`, `options` (each with `quality`, `reversible`, `escalation`, `immediate`, `result`, `feedback.{why,expert,bias,rule}`), `rightEscalation`, `rubric` (optional; defaults apply), `followupWeeks` (optional, default 4), `skills`, `lesson`.
- `light`: `id`, `family`, `bank`, `tier`, `domain`, `title`, `body`, `options` (each with `quality`, `immediate`, `result`, `feedback.{why,rule}`); optional `info`, `rightEscalation`, `rubric`, `skills`, `sector`/`engType`/`phase` (default `"*"`), `requires`, `cooldown`, `lesson`.
- `none`: `id`, `bank`, `tier`, `title`, `body`, `sender` (cast id or `"system"`), `effect` (DSL, may be `{}`); optional `requires`, `scoutable`, `leadWeeks`, `attachments`.

**`requires`** = `{ flags: [names], notFlags: [names], minTrust: { [castId | "contact" | "manager" | "mentor"]: number }, season: number | null, week?: [from, to], tier?: number }`. Trust keys resolve against the engagement the item is drawn for.

**Wildcards.** `sector`, `engType` and `phase` accept `"*"` (`sector: ["*"]`, `engType: ["*"]`, `phase: "*"`); a wildcard item matches any active engagement and is also the only kind drawn when no engagement is active (§14 fallback).

**Flags — one mechanism.** Flags are set only through the effect DSL key `flag.<name>` (value `1`, or `0` to clear), in `immediate`, in a result's `effect`, or in a delayed consequence's `effect`. There is no `setFlag` scenario key and no bare `flag` on consequences; the validator rejects both. A scenario that should run once sets its own flag in every option's `immediate` and lists it in `requires.notFlags` (as the example does). Flags are read by `requires.flags/notFlags`, by match moments, and by the cast `memory` (a flag of the form `<castId>.<name>` is mirrored into that person's `memory`).

**Effect DSL keys**: `energy`, `confidence`, `rep`, `rep.regulator` (reputation sourced from a regulator citation; multiplied by `firm.repMult.regulator`), `integrity`, `eng.quality`, `eng.work`, `eng.deadline`, `trust.contact`, `trust.manager`, `trust.mentor`, `trust.<castId>`, `skill.<id>` (±0.3 cap), `flag.<name>`. Caps per decision: `eng.quality` ±15, `confidence` ±10, `rep` ±8, `integrity` ±15. Unknown keys fail validation at build time and are ignored at runtime (saves from older content). Integrity moves **only** through the DSL (`integrity: -4` on the option that deserves it); there is no tag-driven integrity rule.

**Option tags (`content/tags.json`, closed vocabulary; unknown tags fail validation; `firm.tagMult` keys must come from this list):**

| tag | Hebrew label | meaning |
|---|---|---|
| shortcut | קיצור דרך | skipped a step to save time |
| client-pleasing | ריצוי לקוח | chose what the client wanted over the method |
| documentation | תיעוד | documented the method/evidence |
| initiative | יוזמה | proposed instead of asking |
| escalate | הסלמה | raised to manager/partner/regulator |
| defer | דחייה | postponed to gather more |
| independence | עצמאות | protected independence/objectivity |
| disclosure | גילוי | disclosed a conflict, error or limitation |
| scope-cut | צמצום היקף | reduced scope under pressure |
| over-testing | בדיקת יתר | tested beyond what the risk justified |
| political | פוליטי | chose for internal politics |
| delegate | האצלה | handed the task to someone else |
| downgrade | הורדת דירוג | lowered a finding's rating under pressure |
| hide | הסתרה | concealed a finding or error |
| tip-off | הדלפה | tipped off a subject (AML) |

`biasTags` vocabulary (same file, `biases` section): `anchoring`, `social-pressure`, `procedure-bias`, `responsibility-transfer`, `sunk-cost`, `availability`, `overconfidence`, `authority`, `confirmation`, `status-quo`, `planning-fallacy`, `loss-aversion`, `risk-aversion` — each with a Hebrew label used by the journal.

**Other banks share the engine but have small schemas**: `moments.json` (light scenario + `matchType`, `ticker: {hostile:[...], neutral:[...], friendly:[...]}` 3–6 lines each, optional `scale`, optional `colleagueHint`, options may use `gate.prep` / `gate.trust`), `matchTypes.json` (§8), `events.json` (journal `none`, `requires.season/week`, `scoutable`, `leadWeeks`), `deliverables.json` (§10), `firms.json` (§10), `clients.json` (`{id, name, sector, regulator, isox: bool, contacts: [ids], iaId}`), `stakeholders.json`, `cast.json`, `lessons.json`, `drills.json`, `seasons.json` (§14), `awards.json`, `ratingScales.json`, `baseRates.json`, `tags.json`, `strings.json` (§15).

---

## 8. "Matches": high-stakes events

A match is an engagement's key moment or an external shock. Types in v1 (`content/matchTypes.json`): **תיקוף ממצאים מול הלקוח** `validation` (end of findings phase; for `policy-writing` the same type is labelled «סבב הערות עם בעל התהליך»), **הצגה לדרג בכיר** `present` (end of present phase: ועדת ביקורת / דירקטוריון / מנכ"ל / מנכ"לית משרד; for `policy-writing`: «אישור הנוהל בהנהלה»), **ביקורת רגולטור** `inspection` (1–2 per season at financial clients; the regulator reads *your* earlier reports — moments `requires` flags like `kyc_missed_file`), **תקרית** `incident` (2 per season, any week: privacy leak, AML alert, whistleblower letter), **ועדת ביקורת רבעונית** `ac` (quarterly set piece, §3 picks the client).

**`matchTypes.json`** (every moment's `matchType` must exist here, enforced by the validator):

```json
[
  { "id": "validation", "hebrew": "תיקוף ממצאים מול הלקוח", "moments": 3,
    "fit": { "basis": { "risk": 3, "rules": 1 }, "transparency": { "full": 3, "managed": 1 }, "escalation": { "low": 1, "high": 2 } } },
  { "id": "present",    "hebrew": "הצגה לדרג בכיר", "moments": 3,
    "fit": { "basis": { "risk": 3, "rules": 1 }, "transparency": { "full": 2, "managed": 2 }, "escalation": { "low": 1, "high": 3 } } },
  { "id": "inspection", "hebrew": "ביקורת רגולטור", "moments": 5,
    "fit": { "basis": { "risk": 1, "rules": 3 }, "transparency": { "full": 3, "managed": 0 }, "escalation": { "low": 0, "high": 3 } } },
  { "id": "incident",   "hebrew": "תקרית", "moments": 3,
    "fit": { "basis": { "risk": 3, "rules": 1 }, "transparency": { "full": 3, "managed": 1 }, "escalation": { "low": 0, "high": 3 } } },
  { "id": "ac",         "hebrew": "ועדת ביקורת", "moments": 5,
    "fit": { "basis": { "risk": 3, "rules": 2 }, "transparency": { "full": 2, "managed": 2 }, "escalation": { "low": 2, "high": 2 } } }
]
```

**Structure (no real-time, "live" through pacing):**

1. **הכנה לאירוע** (the week before, in the inbox): the opponent's "team sheet" — who attends, what will be examined, the engagement's current quality and findings. The player sets three discrete approach toggles (**גישת עבודה**): «מבוסס סיכון / מבוסס כללים» (`basis: risk|rules`), «שקיפות מלאה / מנוהלת» (`transparency: full|managed`), «סף הסלמה נמוך / גבוה» (`escalation: low|high`). **`fit`** = mean of the three per-toggle values from the match type's table (0–3). **מוכנות** (`prep`, 0–100):
   `prep = clamp(12 · workBlocksOnThisEngagementInLast3Weeks + 0.4 · eng.quality + 10 · [trust(client IA) ≥ 60] + 5 · fit, 0, 100)`
   (three work blocks on a quality-60 engagement with a friendly IA and a well-fitting approach → 36 + 24 + 10 + 15 = 85). Trust ≥ 60 with the client's internal auditor also reveals the first moment's topic. The three toggles persist in `player.approach` between matches.
2. **רגעים** — `matchTypes[type].moments` moments (3, or 5 for `inspection` and `ac`). Each moment: the ticker prints its lines one tap at a time («המשך ▸»), then a decision card (light scenario, 2–4 options, some gated by `gate.info` on information bought *before* the match in the engagement's scenarios, by `gate.prep` (e.g. `{prep: 60}`), or by `gate.trust` (e.g. `{id: "manager", min: 60}`) — always shown greyed with `gateText`, never silently). Hostility per moment is drawn with `p = clamp(0.20 + 0.03·avg(skills) + 0.004·eng.quality + 0.002·trust.client + 0.002·prep + 0.05·fit − 0.10·[energy<30], 0.08, 0.95)`: roll < p → friendly, < p+0.25 → neutral, else hostile. `p` picks the text and the swing size; the player's choice still decides.
3. **הפסקה** after the second moment in 5-moment matches: change one toggle (fit and prep are recomputed), or ask a brought colleague for a line (trust ≥ 60: the next moment's `colleagueHint` is shown).
4. **סיכום האירוע**: a findings sheet (ratings as pills from the engagement type's scale, §6), the closing tone, a one-line headline for «מה אומרים בשוק», and **ציון ביצוע 1–10** for the player and each participant (FM player ratings), stored in `stats.ratings` and feeding confidence:
   - player: `rating = clamp(round(2 + 8 · mean(optionQuality / 3) + 0.01 · (prep − 50) − 0.5 · hostileMomentsLost), 1, 10)` where `hostileMomentsLost` = hostile moments on which the chosen option had `quality ≤ 1`.
   - each participant (cast/contacts attending): `rating = clamp(round(5 + trust / 25 − [hostile]), 1, 10)` where `[hostile]` = 1 if at least half the moments drew `hostile`.

**Scheduling and auto-resolution.** A match is scheduled for week `W+1` when its trigger fires in the tick into week `W` (§14). It is placed in the inbox at the tick **into** `W+1` and can be played any time during that week; if it is still unplayed at the tick **out of** `W+1` it auto-resolves at `neutral` hostility with `quality: 1` choices, the note `match.autoResolved` and `confidence −3`. Playing a match costs energy −4 (auto-resolve costs nothing but the ratings are what `quality: 1` gives).

**Three lines and independence (engine rule).** Every engagement carries `line: 2 | 3` (`policy-writing`, `risk-survey` and advisory `compliance` work are line 2; `audit`, `isox`, `control-review` and assurance `compliance` reviews are line 3 — the season template states it per engagement). The engine keeps `world.firmHistory[clientId] = [{process, line, season}]`. When a line-3 engagement starts on a client where the firm did line-2 work on the **same `process`** within the last 2 seasons, the engagement is flagged `selfReview: true`, the planning-phase draw is forced to the `independence-self-review` family (disclose to the partner and the client's AC / decline / ring-fence with a different team / say nothing), and running the audit without disclosure carries `integrity −10` and a 50% delayed «הרגולטור שואל מי כתב את הנוהל» consequence. The lesson text cites GIAS 2024 (objectivity, 1100-series) and the independence clauses of הוראה 307 and חוק הביקורת הפנימית.

**Scouting = regulatory monitoring.** «ניטור רגולטורי» hours accumulate scouting points (1 per 4h block); at 2 points the next `scoutable` event (a circular, an inspection notice, a תיקון 13 deadline) appears `leadWeeks` early as «מבט קדימה» (`scout.ahead`), becomes a planned mini-engagement, its negative effect halves, and the 2 points are consumed. Threats seen early are projects, not incidents.

**Resolution.** `eng.quality += Σ moment deltas`; `confidence += (eng.quality − 50)/10 + Σ(rating − 6)/2` over the player's and participants' ratings; `rep += (eng.quality − 60)/20` if integrity ≥ 60. Deadline misses before a match cost `confidence −6`, `trust.client −4` per overdue week.

---

## 9. Decision journal & process feedback

The journal («יומן ההחלטות») is the spine, meant to leak into real life.

**Every journal-tagged decision stores** (`kind: "full" | "light" | "moment"`): week, engagement, scenario id and family, framing chosen (+quality), info bought / missed / noise / trap, option (+quality, tags, biasTags, reversibility, escalation, calibration right/early/late), failure mode picked, memo rationale, follow-up window chosen and the scenario's `followupWeeks`, rubric breakdown, process score P, outcome O (1–10, §14), luck roll (`pGood`, outcome), energy at decision time, delayed consequences (filled in as they land), מעקב answer and the record, «מה למדתי» (optional free text), and **`applied: { confidence, rep, engQuality, integrity, trust: { [id]: n } }`** — the deltas actually applied after caps and firm multipliers, from immediate + result effects, **updated in place when each delayed consequence lands**. Light scenarios create a reduced entry (no framing / premortem / memo / followup fields; rubric over the subset). Match moments create entries tagged `kind: "moment"` with `matchId`, `matchType`, `hostility`, and no info/framing fields.

**Metrics computed from rubric tags (no AI):** process mean and trend; info-before-decide rate; noise/trap rate; escalation calibration (right / too early «זאב-זאב» / too late); reversibility violations; pre-mortem hit rate (did the signal materialise?); follow-up completion; per-domain and per-skill process means; outcome-vs-process divergence counts, defined as **good process, bad outcome = `P ≥ 70 ∧ O ≤ 4`** and **bad process, good outcome = `P ≤ 40 ∧ O ≥ 7`**.

**The 12 pattern detectors** («דפוסים»; each is `{id, hebrew, predicate, minN}` in `engine.js`, with the Hebrew template in `strings.json` under `pattern.<id>`). A detector fires only when its denominator has at least `minN = 4` entries (season-to-date, full + light; moments count where noted) and its condition holds; the panel shows at most 5 lines, strongest first:

| id | Hebrew template (`strings.json`) | predicate |
|---|---|---|
| late-escalation-by-domain | «ב-{k} מתוך {n} החלטות בתחום {domain} הסלמת מאוחר מדי» | per domain: `n` entries with `rightEscalation`, `k` with calibration `late`; fires when `k/n ≥ 0.5` |
| early-escalation | «ב-{k} מתוך {n} החלטות הסלמת מוקדם מדי — זאב-זאב» | `k` entries with calibration `early`; fires when `k/n ≥ 0.4` |
| info-skipped-decisive-missed | «ב-{pct}% מהמקרים שבהם לא אספת מידע, בחרת חלופה חלשה» | `n` entries with `decisiveTotal > 0` and `decisiveBought = 0`; `pct` = share with chosen quality ≤ 1; fires when `pct ≥ 50` |
| irreversible-under-pressure | «{k} פעמים בחרת חלופה בלתי הפיכה כשהייתה הפיכה באותה איכות; {j} מהן באנרגיה נמוכה» | reversibility item scored 0; fires when `k ≥ 3`; `j` = those with energy < 30 |
| trap-buyer | «קנית רכילות או מידע-מלכודת ב-{k} מתוך {n} חדרי החלטה» | entries with ≥ 1 `noise`/`trap` bought; fires when `k/n ≥ 0.4` |
| premortem-miss | «ב-{k} מתוך {n} ההחלטות שבהן התממש כישלון, הפרה-מורטם לא ניבא אותו» | entries with a landed consequence carrying `failureMode`; `k` where it differs from the picked mode; fires when `k/n ≥ 0.5` |
| followup-ignored | «{k} פריטי מעקב לא נענו או נענו באיחור של יותר משבוע» | מעקב items unanswered when the next arrives, or answered > 1 week late; fires when `k ≥ 3` |
| noise-under-low-energy | «באנרגיה מתחת ל-30 קנית רעש פי {x} יותר» | noise rate at energy < 30 divided by noise rate otherwise, both denominators ≥ 4; fires when `x ≥ 1.5` |
| same-family-regression | «ב«{family}» הציון שלך ירד מ-{p1} ל-{p2}» | a family with ≥ 2 entries whose latest P is ≥ 15 below the previous; fires per family, at most 2 lines |
| crunch-dip | «בשבועות עם שני חדרי החלטה ואירוע, התהליך שלך יורד ב-{d} נקודות» | mean P in weeks with 2 full rooms + a match vs other weeks, both ≥ 4; fires when `d ≥ 10` |
| good-process-bad-luck | «{k} פעמים תהליך ≥ 70 הסתיים בתוצאה ≤ 4 — זה מזל, לא אתה» (token: «{אתה|את}») | divergence count (good, bad); fires when `k ≥ 2` |
| bad-process-good-luck | «{k} פעמים תהליך ≤ 40 הסתיים בתוצאה ≥ 7 — זה מזל, לא שיטה» | divergence count (bad, good); fires when `k ≥ 2` |

**Views:** **ציר זמן** (P as a navy bar, O as a gold bar, side by side); **דפוסים** — the detector lines above; **הערת המאמן/ת** (the mentor's quarterly line); **ייצוא** as Markdown (same headings the player can use at work: `## שבוע · לקוח · השאלה · מה ידעתי · חלופות · מה החלטתי · מה יוכיח שטעיתי · מתי בודקים`).

**Closing the loop on prediction:** the **מעקב** inbox item arrives on the follow-up date (or when the first delayed consequence lands, whichever is first), reopens the entry, shows what actually happened, and asks «האם הסימן שציינת התממש?» (`followup.question`). The engine already knows (via `failureMode` on the consequence) and shows both the player's answer and the record — calibration, not a quiz — and feeds the `memo` skill (§4).

**Quarter review («שיחת רבעון»):** the manager quotes the three lowest process-score decisions back, with their rules.

**End-of-season report («סיכום עונה»):** Q̄ per engagement; «תוצאות» and «תהליך» lines for the season; attribute deltas with arrows; relationship map deltas; the **three decisions that mattered most** — ranked by `|applied.confidence| + |applied.rep| + |applied.engQuality|` from the stored `applied` object (so delayed effects that landed are included and caps/firm multipliers are already in) — each with **the branch not taken** (the highest-quality option not chosen and its `why`); the pattern lines; the sponsor's verdict paragraph (assembled from authored sentences keyed to score bands and relationship); awards.

---

## 10. Progression, promotion, job offers, reputation, board confidence; losing conditions

**ציון עונה** = 0.40·mean(eng.quality) + 0.35·mean(P) + 0.25·confidence.

**Promotion at the annual review (week 48) requires all of:**
1. ציון עונה ≥ 62 + 4·(tier−1) and `confidence` ≥ 70 (firm `promoDelta` adjusts both thresholds).
2. **Gate deliverable ≥ 65** — a structured builder, played in weeks 44–47 when eligible. A deliverable is a list of **parts**, each with a `kind` and a `weight`; weights sum to 100 and the score is the weighted sum of part scores (each 0–100):
   - `kind: "slots"` — 5 slots; each slot offers 4 candidate sentences (best 20, slot-confused 10, vague 5, wrong 0) with per-slot feedback; part score = Σ/100·100.
   - `kind: "ratings"` — rate `n` items on authored scales (e.g. סבירות × השפעה 1–5, inherent and residual); part score = `100 · mean(1 − |Δ| / maxΔ)` over all rated cells against the authored answer.
   - `kind: "order"` — order `n` items (heat map, slides); part score = `100 · (1 + τ) / 2` with Kendall's τ against the authored order.
   - `kind: "match"` — pair `n` items (responses ↔ findings) and optionally accept/reject/revise each; part score = 20 per correct pair capped at 100 (`n = 5`), with a reason choice worth half of each pair's points when present.
   Tier 1: one `slots` part — a finding from the season's own engagement (מצב / קריטריון / סיבה / השפעה / המלצה). Tier 2 — דוח סקר סיכונים: `ratings` (6 exposures, סבירות × השפעה, inherent vs residual) weight 40 · `order` (the heat map) weight 25 · `match` (pick the three for the executive summary, as 3 pairs to "in / out") weight 20 · `slots` (the opening sentence, one slot) weight 15. Tier 3: `match` — 5 management responses to findings with accept / reject / revise and a reason. Tier 4: `order` — the AC narrative (opening line, 5 slides, the ask). Tier 5: `slots` — positioning memo (segment, value proposition, proof). **Practice builders** (no score, any time in «ספריית הידע»): the tier-1 finding, the tier-2 report, and **«כתיבת נוהל»** — a `slots` builder with 6 slots (מטרה · תחולה · אחריות · שלבי התהליך · בקרות · מחזור עדכון ואישור) over the season's `policy-writing` engagement, reusing the same builder with `slots: 6`.
3. **The sponsor's vote:** a partner or manager at the current firm with trust ≥ 60 must argue the case. If the mentor left, nobody does — which is how the game nudges the player toward the transfer window.
4. Tier minimums on the primary attributes (tier 2: testing, evidence, writing ≥ 8; tier 3: client, prio ≥ 11; tier 4: present ≥ 14; tier 5: rep ≥ 75 for a full season).

Failing promotion twice at the same tier triggers «שיחה קשה» and offers from smaller firms (faster ladder, lower prestige). The rival is promoted first whenever `confidence < 65` at review.

**Job offers («חלון ההצעות»)** open weeks 1–6. Offer probability per firm = `clamp((rep − firm.minRep)/40, 0, 0.9) × firm.need`. A card shows title, pay multiplier (score only), the board's objectives (`firm.boardObjectives`), the firm's philosophy, and a scouting line if monitoring hours were spent on it. Accepting resets `confidence` to 50, keeps attributes, journal and cast memory, and moves the network but not the sponsor.

**Firms (`content/firms.json`, v1 ships four; «הפרקטיקה שלי» is v2 with tier 5).** Full schema, every key required (empty objects allowed):

```json
{ "id": "ofek", "name": "אופק ביקורת פנימית", "prestige": 45, "pay": 0.9,
  "minRep": 0, "need": 1.0, "hoursPenalty": 0, "promoDelta": -5, "trustMult": 1.5, "incidentRate": 1.0,
  "tagMult": {}, "infoCostMult": {}, "skillGainMult": {}, "repMult": {},
  "philosophy": "…", "sectors": ["muni", "ministry", "govco"],
  "boardObjectives": [ { "metric": "meanQ", "target": 60, "hebrew": "איכות ממוצעת של התיקים ≥ 60" },
                       { "metric": "confidence", "target": 60, "hebrew": "אמון הפירמה ≥ 60 בסוף העונה" } ] }
```

`metric ∈ {meanQ, meanP, confidence, rep, onTime (share of engagements closed by deadline), findings (count)}`; objectives are shown on the offer card and on «הפירמה», and missing all of them at week 48 costs `confidence −5`.

| Firm (`id`) | Profile | Values |
|---|---|---|
| גולדשטיין–ברק ושות' (`goldstein`) | Big-Four style; banks, insurers, ISOX entities | prestige 90, pay 1.4, minRep 55, need 0.6, hoursPenalty 4 (the 44-hour culture), promoDelta 0, trustMult 1.0, incidentRate 1.0, `tagMult: {documentation: 1.1, initiative: 0.9}`, rival density high |
| אופק ביקורת פנימית (`ofek`) | public-sector outsourcer under חוק הביקורת הפנימית 1992 and פקודת העיריות | prestige 45, pay 0.9, minRep 0, need 1.0, hoursPenalty 0, promoDelta −5, trustMult 1.5; where the player starts by default |
| קסטל ניהול סיכונים (`castel`) | risk-survey house (310/350/361) | prestige 65, pay 1.1, minRep 35, need 0.7, hoursPenalty 2, promoDelta 0, `infoCostMult: {evidence: 1.5}` (its own methodology penalises evidence time), incidentRate 1.5, `skillGainMult: {risk: 1.3}` (fastest growth in `risk`) |
| שגב–פרץ ציות ורגולציה (`segev`) | compliance-law boutique (308/411/AML/תיקון 13) | prestige 70, pay 1.2, minRep 45, need 0.5, hoursPenalty 2, promoDelta +5 (slow ladder), `repMult: {regulator: 1.5}` (reputation from `rep.regulator` effects ×1.5) |
| הפרקטיקה שלי (v2, tier 5) | two-person practice | prestige 20, `confidence` replaced by cash runway; win at prestige 60 — **not in v1** |

**Reputation** grows from engagements closed with quality ≥ 60 (only while integrity ≥ 60), awards, regulator citations (`rep.regulator`) and headlines; it halves on dismissal. **Integrity** moves only through DSL effects authored on the options that deserve it (downgrading under pressure, hiding, tipping off, auditing a self-written procedure without disclosure), +1/season recovery.

**Losing conditions** (all survivable except one):
- `confidence < 25` at two consecutive quarter closes → **פיטורים** (`dismissal.confidence`): post-mortem screen listing the journal entries that led there; continue at a lower-prestige firm, rep halves.
- `flag.material_failure` while `rep < 30` → fired the same week (`dismissal.materialFailure`).
- `integrity < 20` → **«ועדת אתיקה»** ending (`ending.ethics`): the career ends with a journal retrospective; a new career can start with the «מורשת» badge.
- `energy < 10` for 4 consecutive weeks → forced leave of 4 weeks (`leave.forced`), all attributes −0.5, confidence −5.

**Endings:** «הגעת לפסגה» (`ending.summit`) — tier 5 at a prestige ≥ 70 firm or own practice at prestige 60; «הצד השני» (`ending.otherSide`) — accepted the tier-3 in-house crossroads; «הקריירה נגמרה» (`ending.careerOver`) — three dismissals; **v1 milestone «{אנליסט בכיר|אנליסטית בכירה}»** (`ending.v1Milestone`, §2) at the first promotion to tier 2. **Awards at week 48** («טקס הפרסים», names in `awards.json` + `strings.json`): «{אנליסט|אנליסטית} השנה» (`award.analystOfYear`), «הממו הכי טוב» (`award.bestMemo`, highest P), «ההסלמה של העונה» (`award.escalation`, a right escalation that mattered), «הממצא של העונה» (`award.finding`), and the shame award **«זאב-זאב»** (`award.wolf`, most `early` calibrations). Awards go on the «קורות חיים» screen.

---

## 11. Calendar & season structure

A season is one calendar year of **48 playable weeks**, four per month, four quarters. Holidays are real weeks with their own rules: no new scenario draws, energy +10, deadlines never fall on them (a deadline that would land on a holiday week moves to the next week), inbox shows «חג שמח» from the mentor (`holiday.greeting`).

| Weeks | Month | Phase | Fixed events |
|---|---|---|---|
| 1–4 | ינואר | תכנון שנתי | transfer window (1–6), annual audit plans to committees, ISOX scoping, new portfolio |
| 5–8 | פברואר | | risk-survey refreshes |
| 9–12 | מרץ | עבודת שטח | **«הצהרת הנהלה»** (10, event for every ISOX client: management's certification in the annual report — the player's control conclusions are quoted back, moments `requires` ISOX flags), Q1 ועדת ביקורת (12), שיחת רבעון |
| 13–16 | אפריל | | **פסח** (15, holiday) |
| 17–20 | מאי | | יום הזיכרון / יום העצמאות (18, light week: draws −1) |
| 21–24 | יוני | | שבועות (22, light), Q2 ועדת ביקורת (24), שיחת רבעון |
| 25–28 | יולי | ISOX ותיקוף | control testing, deficiency evaluation; «הסתמכות רואה החשבון המבקר» moment (the external auditor asks what your sample size was based on — scenario #9) |
| 29–32 | אוגוסט | | slow month: draws −1, client contacts `absent` variants, energy +4/week |
| 33–36 | ספטמבר | | Q3 ועדת ביקורת (35), **ראש השנה** (36, holiday) |
| 37–40 | אוקטובר | דיווח | **יום כיפור / סוכות** (37, holiday); «אחרי החגים» crunch (38–40: draws +1) |
| 41–44 | נובמבר | | report season; **«עדכון לסוף שנה (roll-forward)»** for ISOX clients (41–44: update testing of controls tested mid-year, an `isox` engagement phase label and a scenario family); gate-deliverable window opens (44) |
| 45–48 | דצמבר | | year-end incident spike (AML backlogs, privacy), annual review + awards + season review (48) |

**Frameworks list (pillar 2) and `lessons.json` entries** include, by sector: financial — הוראות ניהול בנקאי תקין 307 (ביקורת פנימית), 308 (ציות), 310 (ניהול סיכונים), 350 (סיכון תפעולי), 361 (סייבר), צווי איסור הלבנת הון, חוזרי רשות שוק ההון, ISOX / SOX 404 (scoping, testing, roll-forward, management certification, external-auditor reliance); public sector — חוק הביקורת הפנימית התשנ"ב-1992, **פקודת העיריות סעיפים 170א–170ג** (the municipal auditor, the audit committee of a council), **חוזרי מנכ"ל משרד הפנים**, **חוק החברות הממשלתיות וחוזרי רשות החברות הממשלתיות**, מבקר המדינה; horizontal — תיקון 13 לחוק הגנת הפרטיות, GIAS 2024, the three lines model, COSO 2013, ISO 31000. Public-sector scenarios are tagged with the exact `frameworks` strings above (the validator checks `frameworks` against the `frameworks` list in `lessons.json`), so a municipal procurement audit cites פקודת העיריות and the DG circulars, not the 1992 law alone.

**Random events:** 2 תקריות per season (any non-holiday week), 1–2 regulator inspections at financial clients (announced 3 weeks ahead, or 6 with scouting), circulars (`scoutable`), rival and market news, mentor notes, an energy event (illness) once per season at most.

**Engagement portfolio** per tier comes from `seasons.json` (§14 for the template): tier 1 = 5 engagements of 8–14 weeks with staggered starts in two waves so that 2–3 overlap at any time and weeks 2–44 always have an active engagement; tier 2 = 5–6 engagements, one owned end-to-end and one `policy-writing`.

---

## 12. Screens

One `<main>` with `<section data-screen>` switching; bottom tab bar on phone (לוח, דואר, תיקים, יומן, עוד), side nav on desktop. All screens: 16px gutter at 400px, no horizontal scroll, tables collapse to cards. Every visible string comes from `strings.json` or a content bank (§15).

| Screen | Purpose | Main elements | Mobile note |
|---|---|---|---|
| **פתיחה / בחירת פירמה** | new career, load slot | name + gender picker (`m|f`, «הדקדוק של המשחק יתאים לבחירה»), four firm cards with culture lines and אופק pre-selected as «ההתחלה המומלצת», 3 save slots | cards stack |
| **לוח הבקרה** | the week | week/season chip, energy bar, 40h budget bar with action chips (each showing its energy price), engagement cards (phase pill, line-2/3 badge, quality bar, deadline countdown, overdue in danger colour), unread count, אמון הפירמה and מוניטין gauges, «סיום שבוע ▶» | sticky bottom button |
| **תיבת הדואר** | inbox | rows: sender initials, subject, week, type pill (החלטה / רגע מפתח / השלכה / מעקב / חדשות / הצעה), unread dot; one-time cards («התוכן מסתיים כאן», «מקרה דומה חזר על עצמו») | full-width rows |
| **חדר ההחלטה** (sheet) | the scenario | stepper (הקשר → מסגור → מידע → חלופות → פרה-מורטם → ממו → תוצאה), collapsible attachments, base-rate card, info buttons with hour cost, greyed gated options with `gateText`, luck line, two-line and four-part feedback, lesson link, «הצג ביומן» | bottom sheet, scrollable body, options pinned |
| **אירוע חי** | the match | header (opponent, מוכנות number, toggles with fit dots), ticker lines with «המשך ▸», moment cards, הפסקה panel (toggle change / colleague hint), result sheet with ratings | ticker full width |
| **התיקים** | engagements | per engagement: client, type, line badge, regulator, phase timeline (planning → fieldwork → findings → report → present → closed) with work units `work/phaseWork`, deadline, findings list with rating pills from the engagement's scale, contacts with trust bars | accordion |
| **הפרופיל המקצועי** | attributes | 3 groups; rows with bar, number chip, ▲▼, «לא תרגלת» badge; band label, tier ceiling marker, integrity word | rows |
| **האנשים שלי** | cast + contacts | cards grouped by organisation, trust bar, temper icon, memory lines («זוכרת את הממצא שהורדת, עונה 2») | cards |
| **יומן ההחלטות** | the teaching screen | timeline (P navy / O gold), filters by skill/domain, entry detail (incl. `applied` deltas), דפוסים panel, הערת המאמן/ת, «ייצוא Markdown» textarea | list → detail |
| **ספריית הידע / לימוד** | training | drills per skill (4h), lessons glossary unlocked by play, regulation one-pagers, deliverable practice builders (ממצא, דוח סקר, **כתיבת נוהל**) | cards |
| **לוח השנה** | 48-week strip | months, holidays, deadlines, matches, quarter closes, window, roll-forward and הצהרת הנהלה markers | horizontal scroll strip |
| **הפירמה** | org and standing | confidence history, board objectives with progress, rival and sponsor status, culture in plain words, «מה אומרים בשוק» feed | feed |
| **חלון ההצעות** | offers | contract cards, accept/decline | cards |
| **סיכום עונה / טקס הפרסים** | season end | score breakdown, promotion verdict, three decisions + branch not taken, sponsor verdict, awards; the v1 milestone variant | long scroll |
| **קורות חיים** | career history | firms, seasons, objectives, awards, endings | table → cards |
| **הגדרות** | settings | theme (auto/light/dark), text size, save slots, export/import JSON textarea, reset, `?sim` note | — |

---

## 13. Content plan for v1

**Domains** (`domain` tag): `compliance` ציות (AML/KYC, מתנות וניגודי עניינים, פרטיות ותיקון 13, חשיפת שחיתויות, ניטור רגולציה) · `risk` סיכונים (סקר סיכונים, RCSA, KRI, ספקים, סיכון תפעולי, סייבר ברמת אנליסט) · `control` בקרה פנימית וביקורת (תכנון מול תפעול, בדיקות ודגימה, ראיות, ליקויים, הפרדת תפקידים והרשאות, ניהול שינויים, כתיבת ממצא, תגובת הנהלה, דיווח לוועדה, עצמאות ושלושת קווי ההגנה, roll-forward) · `policy` כתיבת נהלים ומדיניות (היקף, בעלים, זרימת אישור, מחזור עדכון, בקרות על הנייר) · `decision` קבלת החלטות (מסגור, תעדוף בין לקוחות, הסלמה, פרה-מורטם, ממו) · `strategy` אסטרטגיה (ניתוח מצב, מיצוב — tier 5) · `marketing` שיווק ופיתוח עסקי (RFP, תמחור סקר, מיצוב הפרקטיקה — tier 5).

**Engagement types** (`engType`, closed enum): `audit` (ביקורת פנימית: 1992 law / פקודת העיריות / 307), `compliance` (ציות ו-AML), `risk-survey` (סקר סיכונים), `control-review` (סקירת בקרות, תכנון מול תפעול), `policy-writing` (כתיבת נוהל / מדיניות — line 2), `isox` (ISOX / SOX 404).

**v1 counts (tiers 1–2, four firms, four seasons without a same-id repeat):**

| Bank | Tier 1 | Tier 2 | Notes |
|---|---|---|---|
| compliance scenarios | 14 | 8 | 7 families |
| risk scenarios | 10 | 8 | 6 families |
| control/audit scenarios | 24 | 15 | 13 families, incl. `independence-self-review` (2 + 1) and `isox-rollforward` (1 + 1) |
| policy-writing scenarios | 4 | 3 | 1 family `procedure-writing` (scope / owner / approval flow / review cycle) |
| decision scenarios | 10 | 6 | 5 families |
| strategy / marketing | 0 | 0 | 2 news teasers only; banks arrive with tier 5 |
| match moments | 14 | 10 | validation 8, present 8, inspection 4, incident 4; each with 3 hostility ticker variants; AC uses present + inspection moments tagged `matchType: ["present","ac"]` |
| events / news / circulars | 18 | | 6 scoutable, 3 cast events (mentor leaves, rival promoted, crossroads teaser), הצהרת הנהלה, roll-forward kick-off |
| gate deliverables | 1 | 1 | + 3 practice builders (ממצא, דוח סקר, כתיבת נוהל) |
| drills | 8 | | 5 items each |
| lessons | 34 | | glossary incl. three lines, independence, roll-forward, management certification, פקודת העיריות, חוזרי רשות החברות |
| firms / clients / cast / contacts | 4 / 12 / 8 / 28 | | clients: 2 banks, 2 insurers/provident, 1 investment house, 2 ministries, 2 local authorities, 2 government companies, 1 statutory corp |
| season templates | 2 | | tier 1 (scripted season 1), tier 2 |
| rating scales / match types / base rates / tags | 6 / 5 / 8 / 15 + 13 | | small reference files |

Totals: 102 decision scenarios in 32 families + 24 moments ≈ 126 playable units, ~26k Hebrew words. Half are `sector: ["*"]` with placeholders; ~10 are `phase: "*"` so the fallback draw (§14) never runs dry.

**Draw budget vs bank size (§14 rule, computed).** Per season: 36 normal weeks × (1 + 0.35 · [no match that week] ≈ 1.25) ≈ 45, + 3 crunch weeks × 2 = 6, + 6 light/August weeks × 0 + 3 holiday weeks × 0 → **≈ 51 curriculum draws**, plus ≤ 8 spaced-repetition injections (distinct ids, family variants) → ≈ 59 distinct ids per season. The tier-1-eligible bank (`tier` includes 1) is 62 ids, so a season at tier 1 can run without an id repeat with a thin margin; the sim harness reports the repeat count and the second-draw probability (0.35) is the balance knob. **Honest sizing:** v1.0 ships the full tier-1 bank (62 scenarios, 14 moments, all reference files — enough for seasons 1–2); v1.1 adds the tier-2 bank (40 scenarios, 10 moments) before promotion to tier 2 is reachable in practice; until then the §2 «התוכן מסתיים כאן» card covers promotion.

**The 12 first scenarios (titles in Hebrew; the first six are season 1's `scripted` list, in this order):**
1. המדגם שקצין הציות הכין — bank, KYC sampling, fieldwork, t1
2. «אנחנו מועצה קטנה» — local authority (פקודת העיריות, חוזר מנכ"ל), SoD, validation, t1
3. התיקים שהגזבר הכין לך — municipal procurement, same family as #1, t1
4. חריגה אחת בדגימה של 25 — ISOX payment approval, t1 (base-rate card `attr-25-1-90`)
5. כרטיסים באמצע מכרז — government company (חוזרי רשות החברות), gifts during a live tender, t1
6. הקובץ שנשלח לכתובת הלא נכונה — insurer, תיקון 13 incident, t1/2
7. «רק תוריד את זה ל'ליקוי'» — provident fund, access-control rating, t2
8. אחת-עשרה הפקדות של 49 אלף — bank, structuring + tipping off, t2
9. «על סמך מה נקבע גודל המדגם?» — ISOX external-auditor reliance moment, t1
10. שלושה תיקים, דדליין אחד — prioritisation across clients, t1
11. חמש-עשרה דקות מול ועדת הביקורת — provident fund, presentation moment, t2
12. «למה זה בשקף 3?» — bank AML backlog, AC narrative moment, t2

Plus two that the revision adds to tier 1: 13. «מי כתב את הנוהל הזה?» — government company, the firm's own procedure in the audit plan (`independence-self-review`), planning, t1; 14. «נוהל לכולם, בעלים לאף אחד» — ministry, `policy-writing`, who owns the process, t1.

---

## 14. Simulation & balance

**Engagement model.** Every engagement runs through the ordered phases **`planning → fieldwork → findings → report → present → closed`** (Hebrew labels in `strings.json` under `phase.<id>`, with per-engType overrides such as `phase.policy-writing.fieldwork = "ניסוח"`). It advances when `work >= phaseWork[phase]`; two phases exit through a match:

| phase | default `phaseWork` | on completion |
|---|---|---|
| planning | 1 | advance |
| fieldwork | 4 | advance |
| findings | 2 | schedule a `validation` match for next week (once); advance when it resolves |
| report | 2 | advance |
| present | 1 | schedule a `present` match for next week (once); advance to `closed` when it resolves |
| closed | — | quality is frozen; rep gain if `quality ≥ 60` and integrity ≥ 60 |

Defaults sum to 10 work units; `seasons.json` can override `phaseWork` per engagement. On creation: `work = 0`, `phase = "planning"`, **`quality = 50`**, `deadline = startWeek + duration` (moved past a holiday week if it lands on one), `line` and `process` copied from the template. **Overdue** = `week > deadline && phase != "closed"`; each overdue week costs `energy −8`, `confidence −6` and `trust.client −4` and adds the inbox item «התיק באיחור» (`overdue`). An `isox` engagement that is still open in weeks 41–44 shows the `report` phase as «עדכון לסוף שנה (roll-forward)».

**`seasons.json` template** (one object per `{tier, firm?}`; `firm` omitted = any):

```json
{ "id": "t1-s1", "tier": 1, "firm": "ofek", "season": 1,
  "scripted": ["bank-aml-kyc-sample-v1", "muni-sod-small-council-v1", "muni-procurement-files-v1", "isox-one-deviation-25-v1", "govco-tender-tickets-v1", "insurer-privacy-wrong-address-v1"],
  "engagements": [
    { "clientId": "muni-north",  "type": "audit",          "line": 3, "process": "procurement", "startWeek": 2,  "duration": 12 },
    { "sectorPool": ["bank", "insurer"], "type": "compliance", "line": 3, "process": "kyc", "startWeek": 8, "duration": 14 },
    { "clientId": "govco-rail",  "type": "risk-survey",    "line": 2, "process": "operations",  "startWeek": 20, "duration": 10 },
    { "sectorPool": ["ministry", "muni"], "type": "policy-writing", "line": 2, "process": "gifts", "startWeek": 24, "duration": 8, "phaseWork": { "planning": 1, "fieldwork": 3, "findings": 1, "report": 2, "present": 1 } },
    { "clientId": "bank-alon",   "type": "isox",           "line": 3, "process": "payments",    "startWeek": 30, "duration": 14 }
  ] }
```

`clientId` fixes the client; `sectorPool` draws one client of those sectors not already in the portfolio. Starts are staggered (2 / 8 / 20 / 24 / 30 above: wave one 2–22, wave two 20–44) so that 4–6 engagements cover weeks 2–44 with 2–3 active at once. `scripted` applies only when `season` matches (season 1); it is consumed in order before any random draw. The validator checks every `clientId`, `type`, `process` and scripted id, that `duration` ∈ [8, 14], and that a line-3 engagement's `process` is not one the same template gives to a line-2 engagement at the same client (that conflict is authored deliberately only via the `independence-self-review` family, with `"selfReviewTest": true`).

**Tick order on «סיום שבוע»** (deterministic, `mulberry32` seeded, RNG state saved):
1. `week++`; fire `queue` items with `due <= week` (effects, inbox «השלכה», journal `applied` update, מעקב scheduling).
2. Engagement phases: `work >= phaseWork[phase]` → advance or schedule the phase's match for `week + 1`; deadline/overdue checks; roll-forward label for ISOX in 41–44.
3. Matches: (a) auto-resolve any match from `week − 1` still unplayed (§8); (b) place matches scheduled for this week into the inbox.
4. Energy (below); clamp 0–100.
5. Mastery update (below) for decisions made this week; decay for idle skills.
6. Spaced-repetition scheduler (below).
7. Inbox draw (below).
8. Trust decay (§5); integrity recovery at season end.
9. Quarter close at weeks 12/24/36/48. Autosave.

**Energy** (per week, applied in step 4; the target equilibrium is a sim-harness check):
`energy += 10 − round((energy − 60)/10)` (regeneration with a drift toward 60) `+ 15·restBlocks + 2·floor(unspentHours/4) − 2·workBlocks − 1·(learnBlocks + networkBlocks + scoutBlocks) − 3·fullRoomsOpened − 1·lightScenariosPlayed − 4·matchesPlayed − 8·overdueEngagements − firm.hoursPenalty + 10·[holiday] + 4·[August]`, then clamp 0–100. Authored option costs (`energy: −1/−2`) and trap effects apply on top. **Intended equilibrium:** a normal week (3 work blocks, 1 learning, 1 networking, 8h unspent, ~1.35 rooms, ~0.3 matches) settles at **≈ 65–70**; a crunch week (5 work blocks, 2 full rooms, 1 match, nothing unspent) costs ≈ −10 to −11 per week, so energy drops **below 30 after 3–4 consecutive crunch weeks** (3 at גולדשטיין–ברק with `hoursPenalty 4`), which is when the doubled info costs and the «קיצור דרך» injection start to bite; one rest block every third week keeps a full 40h schedule stable. `tools/sim.mjs` asserts the normal-week fixed point lies in [60, 72] and the crunch descent reaches < 30 within 5 weeks.

**Inbox draw (step 7).** Draws per week: `base = 1`, plus a second draw with probability **0.35** when no match is scheduled for this week; modifiers: holiday → 0 total; light weeks (18, 22) and August (29–32) → `base − 1` and no second draw; «אחרי החגים» (38–40) → `base + 1` (i.e. 2, no second roll); clamp 0–2 and never more than 2 `full` rooms in the inbox for the week (counting rooms still unread). Scripted ids (season 1) are served first, in order, as long as they remain. Each draw filters the scenario bank by: `tier` includes the player's tier; `requires` satisfied; `seen[id] + cooldown < week`; and a match with some **active** engagement (phase ≠ closed) on `phase`, `sector`, `engType` (wildcards match anything). The item is attached to the engagement it matched. **Fallback ladder** when the pool is empty: drop the `phase` filter → drop `sector` → drop `engType` → draw from `phase: "*"` ∧ `sector: ["*"]` items (this is also the rule when **no engagement is active**, e.g. week 1 or 45–48 after every engagement closed; such items attach to the most recently closed engagement for placeholders) → drop `tier` to the **highest tier that has content** (the §2 «התוכן מסתיים כאן» card is shown once when this rung is reached after a promotion) → finally relax `cooldown` (never the `seen`-this-season rule). Among candidates the weight is `max(0.25, 1 + (12 − mastery)/6)` on the weakest tagged attribute (clamped so high mastery never goes negative), × 0.5 for a family seen in the last 10 weeks. Events/news: 1 per 3 weeks plus the calendar's fixed events, `incidentRate`-scaled incidents. Moments, events, consequences and מעקב items count toward the 2–5 inbox size; if the inbox would exceed 5, scenario draws are deferred to next week (the second draw first).

**Mastery update** per tagged skill after a decision: `expected = mastery/20`, `observed = skillScore/100` (craft and process skillScores as defined in §4), `delta = K · w · difficulty · firm.skillGainMult[id] · (observed − expected)`, **`K = 2.0 if obs < 5, 1.2 if obs < 15, else 0.7`** (`obs` is the skill's observation count, not the board meter); `mastery = clamp(mastery + delta, 1, tierCeiling)`; `obs += 1` (`+0.5` for a drill, whose `K` is also halved). **Decay:** after 8 idle weeks, `−0.15/week` toward `max(1, 0.6 · peak)`.

**Spaced repetition:** per skill, ladder `1 → 3 → 7 → 14 → 30` weeks; skillScore ≥ 70 advances a rung, < 50 resets, otherwise repeats. When due, inject a never-last-seen variant from a family tagged with that skill (bypassing family cooldown but never the same id within 20 weeks), labelled in the inbox «מקרה דומה חזר על עצמו» (`repeat.label`), capped at 2 per week with curriculum items taking precedence and the 2-full-rooms cap still applying.

**Process score** per decision: rubric (§6). **Outcome score** O (1–10, one decimal):
`O = clamp(5 + ΔengQuality/5 + Δconfidence/3 + ΣΔtrust/6 + result, 1, 10)` where the deltas are the **applied** immediate + result effects (post-cap, post-firm-multiplier), `ΣΔtrust` sums every `trust.*` key the option touched, and `result = +2` (good) / `−2` (bad). O is recomputed from `applied` when delayed consequences land. (Example: option c, good roll → 5 + 8/5 − 0 + (−3)/6 + 2 = 8.1.)

**Luck:** `result.pGood` rolled once at decision time; delayed `prob` rolled at enqueue time; all stored, so reload changes nothing.

**Firm modifiers:** immediate `eng.quality` on an option is multiplied by `firm.tagMult[tag]` for each tag it carries; info cost by `firm.infoCostMult[kind]`; trust gains by `trustMult`; skill gain by `skillGainMult[id]`; `rep.regulator` by `repMult.regulator`; incident draw rate by `incidentRate`. All default to 1.

**Caps:** per decision `eng.quality` ±15, `confidence` ±10, `rep` ±8, `integrity` ±15; per week `confidence` ±12.

**Anti-repetition:** scenario `cooldown` (default 30 weeks), once-flags set through `flag.<name>` and read through `requires.notFlags`, families with 2–4 surface variants (actor, sector, numbers), placeholders, firm-dependent consequences, hostility variants on moments, weakest-skill weighting (rotates as skills move), holiday and August modifiers that thin the inbox.

**Balance harness:** `node tools/sim.mjs --seasons 200` plays with random choices (and with a "good process" policy) and prints distributions of tier, dismissals, mean P, mean Q, energy floor and mean, weeks below 30, and repeat counts; `?sim=200` in the browser does the same against the bundled engine. Targets: random play is dismissed by season 3 in ≥ 60% of runs; good-process play reaches tier 2 by season 2–3 in ≥ 70%; no scenario id repeats inside a season at tier 1 with the shipped bank; normal-week energy fixed point in [60, 72]; the fallback ladder's last rung (tier relaxation) is never reached at tier 1.

---

## 15. Tech plan

Honours the committed scaffold (`build.mjs`, `src/`, `content/` at package root, `tools/smoke.mjs`). What the scaffold has today and what §15 adds is listed explicitly so the build does not assume files that are not there.

```
marketing-manager/
  build.mjs                 # existing: inlines src css/js + all content/*.json into index.html as window.MM_CONTENT (keyed by file stem)
  index.html                # built output, committed (GitHub Pages)
  DESIGN.md                 # this document
  CONTENT.md                # Hebrew authoring guide: schema, DSL, caps, tags, tokens, strings keys, the 3 worked examples
  src/
    index.template.html     # existing stub; must become the exact head below
    styles.css              # tokens (light + dark), base, components, screens
    engine.js               # pure logic, no DOM: rng, state, effects, tick, draw, scheduler, match, rubric, mastery, journal, save/migrate
    ui.js                   # render per screen, event wiring, bdi wrapping, toasts, bottom sheet, string resolution
  content/
    scenarios.fieldwork.json  scenarios.findings.json  scenarios.report.json  scenarios.present.json  scenarios.planning.json  scenarios.wild.json
    moments.json  matchTypes.json  events.json  deliverables.json  firms.json  clients.json  stakeholders.json  cast.json
    lessons.json  drills.json  seasons.json  awards.json  ratingScales.json  baseRates.json  tags.json  strings.json
  tools/
    validate.mjs            # schema + caps + cross-reference checks; run by build.mjs before bundling; non-zero exit on error
    sim.mjs                 # node balance harness over engine.js
    smoke.mjs               # existing Playwright smoke (console errors, overflow, RTL, screenshots) — optional dev dependency
    engine.test.mjs         # node:test unit tests for engine.js
```

**`src/index.template.html` head (exact; the current stub lacks all of it):**

```html
<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="claude:viewport-fit-sides" content="cover">
<title>מרקטינג מנג'ר: הדרך לשותפות</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@400;500;600&family=Secular+One&display=swap">
<link rel="stylesheet" href="styles.css">
<!-- @content -->
</head>
<body>
<main id="app"></main>
<script src="engine.js"></script>
<script src="ui.js"></script>
</body>
</html>
```

`build.mjs` only inlines `href`s that do not start with `http`, so the Google Fonts link stays external and `styles.css` is inlined; `dir="rtl"` moves from the `#app` div to `<html>` because `smoke.mjs` reads `document.documentElement.dir`.

**Content loading.** `build.mjs` keys `MM_CONTENT` by file stem, so `scenarios.fieldwork.json` arrives as `MM_CONTENT['scenarios.fieldwork']`. `MM.loadContent(c)` therefore merges every key matching `/^scenarios\./` into one `scenarios` array, keeps the other banks by name, and throws on a duplicate scenario id across files (the validator fails earlier on the same condition). Node tools build the same object from `content/` with the same stem rule.

**engine.js** exposes `globalThis.MM = { loadContent, newGame, tick, draw, openScenario, buyInfo, choose, submitMemo, scheduleMatch, playMoment, resolveMatch, applyEffect, score, mastery, scheduler, patterns, save, load, migrate, exportJSON, importJSON, sim }` and ends with `if (typeof module !== 'undefined') module.exports = MM;` so node tests `createRequire` it unchanged; it never touches `document` or `localStorage` directly (ui.js passes a storage adapter). Content is injected as `window.MM_CONTENT` by the existing bundler.

**String contract.** `content/strings.json` is the **only** source of UI and engine text: `{ "<key>": "template with {param} and {masc|fem} tokens" }`. The engine never emits literal Hebrew; every message it produces is `{ key, params }` (e.g. `{ key: "luck.goodProcessBadOutcome", params: { p: 25 } }`), and `ui.js` resolves it with `MM.t(key, params, ctx)` (placeholders, gender tokens, `<bdi>` wrapping). `validate.mjs` extracts every `t('…')` / `key: '…'` literal from `ui.js` and `engine.js` and fails when a key is missing from `strings.json`, and warns on unused keys. **Required keys (listed in CONTENT.md, ≈ 40):** `ui.endWeek`, `ui.continue`, `ui.hours`, `ui.energyCost`, `inbox.type.decision`, `inbox.type.moment`, `inbox.type.consequence`, `inbox.type.followup`, `inbox.type.news`, `inbox.type.offer`, `friday.line`, `luck.good`, `luck.bad`, `luck.goodProcessBadOutcome`, `luck.badProcessGoodOutcome`, `gate.info`, `gate.prep`, `gate.trust`, `shortcut.option`, `match.autoResolved`, `match.prep`, `match.break`, `overdue`, `skill.decayed`, `repeat.label`, `scout.ahead`, `holiday.greeting`, `quarter.talk`, `mentor.note`, `followup.question`, `content.endsHere`, `toast.staleContent`, `leave.forced`, `dismissal.confidence`, `dismissal.materialFailure`, `ending.ethics`, `ending.summit`, `ending.otherSide`, `ending.careerOver`, `ending.v1Milestone`, `award.analystOfYear`, `award.bestMemo`, `award.escalation`, `award.finding`, `award.wolf`, `tier.1.title` … `tier.5.title`, `phase.planning` … `phase.closed`, `band.1` … `band.4`, `integrity.1` … `integrity.4`, `pattern.<id>` × 12.

**State shape (v1):**
```js
state = {
  v: 1, seed, rng: { s }, season, week,
  player: { name, gender, tier, energy, confidence, rep, integrity, flags: {},
            skills: { [id]: { mastery, obs, peak, lastPracticed } },
            ladder: { [skillId]: { rung, due } }, scout: 0, approach: { basis, transparency, escalation } },
  firm: { id, confidenceHistory: [], sponsorId, objectivesMet: {} },
  world: { cast: { [id]: { trust, memory: {}, idleSince } }, contacts: { [id]: { trust, idleSince } },
           firmHistory: { [clientId]: [ { process, line, season } ] } },
  engagements: [ { id, clientId, sector, type, line, process, phase, startWeek, duration, deadline, work, phaseWork,
                   quality, findings: [], managerId, contactId, iaId, matchDue, matchType, selfReview, workLog: [] } ],
  matches: [ { id, engId, type, week, prep, fit, hostility: [], moments: [], played, ratings: {} } ],
  inbox: [ { id, week, type, scenarioId, engId, matchId, read, variantOf } ],
  queue: [ { due, effect, text, scenarioId, optionId, engId, rolled, failureMode, journalId } ],
  journal: [ /* §9 entry incl. applied */ ],
  seen: { [scenarioId]: lastWeek }, familySeen: { [family]: [ { id, week } ] }, scriptedLeft: [],
  stats: { ratings: [], awards: [], seasons: [], energyLog: [] },
  cv: [], contentEndShown: false
}
```

**Save/load:** `localStorage["mm.save.<1|2|3>"]` in try/catch, autosave each tick; `migrate = [{from:1,to:2,fn}]` applied by `state.v`; import validates referenced ids and drops stale ones from `inbox`/`queue` with the toast `toast.staleContent` («תוכן ישן הוסר»); export/import through a textarea (no dialogs).

**Dependencies.** Runtime: none. Build and validation: node only. `tools/smoke.mjs` imports Playwright; it is an **optional dev-only** dependency (`npm i -D playwright && npx playwright install chromium`), never required by `build.mjs` or `validate.mjs`, and the brief's "no dependencies beyond node" tolerates it explicitly for the smoke run.

**Validator checks (`node tools/validate.mjs`, run by `build.mjs`):** JSON parse of every bank; required keys per `journal` weight and per bank; ranges (quality 0–3, hours 1–6, body ≤ 110 words, rule ≤ 15 words, pGood 0–1, prob 0–1, trust0 0–100); every `needsInfo`/`gate.info` ∈ `info.sets`; every `failureMode`, `fits`, `forOptions` id exists; `lesson` ∈ `lessons.json`; `frameworks` ⊆ `lessons.json.frameworks`; `baseRate` ∈ `baseRates.json` and the bound recomputes; `scale` ∈ `ratingScales.json` and matches `engType`; `matchType` ∈ `matchTypes.json`; every effect key ∈ DSL and within caps; `tags` and `biasTags` ∈ `tags.json`; `firm.tagMult`/`infoCostMult`/`skillGainMult`/`repMult` keys valid; top-quality option `escalation === rightEscalation`; `needsInfo` xor `gate`; no `setFlag`, no bare `flag`; tokens balanced, two alternatives, known prefixes; no slash forms; `seasons.json` ids, durations, line/process consistency and scripted ids; unique scenario ids across all `scenarios.*` files; `strings.json` covers every referenced key.

**Testing:** `node --test tools/engine.test.mjs` covers deterministic tick with a fixed seed, DSL caps and unknown keys, `needsInfo`/`gate` gating, rubric scoring on fixtures (including the §7 example scoring 100 on the perfect path and the escalation ordinal), mastery update with `obs`-driven `K` and decay, ladder transitions, delayed-roll storage, `applied` updates on landing consequences, energy fixed point, phase advance and match scheduling/auto-resolve timing, the draw fallback ladder, migration, stale-save import, and `t()` resolution of both token families. `node tools/validate.mjs` must pass before every build (build.mjs calls it). `node tools/sim.mjs` for balance. `node tools/smoke.mjs` runs Playwright at 1280 and 400 px: no console errors, no horizontal overflow, `dir=rtl`, plus a scripted path (new game → scenario → info → choose → memo → end week → journal entry) with screenshots.

**Repo README.** The root `README.md` page table gains the row «מרקטינג מנג'ר: הדרך לשותפות» → `marketing-manager/index.html` (artifact link filled in after the first publish).

**RTL rules (checked in smoke):** logical CSS properties only; `ui.js` wraps numbers and Latin acronyms (SOX, KYC, 308, ISOX) in `<bdi>` at render; `unicode-bidi: plaintext` on inputs and textareas; tab order from DOM order, never flex-reversal; progress bars drawn with `inset-inline`; tables collapse to cards at ≤ 480px.

---

## 16. Visual direction

Reuse the repo's system from «הדרך ל־61»: paper background `--bg #f3efe7`, surfaces `--surface #fffdf8`, ink `--text #141b2d`, `--navy #0e1a33`, accent `--gold #d6a536` / `--gold-ink #7d5a0e`, `--muted #545e72`, `--danger #b42318`, `--ok #217a4b`, radii 8/14/22, `IBM Plex Sans Hebrew` body + `Secular One` display from Google Fonts (the link in the template head above), light primary with the existing dark tokens (`--bg #0a1120`, `--surface #121d33`, `--text #eef2f9`, `--gold #e4b84e`) under `prefers-color-scheme` and `[data-theme]`.

**What makes it read as a manager game:** dense, calm tables (engagements, findings, journal) with number chips; FM-style attribute rows (name · bar · 1–20 chip · ▲▼); colour-banded numbers from the palette, never new hues; pill tags everywhere (phase, rating from the engagement's scale, type, line 2/3); אמון הפירמה and מוניטין as thin gauges with the number; an inbox that looks like an inbox (initials avatar, subject, week, unread dot); the week chip «שבוע 17 · מאי · עונה 2» always visible; «סיום שבוע ▶» as the one gold primary action; match ticker stamps («רגע 2/5») on the inline-end side; the journal's two bars (navy P, gold O) as the signature image; the energy price shown as a small muted number on each budget chip. Display font only for screen titles; everything else Plex. Short `--t-fast` fades, no spinners, no timers.

---

## 17. Open questions for the user

Every question now has a **default written into the design above** so the build does not stall; say the word and the default flips.

1. **Starting firm** — default: the first career begins at «אופק ביקורת פנימית» (pre-selected, labelled «ההתחלה המומלצת»); the other three firms are selectable on the same screen (§2, §12).
2. **Player grammar** — default: you pick a gender at new game and the game's verbs agree; unprefixed `{masc|fem}` tokens are yours, `{contact:…}`/`{manager:…}` tokens belong to NPCs, slash forms are banned by the validator (§7). Alternative, if you prefer: gender-neutral plural everywhere («אתם»), which would make tokens player-only trivial but reads less personal.
3. **Follow-up length** — default: the 2/4/8-week choice stays free, and the scenario's authored `followupWeeks` is the one that scores full marks (adjacent choice half) (§6 rubric).
4. **Real-name regulators** — default: regulators and laws are named precisely; firms, clients and people are fictional-but-recognisable («בנק אלון» = a mid-size bank, «מועצה אזורית צפון» = a small council). Still open: whether any client should carry a real organisation's name.
5. **Journal export** — default: Markdown in a textarea (no dialogs). A downloadable `.md` via `<a download>` is a one-line addition if you want it.
6. **Season 1 difficulty** — default: scripted (fixed portfolio and the fixed first six scenarios from `seasons.json`'s `scripted` list), then drawn from the banks (§2, §14).
