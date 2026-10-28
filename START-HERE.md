# מתחילים כאן – העלאת השרת לאינטרנט

המדריך הזה מיועד למי שמעולם לא העלה שרת לאינטרנט. עוברים עליו לפי הסדר.

**התמונה הכללית:**

1. **GitHub** – שומר את הקוד.
2. **Supabase** – מסד הנתונים (PostgreSQL) בענן.
3. **Render** – לוקח את הקוד מ-GitHub, מריץ את השרת ומתחבר ל-Supabase.

> **שימו לב:** את ממשקי האתרים האלה לא יכולתי לבדוק בזמן הכתיבה, והם משתנים מדי פעם. שמות הכפתורים כאן הם לפי מה שידוע לי, וייתכן שתראו שם קצת שונה. הערכים שצריך להקליד (פקודות, שמות משתנים) נכונים ומדויקים לפרויקט הזה.
>
> גם תנאי המסלולים החינמיים משתנים. נכון לידיעתי: השרת ב-Render "נרדם" אחרי כ-15 דקות בלי שימוש, והבקשה הראשונה אחרי זה לוקחת עד כדקה. פרויקט ב-Supabase עלול להיות מושהה אחרי כשבוע בלי שימוש, ואז צריך ללחוץ שם "Restore". בדקו את התנאים העדכניים באתרים עצמם.

---

## חלק א – GitHub

1. **פתיחת חשבון:** נכנסים ל-https://github.com, לוחצים **Sign up**, ממלאים אימייל, סיסמה ושם משתמש, ומאשרים את המייל.
2. **יצירת Repository:** אחרי ההתחברות לוחצים על **+** למעלה, ואז **New repository**.
   - Repository name: `challenges-backend`
   - בוחרים **Private** (מומלץ) או Public.
   - **לא** מסמנים "Add a README file" (יש לנו כבר).
   - לוחצים **Create repository**.
3. **חילוץ ה-ZIP:** במחשב, קליק ימני על קובץ ה-ZIP, ואז **חלץ הכל** (Extract All). נוצרת תיקייה `backend-project`.
4. **הצגת קבצים מוסתרים:** הקבצים `.gitignore` ו-`.env.example` מתחילים בנקודה, ולפעמים Windows מסתיר אותם. בסייר הקבצים: **תצוגה** → **הצג** → **פריטים מוסתרים**.
5. **העלאה דרך הדפדפן:** בדף ה-Repository החדש לוחצים על הקישור **uploading an existing file** (או **Add file** → **Upload files**).
   - פותחים את התיקייה `backend-project`, מסמנים **את כל מה שבתוכה** (Ctrl+A), וגוררים לחלון הדפדפן. גוררים את התוכן, לא את התיקייה עצמה.
   - מחכים שכל הקבצים יעלו, ואז למטה לוחצים **Commit changes**.
6. **בדיקה:** בדף ה-Repository צריך לראות ברמה העליונה את `src`, `prisma`, `tests`, `docs`, `package.json`, `render.yaml`, `README.md` ו-`START-HERE.md`. נכנסים ל-`prisma` ומוודאים שיש שם תיקייה `migrations`.
   **אסור** שיופיעו `node_modules` או קובץ `.env` (רק `.env.example`).

---

## חלק ב – מסד נתונים ב-Supabase

1. **חשבון:** https://supabase.com → **Start your project** → אפשר להירשם עם חשבון GitHub.
2. **יצירת Database:** **New project**.
   - Name: `challenges`
   - Database Password: לוחצים **Generate a password** ו**מעתיקים את הסיסמה למקום בטוח** (תצטרכו אותה).
   - Region: הקרוב לאירופה (למשל Frankfurt).
   - לוחצים **Create new project** ומחכים כמה דקות.
3. **Connection String:** בראש דף הפרויקט לוחצים **Connect**. בוחרים את הכתובת מסוג **Session pooler** (חשוב: לא "Direct connection", שלא תמיד עובד מ-Render, ולא "Transaction pooler").
   - הכתובת נראית בערך כך:
     `postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
   - מחליפים את `[YOUR-PASSWORD]` בסיסמה מסעיף 2 (בלי הסוגריים המרובעים).
4. **שמירה בטוחה:** הכתובת הזו היא מפתח למסד הנתונים. שומרים אותה רק אצלכם, **לא** ב-GitHub, לא בקוד ולא בצ'אט.
5. **חיבור לשרת:** את הכתובת מדביקים ב-Render, במשתנה `DATABASE_URL` (חלק ג, שלב 6). את הטבלאות לא צריך ליצור ידנית. השרת יוצר אותן בעצמו (Migrations) בכל הפעלה.

> **חלופה:** אפשר כל ספק PostgreSQL אחר (למשל Neon, או PostgreSQL של Render עצמו – שם, לפי מה שידוע לי, המסד החינמי נמחק אחרי זמן מוגבל). צריך רק Connection String שמתחיל ב-`postgresql://`.

---

## חלק ג – Render

1. **חשבון:** https://render.com → **Get Started** → **GitHub** (הרשמה עם חשבון GitHub).
2. **חיבור GitHub:** בפעם הראשונה Render יבקש הרשאה לגשת ל-Repositories. מאשרים, ואפשר לבחור רק את `challenges-backend`.
3. **יצירת Web Service:** בלוח הבקרה לוחצים **New +** → **Web Service**.
4. **בחירת ה-Repository:** בוחרים את `challenges-backend` ולוחצים **Connect**.
5. **הגדרות:**

   | שדה | ערך |
   | --- | --- |
   | Name | `challenges-backend` (זה יהיה חלק מהכתובת) |
   | Language / Runtime | `Node` |
   | Branch | `main` |
   | Build Command | `npm ci --include=dev && npm run build` |
   | Start Command | `npm run start:prod` |
   | Instance Type | **Free** |

   ב-**Advanced** (אם קיים): Health Check Path = `/api/health`.
6. **משתני סביבה** (Environment Variables → **Add Environment Variable**):

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | הכתובת מ-Supabase (חלק ב, שלב 3) |
   | `JWT_SECRET` | מחרוזת אקראית ארוכה, 32 תווים לפחות. ליד השדה יש לפעמים כפתור **Generate** |
   | `JWT_EXPIRES_IN` | `24h` |
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `22` |
   | `CORS_ORIGIN` | כתובת אתר ה-React כשתהיה לכם (למשל `https://my-app.onrender.com`). עד אז אפשר `*` |
   | `SEED_PASSWORD` | (לא חובה) סיסמה לחשבונות ההדגמה. אם מוגדרת, השרת יוצר את נתוני ההדגמה בהפעלה הראשונה |

7. **Prisma Migrations:** לא צריך לעשות כלום. פקודת ה-Start (`npm run start:prod`) מריצה `prisma migrate deploy` לפני הפעלת השרת, ויוצרת או מעדכנת את הטבלאות. אחר כך היא מריצה את ה-Seed, שיוצר את נתוני ההדגמה רק אם הוגדר `SEED_PASSWORD` ורק אם הם עוד לא קיימים.
8. **Deploy:** לוחצים **Create Web Service** (או **Deploy Web Service**). רואים לוג. בהצלחה יופיע בסוף משהו כמו `Server running on port ...`, והסטטוס יהיה **Live**.
9. **בדיקה:** בראש הדף מופיעה כתובת השרת, למשל `https://challenges-backend.onrender.com`. ממשיכים לחלק ד.

> **דרך קצרה (Blueprint):** במקום שלבים 3–6 אפשר **New +** → **Blueprint**, ולבחור את ה-Repository. Render קורא את `render.yaml` וממלא את רוב ההגדרות לבד, ואז מבקש רק `DATABASE_URL`, `CORS_ORIGIN` ו-`SEED_PASSWORD`.

### נתוני הדגמה בענן (לא חובה)

- **הכי פשוט:** מגדירים ב-Render את `SEED_PASSWORD`. בהפעלה הבאה השרת יוצר את נתוני ההדגמה בעצמו (פעם אחת בלבד). מתחברים עם `rachely@example.com` והסיסמה שהגדרתם.
- **בלי נתוני הדגמה:** לא מגדירים `SEED_PASSWORD`, ונרשמים דרך Swagger או דרך האתר (חלק ד).

בלי `SEED_PASSWORD` אין בפרודקשן חשבונות הדגמה בכלל. זה בכוונה, כדי שלא יהיו באינטרנט חשבונות עם סיסמה ידועה.

> **נטפרי:** ייתכן שמהמחשב לא תוכלו להתחבר ישירות למסד הנתונים בענן (שגיאה `P1011 ... server does not support TLS`). זה לא משנה – Render מתחבר בלי בעיה, והוא גם יוצר את הטבלאות ואת נתוני ההדגמה.

---

## חלק ד – בדיקה שהכול עובד

מחליפים את `<SERVER>` בכתובת מ-Render.

1. **בריאות:** פותחים בדפדפן `<SERVER>/api/health`. צריך לראות `{"status":"ok","db":"ok",...}`. אם `db` אינו `ok`, הבעיה ב-`DATABASE_URL`.
2. **Swagger:** פותחים `<SERVER>/api-docs`. מופיע דף עם כל ה-API.
3. **הרשמה או התחברות מתוך Swagger:**
   - פותחים `POST /api/auth/register` → **Try it out** → בוחרים את הדוגמה **create** (קבוצה חדשה), משנים את `email` לכתובת שלכם, ולוחצים **Execute**.
   - או, אם הרצתם Seed: `POST /api/auth/login` עם `rachely@example.com` והסיסמה שבחרתם.
4. **קבלת JWT:** בתשובה (Response body) יש `"token": "eyJ..."`. מעתיקים את הערך, בלי המירכאות.
5. **Authorize:** לוחצים על **Authorize** 🔒 למעלה, מדביקים את ה-token ולוחצים **Authorize** ואז **Close**.
6. **קריאה מוגנת:** `GET /api/auth/me` → **Try it out** → **Execute**. צריך לקבל 200 עם הפרטים שלכם.
   לבדיקה: לחצו **Authorize** → **Logout** ונסו שוב. אמור לחזור 401.
7. **הוספת רשומה:** `POST /api/challenges` → **Try it out** → בוחרים את הדוגמה **public**. משנים את `startDate` לתאריך של היום (YYYY-MM-DD), ואת `endDate` לתאריך מאוחר יותר → **Execute**. צריך לקבל 201.
8. **שליפה ממסד הנתונים:** `GET /api/challenges` → **Execute**. האתגר שיצרתם מופיע ברשימה, כלומר הוא נשמר במסד הנתונים. אפשר לבדוק גם חיפוש: בשדה `search` רושמים חלק מהשם.

---

## חלק ה – פתרון תקלות

| תקלה | מה עושים |
| --- | --- |
| **Build Failed** | פותחים את הלוג ב-Render ומחפשים את השורה האדומה הראשונה. בודקים שה-Build Command הוא בדיוק `npm ci --include=dev && npm run build`, ושהקובץ `package-lock.json` הועלה ל-GitHub. |
| **`DATABASE_URL` שגוי** (בלוג: `P1001`, `Can't reach database`, או `authentication failed`) | בודקים שהחלפתם את `[YOUR-PASSWORD]` בסיסמה האמיתית, בלי סוגריים. משתמשים בכתובת **Session pooler**. אם בסיסמה יש תווים כמו `@` `#` `/`, צרו ב-Supabase סיסמה חדשה בלי סימנים מיוחדים. |
| **בעיית Prisma** (`P3009`, `migrate deploy` נכשל) | בודקים שהתיקייה `prisma/migrations` קיימת ב-GitHub. אם המסד "התלכלך" בניסיונות קודמים, הכי פשוט ליצור ב-Supabase פרויקט חדש ולעדכן את `DATABASE_URL`. |
| **JWT_SECRET חסר** (בלוג: `Invalid environment configuration` / `JWT_SECRET`) | מוסיפים ב-Render את המשתנה `JWT_SECRET` עם לפחות 32 תווים, ושומרים. השרת יעלה מחדש. |
| **שגיאת CORS** (בדפדפן של אתר ה-React: `blocked by CORS policy`) | ב-`CORS_ORIGIN` שמים את הכתובת **המדויקת** של אתר ה-React, בלי `/` בסוף, למשל `https://my-app.onrender.com`. כמה כתובות מפרידים בפסיק. בזמן פיתוח מקומי: `http://localhost:5173`. |
| **401** | אין Token, הוא פג (אחרי 24 שעות), או שהועתק לא נכון. מתחברים מחדש ולוחצים שוב **Authorize**. ב-React בודקים שנשלחת הכותרת `Authorization: Bearer <token>`. |
| **403** | מחוברים, אבל אין הרשאה: למשל חבר שמנסה ליצור אתגר ציבורי. `RESULTS_LOCKED` פירושו שצריך קודם להשלים דיווחים, או להצטרף לאתגר. |
| **Swagger לא נפתח** | בודקים שהכתובת היא `<SERVER>/api-docs` ושהשרת **Live**. אם השרת "נרדם", מחכים כדקה ומרעננים. |
| **השרת לא עולה / Deploy נתקע** | בלוג של Render מחפשים את הודעת השגיאה. ברוב המקרים חסר משתנה סביבה, או ש-`DATABASE_URL` שגוי. בודקים גם שה-Start Command הוא `npm run start:prod`. |
| **הבקשה הראשונה איטית מאוד** | זה תקין במסלול החינמי: השרת התעורר משינה. |
| **`npm install` נכשל במחשב עם נטפרי** (`unable to get local issuer certificate`) | ב-PowerShell: `$env:NODE_OPTIONS="--use-system-ca"`, ואז שוב `npm install`. |
