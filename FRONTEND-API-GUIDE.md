# מדריך API לכתיבת צד ה-React

המדריך מסביר איך אתר ה-React מדבר עם השרת. הוא **לא** כולל קוד React: את הקומפוננטות, ה-Hooks, הטפסים, React Query וה-Context כותבים בעצמכם.
התיעוד המלא והאינטראקטיבי נמצא ב-Swagger: `<SERVER>/api-docs`.

## 1. כתובת הבסיס (Base URL)

| סביבה | כתובת |
| --- | --- |
| פיתוח במחשב | `http://localhost:3000` |
| ענן | הכתובת מ-Render, למשל `https://challenges-backend.onrender.com` |

כל הנתיבים מתחילים ב-`/api`. מומלץ לשמור את כתובת הבסיס במשתנה סביבה של פרויקט ה-React, ולא לכתוב אותה בכל מקום.
אם הדפדפן חוסם בקשות (CORS), צריך להוסיף את כתובת אתר ה-React למשתנה `CORS_ORIGIN` בשרת.

## 2. התחברות ו-Token

1. `POST /api/auth/register` או `POST /api/auth/login` מחזירים `{ token, user }`.
2. שומרים את ה-token (למשל ב-localStorage) ואת ה-user (למשל ב-Context).
3. בכל בקשה לכתובת מוגנת שולחים את הכותרת:
   ```
   Authorization: Bearer <token>
   ```
4. כשהאתר נטען ויש token שמור, קוראים ל-`GET /api/auth/me`:
   - **200**: המשתמש עדיין מחובר, ומקבלים את הפרטים העדכניים, כולל `role`.
   - **401**: ה-token פג או לא תקין. מוחקים אותו ושולחים למסך ההתחברות.
5. **התנתקות:** אין כתובת בשרת. פשוט מוחקים את ה-token בצד הלקוח.
6. ה-token תקף ל-24 שעות.

**התפקיד** (`user.role`) הוא `MANAGER` או `MEMBER`. לפיו מחליטים מה להציג, אבל השרת בודק הרשאות בעצמו בכל מקרה.

## 3. מבנה שגיאות

כל שגיאה חוזרת באותו מבנה:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "יש שגיאות בנתונים שנשלחו",
  "details": [ { "field": "title", "message": "שם האתגר חייב להכיל לפחות 2 תווים" } ] } }
```

- `message` מתאים להצגה למשתמש, בעברית.
- `details` (כשקיים) מפרט שגיאה לכל שדה. `field` הוא שם השדה בטופס, כך שאפשר להציג את השגיאה ליד השדה הנכון.

| HTTP | code | משמעות למסך |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | שדות לא תקינים: מציגים את `details` ליד השדות |
| 400 | `RULE_VIOLATION` | פעולה לא מותרת לפי הכללים: מציגים את `message` |
| 400 | `MISSING_NOT_CONFIRMED` | בדיווח נשארו ימים חסרים בלי אישור. `details.remainingDates` = הימים |
| 401 | `UNAUTHORIZED` | לא מחובר או ה-token פג: למסך ההתחברות |
| 403 | `FORBIDDEN` | אין הרשאה |
| 403 | `RESULTS_LOCKED` | התוצאות נעולות. `details.reason`: `NOT_PARTICIPANT` או `MISSING_REPORTS` |
| 404 | `NOT_FOUND` | לא קיים, או שאין גישה אליו |
| 409 | `CONFLICT` | כבר קיים: מייל רשום, קוד תפוס, כבר הצטרף, כבר דיווח |
| 429 | `TOO_MANY_REQUESTS` | יותר מדי ניסיונות התחברות: לחכות כמה דקות |
| 500 | `INTERNAL_ERROR` | תקלה בשרת |

## 4. ערכים קבועים

- **סולם** `scale`: `YES_NO` (ערך דיווח 0 או 1), `RATING` (ערך 1–10).
- **פרטיות** `visibility`: `PUBLIC`, `PRIVATE`.
- **סטטוס** `status` (מחושב): `UPCOMING` (עתידי), `ACTIVE` (פעיל), `ENDED` (הסתיים).
- **אווטארים:** 30 ערכים. את הרשימה עם האימוג'י מקבלים מ-`GET /api/meta`, כדי לא להעתיק אותה לקוד.
- **תאריכים:** תמיד מחרוזת `YYYY-MM-DD` לפי שעון ישראל. את התאריך העברי מחשבים בצד הלקוח, למשל בעזרת `Intl.DateTimeFormat` עם לוח שנה עברי.

## 5. אילו כתובות כל מסך צריך

| מסך | כתובות |
| --- | --- |
| כל הדפים | `GET /api/auth/me` (בטעינה), `GET /api/quotes/today` (הסטריפ) |
| התחברות | `POST /api/auth/login` |
| הרשמה | `GET /api/meta` (אווטארים), `POST /api/auth/register` |
| כל האתגרים | `GET /api/challenges?...` |
| עמוד אתגר | `GET /api/challenges/:id`, `POST`/`DELETE /api/challenges/:id/join`, `GET /api/challenges/:id/pending`, `POST /api/challenges/:id/reports`, `GET /api/challenges/:id/leaderboard`, `GET /api/challenges/:id/progress`, `DELETE /api/challenges/:id` |
| טופס אתגר | יצירה: `POST /api/challenges`. עריכה: `GET /api/challenges/:id` ואז `PATCH /api/challenges/:id`. חידוש: `GET` של הישן, ואז `POST` עם `previousChallengeId` |
| הקבוצה שלנו | `GET /api/group`, ולמנהל: `PATCH /api/group`, `POST /api/group/join-code`, `POST /api/group/transfer-manager` |

**רענון אחרי שינוי (React Query):** אחרי הצטרפות, דיווח, עריכה או מחיקה, צריך לרענן את הנתונים הקשורים: רשימת האתגרים, פרטי האתגר, `pending`, הדירוג והגרף. אחרי העברת ניהול מרעננים את `auth/me` ואת `group`.

## 6. הכתובות בפירוט

### הרשמה – `POST /api/auth/register`
שדות חובה: `email` (כתובת מייל תקינה; אין הבדל בין אותיות גדולות לקטנות), `password` (8–64, לפחות אות וספרה), `displayName` (2–30), `avatar`.
בנוסף **בדיוק אחד** מהשניים: `joinCode` (קוד קבוצה קיימת) או `groupName` (2–40, קבוצה חדשה – והנרשם הופך למנהל).
```json
{ "email": "chani@example.com", "password": "Secret123", "displayName": "חני ויס", "avatar": "OWL", "joinCode": "DEMO2026" }
```
הצלחה **201**:
```json
{ "token": "eyJhbGciOi...", "user": { "id": 7, "email": "chani@example.com", "displayName": "חני ויס", "avatar": "OWL",
  "color": "#EB6834", "role": "MEMBER", "group": { "id": 2, "name": "חברות בנפש✨" } } }
```
שגיאות: 400 (שדות), 404 עם `details[0].field = "joinCode"` (קוד לא נמצא), 409 (המייל כבר רשום, `details[0].field = "email"`).

### התחברות – `POST /api/auth/login`
`{ "email": "chani@example.com", "password": "Secret123" }` → **200** באותו מבנה כמו בהרשמה. פרטים שגויים → **401**.

### `GET /api/auth/me`
מחזיר את אובייקט ה-`user` (בלי token).

### הקבוצה – `GET /api/group`
```json
{ "id": 2, "name": "חברות בנפש✨", "joinCode": "DEMO2026",
  "members": [ { "id": 1, "displayName": "רחלי פרידמן", "avatar": "BUTTERFLY", "color": "#2A78D6", "isManager": true, "challengesCount": 3 } ] }
```
`joinCode` מגיע **רק למנהל**.
- `PATCH /api/group` – `{ "name": "..." }` (2–40 תווים)
- `POST /api/group/join-code` – `{ "mode": "random" }` או `{ "mode": "custom", "code": "COHEN2026" }` (6–12 תווים, A–Z ו-0–9). מחזיר `{ "joinCode": "..." }`. 409 אם הקוד תפוס.
- `POST /api/group/transfer-manager` – `{ "userId": 7 }`. מחזיר `{ "managerId": 7 }`.

### רשימת אתגרים – `GET /api/challenges`
פרמטרים, כולם אופציונליים:

| פרמטר | ערכים |
| --- | --- |
| `search` | חלק מהשם |
| `status` | `UPCOMING` / `ACTIVE` / `ENDED` |
| `scale` | `YES_NO` / `RATING` |
| `visibility` | `PUBLIC` / `PRIVATE` |
| `joined` | `true` (רק שלי) / `false` |
| `sort` | `endDate` (ברירת מחדל) / `startDate` / `participants` / `title` |
| `order` | `asc` (ברירת מחדל) / `desc` |

דוגמה: `/api/challenges?status=ACTIVE&search=הלכות&sort=participants&order=desc`
מחזיר מערך של **כרטיסי אתגר**:
```json
{ "id": 12, "title": "2 הלכות ביום", "scale": "YES_NO", "visibility": "PUBLIC", "status": "ACTIVE",
  "startDate": "2026-11-01", "endDate": "2026-11-30", "prize": "כרטיספר על סך 70 ש\"ח", "joinWindowDays": 5,
  "joinDeadline": "2026-11-06", "participantsCount": 4, "isJoined": true, "canJoin": false,
  "myStatus": { "reportedToday": false, "missingCount": 2 }, "previousChallengeId": 9 }
```
- `myStatus` הוא `null` כשהמשתמש לא משתתף, או כשהאתגר לא פעיל. ממנו בונים "דיווחת היום ✓" / "עוד לא דיווחת היום" / "חסרים X דיווחים".
- `joinDeadline` הוא היום האחרון להצטרפות ("אפשר להצטרף עוד X ימים").
- לחיצה על כרטיס עם `status: "ENDED"` מובילה לתצוגת המנצחים.

### פרטי אתגר – `GET /api/challenges/:id`
כל השדות של הכרטיס, ובנוסף:
```json
{ "description": "...", "creator": { "id": 1, "displayName": "רחלי פרידמן" },
  "previousChallenge": { "id": 9, "title": "..." },
  "participants": [ { "id": 7, "displayName": "חני ויס", "avatar": "OWL", "color": "#EB6834", "firstDay": "2026-11-01" } ],
  "permissions": { "canEdit": true, "canDelete": false, "canJoin": false, "canLeave": false,
                   "canRenew": false, "canViewResults": true, "lockedReason": null },
  "editableFields": ["title", "description", "prize", "endDate"],
  "suggestedRenewalDates": null }
```
- **`permissions`** אומר אילו כפתורים להציג.
- **`lockedReason`**: `NOT_PARTICIPANT` (להציג כפתור "הצטרף"), `MISSING_REPORTS` (להציג רק את טופס הדיווח), או `null` (להציג תוצאות).
- **`editableFields`**: בטופס העריכה, כל שדה שאינו ברשימה מוצג מושבת.
- **`suggestedRenewalDates`**: למנהל או ליוצר של אתגר שהסתיים, `{ startDate, endDate }` למילוי מראש של טופס החידוש.

### יצירה – `POST /api/challenges` · עריכה – `PATCH /api/challenges/:id`

| שדה | חובה ביצירה | כללים |
| --- | --- | --- |
| `title` | ✓ | 2–60 תווים |
| `description` | | עד 500 |
| `scale` | ✓ | `YES_NO` / `RATING` |
| `visibility` | ✓ | `PUBLIC` רק למנהל; לא ניתן לשינוי אחרי היצירה |
| `startDate` | ✓ | היום או אחריו |
| `endDate` | ✓ | ≥ `startDate`, עד 366 ימים |
| `prize` | | עד 100. **אסור** באתגר פרטי |
| `joinWindowDays` | ציבורי ✓ | 0 ומעלה, לא יותר ממשך האתגר. **אסור** באתגר פרטי |
| `previousChallengeId` | | רק ביצירה, לחידוש אתגר שהסתיים |

- **יצירה** מחזירה **201** עם פרטי האתגר המלאים.
- **בעריכה** שולחים רק מה שהשתנה (מותר לשלוח גם ערכים שלא השתנו). אחרי ההתחלה מותר לשנות רק `title`, `description`, `prize`, ולהאריך את `endDate`. אחרת חוזר 400 `RULE_VIOLATION`.
- **מחיקה** `DELETE /api/challenges/:id` מחזירה **204**: אתגר ציבורי רק לפני ההתחלה, ואתגר פרטי תמיד.

### הצטרפות ועזיבה
- `POST /api/challenges/:id/join` → **201** `{ "challengeId": 12, "firstDay": "2026-11-03" }`
- `DELETE /api/challenges/:id/join` → **204** (רק לפני ההתחלה)

### מה נשאר לדווח – `GET /api/challenges/:id/pending`
```json
{ "scale": "YES_NO", "status": "ACTIVE", "missingDates": ["2026-11-01", "2026-11-02"],
  "today": { "date": "2026-11-03", "reported": false, "canReport": true } }
```
טופס הדיווח: שורה לכל תאריך ב-`missingDates`, ושורה ל-`today` אם `canReport` הוא true.

### שליחת דיווחים – `POST /api/challenges/:id/reports`
```json
{ "reports": [ { "date": "2026-11-02", "value": 1 }, { "date": "2026-11-03", "value": 1 } ],
  "fillMissingWithZero": true }
```
- ערכים: `YES_NO` → 0 או 1. `RATING` → 1 עד 10.
- **תהליך ה-confirm:** אם המשתמש לא מילא חלק מהימים החסרים, מציגים confirm ("נותרו לך X ימים... יקבלו 0"). רק אם אישר, שולחים `fillMissingWithZero: true`. בלי זה השרת מחזיר `MISSING_NOT_CONFIRMED`, ולא שומר כלום.
- את היום אפשר להשאיר ריק. הוא לא מקבל 0.
- הצלחה **201**: `{ "created": 3, "skipped": ["2026-11-01"], "missingDates": [], "todayReported": true }`
- דיווח קיים לא ניתן לשינוי (409).

### טבלת דירוג – `GET /api/challenges/:id/leaderboard`
```json
{ "dataUntil": "2026-11-02", "status": "ACTIVE", "prize": "כרטיספר על סך 70 ש\"ח",
  "rows": [ { "rank": 1, "user": { "id": 7, "displayName": "חני ויס", "avatar": "OWL", "color": "#EB6834" },
              "percentage": 87.5, "daysCounted": 8, "currentStreak": 5, "isMe": true } ],
  "winners": null }
```
- `rank` משותף בשוויון (1, 1, 3). `percentage` ו-`rank` הם `null` כשאין עדיין נתונים.
- `winners` הוא מערך משתמשים רק כשהאתגר הסתיים (ריק אם כולם סיימו עם 0%).
- **גרף העמודות** נבנה מ-`rows`: `user.displayName` לציר, `percentage` לגובה, `user.color` לצבע, ו-`isMe` להבלטה.
- לפני הסיום: 403 `RESULTS_LOCKED` למי שלא משתתף, או שיש לו ימים חסרים.

### גרף "הכושר השבועי" – `GET /api/challenges/:id/progress`
```json
{ "dataUntil": "2026-11-02",
  "series": [ { "key": "u7", "id": 7, "displayName": "חני ויס", "avatar": "OWL", "color": "#EB6834" } ],
  "points": [ { "date": "2026-11-01", "u7": 100, "u3": null }, { "date": "2026-11-02", "u7": 50, "u3": 100 } ] }
```
המבנה מתאים ישירות לגרף קווים (למשל ב-Recharts):
- `points` הם הנתונים.
- `date` הוא ציר ה-X.
- לכל איבר ב-`series` יש קו אחד, עם `dataKey = key` וצבע `color`.
- `null` אומר שאין נקודה באותו יום (לפני שהמשתתף הצטרף).

## 7. מי רשאי לעשות מה

| פעולה | חבר | מנהל |
| --- | --- | --- |
| לראות אתגרים ציבוריים, להצטרף, לעזוב (לפני ההתחלה), לדווח | ✓ | ✓ |
| ליצור, לערוך ולמחוק אתגר פרטי – רק שלו | ✓ | ✓ |
| ליצור, לערוך, למחוק ולחדש אתגר ציבורי | ✗ (403) | ✓ |
| לראות קוד הצטרפות, לשנות קוד, לשנות שם קבוצה, להעביר ניהול | ✗ (403) | ✓ |
| לראות תוצאות לפני סיום האתגר | רק משתתף בלי ימים חסרים | אותו כלל |
| לראות תוצאות אחרי הסיום | ✓ | ✓ |
