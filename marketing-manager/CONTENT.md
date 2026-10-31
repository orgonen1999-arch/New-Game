# CONTENT.md — authoring guide for «מרקטינג מנג'ר: הדרך לשותפות»

This is the contract between the content banks in `content/` and the engine. DESIGN.md is the authority; this file restates the parts an author needs while writing Hebrew content, and lists every id the reference files expose. English for the builder, Hebrew for everything the player sees.

Contents: 1 files · 2 scenario schema (§7, verbatim) · 3 effect DSL and caps · 4 placeholders and gender tokens · 5 text caps and style · 6 tags and bias tags · 7 reference ids (lessons, frameworks, base rates, scales, match types, awards) · 8 strings contract · 9 worked examples · 10 checklist.

---

## 1. Files

| file | shape | owner |
|---|---|---|
| `content/scenarios.<phase>.json` (`planning`, `fieldwork`, `findings`, `report`, `present`, `wild`) | array of scenario objects (§2) | scenario banks |
| `content/moments.json` | array of light scenarios + `matchType`, `ticker`, optional `scale`, `colleagueHint` | moment bank |
| `content/events.json` | array of `journal: "none"` items | events bank |
| `content/strings.json` | flat `{ key: template }` | this guide, §8 |
| `content/tags.json` | `{ tags: [...], biases: [...] }`, each `{ id, he, desc }` | §6 |
| `content/lessons.json` | `{ frameworks: [...], lessons: [...] }` | §7.1 |
| `content/baseRates.json` | array of rows `{ id, n, dev, conf, upper, source, he }` | §7.2 |
| `content/ratingScales.json` | `{ byEngType: {...}, scales: [...] }` | §7.3 |
| `content/matchTypes.json` | array `{ id, hebrew, hebrewByEngType, moments, fit }` | §7.4 |
| `content/awards.json` | array `{ id, key, he, shame, criteria, rule, desc }` | §7.5 |
| `firms.json`, `clients.json`, `stakeholders.json`, `cast.json`, `seasons.json`, `deliverables.json`, `drills.json` | see DESIGN.md §5, §10, §14 | world banks |

`build.mjs` inlines every `content/*.json` as `window.MM_CONTENT[<file stem>]`; `scenarios.*` stems are merged into one `scenarios` array and duplicate ids fail the build. All files are UTF-8, ids are kebab-case ASCII, and **Hebrew appears only in player-facing fields** (`title`, `body`, `label`, `text`, `reveal`, `signal`, `gateText`, `hint`, `pushback`, `feedback.*`, `he`, `hebrew`, string templates).

---

## 2. Scenario schema (DESIGN.md §7, verbatim)

A scenario is one situation with trade-offs, delayed consequences and feedback that teaches the why. Three weights: `journal: "full"` (the decision room), `"light"` (context → optional info → options → feedback), `"none"` (news, letters). Full rooms are capped at 2 per week.

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

Option **c** is the top-quality option and carries `escalation: "inform"` = `rightEscalation`, so the perfect play (f1 + pop + method, no noise, c, m3, r2, 4 weeks) scores P = 100. Note: `"{contact:מרוצה|מרוצה}"` in option c's good text is a token with identical alternatives; the validator accepts it (two alternatives), but prefer a real pair or no token.

**Scenario-level tags**: `domain` (`compliance` · `risk` · `control` · `policy` · `decision` · `strategy` · `marketing`), `sector` (`bank` · `insurer` · `provident` · `invest` · `ministry` · `muni` · `govco` · `statutory`, or `"*"`), `engType` (`audit` · `compliance` · `risk-survey` · `control-review` · `policy-writing` · `isox`, or `"*"`), `phase` (`planning` · `fieldwork` · `findings` · `report` · `present`, or `"*"`), `tier` (array of 1–5), `skills[{id, w}]`, `family`, `frameworks`, `lesson`, `baseRate`, `cooldown` (default 30), `difficulty` 1–3. **Option-level**: `tags`, `biasTags` (never on the scenario). The example's `domain: "audit"` predates the closed list; new scenarios use `control` for audit-craft content.

**Required keys per `journal` weight**
- `full`: everything in the example — `framings`, `info`, `failureModes`, `rationales`, `options` (each with `quality`, `reversible`, `escalation`, `immediate`, `result`, `feedback.{why,expert,bias,rule}`), `rightEscalation`, `rubric` (optional; defaults apply), `followupWeeks` (optional, default 4), `skills`, `lesson`.
- `light`: `id`, `family`, `bank`, `tier`, `domain`, `title`, `body`, `options` (each with `quality`, `immediate`, `result`, `feedback.{why,rule}`); optional `info`, `rightEscalation`, `rubric`, `skills`, `sector`/`engType`/`phase` (default `"*"`), `requires`, `cooldown`, `lesson`.
- `none`: `id`, `bank`, `tier`, `title`, `body`, `sender` (cast id or `"system"`), `effect` (DSL, may be `{}`); optional `requires`, `scoutable`, `leadWeeks`, `attachments`.

**Other fields**
- `requires` = `{ flags: [names], notFlags: [names], minTrust: { [castId | "contact" | "manager" | "mentor"]: number }, season: number | null, week?: [from, to], tier?: number }`.
- Option gates: `needsInfo: string | string[]` (short form) **or** `gate: { info?, prep?: number, trust?: { id, min } }` with a sibling `gateText`; never both. `prep` gates belong in moments only. When `gateText` is omitted the engine uses `gate.info` / `gate.prep` / `gate.trust` from `strings.json`.
- A scenario that should run once sets its own flag in every option's `immediate` (`flag.<name>: 1`) and lists it in `requires.notFlags`. There is no `setFlag` key and no bare `flag` on consequences.
- Delayed consequences: `{ after, prob, text, effect, failureMode?, recurring?: { every, times } }`. All rolls happen at enqueue time.
- Rating pills: a scenario or moment that offers them carries `"scale": "<scale id>"` matching every `engType` it is tagged with; a `"*"` engType must use `scaleByEngType: { "<engType>": "<scale id>" }`.
- Validator invariant: the option with the highest `quality` must have `escalation === rightEscalation` (ties must all match).

**Moments** (`moments.json`): a light scenario plus `matchType` (string or array, must exist in `matchTypes.json`), `ticker: { hostile: [..], neutral: [..], friendly: [..] }` with 3–6 lines each, optional `scale`, optional `colleagueHint`, options may use `gate.prep` / `gate.trust`. Moments carry `requires` on flags earlier scenarios set (e.g. `kyc_missed_file`).

**Events** (`events.json`): `journal: "none"`, `requires.season` / `requires.week`, `scoutable: true` + `leadWeeks` for circulars and inspection notices (shown early as «מבט קדימה» when the player has 2 scouting points).

---

## 3. Effect DSL and caps

Effect keys (anything else fails validation at build time and is ignored at runtime):

| key | meaning | cap per decision |
|---|---|---|
| `energy` | player energy | — |
| `confidence` | board confidence (אמון הפירמה) | ±10 (±12 per week) |
| `rep` | professional reputation | ±8 |
| `rep.regulator` | reputation from a regulator citation (× `firm.repMult.regulator`) | counts toward the `rep` cap |
| `integrity` | hidden integrity; **only** way integrity moves | ±15 |
| `eng.quality` | the attached engagement's quality (× `firm.tagMult[tag]` for each option tag) | ±15 |
| `eng.work` | work units on the current phase (±1 typical) | — |
| `eng.deadline` | move the deadline by n weeks | — |
| `trust.contact`, `trust.manager`, `trust.mentor`, `trust.<castId>` | trust toward the player (gains × `firm.trustMult`) | ±2..±10 by convention |
| `skill.<id>` | direct nudge to a skill's mastery | ±0.3 |
| `flag.<name>` | set (`1`) or clear (`0`) a flag; `<castId>.<name>` mirrors into that person's memory | — |

Effects appear in `immediate`, in `result.good.effect` / `result.bad.effect`, in `delayed[].effect`, in `info[].effect` (traps) and in an event's `effect`. Write the integrity hit on the option that deserves it (`"integrity": -4` on downgrade / hide / tip-off / undisclosed self-review); never rely on tags for it.

Energy conventions: a full room costs −3 and a light one −1 on top of authored option costs; keep authored `energy` in −1..−2.

---

## 4. Placeholders and gender tokens

Placeholders filled at draw time: `{client}`, `{contact}`, `{manager}`, `{mentor}`, `{regulator}`, `{firm}`, `{player}`. Strings templates add their own named params (`{n}`, `{week}`, `{p}`, …).

Two token families, one rule each:
- **`{masc|fem}`** with no prefix resolves by the **player's** gender. Use it for anything said to or about the player: `{יודע|יודעת}`, `{אתה|את}`, `{אנליסט בכיר|אנליסטית בכירה}`.
- **`{<who>:masc|fem}`** resolves by that person's `gender`. `<who>` is `contact`, `manager`, `mentor`, `regulator`, or any cast/contact id. v1 cast ids: `naama` (f, mentor), `uri` (m, manager), `tom` (m, rival), `dalia` (f, AC chair), `yossi` (m, treasurer), `anat` (f, compliance officer), `regulator` (m), `michal` (f, client IA) — so `{dalia:זוכר|זוכרת}` resolves to «זוכרת». Order is always masculine first: `{contact:שלח|שלחה}`, `{manager:המנהל יחשוב|המנהלת תחשוב}`. An unprefixed token never refers to an NPC.
- Plural and neutral forms («אתם», «לכם», «הצוות», «המתחרה») need no token and are the easiest way to stay correct.
- Exactly two alternatives per token; no empty alternative; no nested braces; no `|` outside a token.
- **Slash forms are forbidden everywhere** (`/[א-ת]\/[א-ת]/` fails validation): never «מנהל/ת», «אמר/ה», «ו/או». Write a token, a neutral form, or two sentences.
- Numbers and Latin acronyms (SOX, KYC, 308, ISOX) are wrapped in `<bdi>` by `ui.js`; write them plainly.

Cast and role words in `strings.json` are keyed by gender (`role.manager.m` / `role.manager.f`) so the UI can pick without a token; tempers are nouns (`temper.supportive` = «תמיכה») for the same reason.

---

## 5. Text caps and style

| field | cap |
|---|---|
| `body` | ≤ 110 words |
| `feedback.rule` | ≤ 15 words, one transferable line |
| option `label` | one line (≤ 14 words works on a phone) |
| framing / failure-mode / rationale `text` | one sentence |
| `ticker` lines | 3–6 per hostility, each one line |
| `hours` on info actions | 1–6 |
| `quality` | 0–3 |
| `pGood`, `prob` | 0–1 |
| lesson `body` | 80–160 words |

Register: a serious manager game. Short sentences, present tense, no exclamation marks except in quoted client mail, no emoji. Feedback never says «נכון/לא נכון» alone: `why` names the principle and cites the framework by name; `expert` says what a senior analyst would do (use player tokens); `bias` names one bias from `tags.json`; `rule` is the line the player should remember at work. Regulators and laws are named precisely; firms, clients and people are fictional-but-recognisable.

---

## 6. Tags and bias tags (`content/tags.json`)

Option `tags` (closed): `shortcut` קיצור דרך · `client-pleasing` ריצוי לקוח · `documentation` תיעוד · `initiative` יוזמה · `escalate` הסלמה · `defer` דחייה · `independence` עצמאות · `disclosure` גילוי · `scope-cut` צמצום היקף · `over-testing` בדיקת יתר · `political` פוליטי · `delegate` האצלה · `downgrade` הורדת דירוג · `hide` הסתרה · `tip-off` הדלפה.

Option `biasTags` (closed): `anchoring` עיגון · `social-pressure` לחץ חברתי · `procedure-bias` הטיית ההליך · `responsibility-transfer` העברת אחריות · `sunk-cost` עלות שקועה · `availability` זמינות · `overconfidence` ביטחון יתר · `authority` סמכות · `confirmation` אישוש · `status-quo` שמרנות · `planning-fallacy` כשל התכנון · `loss-aversion` שנאת הפסד · `risk-aversion` הימנעות מסיכון.

`firm.tagMult` keys must come from the `tags` list. A quality-3 option usually carries 1–2 positive tags and an empty `biasTags`; the `bias` feedback of a top option says what could still go wrong in execution.

---

## 7. Reference ids

### 7.1 Lessons and frameworks (`content/lessons.json`)

`lesson` on a scenario must be one of (tier in brackets):

`three-lines` [1] · `independence-objectivity` [1] · `self-review-independence` [1] · `internal-audit-law-1992` [1] · `municipalities-ordinance` [1] · `interior-dg-circulars` [1] · `govco-authority-circulars` [1] · `state-comptroller` [2] · `directive-307` [1] · `directive-308` [1] · `directive-310` [2] · `directive-350` [2] · `directive-361` [2] · `aml-kyc-orders` [1] · `aml-tipping-off` [2] · `privacy-amendment-13` [1] · `capital-market-circulars` [2] · `isox-scoping` [1] · `isox-rollforward` [1] · `management-certification` [2] · `external-auditor-reliance` [1] · `gias-2024` [1] · `coso-2013` [1] · `iso-31000` [1] · `inherent-residual` [1] · `design-vs-operating` [1] · `deficiency-taxonomy` [1] · `sampling-population` [1] · `attribute-sampling` [1] · `evidence-sufficiency` [1] · `finding-anatomy` [1] · `segregation-of-duties` [1] · `management-response` [2] · `procedure-writing` [1] · `premortem` [1] · `base-rates` [1] · `reversibility` [1] · `escalation-calibration` [1] · `decision-memo` [1] · `framing` [1] · `regulatory-monitoring` [1] · `scope-management` [1] · `sponsor-and-promotion` [1] · `energy-and-judgment` [1].

Each lesson is `{ id, title, body, frameworks: [framework ids], skills: [skill ids], tier }`.

`frameworks` on a scenario is an array of strings. Each string must match a framework entry in `lessons.json.frameworks` by **`id`**, by exact **`he`**, by one of its **`aliases`**, or by `he` followed by ` — <topic>` (so «GIAS 2024 — ראיות מספיקות ומהימנות» matches `gias-2024`). Framework ids and canonical Hebrew:

| id | he |
|---|---|
| `three-lines` | מודל שלושת הקווים (IIA 2020) |
| `gias-2024` | GIAS 2024 |
| `coso-2013` | COSO 2013 |
| `iso-31000` | ISO 31000 |
| `internal-audit-law-1992` | חוק הביקורת הפנימית התשנ"ב-1992 |
| `municipalities-ordinance-170` | פקודת העיריות סעיפים 170א–170ג |
| `interior-dg-circulars` | חוזרי מנכ"ל משרד הפנים |
| `govco-law-circulars` | חוק החברות הממשלתיות וחוזרי רשות החברות הממשלתיות |
| `state-comptroller` | מבקר המדינה |
| `pcbb-307` … `pcbb-361` | הוראת ניהול בנקאי תקין 307 / 308 / 310 / 350 / 361 |
| `aml-law` | חוק איסור הלבנת הון התש"ס-2000 |
| `aml-orders` | צווי איסור הלבנת הון |
| `privacy-amendment-13` | תיקון 13 לחוק הגנת הפרטיות |
| `privacy-security-regs` | תקנות הגנת הפרטיות (אבטחת מידע) התשע"ז-2017 |
| `cma-circulars` | חוזרי רשות שוק ההון, ביטוח וחיסכון |
| `isox` | ISOX / SOX 404 |
| `external-auditor-reliance` | הסתמכות רואה החשבון המבקר על עבודת הביקורת הפנימית |
| `risk-survey-method` | מתודולוגיית סקר סיכונים (סבירות × השפעה) |
| `gifts-law` | חוק שירות הציבור (מתנות) התש"ם-1979 |
| `whistleblower-law` | חוק הגנה על עובדים (חשיפת עבירות ופגיעה בטוהר המידות או במינהל התקין) התשנ"ז-1997 |
| `decision-process` | תהליך קבלת החלטות (מסגור · מידע · חלופות · פרה-מורטם · ממו) |

Public-sector scenarios cite the exact public-sector strings (פקודת העיריות, חוזרי מנכ"ל, רשות החברות), not the 1992 law alone.

### 7.2 Base rates (`content/baseRates.json`)

Array of rows `{ id, n, dev, conf, upper, source, he }`. A scenario names a row (`"baseRate": "attr-25-1-90"`) and the card fills `{n}`, `{dev}`, `{conf}`, `{upper}` into the row's `he`. `upper` is the binomial upper confidence bound on the population deviation rate, in whole percent; the validator recomputes it (`largest p with P(X ≤ dev | n, p) ≥ 1 − conf/100`) and tolerates one point.

| id | n | dev | conf | upper |
|---|---|---|---|---|
| `attr-25-1-90` | 25 | 1 | 90 | 15 |
| `attr-25-0-90` | 25 | 0 | 90 | 9 |
| `attr-25-1-95` | 25 | 1 | 95 | 18 |
| `attr-25-2-90` | 25 | 2 | 90 | 20 |
| `attr-15-0-90` | 15 | 0 | 90 | 14 |
| `attr-40-0-90` | 40 | 0 | 90 | 6 |
| `attr-40-1-90` | 40 | 1 | 90 | 9 |
| `attr-60-0-95` | 60 | 0 | 95 | 5 |

### 7.3 Rating scales (`content/ratingScales.json`)

`byEngType` maps engagement type → scale id; `scales[]` hold `{ id, he, kind: "severity" | "status", engTypes, pills: [{ id, he, level }], pair? }`.

| scale id | engType | pills (low → high) |
|---|---|---|
| `icfr` | `isox` | `deficiency` ליקוי · `significant` ליקוי משמעותי · `material` חולשה מהותית |
| `severity` | `audit` | `low` חומרה נמוכה · `medium` חומרה בינונית · `high` חומרה גבוהה |
| `compliance` | `compliance` | `recommendation` המלצה · `noncompliance` אי-עמידה · `breach` הפרה |
| `riskBands` | `risk-survey` | `low` נמוך · `medium` בינוני · `high` גבוה · `critical` קריטי — shown as a pair `pair.inherent` מובנה / `pair.residual` שיורי |
| `designOp` | `control-review` | `note` הערה · `operating` ליקוי תפעול · `design` ליקוי תכנון |
| `docStatus` | `policy-writing` | `draft` טיוטה · `review` בסבב הערות · `approved` מאושר (a status, not a severity) |

Never put ICFR vocabulary on a council audit; the scale check exists for that.

### 7.4 Match types (`content/matchTypes.json`)

`validation` תיקוף ממצאים מול הלקוח (3 moments; for `policy-writing`: «סבב הערות עם בעל התהליך») · `present` הצגה לדרג בכיר (3; for `policy-writing`: «אישור הנוהל בהנהלה») · `inspection` ביקורת רגולטור (5) · `incident` תקרית (3) · `ac` ועדת ביקורת (5; draws moments tagged `matchType: ["present", "ac"]` or `["inspection", "ac"]`). The `hebrewByEngType` map holds the per-engType label; `fit` holds the three toggle tables (`basis.risk|rules`, `transparency.full|managed`, `escalation.low|high`, each 0–3), exactly as DESIGN.md §8.

### 7.5 Awards (`content/awards.json`)

`analystOfYear` («{אנליסט|אנליסטית} השנה», criteria `season-score-top`) · `bestMemo` («הממו הכי טוב», `max-process-score`) · `escalation` («ההסלמה של העונה», `right-escalation-max-impact`) · `finding` («הממצא של העונה», `max-finding-impact`) · `wolf` («זאב-זאב», `most-early-calibrations`, `shame: true`). Each award's `key` is the `strings.json` key with the display name; `rule` is the builder-facing predicate.

### 7.6 Skill ids

Craft: `risk` `controls` `testing` `evidence` `writing` `reg` `interview` `client` `present` `prio`. Process: `framing` `gather` `judgment` `premortem` `escalation` `memo`. Partnership (tier 5): `bd` `positioning` `datastory`. Hebrew names live in `strings.json` under `skill.<id>`.

---

## 8. Strings contract (`content/strings.json`)

Flat `{ "<key>": "template" }`. The engine never emits literal Hebrew; it returns `{ key, params }` and `ui.js` resolves it with `MM.t(key, params, ctx)` (params, both token families, `<bdi>` wrapping). The validator fails on a key referenced in `ui.js` / `engine.js` that is missing from the file and warns on unused keys, so adding keys is cheap and removing them is not.

Groups and the keys other code depends on (params in braces):

- `app.*` title, tagline, motto.
- `nav.*` (13 tabs), `screen.*` (18 titles).
- `ui.*` generic buttons and chips: `ui.endWeek`, `ui.continue`, `ui.hours {n}`, `ui.energyCost {n}`, `ui.weekChip {week} {month} {season}`, `ui.of {a} {b}` …
- `newgame.*` opening screen; `board.*` dashboard; `budget.*` the six action chips (`budget.work` … `budget.rest`), `budget.hours {used} {total}`, `budget.scoutPoints {n}`.
- `inbox.type.decision|moment|consequence|followup|news|offer` (+ `regulation`), `inbox.*` rows; one-time cards `content.endsHere`, `repeat.label`, `scout.ahead {title} {n}`, `holiday.greeting {mentor}`, `overdue {client} {n}`, `mentor.note {mentor} {week} {rule}`, `quarter.talk {manager} {list}`.
- `room.*` decision-room steps, prompts, rubric row names (`room.rubric.<item>`), feedback headings; `friday.line {o} {p}`; `luck.good|bad|goodProcessBadOutcome|badProcessGoodOutcome {p}`; `gate.info {info}`, `gate.prep {n}`, `gate.trust {n} {name}`; `shortcut.option` plus `shortcut.why|expert|bias|rule|result.good|result.bad` for the engine's generic shortcut option.
- `match.*` preparation, toggles (`match.basis.risk|rules`, `match.transparency.full|managed`, `match.escalation.low|high`), `match.prep`, `match.moment {i} {n}`, `match.break`, `match.autoResolved {type} {client}`, ratings.
- `eng.*` engagement cards; `phase.planning|fieldwork|findings|report|present|closed`; per-engType overrides as `phase.<engType>.<phase>` (e.g. `phase.policy-writing.fieldwork` = «ניסוח»); the ISOX weeks-41–44 label `phase.isox.report.rollforward`. `engType.<id>`, `domain.<id>`, `sector.<id>`.
- `profile.*`; `band.1` … `band.4` (1 = «{מתחיל|מתחילה}», 4 = «{מומחה|מומחית}»); `integrity.1` … `integrity.4` in the design's order **from best to worst** (1 = «ללא רבב» ≥ 80, 2 = «תקין» 50–79, 3 = «מפוקפק» 20–49, 4 = «בבדיקה» < 20); `skill.decayed {n}`; `skill.<id>` names; `tier.1.title` … `tier.5.title`.
- `people.*`, `temper.<tag>`, `role.<role>.m|f`.
- `journal.*` views, entry fields, calibration words, export headings (`journal.export.heading {week} {client}`, `journal.export.question|known|options|decided|signal|when`); `pattern.<id>` × 12 with the params DESIGN.md §9 lists (`k`, `n`, `pct`, `j`, `x`, `family`, `p1`, `p2`, `d`, `domain`).
- `followup.question` and `followup.*`; `consequence.*`; `independence.*`.
- `quarter.*`, `season.*` (verdicts, reasons, three decisions, sponsor), `awards.*` ceremony lines, `award.<id>` names.
- `ending.v1Milestone|summit|otherSide|ethics|careerOver` (+ `.body`), `dismissal.confidence|materialFailure`, `leave.forced`.
- `deliverable.*` gate builder (part kinds, slot verdicts, finding and procedure slot names, risk-report parts), `library.*`, `calendar.*`, `month.1` … `month.12`, `holiday.*`, `firm.*` (incl. `firm.metric.<metric>`), `offers.*`, `cv.*`, `settings.*`, `toast.*` (incl. `toast.staleContent`), `energy.*`, `empty.*`.

Conventions: numbers are params, never baked in (except fixed rules like «60», «65», «2 מתוך»); deltas arrive pre-signed (`{n}` = «+3» or «−4»); a key that addresses the player uses unprefixed tokens; a key that names an NPC uses the prefixed family or a neutral form.

---

## 9. Worked examples

### 9.1 Full room — «המדגם שקצין הציות הכין»

The complete object is in §2 above. What makes it work: the framing set has one 3, two 1s and a 0; two decisive info actions, one noise, one trap with an effect; the top option (`c`) is gated on the decisive info, is reversible, `inform`s, and carries a small trust cost that the feedback explains; the shortcut option (`a`) carries the integrity hit on its delayed consequence and sets the flag an inspection moment later `requires`; every failure mode's `forOptions` and every rationale's `fits` point at real option ids.

### 9.2 Moment — «על סמך מה נקבע גודל המדגם?» (`moments.json`)

Scenario #9 of the design, authored here as a schema example (illustrative, not the shipped text).

```json
{
  "id": "isox-ea-reliance-sample-size-v1",
  "family": "external-auditor-reliance",
  "bank": "moment",
  "journal": "light",
  "matchType": ["validation", "ac"],
  "tier": [1, 2],
  "difficulty": 2,
  "domain": "control",
  "sector": ["bank", "insurer", "invest"],
  "engType": ["isox"],
  "phase": "*",
  "scale": "icfr",
  "skills": [{ "id": "testing", "w": 0.6 }, { "id": "present", "w": 0.4 }],
  "frameworks": ["הסתמכות רואה החשבון המבקר", "ISOX / SOX 404"],
  "lesson": "external-auditor-reliance",
  "rightEscalation": "none",
  "requires": { "flags": [], "notFlags": [], "minTrust": {}, "season": null },
  "title": "«על סמך מה נקבע גודל המדגם?»",
  "body": "רואה החשבון המבקר של {client} יושב מולכם עם נייר העבודה של בקרת אישור התשלומים. 25 פריטים, חריגה אחת. הוא רוצה להסתמך על העבודה שלכם במקום לבדוק בעצמו.",
  "ticker": {
    "hostile": ["הוא מדפדף בלי להרים את העיניים.", "\"25. למה לא 40? למה לא 15?\"", "\"ואם הייתה חריגה שנייה?\"", "{manager} {manager:שותק|שותקת}."],
    "neutral": ["הוא פותח את נייר העבודה בעמוד המדגם.", "\"תסבירו לי את הלוגיקה של 25.\"", "{manager} {manager:מהנהן|מהנהנת} לכיוונכם."],
    "friendly": ["\"ראיתי שתיעדתם את האוכלוסייה. יפה.\"", "\"רק תגידו לי איך הגעתם ל-25.\"", "{manager} {manager:מחייך|מחייכת}."]
  },
  "colleagueHint": "תגידו את ארבעת הפרמטרים לפני שהוא שואל על החריגה.",
  "options": [
    {
      "id": "a", "label": "«ככה נהוג אצלנו לבקרה יומית.»", "quality": 0,
      "tags": ["shortcut"], "biasTags": ["status-quo", "authority"],
      "reversible": false, "escalation": "none",
      "immediate": { "eng.quality": -5, "confidence": -2 },
      "result": { "pGood": 0.3,
        "good": { "text": "הוא רושם משהו ועובר הלאה. הוא לא יסתמך.", "effect": {} },
        "bad": { "text": "\"אז אין לכם טיעון.\" הוא יבדוק בעצמו, והשעות שלכם לא ייספרו.", "effect": { "confidence": -2 } } },
      "feedback": { "why": "לפי ISA 610 רואה החשבון מסתמך רק על עבודה עם גישה שיטתית ומתועדת. «נהוג» אינו שיטה.", "rule": "גודל מדגם הוא טיעון, לא מנהג." }
    },
    {
      "id": "b", "label": "«שיעור נסבל 10%, צפוי 1%, ביטחון 90%, בקרה יומית; הגבול העליון עם חריגה אחת הוא כ-15%, ולכן הרחבנו ל-40.»", "quality": 3,
      "gate": { "prep": 50 }, "gateText": "דורש מוכנות 50: צריך לזכור את הפרמטרים בעל פה",
      "tags": ["documentation", "initiative"], "biasTags": [],
      "reversible": true, "escalation": "none",
      "immediate": { "eng.quality": 6, "rep": 2 },
      "result": { "pGood": 0.8,
        "good": { "text": "\"זה מה שרציתי לשמוע.\" הוא מסמן הסתמכות.", "effect": { "confidence": 3 } },
        "bad": { "text": "\"ובמדגם המורחב?\" עוד לא סיימתם אותו. הוא מחכה.", "effect": {} } },
      "feedback": { "why": "ארבעת הפרמטרים והגבול העליון הם בדיוק מה שתקן ISA 610 דורש כדי להעריך את העבודה: שיטה, תיעוד, ומסקנה שנגזרת מהם.", "rule": "חריגה אחת היא שאלה, לא תשובה." }
    },
    {
      "id": "c", "label": "להפנות אותו ל{manager:מנהל|מנהלת} ההתקשרות", "quality": 1,
      "tags": ["delegate"], "biasTags": ["responsibility-transfer"],
      "reversible": true, "escalation": "escalate",
      "immediate": { "trust.manager": -3 },
      "result": { "pGood": 0.5,
        "good": { "text": "{manager} עונה במקומכם. הפגישה נגמרת בסדר, בלי שם שלכם.", "effect": {} },
        "bad": { "text": "{manager}: \"זה המדגם של {player}. {player}?\"", "effect": { "confidence": -2 } } },
      "feedback": { "why": "המדגם שלכם, הטיעון שלכם. העברה לאחר בחדר מול רואה החשבון מתועדת כחוסר בעלות.", "rule": "מי שבחר את המדגם מסביר אותו." }
    }
  ]
}
```

Checks it passes: `matchType` ids exist; `scale: "icfr"` matches the only `engType` (`isox`); the top option (`b`) has `escalation: "none"` = `rightEscalation`; the `prep` gate is in a moment; ticker has 3–4 lines per hostility; `frameworks` match by alias and by `he`.

### 9.3 Scoutable event — a circular (`events.json`)

```json
{
  "id": "news-cma-cyber-circular-v1",
  "bank": "event",
  "journal": "none",
  "tier": [1, 2],
  "sector": ["insurer", "provident"],
  "engType": ["*"],
  "phase": "*",
  "sender": "system",
  "scoutable": true,
  "leadWeeks": 6,
  "requires": { "flags": [], "notFlags": ["seen_cma_cyber_circular"], "minTrust": {}, "season": null, "week": [20, 40] },
  "title": "חוזר חדש: ניהול סיכוני סייבר בגופים מוסדיים",
  "body": "רשות שוק ההון פרסמה עדכון לחוזר ניהול סיכוני סייבר. הגופים המוסדיים נדרשים לעדכן את סקר הסיכונים ואת מיפוי הספקים הקריטיים עד סוף השנה. {client} טרם התחיל.",
  "attachments": [{ "label": "תמצית החוזר", "text": "עדכון מיפוי ספקים קריטיים · הערכת סיכוני סייבר שנתית · דיווח לדירקטוריון." }],
  "effect": { "eng.deadline": -2, "flag.seen_cma_cyber_circular": 1 }
}
```

When the player holds 2 scouting points the item appears `leadWeeks` early as «מבט קדימה» (`scout.ahead`), its negative effect halves (`eng.deadline: -1`) and the points are consumed. Without scouting it lands as a תקרית-flavoured deadline cut.

---

## 10. Checklist before committing a bank

1. `node -e "JSON.parse(require('fs').readFileSync('content/<file>.json','utf8'))"` — valid JSON, UTF-8.
2. `node tools/validate.mjs` — required keys per weight, ranges, cross-references (`lesson`, `frameworks`, `baseRate`, `scale`, `matchType`, `tags`, `biasTags`), the escalation invariant, `needsInfo` xor `gate`, no `setFlag`, tokens balanced with two alternatives and known prefixes, **no slash forms**, unique ids across `scenarios.*`.
3. Read every `rule` aloud: ≤ 15 words and true outside the game.
4. Every top-quality option `inform`s or `escalate`s only when the scenario's `rightEscalation` says so.
5. Every `failureMode.signal` is observable within the follow-up window.
6. Public-sector scenarios cite פקודת העיריות / חוזרי מנכ"ל / רשות החברות, not only the 1992 law; bank scenarios cite the directive by number; ISOX scenarios use the `icfr` scale and no other.
7. Player tokens `{masc|fem}` only for the player; NPCs get a prefix or a neutral form.

## Onboarding units («חפיפה»)

File: `content/onboarding.json` = `{ "weeks": 6, "units": [unit, ...] }`. A new career starts in onboarding unless the player picks «יש לי ניסיון, לדלג». The season clock waits at week 1; each «לשבוע הבא בחפיפה» advances only the onboarding week. Units unlock by `week`. The unit with `"exam": true` (week 6) must reach `pass` (default 70) before «לסיים את החפיפה» opens the season.

Unit shape:
- `id`, `week`, `title`, `concept` (short label for the concept map), `skills: [{id, w}]` (mastery update with the unit score), `terms: [glossary ids]`, `takeaway` (one transferable rule).
- `scene: [{ who, text }]` where `who` is a cast id (`naama` mentor, `uri` manager, …) or `"thought"` for the plain-language layer «מה זה אומר בפשטות».
- `analogy: { title, text }`: an everyday example before the jargon.
- `task`: `{ intro, kind: "classify", bins: [{id, label}], items: [{text, bin, why}] }` or `{ intro, kind: "choice", questions: [{ q, options: [{t, ok, why}] }] }`.
- `check: { q, options: [{t, ok, why}] }`: one understanding question.

Score = 70% task (share correct) + 30% check. Rules: one new concept per unit, analogy before terminology, every option carries a `why`, player-gender tokens as everywhere else, no slash forms.

Weeks 1–2 and the exam are authored. Planned for weeks 3–5: population and sample, what counts as evidence, working papers; walkthrough and interviews, the first email and document request list, the Israeli regulator map; finding anatomy, rating severity, when to escalate versus inform.
