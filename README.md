# הדרך ל־61

משחק אסטרטגיה פוליטי על הרכבת קואליציה בישראל. הקוד נשמר כאן מתוך ארטיפקטים ב-claude.ai.

## מבנה

| תיקייה | תוכן | מקור |
|---|---|---|
| `game/index.html` | **המשחק הראשי** (גרסה 64, 21.10.2026) | https://claude.ai/artifact/L9qJtKpU1T3MkthLFzZ87B |
| `prototypes/election-edition.html` | הדרך ל־61: מהדורת בחירות | https://claude.ai/artifact/VrKUekcybgbLSxUYjFGmEg |
| `prototypes/seat-movement-models.html` | מודלי תנועת המנדטים | https://claude.ai/artifact/FYex1KYwtFtZGmaALb9Aja |
| `prototypes/rivals-with-character.html` | יריבות עם אופי | https://claude.ai/artifact/NCxZ3g7YgN2gfsfkp3yMog |
| `prototypes/campaign-2022-twists.html` | תפניות בקמפיין 2022 | https://claude.ai/artifact/V86vEvwiPZqn2sRspDnFsx |
| `prototypes/after-the-ballot.html` | אחרי הקלפי | https://claude.ai/artifact/3EZ6SJA9PSMX3vJds1GFYX |
| `prototypes/new-negotiation-meeting.html` | פגישת מו״מ חדשה | https://claude.ai/artifact/9rKgJXJAN7JcD8KEsr58sZ |
| `marketing-manager/index.html` | **מרקטינג מנג'ר: הדרך לשותפות** (משחק קריירה בסגנון Football Manager לאנליסט ביקורת פנימית, ציות וסיכונים; גרסה ראשונה, דרגה 1) | נבנה ב-Claude Code מתוך `marketing-manager/src` ו-`marketing-manager/content` |
| `design/` | כיווני עיצוב (סבב 1 וסבב 2) | https://claude.ai/artifact/6KXWFtGneq7X1mojFG9WFL |

כל קובץ הוא דף HTML עצמאי: פותחים אותו ישירות בדפדפן.

לשחק באינטרנט: https://orgonen1999-arch.github.io/New-Game/game/

מרקטינג מנג'ר: https://orgonen1999-arch.github.io/New-Game/marketing-manager/ (אחרי מיזוג הענף `claude/marketing-manager`)

## מרקטינג מנג'ר: איך בונים

```
node marketing-manager/build.mjs        # מאמת את התוכן ומאגד את src/ ו-content/ לקובץ index.html אחד
node --test marketing-manager/tools/engine.test.mjs
node marketing-manager/tools/sim.mjs    # סימולציית איזון
node marketing-manager/tools/smoke.mjs  # בדיקת עשן ב-Playwright
```

מסמך העיצוב: `marketing-manager/DESIGN.md`. מדריך כתיבת תרחישים: `marketing-manager/CONTENT.md`.
