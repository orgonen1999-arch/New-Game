# Marketing Manager — Game Design Document (final)

Working title (user's): **Marketing Manager**. Player-facing Hebrew name: **«מרקטינג מנג'ר: הדרך לשותפות»**.
Tagline: **«כל החלטה נרשמת. כל ממצא זוכר.»**

Built on the *buildable-core* skeleton (engine, schema, tick order, validation, saves) with *learning-first*'s learning science (decision room, rubric, mastery, spaced repetition, journal), *career-narrative*'s world (firms, cast, ladder, gate deliverables, incident queue) and *fm-faithful*'s match-day texture (preparation, two-line feedback, follow-up, ratings, awards, scouting). English for the builder; every player-facing string is Hebrew.

---

## 1. Vision & pillars

**Vision.** Football Manager for a junior analyst at an Israeli internal-audit / compliance / risk consulting firm. The player starts with no experience, serves banks, insurers, provident funds, ministries, local authorities and government companies, and climbs to partner. It is a trainer in disguise: every week the inbox delivers decisions from the real job (what to sample, when evidence is enough, how to rate a finding, how to handle a treasurer who says "we are a small council", what goes on slide one), and the game grades *how* the player decided, separately from how it turned out.

**Pillars** (every feature must serve at least one; features that serve none are cut):

1. **תהליך לפני תוצאה — process before outcome.** The decision journal scores the process with a measurable rubric. Luck is rolled in the open. Feedback always teaches the why and ends in a transferable rule. The journal line the player sees most: «תהליך טוב, תוצאה רעה: זה קורה. תהליך רע, תוצאה טובה: זה מזל.»
2. **העבודה האמיתית — the real job, really.** Engagements for real sector types under real Israeli regulation (307/308/310/350/361, AML orders, תיקון 13, חוק הביקורת הפנימית 1992, מבקר המדינה, ISOX, GIAS 2024, COSO 2013, ISO 31000). The deliverables the player must learn to write (finding, risk survey report, management response, executive narrative) are practised as structured builders, not as multiple-choice trivia.
3. **אדם בתוך עולם — a person in a world.** Firms with culture, a persistent cast that remembers, a rival, a mentor who leaves, a regulator who reads your old reports, consequences that land seasons later. Reputation is a career, not a number.
4. **בנוי להרחבה — buildable and extensible.** One engine, never touched after v1. All content is validated JSON. The engine never references a scenario id. Adding a sector, a firm, a tier or a scenario family is adding files.

**Non-goals.** No multiplayer, backend, runtime AI, real-time timers, browser dialogs or frameworks.

---

## 2. Player fantasy & career arc

The fantasy: *I am the person in the room whose work the regulator trusts.* The arc runs from a fieldwork block inside someone else's engagement to running the practice.

| Tier | Hebrew title | What a "match" is | What the player decides | Attribute ceiling | Gate deliverable |
|---|---|---|---|---|---|
| 1 | אנליסט/ית | A fieldwork block and a findings-validation meeting inside the manager's engagement | What to ask, what to sample, what counts as evidence, when to escalate to the manager | 12 | ממצא כתוב (מצב · קריטריון · סיבה · השפעה · המלצה) |
| 2 | אנליסט/ית בכיר/ה | A full engagement run under a manager, first presentations to a CEO / מנכ"ל / מנכ"לית רשות | Scoping, finding rating, drafting the report, handling client pushback | 15 | דוח סקר סיכונים |
| 3 | מנהל/ת פרויקטים | 3–4 parallel engagements, one junior whose mistakes become your validation problems | Prioritisation across clients, staffing, management responses, the in-house crossroads | 17 | התאמת תגובות הנהלה לממצאים |
| 4 | מוביל/ת התקשרות | Audit committees, boards, regulator inspections | Framing for executives, scope and fee negotiation, escalation to the partner | 19 | נרטיב לוועדת ביקורת |
| 5 | שותף/ה · ראש/ת פרקטיקה | Winning and keeping clients; the practice's name | Business development, positioning, which clients to refuse, hiring | 20 | ממו מיצוב הפרקטיקה |

**What changes per tier.** The scenario banks are tier-tagged, so the inbox changes genre: tier 1 is 60% fieldwork; tier 2 adds scoping, rating and report; tier 3 adds portfolio and people; tier 4 is executive rooms and inspections; tier 5 unlocks the small BD bank (`domain: "marketing"`, `"strategy"`), the «הפרקטיקה שלי» screen and the option to found a two-person practice at prestige 20 (the Conference-South-to-Champions-League arc). Ceilings prevent grinding past what the job lets you practise. The tier-3 crossroads is a one-time in-house offer («לעבור לצד השני») with its own quiet ending.

**Pacing target.** ~4–5 hours per season; at least two seasons per tier at tiers 1–2 (the gate deliverable and the sponsor make the first attempt usually fail by design); partner in 8–10 seasons ≈ 40–50 hours. v1 content covers tiers 1–2 (seasons 1–4); tiers 3–5 are later JSON banks on the same engine.

---

## 3. Core loop

One in-game week = one press of **«סיום שבוע ▶»**. A season is 48 playable weeks (one calendar year, §11).

**Each week the player:**

1. Reads **תיבת הדואר** (2–5 items: החלטה, רגע מפתח, השלכה, מעקב, חדשות/רגולציה, הצעה).
2. Spends the **weekly budget: 40 שעות** (a bar with chips):
   - **עבודה על תיק** — 8h → +1 work unit on one engagement's current phase.
   - **החלטה** — opening a scenario is free; information actions cost their authored hours (1–6h); the memo costs 1h.
   - **לימוד** — 4h → a 5-item drill on one skill (mastery update at half strength).
   - **קשרים** — 4h → trust +3 with one named person.
   - **ניטור רגולטורי** (scouting) — 4h → scouting points that reveal an upcoming circular/inspection early (§8, §11).
   - **מנוחה** — 8h → energy +15.
   Unspent hours convert to energy (+2 per 4h). The budget is hard: the player cannot work 60 hours; instead low energy makes decisions worse (§6).
3. Presses «סיום שבוע». The tick (§14) fires queued consequences, advances engagement phases, schedules matches, draws the next inbox, runs the spaced-repetition scheduler, applies decay, and autosaves.

**Quarter close** (weeks 12, 24, 36, 48): audit committee set piece for one client, and the **שיחת רבעון** with the engagement manager quoting the player's three lowest process scores back.

**Season end** (week 48): awards, gate deliverable (if eligible), annual review (promotion / warning / dismissal), season review with the three decisions that mattered most; the transfer window opens in weeks 1–6 of the next season and a new portfolio is drawn from `seasons.json`.

---

## 4. Attributes & skills

All attributes are 1–20 (FM scale), shown with one decimal in the profile as a bar + number chip, colour-banded by the repo palette (1–5 danger, 6–10 muted, 11–15 ok, 16–20 gold). They move slowly via the mastery model (§14). Each has `mastery`, `confidence` (observations), `peak`, `lastPracticed`.

**מלאכה (craft) — 10**

| id | Hebrew | Gates / used by |
|---|---|---|
| risk | זיהוי והערכת סיכונים | risk-survey scenarios, heat-map ordering, moment hostility in risk presentations |
| controls | הבנת בקרות: תכנון מול תפעול | design-vs-operating scenarios, deficiency classification |
| testing | בדיקת בקרות ודגימה | sampling scenarios, ISOX moments |
| evidence | ראיות ותיעוד | evidence sufficiency, work-paper quality, inspection moments |
| writing | כתיבה מקצועית | report scenarios, gate deliverables (finding, report) |
| reg | ידע רגולטורי | regulatory items, scouting yield, inspection moments; sector familiarity shown as badges, not separate attributes |
| interview | ראיונות ותשאול | fieldwork interviews, what-to-ask scenarios |
| client | ליווי לקוח ועמידה בלחץ | validation meetings, pushback |
| present | הצגה לדרג בכיר | AC / board / CEO moments |
| prio | תעדוף וניהול זמן | portfolio scenarios, deadline pressure |

**תהליך (decision process) — 6**

| id | Hebrew | Fed by rubric item |
|---|---|---|
| framing | מסגור | framing choice |
| gather | איסוף מידע | decisive info bought, noise/trap avoided |
| judgment | שיפוט ושיעורי בסיס | option quality, base-rate card use |
| premortem | פרה-מורטם והפיכות | failure-mode pick, reversibility |
| escalation | הסלמה | escalation level vs scenario's right level |
| memo | ממו ומעקב | memo consistency, follow-up set, מעקב answered |

**שותפות (tier 5 only, greyed before) — 3:** `bd` פיתוח עסקי, `positioning` מיצוב ובידול, `datastory` סיפור בנתונים.

**Meters (0–100):** `energy` אנרגיה (visible), `confidence` אמון הפירמה (visible, the board), `rep` מוניטין מקצועי (visible), `integrity` יושרה (hidden; shown only as a word: «ללא רבב» ≥80, «תקין» 50–79, «מפוקפק» 20–49, «בבדיקה» <20). Reputation can only grow while integrity ≥ 60.

**Starting profile** for the real player's situation: craft 4–7, process 6–9, people-facing (interview, client, present) 5–7, energy 80, confidence 55, rep 20, integrity 85.

**Mastery bands** change the content, not the numbers: 1–7 «מתחיל/ה» shows `hint` and base-rate cards; 8–13 «מתפקד/ת» hides hints; 14–17 «מוסמך/ת» appends `pushback` text and extra distractor options; 18–20 «מומחה/ית» serves `ambiguous: true` scenarios graded on process only. Decay shows as a red ▼ arrow with «לא תרגלת 8 שבועות».

---

## 5. Stakeholders & team

**Model.** One number per person: `trust` 0–100 toward the player. One `temper` tag (`blunt`, `political`, `supportive`, `absent`, `charming`) selects text variants. Everyone has `gender: "m"|"f"` so templates agree grammatically (§7). Every person has `memory` — flags written by scenarios (`dalia.downgraded`, `uri.shortcut_taken`) that later scenarios can `requires`. The cast lives in `world.cast`, keyed by id, independent of the current firm, so clients remember across firm moves and the mentor can leave.

**Thresholds unlock concrete things** (compliance is a relationship business, taught mechanically):

| trust | effect |
|---|---|
| ≥ 60 control owner / client contact | evidence arrives on time: fieldwork work units +1 per 8h block on that engagement; evidence-type info actions cost half |
| ≥ 60 internal auditor at client | shares her plan: the next match's first moment is revealed in הכנה |
| ≥ 60 partner or manager at current firm | can be the player's **sponsor** for promotion |
| ≥ 70 mentor | sends the two-line note whenever a journal entry scores < 50 |
| < 30 anyone | hostile moment variants, info actions +50% cost, inbox friction items |

Trust moves ±2..±10 per authored effect, +3 per קשרים block, −1/week after 6 idle weeks (floor 30 for colleagues).

**Persistent cast (v1, 8 people):**
- **נעמה שחר** — partner at אופק, the mentor. Leaves for גולדשטיין–ברק in season 3 (an `event` with `requires.season: 3`); chasing her is a career fork.
- **אורי לב** — first engagement manager. Billable hours over rigour; his shortcuts raise confidence now and seed «ממצא שהוחמץ» incidents 2–4 seasons later.
- **תום אלקיים** — cohort rival; promoted first when your confidence is low; occasionally your only ally in a hostile committee.
- **רו"ח דליה מזרחי** — audit-committee chair at a provident fund; remembers every finding you downgraded.
- **יוסי ברקת** — municipal treasurer (גזבר). Charming, obstructive, central to the public-sector track.
- **ענת קרן** — compliance officer at a mid-size bank; becomes your best client or your loudest critic.
- **הרפרנט/ית מבנק ישראל / רשות שוק ההון** — never named, always formal, appears in inspections and letters.
- **ד"ר מיכל אדרי** — internal auditor (מבקרת פנימית) at a government company; shares her plan at trust ≥ 60.

**Client contacts** (`stakeholders.json`, ~28): 2–3 per client (מנהל/ת ביקורת פנימית, גזבר/ית, קצין/ת ציות, סמנכ"ל/ית כספים, מנכ"ל/ית, DPO, ראש/ת IT). **Juniors** (tier 3+) are cast entries with `attrs` assigned to engagements; v1 defines the field, v2 populates it.

---

## 6. Scenarios: the teaching unit

A scenario is one situation with trade-offs, delayed consequences and feedback that teaches the why. Three weights: `journal: "full"` (the decision room, ~2–4 minutes), `"light"` (context → optional info → options → feedback), `"none"` (news, letters). Full rooms are capped at 2 per week so the ritual stays special, not a form.

**Anatomy of a full decision room («חדר ההחלטה»), the steps the UI enforces in order:**

1. **ההקשר** — body (≤110 words) plus optional attachments (email, Excel excerpt, policy clause) that hold the critical detail. At band 1–7 a `hint` and a base-rate card («בתעשייה, בדגימה של 25 חריגה אחת מרמזת על שיעור של עד ~10%») are shown.
2. **מסגור** — choose one of 3–4 framings. Each has `quality` 0–3 like an option; two can both be 3, so it is not a one-right-answer quiz. Typical set: correct / too narrow / political / non-problem.
3. **איסוף מידע** — 3–6 costed actions (`hours`). `kind`: `decisive` (sets a flag that unlocks options via `needsInfo`), `noise`, `trap` (gossip; costs hours and may carry an effect). Energy < 30 doubles all costs. Gather-before-decide is enforced by the engine: options that need information are hidden until bought.
4. **חלופות** — 3–5 options; usually one «להעלות למנהל/ת ההתקשרות» and often «לדחות בשבוע ולאסוף עוד». Hidden tags: `reversible`, `escalation` (`none|inform|escalate`), content tags for firm modifiers. Energy < 30 injects one extra tempting `quality: 0` «קיצור דרך» option.
5. **פרה-מורטם** — «אם זה ייכשל, זה כנראה כי…»: pick one of 3–5 authored failure modes. No free text, no keyword matching. The chosen mode's `signal` becomes memo field 3.
6. **ממו** — four fields: «מה החלטתי» (auto), «למה» (pick one of 3 authored rationales, each `fits` some options; optional free text), «מה יוכיח שטעיתי» (the signal from step 5), «מתי בודקים שוב» (2/4/8 weeks → schedules the **מעקב** item).

Then **תוצאה**: the luck roll is shown («ההחלטה הייתה טובה; הפעם המזל לא שיחק לטובתך (25%)»), immediate effects apply, the good/bad result appears, delayed consequences are enqueued (rolled now, stored), and the **feedback** opens.

**Feedback contract (required by the validator, per option):** `why` (principle + framework citation), `expert` («מה היה עושה אנליסט ותיק»), `bias` («הטיה לבדיקה», named), `rule` (one transferable line ≤ 15 words, e.g. «חריגה אחת היא שאלה, לא תשובה», «הפיך — פעל; בלתי הפיך — הסלם»). Never «נכון/לא נכון» alone. The Friday line always shows **«תוצאה X/10 · תהליך Y/10»**.

**Process rubric (0–100), default weights, overridable per scenario:** framing 15 · decisive info 20 · noise/trap avoided 5 · option quality 20 · pre-mortem names a mode that fits the chosen option 10 · reversibility respected 10 · escalation level matches the scenario's `rightEscalation` 10 · memo rationale fits the option 5 · follow-up date set 5. Light scenarios use the subset that exists and renormalise. The score is computed, never self-reported.

**Difficulty** 1–3 multiplies mastery gain, not damage. **Tags**: `domain`, `sector`, `engType`, `phase`, `tier`, `skills[{id,w}]`, `family` (variant family for spaced repetition), `biasTags`, `frameworks`, `lesson`.

**Delayed consequences** carry `after` (weeks), `prob`, optional `recurring: {every, times}` for multi-season incidents (e.g. the regulator finds the downgraded finding, 35% per season for 3 seasons; all rolls are made at enqueue time and stored). A consequence can reference `failureMode` so the מעקב item can say whether the pre-mortem named the thing that bit.

**Match moments** (`bank: "moment"`) are light scenarios with 3–6 ticker lines before the options and a `hostility` variant (`hostile|neutral|friendly`) chosen by the match engine (§8).

---

## 7. Scenario JSON schema

Exact shape; `content/scenarios.*.json` files are arrays of these objects. The validator (§15) enforces required keys, ranges, text caps, that every `needsInfo` matches an `info.sets`, every `failureMode` and `fits` id exists, every `lesson` exists in `lessons.json`, every effect key is in the DSL, and that gendered tokens are well formed.

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
  "setFlag": "kyc_sample_done",
  "rightEscalation": "none",
  "lesson": "sampling-population",

  "title": "המדגם שקצין הציות הכין",
  "body": "אתם בשבוע השני של ביקורת על תהליך \"הכר את הלקוח\" ב{client}, לפי צו איסור הלבנת הון והוראה 308. {contact} {שלח|שלחה} מייל חביב: \"הכנתי לכם 15 תיקי לקוח מעודכנים, הכול מסודר, תחסכו זמן.\" עבודת השטח צריכה להסתיים בעוד שלושה שבועות ויש לכם עוד שני תיקים פתוחים.",
  "attachments": [{ "label": "המייל של {contact}", "text": "מצורפים 15 תיקים. כולם עודכנו ברבעון האחרון. בהצלחה!" }],
  "hint": "שאלה ראשונה בכל דגימה: מהי האוכלוסייה, ומי בחר את הפריטים?",
  "pushback": "{contact} {מוסיף|מוסיפה}: \"בשנה שעברה הביקורת הסתפקה בזה.\"",

  "framings": [
    { "id": "f1", "text": "האם 15 התיקים האלה הם מדגם מייצג של האוכלוסייה שחייבת בעדכון?", "quality": 3 },
    { "id": "f2", "text": "האם אספיק לסיים את עבודת השטח בזמן?", "quality": 1 },
    { "id": "f3", "text": "האם קצין הציות מנסה להסתיר משהו?", "quality": 1 },
    { "id": "f4", "text": "אין כאן שאלה — קיבלתי חומר, בודקים אותו.", "quality": 0 }
  ],

  "info": [
    { "id": "pop", "kind": "decisive", "hours": 2, "label": "לבקש את רשימת האוכלוסייה המלאה של הלקוחות החייבים בעדכון", "reveal": "ברשימה 2,140 לקוחות; 190 מסווגים בסיכון גבוה; 15 התיקים שנשלחו כולם מסיכון נמוך.", "sets": "asked_population" },
    { "id": "method", "kind": "decisive", "hours": 1, "label": "לשאול את מנהל/ת ההתקשרות מה נהוג במשרד", "reveal": "\"מדגם מבוסס סיכון מתוך האוכלוסייה המלאה; המבוקר לא בוחר את המדגם. אבל זה התיק שלך.\"", "sets": "asked_method" },
    { "id": "gossip", "kind": "noise", "hours": 1, "label": "לשאול את תום מה הוא היה עושה", "reveal": "\"קח את ה-15, מי יבדוק? יש לך עוד שני תיקים.\"" },
    { "id": "lastyear", "kind": "trap", "hours": 2, "label": "לקרוא את דוח הביקורת של שנה שעברה", "reveal": "הדוח של שנה שעברה הסתמך על תיקים שהבנק בחר. אין ממצאים. (הרגולטור ביקר אותו על כך, אבל זה לא כתוב בדוח.)", "effect": { "energy": -2 } }
  ],

  "failureModes": [
    { "id": "m1", "text": "המדגם לא ייצג את הסיכון, והרגולטור ימצא מה שלא בדקנו.", "signal": "ממצא של בנק ישראל בלקוח בסיכון גבוה שלא היה במדגם שלנו", "forOptions": ["a"] },
    { "id": "m2", "text": "מדגם אקראי לא יתפוס אף לקוח בסיכון גבוה ונצטרך להרחיב.", "signal": "אפס לקוחות בסיכון גבוה במדגם", "forOptions": ["b"] },
    { "id": "m3", "text": "קצין הציות ייפגע ויעכב ראיות.", "signal": "ראיות מגיעות באיחור של יותר משבוע", "forOptions": ["c"] },
    { "id": "m4", "text": "המנהל/ת יחשוב/תחשוב שאני לא יודע/ת לעבוד לבד.", "signal": "הערה על עצמאות בשיחת הרבעון", "forOptions": ["d"] }
  ],

  "rationales": [
    { "id": "r1", "text": "חיסכון בזמן חשוב יותר מהשלמות כשיש שני תיקים פתוחים.", "fits": ["a"] },
    { "id": "r2", "text": "עצמאות המדגם היא חלק מהראיה; כשהזמן קצר מקטינים מדגם, לא עצמאות.", "fits": ["b", "c"] },
    { "id": "r3", "text": "המתודולוגיה היא החלטה של המנהל/ת, לא שלי.", "fits": ["d"] }
  ],

  "options": [
    {
      "id": "a", "label": "לקבל את 15 התיקים ולהתקדם", "quality": 0, "needsInfo": null,
      "tags": ["shortcut", "client-pleasing"], "reversible": false, "escalation": "none",
      "immediate": { "energy": -1, "eng.quality": -4, "eng.work": 1, "trust.contact": 6 },
      "result": { "pGood": 0.3,
        "good": { "text": "15 התיקים תקינים. עבודת השטח נסגרת בזמן.", "effect": {} },
        "bad": { "text": "תוך כדי בדיקה אתם שמים לב שכל 15 התיקים הם לקוחות פרטיים קטנים.", "effect": { "confidence": -2 } } },
      "delayed": [
        { "after": 4, "prob": 0.7, "failureMode": "m1", "text": "בבדיקת בנק ישראל נמצא לקוח בסיכון גבוה ללא הצהרת נהנה. הממצא לא הופיע בדוח שלכם.", "effect": { "eng.quality": -15, "confidence": -8, "integrity": -4 }, "flag": "kyc_missed_file" }
      ],
      "feedback": {
        "why": "המבוקר בחר את המדגם, ולכן הוא לא מדגם אלא מצגת. לפי GIAS 2024 ראיה צריכה להיות מספיקה ומהימנה, והוראה 308 מצפה שהביקורת תבחן את האוכלוסייה בסיכון, לא את מה שנוח.",
        "expert": "מבקש/ת את האוכלוסייה, מסווג/ת לפי סיכון, בוחר/ת בעצמו/ה, ומתעד/ת את השיטה בנייר העבודה לפני שנוגעים בתיק הראשון.",
        "bias": "עיגון: 15 התיקים שעל השולחן הפכו לברירת המחדל. ולחץ חברתי: המייל היה חביב.",
        "rule": "מדגם שהלקוח בחר הוא מצגת, לא מדגם."
      },
      "biasTags": ["anchoring", "social-pressure"]
    },
    {
      "id": "b", "label": "לבקש את האוכלוסייה ולבחור מדגם אקראי של 25 תיקים", "quality": 2, "needsInfo": "asked_population",
      "tags": ["documentation"], "reversible": true, "escalation": "none",
      "immediate": { "energy": -1, "eng.quality": 4 },
      "result": { "pGood": 0.6,
        "good": { "text": "במדגם נפלו שני לקוחות בסיכון גבוה. אחד מהם ללא עדכון במועד — ממצא.", "effect": { "eng.quality": 3 } },
        "bad": { "text": "במדגם האקראי לא נפל אף לקוח בסיכון גבוה.", "effect": {} } },
      "delayed": [
        { "after": 3, "prob": 0.4, "failureMode": "m2", "text": "מנהל/ת ההתקשרות מבקש/ת להרחיב את המדגם ללקוחות בסיכון גבוה. שבוע עבודה נוסף.", "effect": { "eng.work": -1 } }
      ],
      "feedback": {
        "why": "טוב: המדגם שלכם, מתוך האוכלוסייה. חסר: אקראיות טהורה מפספסת את מה שהרגולטור מחפש, כי 9% מהאוכלוסייה מרכזים את רוב החשיפה. דגימה מבוססת סיכון היא הסטנדרט בביקורת ציות.",
        "expert": "משלב/ת: רוב הפריטים מהשכבה בסיכון גבוה, מיעוט אקראי מהשאר, ומסביר/ה את היחס בנייר העבודה.",
        "bias": "הטיית ההליך: 'אקראי' נשמע אובייקטיבי, אבל האובייקטיביות היא בשיטה המתועדת, לא במטבע.",
        "rule": "גודל מדגם הוא טיעון, לא מספר."
      },
      "biasTags": ["procedure-bias"]
    },
    {
      "id": "c", "label": "מדגם מבוסס סיכון: 20 תיקים בסיכון גבוה + 10 אקראיים, ולתעד את שיטת הבחירה", "quality": 3, "needsInfo": "asked_population",
      "tags": ["documentation", "initiative"], "reversible": true, "escalation": "inform",
      "immediate": { "energy": -2, "eng.quality": 8, "trust.contact": -3 },
      "result": { "pGood": 0.75,
        "good": { "text": "נמצאו 3 תיקים בסיכון גבוה ללא עדכון במועד. {contact} לא מרוצה, אבל הממצא מבוסס.", "effect": { "rep": 3, "flag.finding_kyc_def": 1 } },
        "bad": { "text": "המדגם נקי. {contact} {מזכיר|מזכירה} לכם בחיוך שהוא/היא אמר/ה.", "effect": { "trust.contact": -2 } } },
      "delayed": [
        { "after": 6, "prob": 0.5, "failureMode": "m3", "text": "ראיות לתיקים הנוספים מגיעות באיחור. {contact} 'עסוק/ה'.", "effect": { "eng.work": -1 } }
      ],
      "feedback": {
        "why": "זה הסטנדרט: אוכלוסייה → סיכון → מדגם → תיעוד. אמון הלקוח ירד קצת, וזה בסדר; אמון נבנה על דוח שעומד מול הרגולטור, לא על נוחות.",
        "expert": "בדיוק זה, ובנוסף שולח/ת ל{contact} שורה אחת שמסבירה למה: 'המתודולוגיה שלנו, לא חוסר אמון'.",
        "bias": "אין הטיה לתקן כאן; הסיכון הוא ביישום — שלא תתעדו כי 'ברור'.",
        "rule": "מדגם מתחיל מהאוכלוסייה, לא מהתיקים שמישהו הביא."
      },
      "biasTags": []
    },
    {
      "id": "d", "label": "להעלות למנהל/ת ההתקשרות ולבקש הנחיה", "quality": 1, "needsInfo": null,
      "tags": ["escalate"], "reversible": true, "escalation": "escalate",
      "immediate": { "trust.manager": -2 },
      "result": { "pGood": 0.5,
        "good": { "text": "המנהל/ת עונה בשורה: 'אוכלוסייה, סיכון, מדגם שלך. למה שאלת?'", "effect": {} },
        "bad": { "text": "המנהל/ת בשטח אצל לקוח אחר. תשובה רק בעוד יומיים.", "effect": { "eng.work": -1 } } },
      "delayed": [],
      "feedback": {
        "why": "העלאה היא כלי, לא תחליף לשיקול דעת. כאן המתודולוגיה ברורה ואין צורך בסמכות; לשאול 'מה לעשות' בלי להציע מה הייתם עושים מוריד נקודות אצל המנהל/ת.",
        "expert": "אם כבר מעלה — מגיע/ה עם הצעה: 'אני מתכנן/ת מדגם מבוסס סיכון, 30 תיקים. מתנגד/ת?'",
        "bias": "הימנעות מסיכון: העברת האחריות מרגישה בטוחה, אבל היא מתועדת כחוסר עצמאות.",
        "rule": "מסלימים כשחסר מידע או סמכות, לא כשחסר אומץ."
      },
      "biasTags": ["responsibility-transfer"]
    }
  ],

  "rubric": { "framing": 15, "info": 20, "noise": 5, "option": 20, "premortem": 10, "reversibility": 10, "escalation": 10, "memo": 5, "followup": 5 }
}
```

**Placeholders**: `{client}`, `{contact}`, `{manager}`, `{regulator}`, `{firm}` are filled at draw time from the engagement; `{masc|fem}` tokens resolve by the nearest preceding person placeholder's `gender` (default `{contact}`). The validator rejects unbalanced tokens.

**Effect DSL keys**: `energy`, `confidence`, `rep`, `integrity`, `eng.quality`, `eng.work`, `eng.deadline`, `trust.contact`, `trust.manager`, `trust.<castId>`, `skill.<id>` (±0.3 cap), `flag.<name>`. Caps per decision: `eng.quality` ±15, `confidence` ±10, `rep` ±8, `integrity` ±15. Unknown keys warn at build time and are ignored at runtime.

**Other banks share the engine but have small schemas**: `moments.json` (scenario + `ticker: {hostile:[...], neutral:[...], friendly:[...]}` 3–6 lines each, `matchType`), `events.json` (journal `none`, `requires.season/week`, `scoutable`, `leadWeeks`), `deliverables.json` (§10), `firms.json`, `clients.json`, `stakeholders.json`, `lessons.json`, `drills.json`, `seasons.json`, `awards.json`.

---

## 8. "Matches": high-stakes events

A match is an engagement's key moment or an external shock. Types in v1: **תיקוף ממצאים מול הלקוח** (end of findings phase), **הצגה לדרג בכיר** (end of present phase: ועדת ביקורת / דירקטוריון / מנכ"ל / מנכ"לית משרד), **ביקורת רגולטור** (1–2 per season at financial clients; the regulator reads *your* earlier reports — moments `requires` flags like `kyc_missed_file`), **תקרית** (2 per season, any week: privacy leak, AML alert, whistleblower letter). Audit committees are quarterly set pieces.

**Structure (no real-time, "live" through pacing):**

1. **הכנה לאירוע** (the week before, in the inbox): the opponent's "team sheet" — who attends, what will be examined, the engagement's current quality and findings. The player sets three discrete approach toggles (**גישת עבודה**): «מבוסס סיכון / מבוסס כללים», «שקיפות מלאה / מנוהלת», «סף הסלמה נמוך / גבוה». Each match type has a fit table (0–3). Preparation hours spent on that engagement in the last 3 weeks plus evidence quality compile into **מוכנות** 0–100. Trust ≥ 60 with the client's internal auditor reveals the first moment's topic.
2. **רגעים** — 3 moments (5 for AC and inspections). Each moment: the ticker prints its lines one tap at a time («המשך ▸»), then a decision card (light scenario, 2–4 options, some gated on `needsInfo` bought *before* the match, on prep ≥ 60, or on a colleague's trust ≥ 60 — always with the gate shown as a greyed label with the reason, never silently). Hostility per moment is drawn with `p = clamp(0.20 + 0.03·avg(skills) + 0.004·eng.quality + 0.002·trust.client + 0.002·prep + 0.05·fit − 0.10·[energy<30], 0.08, 0.95)`: roll < p → friendly, < p+0.25 → neutral, else hostile. `p` picks the text and the swing size; the player's choice still decides.
3. **הפסקה** after the second moment in 5-moment matches: change one toggle, or ask a brought colleague for a line (trust ≥ 60: a hint on the next moment).
4. **סיכום האירוע**: a findings sheet (ratings as pills: הערה / ליקוי / ליקוי משמעותי / חולשה מהותית), the closing tone, a one-line headline for «מה אומרים בשוק», and **ציון ביצוע 1–10** for the player and each participant (FM player ratings), stored in stats and feeding confidence.

**Scouting = regulatory monitoring.** «ניטור רגולטורי» hours accumulate scouting points; at 2 points the next `scoutable` event (a circular, an inspection notice, a תיקון 13 deadline) appears `leadWeeks` early as «מבט קדימה», becomes a planned mini-engagement, and its negative effect halves. Threats seen early are projects, not incidents.

**Resolution.** `eng.quality += Σ moment deltas`; `confidence += (eng.quality − 50)/10 + Σ(rating − 6)/2`; `rep += (eng.quality − 60)/20` if integrity ≥ 60. Deadline misses before a match cost `confidence −6`, `trust.client −4` per week.

---

## 9. Decision journal & process feedback

The journal («יומן ההחלטות») is the spine, meant to leak into real life.

**Every journal-tagged decision stores:** week, engagement, scenario family, framing chosen (+quality), info bought / missed / noise / trap, option (+quality, tags, reversibility, escalation), failure mode picked, memo rationale, follow-up date, rubric breakdown, process score P, outcome O (1–10 from immediate + result), luck roll (`pGood`, outcome), delayed consequences (filled in as they land), מעקב answer, and «מה למדתי» (optional free text).

**Metrics computed from rubric tags (no AI):** process mean and trend; info-before-decide rate; noise/trap rate; escalation calibration (right / too early «זאב-זאב» / too late); reversibility violations; pre-mortem hit rate (did the signal materialise?); follow-up completion; per-domain and per-skill process means; outcome-vs-process divergence count ("good process, bad outcome" vs "bad process, good outcome").

**Views:** **ציר זמן** (P as a navy bar, O as a gold bar, side by side); **דפוסים** — pattern lines generated by 12 hand-written detectors, e.g. «ב-4 מתוך 6 אירועי פרטיות הסלמת מאוחר מדי», «ב-68% מהמקרים שבהם לא איספת מידע, פספסת ראיה מכריעה»; **הערת המאמן/ת** (the mentor's quarterly line); **ייצוא** as Markdown (same headings the player can use at work: `## שבוע · לקוח · השאלה · מה ידעתי · חלופות · מה החלטתי · מה יוכיח שטעיתי · מתי בודקים`).

**Closing the loop on prediction:** the **מעקב** inbox item arrives on the follow-up date (or when the first delayed consequence lands, whichever is first), reopens the entry, shows what actually happened, and asks «האם הסימן שציינת התממש?». The engine already knows (via `failureMode` on the consequence) and shows both the player's answer and the record — calibration, not a quiz.

**Quarter review («שיחת רבעון»):** the manager quotes the three lowest process-score decisions back, with their rules.

**End-of-season report («סיכום עונה»):** Q̄ per engagement; «תוצאות» and «תהליך» lines for the season; attribute deltas with arrows; relationship map deltas; the **three decisions that mattered most** (largest |Δ confidence + Δ rep + Δ eng.quality| including delayed effects) each with **the branch not taken** (the highest-quality option not chosen and its `why`); the pattern lines; the sponsor's verdict paragraph (assembled from authored sentences keyed to score bands and relationship); awards.

---

## 10. Progression, promotion, job offers, reputation, board confidence; losing conditions

**ציון עונה** = 0.40·mean(eng.quality) + 0.35·mean(P) + 0.25·confidence.

**Promotion at the annual review (week 48) requires all of:**
1. ציון עונה ≥ 62 + 4·(tier−1) and `confidence` ≥ 70 (firm `promoDelta` adjusts).
2. **Gate deliverable ≥ 65** — a structured builder, played in weeks 44–47 when eligible. Each deliverable has 5 slots; each slot offers 4 candidate sentences (best 20, slot-confused 10, vague 5, wrong 0) with per-slot feedback. Tier 1: a finding from the season's own engagement (מצב / קריטריון / סיבה / השפעה / המלצה). Tier 2: a risk-survey report (rate 6 exposures on סבירות × השפעה, inherent vs residual, order the heat map, pick the three for the executive summary, pick the opening sentence). Tier 3: match 5 management responses to findings and accept / reject / revise with a reason. Tier 4: order the AC narrative (opening line, 5 slides, the ask). Tier 5: positioning memo (segment, value proposition, proof). Practice versions are available any time in «ספריית הידע» without score.
3. **The sponsor's vote:** a partner or manager at the current firm with trust ≥ 60 must argue the case. If the mentor left, nobody does — which is how the game nudges the player toward the transfer window.
4. Tier minimums on the primary attributes (tier 2: testing, evidence, writing ≥ 8; tier 3: client, prio ≥ 11; tier 4: present ≥ 14; tier 5: rep ≥ 75 for a full season).

Failing promotion twice at the same tier triggers «שיחה קשה» and offers from smaller firms (faster ladder, lower prestige). The rival is promoted first whenever `confidence < 65` at review.

**Job offers («חלון ההצעות»)** open weeks 1–6. Offer probability per firm = `clamp((rep − firm.minRep)/40, 0, 0.9) × firm.need`. A card shows title, pay multiplier (score only), the board's objectives, the firm's philosophy, and a scouting line if monitoring hours were spent on it. Accepting resets `confidence` to 50, keeps attributes, journal and cast memory, and moves the network but not the sponsor.

**Firms (JSON culture modifiers, v1 ships four + own practice):**

| Firm | Profile | Modifiers |
|---|---|---|
| גולדשטיין–ברק ושות' | Big-Four style; banks, insurers, ISOX entities | prestige 90, pay 1.4, hours 44 (energy −4/week), `tagMult: {documentation: 1.1, initiative: 0.9}`, rival density high |
| אופק ביקורת פנימית | public-sector outsourcer under חוק הביקורת הפנימית 1992 | prestige 45, pay 0.9, `trustMult 1.5`, `promoDelta −5`; where the player should start |
| קסטל ניהול סיכונים | risk-survey house (310/350/361) | prestige 65, `infoCostMult: {evidence: 1.5}` (its own methodology penalises evidence time), `incidentRate 1.5`, fastest growth in `risk` |
| שגב–פרץ ציות ורגולציה | compliance-law boutique (308/411/AML/תיקון 13) | prestige 70, slow ladder (`promoDelta +5`), regulator-sourced rep ×1.5 |
| הפרקטיקה שלי (tier 5) | two-person practice | prestige 20, `confidence` replaced by cash runway; win at prestige 60 |

**Reputation** grows from engagements with quality ≥ 65 (only while integrity ≥ 60), awards, regulator citations and headlines; it halves on dismissal. **Integrity** drops on options tagged `integrity-` (downgrading under pressure, hiding, tipping off), +1/season recovery.

**Losing conditions** (all survivable except one):
- `confidence < 25` at two consecutive quarter closes → **פיטורים**: post-mortem screen listing the journal entries that led there; continue at a lower-prestige firm, rep halves.
- `flag.material_failure` while `rep < 30` → fired the same week.
- `integrity < 20` → **«ועדת אתיקה»** ending: the career ends with a journal retrospective; a new career can start with the «מורשת» badge.
- `energy < 10` for 4 consecutive weeks → forced leave of 4 weeks, all attributes −0.5, confidence −5.

**Endings:** «הגעת לפסגה» — tier 5 at a prestige ≥ 70 firm or own practice at prestige 60; «הצד השני» — accepted the tier-3 in-house crossroads; «הקריירה נגמרה» — three dismissals. **Awards at week 48** («טקס הפרסים»): «אנליסט/ית השנה», «הממו הכי טוב» (highest P), «ההסלמה של העונה» (a right escalation that mattered), «הממצא של העונה», and the shame award **«זאב-זאב»** (most wrong escalations). Awards go on the «קורות חיים» screen.

---

## 11. Calendar & season structure

A season is one calendar year of **48 playable weeks**, four per month, four quarters. Holidays are real weeks with their own rules: no new scenario draws, energy +10, deadlines never fall on them, inbox shows «חג שמח» from the mentor.

| Weeks | Month | Phase | Fixed events |
|---|---|---|---|
| 1–4 | ינואר | תכנון שנתי | transfer window (1–6), annual audit plans to committees, ISOX scoping, new portfolio |
| 5–8 | פברואר | | risk-survey refreshes |
| 9–12 | מרץ | עבודת שטח | Q1 ועדת ביקורת (12), שיחת רבעון |
| 13–16 | אפריל | | **פסח** (15, holiday) |
| 17–20 | מאי | | יום הזיכרון / יום העצמאות (18, light week: draws −1) |
| 21–24 | יוני | | שבועות (22, light), Q2 ועדת ביקורת (24), שיחת רבעון |
| 25–28 | יולי | ISOX ותיקוף | control testing, deficiency evaluation |
| 29–32 | אוגוסט | | slow month: draws −1, client contacts `absent` variants, energy +4/week |
| 33–36 | ספטמבר | | Q3 ועדת ביקורת (35), **ראש השנה** (36, holiday) |
| 37–40 | אוקטובר | דיווח | **יום כיפור / סוכות** (37, holiday); «אחרי החגים» crunch (38–40: draws +1) |
| 41–44 | נובמבר | | report season; gate-deliverable window opens (44) |
| 45–48 | דצמבר | | year-end incident spike (AML backlogs, privacy), annual review + awards + season review (48) |

**Random events:** 2 תקריות per season (any non-holiday week), 1–2 regulator inspections at financial clients (announced 3 weeks ahead, or 6 with scouting), circulars (`scoutable`), rival and market news, mentor notes, an energy event (illness) once per season at most. **Engagement portfolio** per tier from `seasons.json`: tier 1 = 3 overlapping engagements of 8–14 weeks each; tier 2 = 3 engagements, one owned end-to-end.

---

## 12. Screens

One `<main>` with `<section data-screen>` switching; bottom tab bar on phone (לוח, דואר, תיקים, יומן, עוד), side nav on desktop. All screens: 16px gutter at 400px, no horizontal scroll, tables collapse to cards.

| Screen | Purpose | Main elements | Mobile note |
|---|---|---|---|
| **פתיחה / בחירת פירמה** | new career, load slot | name + gender picker, four firm cards with culture lines, 3 save slots | cards stack |
| **לוח הבקרה** | the week | week/season chip, energy bar, 40h budget bar with action chips, engagement cards (phase pill, quality bar, deadline countdown), unread count, אמון הפירמה and מוניטין gauges, «סיום שבוע ▶» | sticky bottom button |
| **תיבת הדואר** | inbox | rows: sender initials, subject, week, type pill (החלטה / רגע מפתח / השלכה / מעקב / חדשות / הצעה), unread dot | full-width rows |
| **חדר ההחלטה** (sheet) | the scenario | stepper (הקשר → מסגור → מידע → חלופות → פרה-מורטם → ממו → תוצאה), collapsible attachments, info buttons with hour cost, luck line, two-line and four-part feedback, lesson link, «הצג ביומן» | bottom sheet, scrollable body, options pinned |
| **אירוע חי** | the match | header (opponent, מוכנות, toggles), ticker lines with «המשך ▸», moment cards, הפסקה panel, result sheet with ratings | ticker full width |
| **התיקים** | engagements | per engagement: client, type, regulator, phase timeline, work units, findings list with rating pills, contacts with trust bars | accordion |
| **הפרופיל המקצועי** | attributes | 3 groups; rows with bar, number chip, ▲▼, «לא תרגלת» badge; band label, tier ceiling marker, integrity word | rows |
| **האנשים שלי** | cast + contacts | cards grouped by organisation, trust bar, temper icon, memory lines («זוכרת את הממצא שהורדת, עונה 2») | cards |
| **יומן ההחלטות** | the teaching screen | timeline (P navy / O gold), filters by skill/domain, entry detail, דפוסים panel, הערת המאמן/ת, «ייצוא Markdown» textarea | list → detail |
| **ספריית הידע / לימוד** | training | drills per skill (4h), lessons glossary unlocked by play, regulation one-pagers, deliverable practice builders | cards |
| **לוח השנה** | 48-week strip | months, holidays, deadlines, matches, quarter closes, window | horizontal scroll strip |
| **הפירמה** | org and standing | confidence history, rival and sponsor status, culture in plain words, «מה אומרים בשוק» feed | feed |
| **חלון ההצעות** | offers | contract cards, accept/decline | cards |
| **סיכום עונה / טקס הפרסים** | season end | score breakdown, promotion verdict, three decisions + branch not taken, sponsor verdict, awards | long scroll |
| **קורות חיים** | career history | firms, seasons, objectives, awards, endings | table → cards |
| **הגדרות** | settings | theme (auto/light/dark), text size, save slots, export/import JSON textarea, reset, `?sim` note | — |

---

## 13. Content plan for v1

**Domains** (`domain` tag): `compliance` ציות (AML/KYC, מתנות וניגודי עניינים, פרטיות ותיקון 13, חשיפת שחיתויות, ניטור רגולציה) · `risk` סיכונים (סקר סיכונים, RCSA, KRI, ספקים, סיכון תפעולי, סייבר ברמת אנליסט) · `control` בקרה פנימית וביקורת (תכנון מול תפעול, בדיקות ודגימה, ראיות, ליקויים, הפרדת תפקידים והרשאות, ניהול שינויים, כתיבת ממצא, תגובת הנהלה, דיווח לוועדה) · `decision` קבלת החלטות (מסגור, תעדוף בין לקוחות, הסלמה, פרה-מורטם, ממו) · `strategy` אסטרטגיה (ניתוח מצב, מיצוב — tier 5) · `marketing` שיווק ופיתוח עסקי (RFP, תמחור סקר, מיצוב הפרקטיקה — tier 5).

**v1 counts (tiers 1–2, two firms, four seasons without a same-id repeat):**

| Bank | Tier 1 | Tier 2 | Notes |
|---|---|---|---|
| compliance scenarios | 14 | 8 | 7 families |
| risk scenarios | 10 | 8 | 6 families |
| control/audit scenarios | 22 | 14 | 12 families |
| decision scenarios | 10 | 6 | 5 families |
| strategy / marketing | 0 | 0 | 2 news teasers only; banks arrive with tier 5 |
| match moments | 14 | 10 | validation 8, present 8, inspection 4, incident 4; each with 3 hostility ticker variants |
| events / news / circulars | 16 | | 6 scoutable, 3 cast events (mentor leaves, rival promoted, crossroads teaser) |
| gate deliverables | 1 | 1 | + 1 practice builder each |
| drills | 8 | | 5 items each |
| lessons | 30 | | glossary |
| firms / clients / cast / contacts | 4 / 12 / 8 / 28 | | clients: 2 banks, 2 insurers/provident, 1 investment house, 2 ministries, 2 local authorities, 2 government companies, 1 statutory corp |
| season templates | 2 | | |

Totals: 92 decision scenarios in 30 families + 24 moments ≈ 116 playable units, ~23k Hebrew words. Honest sizing: v1.0 ships 60 scenarios (enough for season 1), v1.1 adds the remaining 32 before season 2 is reachable. Half are `sector: ["*"]` with placeholders.

**The 12 first scenarios (titles in Hebrew):**
1. המדגם שקצין הציות הכין — bank, KYC sampling, fieldwork, t1
2. «אנחנו מועצה קטנה» — local authority, SoD, validation, t1
3. התיקים שהגזבר הכין לך — municipal procurement, same family as #1, t1
4. חריגה אחת בדגימה של 25 — ISOX payment approval, t1
5. כרטיסים באמצע מכרז — government company, gifts during a live tender, t1
6. הקובץ שנשלח לכתובת הלא נכונה — insurer, תיקון 13 incident, t1/2
7. «רק תוריד את זה ל'ליקוי'» — provident fund, access-control rating, t2
8. אחת-עשרה הפקדות של 49 אלף — bank, structuring + tipping off, t2
9. «על סמך מה נקבע גודל המדגם?» — ISOX external-auditor moment, t1
10. שלושה תיקים, דדליין אחד — prioritisation across clients, t1
11. חמש-עשרה דקות מול ועדת הביקורת — provident fund, presentation moment, t2
12. «למה זה בשקף 3?» — bank AML backlog, AC narrative moment, t2

---

## 14. Simulation & balance

**Tick order on «סיום שבוע»** (deterministic, `mulberry32` seeded, RNG state saved):
1. `week++`; fire `queue` items with `due <= week` (effects, inbox «השלכה», journal update, מעקב scheduling).
2. Engagement phases: `work >= phaseWork[phase]` → advance; entering `findings`/`present` schedules a match next week; deadline checks.
3. Resolve matches scheduled for this week (player plays them from the inbox before ending the next week; unplayed matches auto-resolve at neutral with `quality: 1` choices and a confidence −3 note).
4. Energy: `+10` base, `+15` rest, `+2` per 4 unspent hours, `−8` per overdue engagement, `−firm.hoursPenalty`; clamp 0–100.
5. Mastery update (below) for decisions made this week; decay for idle skills.
6. Spaced-repetition scheduler (below).
7. Inbox draw: 1–2 curriculum scenarios matching an active engagement's `phase`/`sector`/`engType`/`tier`, `requires`, `seen[id] + cooldown < week`, weighted toward the weakest tagged attribute (weight = `1 + (12 − mastery)/6`), capped at 2 `full` rooms per week; 1 event/news per 3 weeks; holiday/season modifiers.
8. Trust decay; integrity recovery at season end.
9. Quarter close at weeks 12/24/36/48. Autosave.

**Mastery update** per tagged skill after a decision: `expected = mastery/20`, `observed = skillScore/100` (the rubric items tagged to the skill, or P for process skills), `delta = K · w · difficulty · (observed − expected)`, `K = 2.0 if confidence < 5, 1.2 if < 15, else 0.7`; `mastery = clamp(mastery + delta, 1, tierCeiling)`. Drills use `K · 0.5`. **Decay:** after 8 idle weeks, `−0.15/week` toward `max(1, 0.6 · peak)`.

**Spaced repetition:** per skill, ladder `1 → 3 → 7 → 14 → 30` weeks; skillScore ≥ 70 advances a rung, < 50 resets, otherwise repeats. When due, inject a never-last-seen variant from a family tagged with that skill (bypassing family cooldown but never the same id within 20 weeks), labelled in the inbox «מקרה דומה חזר על עצמו», capped at 2 per week with curriculum items taking precedence.

**Process score** per decision: rubric sum (§6). **Outcome score** O (1–10): `5 + Σ immediate(eng.quality, confidence, trust)/4 + result(good: +2, bad: −2)`, clamped, updated when delayed consequences land.

**Luck:** `result.pGood` rolled once at decision time; delayed `prob` rolled at enqueue time; all stored, so reload changes nothing.

**Firm modifiers:** immediate `eng.quality` on an option is multiplied by `firm.tagMult[tag]` for each tag it carries; info cost by `firm.infoCostMult[kind]`; trust gains by `trustMult`; incident draw rate by `incidentRate`.

**Caps:** per decision `eng.quality` ±15, `confidence` ±10, `rep` ±8; per week `confidence` ±12.

**Anti-repetition:** scenario `cooldown` (default 30 weeks), `setFlag` once-flags, families with 2–4 surface variants (actor, sector, numbers), placeholders, firm-dependent consequences, hostility variants on moments, weakest-skill weighting (rotates as skills move), holiday and August modifiers that thin the inbox.

**Balance harness:** `node tools/sim.mjs --seasons 200` plays with random choices (and with a "good process" policy) and prints distributions of tier, dismissals, mean P, mean Q, energy floor, and repeat counts; `?sim=200` in the browser does the same against the bundled engine. Targets: random play is dismissed by season 3 in ≥ 60% of runs; good-process play reaches tier 2 by season 2–3 in ≥ 70%; no scenario id repeats inside a season.

---

## 15. Tech plan

Honours the committed scaffold (`build.mjs`, `src/`, `content/` at package root, `tools/smoke.mjs`).

```
marketing-manager/
  build.mjs                 # existing: inlines src css/js + all content/*.json into index.html as window.MM_CONTENT
  index.html                # built output, committed (GitHub Pages)
  DESIGN.md                 # this document
  CONTENT.md                # Hebrew authoring guide: schema, DSL, caps, the 3 worked examples
  src/
    index.template.html     # <html lang="he" dir="rtl">, <main>, <section data-screen>…
    styles.css              # tokens (light + dark), base, components, screens
    engine.js               # pure logic, no DOM: rng, state, effects, tick, draw, scheduler, match, rubric, mastery, journal, save/migrate
    ui.js                   # render per screen, event wiring, bdi wrapping, toasts, bottom sheet
  content/
    scenarios.fieldwork.json  scenarios.findings.json  scenarios.report.json  scenarios.present.json  scenarios.planning.json
    moments.json  events.json  deliverables.json  firms.json  clients.json  stakeholders.json  cast.json
    lessons.json  drills.json  seasons.json  awards.json  strings.json
  tools/
    validate.mjs            # schema + caps + cross-reference checks; run by build.mjs before bundling; non-zero exit on error
    sim.mjs                 # node balance harness over engine.js
    smoke.mjs               # existing Playwright smoke (console errors, overflow, RTL, screenshots)
    engine.test.mjs         # node:test unit tests for engine.js
```

**engine.js** exposes `globalThis.MM = { newGame, tick, draw, openScenario, buyInfo, choose, submitMemo, playMoment, applyEffect, score, mastery, scheduler, save, load, migrate, exportJSON, importJSON, sim }` and ends with `if (typeof module !== 'undefined') module.exports = MM;` so node tests `createRequire` it unchanged; it never touches `document` or `localStorage` directly (ui.js passes a storage adapter). Content is injected as `window.MM_CONTENT` by the existing bundler; node tools load the same JSON from `content/`.

**State shape (v1):**
```js
state = {
  v: 1, seed, rng: { s }, season, week,
  player: { name, gender, tier, energy, confidence, rep, integrity, flags: {},
            skills: { [id]: { mastery, confidence, peak, lastPracticed } },
            ladder: { [skillId]: { rung, due } }, scout: 0, approach: { basis, transparency, escalation } },
  firm: { id, confidenceHistory: [], sponsorId },
  world: { cast: { [id]: { trust, memory: {} } }, contacts: { [id]: { trust } } },
  engagements: [ { id, clientId, sector, type, phase, startWeek, deadline, work, phaseWork, quality, findings: [], managerId, contactId, matchDue } ],
  inbox: [ { id, week, type, scenarioId, engId, read, variantOf } ],
  queue: [ { due, effect, text, scenarioId, optionId, engId, rolled, failureMode } ],
  journal: [ /* §9 entry */ ],
  seen: { [scenarioId]: lastWeek }, familySeen: { [family]: [ids] },
  stats: { ratings: [], awards: [], seasons: [] },
  cv: []
}
```

**Save/load:** `localStorage["mm.save.<1|2|3>"]` in try/catch, autosave each tick; `migrate = [{from:1,to:2,fn}]` applied by `state.v`; import validates referenced ids and drops stale ones from `inbox`/`queue` with the toast «תוכן ישן הוסר»; export/import through a textarea (no dialogs).

**Testing:** `node --test tools/engine.test.mjs` covers deterministic tick with a fixed seed, DSL caps and unknown keys, `needsInfo` gating, rubric scoring on fixtures, mastery update and decay, ladder transitions, delayed-roll storage, migration, stale-save import. `node tools/validate.mjs` must pass before every build (build.mjs calls it). `node tools/sim.mjs` for balance. `node tools/smoke.mjs` runs Playwright at 1280 and 400 px: no console errors, no horizontal overflow, `dir=rtl`, plus a scripted path (new game → scenario → info → choose → memo → end week → journal entry) with screenshots.

**RTL rules (checked in smoke):** logical CSS properties only; `ui.js` wraps numbers and Latin acronyms (SOX, KYC, 308, ISOX) in `<bdi>` at render; `unicode-bidi: plaintext` on inputs and textareas; tab order from DOM order, never flex-reversal; progress bars drawn with `inset-inline`; tables collapse to cards at ≤ 480px.

---

## 16. Visual direction

Reuse the repo's system from «הדרך ל־61»: paper background `--bg #f3efe7`, surfaces `--surface #fffdf8`, ink `--text #141b2d`, `--navy #0e1a33`, accent `--gold #d6a536` / `--gold-ink #7d5a0e`, `--muted #545e72`, `--danger #b42318`, `--ok #217a4b`, radii 8/14/22, `IBM Plex Sans Hebrew` body + `Secular One` display from Google Fonts, light primary with the existing dark tokens (`--bg #0a1120`, `--surface #121d33`, `--text #eef2f9`, `--gold #e4b84e`) under `prefers-color-scheme` and `[data-theme]`.

**What makes it read as a manager game:** dense, calm tables (engagements, findings, journal) with number chips; FM-style attribute rows (name · bar · 1–20 chip · ▲▼); colour-banded numbers from the palette, never new hues; pill tags everywhere (phase, rating, type); אמון הפירמה and מוניטין as thin gauges with the number; an inbox that looks like an inbox (initials avatar, subject, week, unread dot); the week chip «שבוע 17 · מאי · עונה 2» always visible; «סיום שבוע ▶» as the one gold primary action; match ticker stamps («רגע 2/5») on the inline-end side; the journal's two bars (navy P, gold O) as the signature image. Display font only for screen titles; everything else Plex. Short `--t-fast` fades, no spinners, no timers.

---

## 17. Open questions for the user

1. Starting firm: should the first career always begin at «אופק ביקורת פנימית» (public sector, mentor-rich, the recommended start), or is the four-firm choice open from the first screen?
2. Player grammar: do you want to pick a gender for your own character (so the game's verbs agree), or should all player-directed text be written gender-neutral (e.g. «אתם»)?
3. Follow-up length: the «מעקב» item defaults to 4 weeks after the decision; do you prefer the memo's 2/4/8-week choice to be free, or fixed per scenario so the lesson lands at the right moment?
4. Real-name regulators: the game names regulators and laws precisely but keeps firms, clients and people fictional; is that the right line, or should client organisations also be fictional-but-recognisable (e.g. «בנק אלון» = a mid-size bank)?
5. Journal export: Markdown in a textarea is the no-dialog option; would a downloadable `.md` file (via an `<a download>`) be worth the small deviation?
6. Season 1 difficulty: should the first season at tier 1 be scripted (fixed portfolio and fixed first six scenarios so the tutorial is reliable), or fully drawn from the banks like later seasons?
