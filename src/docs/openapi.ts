// OpenAPI 3 description of the API, shown by Swagger UI at /api-docs.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Avatar } from '@prisma/client';

type Obj = Record<string, any>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: Obj, example?: unknown) => ({ 'application/json': { schema, ...(example !== undefined ? { example } : {}) } });
const errorResponse = (description: string, code: string, message: string) => ({
  description,
  content: json(ref('Error'), { error: { code, message } }),
});

const E = {
  400: errorResponse('נתונים לא תקינים', 'VALIDATION_ERROR', 'יש שגיאות בנתונים שנשלחו'),
  '400rule': errorResponse('הפעולה סותרת כלל משחק', 'RULE_VIOLATION', 'אפשר לעזוב רק לפני שהאתגר התחיל'),
  401: errorResponse('לא מחובר / Token לא תקין או פג תוקף', 'UNAUTHORIZED', 'יש להתחבר כדי לבצע פעולה זו'),
  403: errorResponse('אין הרשאה', 'FORBIDDEN', 'רק מנהל הקבוצה יכול לבצע פעולה זו'),
  '403locked': errorResponse('התוצאות נעולות', 'RESULTS_LOCKED', 'יש להשלים את הדיווחים החסרים כדי לראות את התוצאות'),
  404: errorResponse('לא נמצא', 'NOT_FOUND', 'האתגר לא נמצא'),
  409: errorResponse('התנגשות', 'CONFLICT', 'הפריט כבר קיים'),
};

const secured = [{ bearerAuth: [] }];
const idPath = [{ name: 'id', in: 'path', required: true, description: 'מזהה האתגר', schema: { type: 'integer', example: 12 } }];

const userExample = {
  id: 7, email: 'chani@example.com', displayName: 'חני ויס', avatar: 'OWL', color: '#EB6834', role: 'MEMBER',
  group: { id: 2, name: 'חברות בנפש✨' },
};
const summaryExample = {
  id: 12, title: '2 הלכות ביום', scale: 'YES_NO', visibility: 'PUBLIC', status: 'ACTIVE',
  startDate: '2026-11-01', endDate: '2026-11-30', prize: 'כרטיספר על סך 70 ש"ח', joinWindowDays: 5,
  joinDeadline: '2026-11-06', participantsCount: 4, isJoined: true, canJoin: false,
  myStatus: { reportedToday: false, missingCount: 2 }, previousChallengeId: 9,
};
const detailsExample = {
  ...summaryExample,
  description: 'כל אחת לומדת 2 הלכות ביום בספר שמירת הלשון',
  creator: { id: 3, displayName: 'רחלי פרידמן' },
  previousChallenge: { id: 9, title: '2 הלכות ביום – חשוון' },
  participants: [{ id: 7, displayName: 'חני ויס', avatar: 'OWL', color: '#EB6834', firstDay: '2026-11-01' }],
  permissions: { canEdit: false, canDelete: false, canJoin: false, canLeave: false, canRenew: false, canViewResults: false, lockedReason: 'MISSING_REPORTS' },
  editableFields: [],
  suggestedRenewalDates: null,
};

const challengeInputProps: Obj = {
  title: { type: 'string', minLength: 2, maxLength: 60 },
  description: { type: 'string', maxLength: 500, nullable: true },
  scale: { type: 'string', enum: ['YES_NO', 'RATING'] },
  visibility: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
  startDate: { type: 'string', format: 'date' },
  endDate: { type: 'string', format: 'date' },
  prize: { type: 'string', maxLength: 100, nullable: true, description: 'רק באתגר ציבורי' },
  joinWindowDays: { type: 'integer', minimum: 0, nullable: true, description: 'חובה באתגר ציבורי, אסור באתגר פרטי' },
};

export const openApiDocument: Obj = {
  openapi: '3.0.3',
  info: {
    title: 'Challenges API – אתר מעקב אתגרים קבוצתי',
    version: '1.0.0',
    description:
      'שרת לאתר מעקב אתגרים קבוצתי.\n\n' +
      '**איך מתחברים כאן:** הריצו `POST /api/auth/login` (משתמשי הדגמה: `rachely@example.com` או `chani@example.com`, סיסמת ההדגמה מוגדרת ב-Seed), ' +
      'העתיקו את ה-token מהתשובה, לחצו על הכפתור **Authorize** למעלה והדביקו אותו. מעכשיו כל הקריאות נשלחות עם ה-Token.\n\n' +
      'תאריכים הם מחרוזות `YYYY-MM-DD` לפי שעון ישראל. כל שגיאה מוחזרת במבנה `{ error: { code, message, details? } }`.',
  },
  servers: [{ url: '/', description: 'השרת הנוכחי' }],
  tags: [
    { name: 'General', description: 'בדיקה ומידע קבוע' },
    { name: 'Auth', description: 'הרשמה והתחברות' },
    { name: 'Group', description: 'הקבוצה שלי' },
    { name: 'Challenges', description: 'אתגרים' },
    { name: 'Reports & Results', description: 'דיווחים, דירוג וגרפים' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', enum: ['VALIDATION_ERROR', 'RULE_VIOLATION', 'MISSING_NOT_CONFIRMED', 'UNAUTHORIZED', 'FORBIDDEN', 'RESULTS_LOCKED', 'NOT_FOUND', 'CONFLICT', 'TOO_MANY_REQUESTS', 'INTERNAL_ERROR'] },
              message: { type: 'string' },
              details: { oneOf: [{ type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } }, { type: 'object' }] },
            },
          },
        },
      },
      Avatar: { type: 'string', enum: Object.values(Avatar) },
      PublicUser: {
        type: 'object',
        properties: { id: { type: 'integer' }, displayName: { type: 'string' }, avatar: ref('Avatar'), color: { type: 'string', example: '#EB6834' } },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, email: { type: 'string', format: 'email' }, displayName: { type: 'string' }, avatar: ref('Avatar'),
          color: { type: 'string' }, role: { type: 'string', enum: ['MANAGER', 'MEMBER'] },
          group: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } },
        },
      },
      AuthResponse: { type: 'object', properties: { token: { type: 'string' }, user: ref('User') } },
      ChallengeSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, title: { type: 'string' },
          scale: { type: 'string', enum: ['YES_NO', 'RATING'] }, visibility: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
          status: { type: 'string', enum: ['UPCOMING', 'ACTIVE', 'ENDED'] },
          startDate: { type: 'string', format: 'date' }, endDate: { type: 'string', format: 'date' },
          prize: { type: 'string', nullable: true }, joinWindowDays: { type: 'integer', nullable: true },
          joinDeadline: { type: 'string', format: 'date', nullable: true }, participantsCount: { type: 'integer' },
          isJoined: { type: 'boolean' }, canJoin: { type: 'boolean' },
          myStatus: {
            type: 'object', nullable: true, description: 'רק באתגר פעיל שהמשתמש משתתף בו',
            properties: { reportedToday: { type: 'boolean' }, missingCount: { type: 'integer' } },
          },
          previousChallengeId: { type: 'integer', nullable: true },
        },
      },
      ChallengeDetails: {
        allOf: [
          ref('ChallengeSummary'),
          {
            type: 'object',
            properties: {
              description: { type: 'string', nullable: true },
              creator: { type: 'object', properties: { id: { type: 'integer' }, displayName: { type: 'string' } } },
              previousChallenge: { type: 'object', nullable: true, properties: { id: { type: 'integer' }, title: { type: 'string' } } },
              participants: { type: 'array', items: { allOf: [ref('PublicUser'), { type: 'object', properties: { firstDay: { type: 'string', format: 'date' } } }] } },
              permissions: {
                type: 'object',
                properties: {
                  canEdit: { type: 'boolean' }, canDelete: { type: 'boolean' }, canJoin: { type: 'boolean' }, canLeave: { type: 'boolean' },
                  canRenew: { type: 'boolean' }, canViewResults: { type: 'boolean' },
                  lockedReason: { type: 'string', nullable: true, enum: ['NOT_PARTICIPANT', 'MISSING_REPORTS', null] },
                },
              },
              editableFields: { type: 'array', items: { type: 'string' } },
              suggestedRenewalDates: {
                type: 'object', nullable: true,
                properties: { startDate: { type: 'string', format: 'date' }, endDate: { type: 'string', format: 'date' } },
              },
            },
          },
        ],
      },
      ChallengeCreate: { type: 'object', required: ['title', 'scale', 'visibility', 'startDate', 'endDate'], properties: { ...challengeInputProps, previousChallengeId: { type: 'integer', nullable: true } } },
      ChallengeUpdate: { type: 'object', minProperties: 1, properties: challengeInputProps },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['General'], summary: 'בדיקת בריאות השרת ומסד הנתונים', security: [],
        responses: {
          200: { description: 'תקין', content: json({ type: 'object' }, { status: 'ok', db: 'ok', time: '2026-11-03T08:00:00.000Z' }) },
          503: { description: 'מסד הנתונים לא זמין' },
        },
      },
    },
    '/api/meta': {
      get: {
        tags: ['General'], summary: 'רשימות קבועות: אווטארים, סולמות, סטטוסים ומגבלות', security: [],
        responses: { 200: { description: 'הצלחה', content: json({ type: 'object' }, { avatars: [{ key: 'LION', emoji: '🦁' }], scales: [{ key: 'YES_NO', label: 'כן/לא', max: 1 }, { key: 'RATING', label: 'דירוג 1–10', max: 10 }], visibilities: ['PUBLIC', 'PRIVATE'], statuses: ['UPCOMING', 'ACTIVE', 'ENDED'], limits: { titleMin: 2, titleMax: 60 } }) } },
      },
    },
    '/api/quotes/today': {
      get: {
        tags: ['General'], summary: 'משפט ההשראה של היום', security: [],
        responses: { 200: { description: 'הצלחה', content: json({ type: 'object', properties: { date: { type: 'string' }, text: { type: 'string' } } }, { date: '2026-11-03', text: 'צעד קטן כל יום עושה דרך ארוכה.' }) } },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'], summary: 'הרשמה – עם קוד הצטרפות או עם קבוצה חדשה', security: [],
        description: 'יש לשלוח **בדיוק אחד** מהשדות joinCode או groupName. מי שיוצר קבוצה הופך למנהל שלה. מחזיר Token – המשתמש כבר מחובר.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['email', 'password', 'displayName', 'avatar'],
                properties: {
                  email: { type: 'string', format: 'email', maxLength: 254, description: 'כתובת המייל משמשת לכניסה; אין הבדל בין אותיות גדולות לקטנות' },
                  password: { type: 'string', minLength: 8, maxLength: 64, description: 'לפחות אות אחת באנגלית וספרה אחת' },
                  displayName: { type: 'string', minLength: 2, maxLength: 30 },
                  avatar: ref('Avatar'),
                  joinCode: { type: 'string' },
                  groupName: { type: 'string', minLength: 2, maxLength: 40 },
                },
              },
              examples: {
                join: { summary: 'הצטרפות עם קוד', value: { email: 'chani2@example.com', password: 'Secret123', displayName: 'חני ויס', avatar: 'OWL', joinCode: 'DEMO2026' } },
                create: { summary: 'קבוצה חדשה', value: { email: 'rachely2@example.com', password: 'Secret123', displayName: 'רחלי פרידמן', avatar: 'BUTTERFLY', groupName: 'חברות בנפש✨' } },
              },
            },
          },
        },
        responses: {
          201: { description: 'נרשם והתחבר', content: json(ref('AuthResponse'), { token: 'eyJhbGciOi...', user: userExample }) },
          400: E[400],
          404: errorResponse('קוד ההצטרפות לא נמצא', 'NOT_FOUND', 'קוד ההצטרפות לא נמצא'),
          409: errorResponse('כתובת המייל כבר רשומה', 'CONFLICT', 'כתובת המייל כבר רשומה'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'התחברות – מחזיר JWT', security: [],
        requestBody: { required: true, content: json({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } }, { email: 'rachely@example.com', password: 'Demo1234' }) },
        responses: {
          200: { description: 'מחובר', content: json(ref('AuthResponse'), { token: 'eyJhbGciOi...', user: { ...userExample, role: 'MANAGER' } }) },
          400: E[400],
          401: errorResponse('פרטים שגויים', 'UNAUTHORIZED', 'כתובת מייל או סיסמה שגויים'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'], summary: 'המשתמש המחובר (לפי ה-Token)', security: secured,
        responses: { 200: { description: 'הצלחה', content: json(ref('User'), userExample) }, 401: E[401] },
      },
    },
    '/api/group': {
      get: {
        tags: ['Group'], summary: 'הקבוצה שלי וחבריה', description: 'joinCode מופיע רק כשהמבקש הוא המנהל.', security: secured,
        responses: {
          200: {
            description: 'הצלחה',
            content: json({ type: 'object' }, { id: 2, name: 'חברות בנפש✨', joinCode: 'X7K2PQ', members: [{ id: 3, displayName: 'רחלי פרידמן', avatar: 'BUTTERFLY', color: '#2A78D6', isManager: true, challengesCount: 3 }] }),
          },
          401: E[401],
        },
      },
      patch: {
        tags: ['Group'], summary: 'שינוי שם הקבוצה (מנהל)', security: secured,
        requestBody: { required: true, content: json({ type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 2, maxLength: 40 } } }, { name: 'חברות בנפש – מחזור תשפ"ז' }) },
        responses: { 200: { description: 'עודכן', content: json({ type: 'object' }, { id: 2, name: 'חברות בנפש – מחזור תשפ"ז' }) }, 400: E[400], 401: E[401], 403: E[403] },
      },
    },
    '/api/group/join-code': {
      post: {
        tags: ['Group'], summary: 'שינוי קוד ההצטרפות (מנהל)', description: 'random – קוד אקראי חדש. custom – קוד משלי (6–12 תווים, A–Z ו-0–9). הקוד הישן מפסיק לעבוד מיד.', security: secured,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['mode'], properties: { mode: { type: 'string', enum: ['random', 'custom'] }, code: { type: 'string' } } },
              examples: { random: { value: { mode: 'random' } }, custom: { value: { mode: 'custom', code: 'COHEN2026' } } },
            },
          },
        },
        responses: { 200: { description: 'הקוד החדש', content: json({ type: 'object' }, { joinCode: 'COHEN2026' }) }, 400: E[400], 401: E[401], 403: E[403], 409: errorResponse('הקוד תפוס', 'CONFLICT', 'הקוד הזה כבר תפוס, בחרו קוד אחר') },
      },
    },
    '/api/group/transfer-manager': {
      post: {
        tags: ['Group'], summary: 'העברת ניהול לחבר אחר (מנהל)', description: 'השולח הופך לחבר רגיל. מומלץ לרענן אחר כך את /api/auth/me.', security: secured,
        requestBody: { required: true, content: json({ type: 'object', required: ['userId'], properties: { userId: { type: 'integer' } } }, { userId: 7 }) },
        responses: { 200: { description: 'הועבר', content: json({ type: 'object' }, { managerId: 7 }) }, 400: E['400rule'], 401: E[401], 403: E[403], 404: E[404] },
      },
    },
    '/api/challenges': {
      get: {
        tags: ['Challenges'], summary: 'רשימת אתגרים – חיפוש, סינון ומיון',
        description: 'מחזיר את האתגרים הציבוריים של הקבוצה ואת האתגרים הפרטיים של המשתמש.', security: secured,
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'חלק משם האתגר' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['UPCOMING', 'ACTIVE', 'ENDED'] } },
          { name: 'scale', in: 'query', schema: { type: 'string', enum: ['YES_NO', 'RATING'] } },
          { name: 'visibility', in: 'query', schema: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] } },
          { name: 'joined', in: 'query', schema: { type: 'string', enum: ['true', 'false'] }, description: 'true – רק אתגרים שאני משתתף בהם' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['endDate', 'startDate', 'participants', 'title'], default: 'endDate' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        ],
        responses: { 200: { description: 'הצלחה', content: json({ type: 'array', items: ref('ChallengeSummary') }, [summaryExample]) }, 400: E[400], 401: E[401] },
      },
      post: {
        tags: ['Challenges'], summary: 'יצירת אתגר (ציבורי – מנהל בלבד; פרטי – כל משתמש)',
        description: 'לחידוש אתגר שהסתיים שולחים previousChallengeId. באתגר פרטי היוצר מצורף אוטומטית כמשתתף.', security: secured,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('ChallengeCreate'),
              examples: {
                public: { summary: 'אתגר ציבורי', value: { title: '2 הלכות ביום', description: 'כל אחת לומדת 2 הלכות ביום בספר שמירת הלשון', scale: 'YES_NO', visibility: 'PUBLIC', startDate: '2026-12-01', endDate: '2026-12-31', prize: 'כרטיספר על סך 70 ש"ח', joinWindowDays: 5 } },
                private: { summary: 'אתגר פרטי', value: { title: 'פנקס הכרת הטוב', scale: 'RATING', visibility: 'PRIVATE', startDate: '2026-12-01', endDate: '2026-12-14' } },
              },
            },
          },
        },
        responses: { 201: { description: 'נוצר', content: json(ref('ChallengeDetails'), detailsExample) }, 400: E[400], 401: E[401], 403: E[403], 404: E[404] },
      },
    },
    '/api/challenges/{id}': {
      parameters: idPath,
      get: {
        tags: ['Challenges'], summary: 'פרטי אתגר, משתתפים והרשאות', security: secured,
        responses: { 200: { description: 'הצלחה', content: json(ref('ChallengeDetails'), detailsExample) }, 401: E[401], 404: E[404] },
      },
      patch: {
        tags: ['Challenges'], summary: 'עריכת אתגר',
        description: 'שולחים רק שדות לשינוי. לפני ההתחלה – הכול (חוץ מ-visibility). אחרי ההתחלה – רק title, description, prize והארכת endDate. אתגר שהסתיים – לא ניתן לעריכה.', security: secured,
        requestBody: { required: true, content: json(ref('ChallengeUpdate'), { title: '3 הלכות ביום', endDate: '2027-01-05' }) },
        responses: { 200: { description: 'עודכן', content: json(ref('ChallengeDetails'), detailsExample) }, 400: E['400rule'], 401: E[401], 403: E[403], 404: E[404] },
      },
      delete: {
        tags: ['Challenges'], summary: 'מחיקת אתגר', description: 'ציבורי – מנהל. פרטי – היוצר. בכל שלב, כולל אחרי ההתחלה; הדיווחים נמחקים יחד עם האתגר.', security: secured,
        responses: { 204: { description: 'נמחק' }, 401: E[401], 403: E[403], 404: E[404] },
      },
    },
    '/api/challenges/{id}/join': {
      parameters: idPath,
      post: {
        tags: ['Challenges'], summary: 'הצטרפות לאתגר ציבורי', description: 'עד joinDeadline ולא אחרי סיום האתגר.', security: secured,
        responses: { 201: { description: 'הצטרף', content: json({ type: 'object' }, { challengeId: 12, firstDay: '2026-11-03' }) }, 400: E['400rule'], 401: E[401], 404: E[404], 409: errorResponse('כבר משתתף', 'CONFLICT', 'כבר הצטרפת לאתגר הזה') },
      },
      delete: {
        tags: ['Challenges'], summary: 'עזיבת אתגר (רק לפני ההתחלה)', security: secured,
        responses: { 204: { description: 'עזב' }, 400: E['400rule'], 401: E[401], 404: E[404] },
      },
    },
    '/api/challenges/{id}/pending': {
      parameters: idPath,
      get: {
        tags: ['Reports & Results'], summary: 'מה נשאר לי לדווח', description: 'ימים חסרים (שעברו) ומצב היום. באתגר שהסתיים – רשימה ריקה.', security: secured,
        responses: {
          200: { description: 'הצלחה', content: json({ type: 'object' }, { scale: 'YES_NO', status: 'ACTIVE', missingDates: ['2026-11-01', '2026-11-02'], today: { date: '2026-11-03', reported: false, canReport: true } }) },
          401: E[401], 404: E[404],
        },
      },
    },
    '/api/challenges/{id}/reports': {
      parameters: idPath,
      post: {
        tags: ['Reports & Results'], summary: 'שליחת דיווחים (כמה ימים בבת אחת)',
        description: 'ערכים: YES_NO – 0 או 1, RATING – 1 עד 10. דיווח לא ניתן לשינוי. אם נשארים ימים חסרים שלא נשלחו, חובה fillMissingWithZero: true – אחרת השגיאה MISSING_NOT_CONFIRMED ושום דבר לא נשמר.', security: secured,
        requestBody: {
          required: true,
          content: json(
            { type: 'object', required: ['reports'], properties: { reports: { type: 'array', items: { type: 'object', required: ['date', 'value'], properties: { date: { type: 'string', format: 'date' }, value: { type: 'integer' } } } }, fillMissingWithZero: { type: 'boolean', default: false } } },
            { reports: [{ date: '2026-11-02', value: 1 }, { date: '2026-11-03', value: 0 }], fillMissingWithZero: true },
          ),
        },
        responses: {
          201: { description: 'נשמר', content: json({ type: 'object' }, { created: 3, skipped: ['2026-11-01'], missingDates: [], todayReported: true }) },
          400: errorResponse('נתונים לא תקינים או ימים חסרים בלי אישור', 'MISSING_NOT_CONFIRMED', 'נותרו 1 ימים שלא דווחו. כדי שיקבלו 0 יש לשלוח fillMissingWithZero: true'),
          401: E[401], 404: E[404], 409: errorResponse('כבר דווח', 'CONFLICT', 'כבר דיווחת על הימים האלה. אי אפשר לשנות דיווח'),
        },
      },
    },
    '/api/challenges/{id}/leaderboard': {
      parameters: idPath,
      get: {
        tags: ['Reports & Results'], summary: 'טבלת דירוג (גם לגרף העמודות)',
        description: 'מקומות משותפים בשוויון. winners רק באתגר שהסתיים. לפני הסיום – רק משתתף בלי ימים חסרים; אחרי הסיום – כל חברי הקבוצה.', security: secured,
        responses: {
          200: {
            description: 'הצלחה',
            content: json({ type: 'object' }, {
              dataUntil: '2026-11-02', status: 'ACTIVE', prize: 'כרטיספר על סך 70 ש"ח',
              rows: [{ rank: 1, user: { id: 7, displayName: 'חני ויס', avatar: 'OWL', color: '#EB6834' }, percentage: 87.5, daysCounted: 8, currentStreak: 5, isMe: true }],
              winners: null,
            }),
          },
          401: E[401], 403: E['403locked'], 404: E[404],
        },
      },
    },
    '/api/challenges/{id}/progress': {
      parameters: idPath,
      get: {
        tags: ['Reports & Results'], summary: 'נתוני גרף "הכושר השבועי"',
        description: 'נקודה לכל יום; לכל משתתף מפתח (u7) עם אחוז ההצלחה ב-7 הימים האחרונים עד אותו יום, או null לפני שהצטרף.', security: secured,
        responses: {
          200: {
            description: 'הצלחה',
            content: json({ type: 'object' }, {
              dataUntil: '2026-11-02',
              series: [{ key: 'u7', id: 7, displayName: 'חני ויס', avatar: 'OWL', color: '#EB6834' }],
              points: [{ date: '2026-11-01', u7: 100 }, { date: '2026-11-02', u7: 50 }],
            }),
          },
          401: E[401], 403: E['403locked'], 404: E[404],
        },
      },
    },
  },
};
