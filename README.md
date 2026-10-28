# שרת לאתר מעקב אתגרים קבוצתי

השרת (Backend) של אתר שבו קבוצת חברים מציבה אתגרים, מדווחת כל יום, ורואה דירוג, גרפים ומנצחים.

> **מתחילים מכאן?** קראו את [START-HERE.md](START-HERE.md) – הוראות שלב-אחר-שלב להעלאה ל-GitHub ולענן.
> **כותבים את ה-React?** קראו את [FRONTEND-API-GUIDE.md](FRONTEND-API-GUIDE.md).

## טכנולוגיות

| תחום | כלי |
| --- | --- |
| שפה | TypeScript (strict) על Node.js 22 |
| שרת | Express 4 |
| מסד נתונים | PostgreSQL, דרך Prisma ORM |
| בדיקת נתונים | Zod |
| התחברות | JWT (Bearer Token), סיסמאות ב-bcrypt |
| תיעוד | Swagger UI בכתובת `/api-docs` (OpenAPI 3) |
| בדיקות | Vitest + Supertest, מול PostgreSQL אמיתי |

## מבנה התיקיות

```
src/
  app.ts               יצירת אפליקציית Express (middleware, Swagger, routes)
  server.ts            הפעלת השרת
  config/env.ts        קריאה ובדיקה של משתני הסביבה
  db/prisma.ts         חיבור למסד הנתונים
  routes/index.ts      כל הכתובות (URL) ומי רשאי לגשת אליהן
  controllers/         מקבלים בקשה, בודקים אותה, קוראים ל-service ומחזירים תשובה
  services/            הלוגיקה: הרשאות, כללי המשחק, גישה למסד הנתונים
  schemas/             סכמות Zod לבדיקת הנתונים שמגיעים מהלקוח
  middleware/          התחברות (JWT), הרשאת מנהל, טיפול בשגיאות
  lib/                 כלים: תאריכים, חישובי ניקוד, שגיאות, קבועים
  docs/openapi.ts      תיאור ה-API ל-Swagger
prisma/
  schema.prisma        הטבלאות
  migrations/          יצירת הטבלאות במסד הנתונים
  seed.ts              נתוני הדגמה
tests/                 בדיקות אוטומטיות
docs/openapi.json      קובץ OpenAPI (נוצר מ-src/docs/openapi.ts)
```

## הרצה על המחשב (לפיתוח)

צריך: Node.js 22, ומסד PostgreSQL. הדרך הכי פשוטה ל-PostgreSQL מקומי היא Docker:

```bash
docker run -d --name challenges-pg -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=challenges -p 55432:5432 postgres:16-alpine
```

ואז:

```bash
npm install
cp .env.example .env        # ולערוך: DATABASE_URL=postgresql://app:app@localhost:55432/challenges?schema=public
npm run db:deploy           # יצירת הטבלאות
npm run db:seed             # נתוני הדגמה (סיסמה: Demo1234)
npm run dev                 # השרת עולה ב-http://localhost:3000 , תיעוד ב-http://localhost:3000/api-docs
```

> **נטפרי / סינון אינטרנט:** אם `npm install` נכשל עם `unable to get local issuer certificate` (בשלב `prisma generate`), הריצו:
> `set NODE_OPTIONS=--use-system-ca` (ב-PowerShell: `$env:NODE_OPTIONS="--use-system-ca"`) ואז שוב `npm install`.

## פקודות

| פקודה | מה עושה |
| --- | --- |
| `npm run dev` | שרת פיתוח שמתעדכן אוטומטית |
| `npm run build` | קומפילציה ל-`dist/` |
| `npm start` | הרצת הגרסה המקומפלת |
| `npm run start:prod` | הרצת Migrations, Seed (אם הוגדר `SEED_PASSWORD`) ואז השרת (לענן) |
| `npm test` | בדיקות אוטומטיות (צריך PostgreSQL – ראו למטה) |
| `npm run typecheck` | בדיקת טיפוסים |
| `npm run db:migrate` | יצירת Migration חדש אחרי שינוי ב-schema.prisma |
| `npm run db:deploy` | החלת Migrations קיימים |
| `npm run db:seed` | נתוני הדגמה |
| `npm run openapi:export` | עדכון `docs/openapi.json` |

### בדיקות

הבדיקות רצות מול מסד נתונים נפרד בשם `challenges_test` (הוא נמחק ונבנה מחדש בכל הרצה).
ברירת המחדל היא ה-PostgreSQL של Docker מלמעלה. כדי להשתמש במסד אחר: `TEST_DATABASE_URL=... npm test`.

## משתמשי הדגמה (אחרי `db:seed`)

| מייל | תפקיד |
| --- | --- |
| `rachely@example.com` | רחלי פרידמן, מנהלת הקבוצה "חברות בנפש✨", קוד הצטרפות `DEMO2026` |
| `chani@example.com`, `brachy@example.com`, `miri@example.com` | חברות בקבוצה (לברכי יש ימים חסרים – התוצאות נעולות לה) |
| `other@example.com` | משתמש מ"משפחת שפירא (הדגמה)" – לבדיקה שקבוצות לא רואות זו את זו |

הסיסמה בפיתוח: `Demo1234`. בפרודקשן נתוני ההדגמה נוצרים רק אם הוגדר `SEED_PASSWORD` (והוא גם הסיסמה שלהם), כדי שלא יהיו באינטרנט חשבונות עם סיסמה ידועה. `start:prod` מריץ את ה-Seed בכל הפעלה, והוא מדלג אם הנתונים כבר קיימים.

## אבטחה בקצרה

- סיסמאות נשמרות כ-Hash של bcrypt ולא חוזרות אף פעם בתשובות.
- Token בתוקף מוגבל (`JWT_EXPIRES_IN`), חתום עם `JWT_SECRET` ממשתנה סביבה.
- המשתמש מזוהה רק לפי ה-Token. ההרשאות נבדקות בשרת בכל בקשה (גם התפקיד נטען מחדש ממסד הנתונים).
- אין גישה לנתונים של קבוצה אחרת או לאתגר פרטי של אחר – מוחזר 404.
- הגבלת קצב על התחברות והרשמה, Helmet, ו-CORS לפי `CORS_ORIGIN`.
- `npm audit --omit=dev`: אין חולשות ידועות בתלויות של השרת. נשארו התראות רק בכלי הבדיקות (vitest/esbuild), שלא רצים בשרת בענן.
