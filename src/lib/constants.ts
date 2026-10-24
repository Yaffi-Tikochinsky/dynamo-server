import { Avatar, Scale } from '@prisma/client';

export const AVATAR_EMOJI: Record<Avatar, string> = {
  LION: '🦁', TIGER: '🐯', FOX: '🦊', PANDA: '🐼', KOALA: '🐨', OWL: '🦉',
  PENGUIN: '🐧', TURTLE: '🐢', DOLPHIN: '🐬', WHALE: '🐳', OCTOPUS: '🐙', BUTTERFLY: '🦋',
  BEE: '🐝', UNICORN: '🦄', HORSE: '🐴', RABBIT: '🐰', CAT: '🐱', DOG: '🐶',
  ROCKET: '🚀', STAR: '⭐', SUN: '☀️', MOON: '🌙', RAINBOW: '🌈', SUNFLOWER: '🌻',
  TREE: '🌳', CACTUS: '🌵', MOUNTAIN: '⛰️', BOOK: '📚', GUITAR: '🎸', SOCCER: '⚽',
};

/** Member colors, chosen to be easy to tell apart in charts. */
export const MEMBER_COLORS = [
  '#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4',
  '#008300', '#6250D6', '#E34948', '#0F9BB5', '#8A5A2B',
] as const;

/** Highest value of one daily report, per scale. */
export const SCALE_MAX: Record<Scale, number> = { YES_NO: 1, RATING: 10 };

export const SCALE_LABELS: Record<Scale, string> = { YES_NO: 'כן/לא', RATING: 'דירוג 1–10' };

export const LIMITS = {
  emailMax: 254,
  passwordMin: 8, passwordMax: 64,
  displayNameMin: 2, displayNameMax: 30,
  groupNameMin: 2, groupNameMax: 40,
  joinCodeMin: 6, joinCodeMax: 12,
  titleMin: 2, titleMax: 60,
  descriptionMax: 500,
  prizeMax: 100,
  maxChallengeDays: 366,
} as const;

/** Characters for random join codes (no 0/O and 1/I, which are easy to confuse). */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const RANDOM_JOIN_CODE_LENGTH = 6;

/** Daily inspiration sentences. One is shown per day, in order. */
export const QUOTES = [
  'צעד קטן כל יום עושה דרך ארוכה.',
  'ההתמדה חשובה יותר מהשלמות.',
  'היום הוא הזדמנות חדשה להתחיל מחדש.',
  'מי שמתחיל – כבר עשה חצי מהדרך.',
  'גם יום חלש הוא יום שבו לא ויתרת.',
  'הרגלים טובים נבנים לאט, אבל נשארים הרבה זמן.',
  'ביחד קל יותר להתמיד.',
  'אל תשווה את ההתחלה שלך לאמצע של מישהו אחר.',
  'כל דיווח הוא עוד לבנה בבניין.',
  'ההצלחה היא סכום של מאמצים קטנים שחוזרים כל יום.',
  'מה שעושים בעקביות – משנה.',
  'אתמול כבר עבר, מחר עוד לא הגיע – יש לך את היום.',
  'נפלת? קום, וזה כבר ניצחון.',
  'התקדמות איטית היא עדיין התקדמות.',
  'החברים שלך סומכים עליך – ואתה יכול לסמוך על עצמך.',
  'מוטיבציה מתחילה אותך, הרגל ממשיך אותך.',
  'אין צורך להיות מושלם, רק להמשיך.',
  'כל יום הוא עמוד חדש. כתוב בו משהו טוב.',
  'גם מסע של אלף קילומטרים מתחיל בצעד אחד.',
  'מה שקשה היום – יהיה טבעי מחר.',
  'תן לעצמך קרדיט על כל מאמץ.',
  'הדרך הכי טובה לחזות את העתיד היא ליצור אותו.',
  'קבוצה טובה מרימה את כל החברים בה.',
  'לא חשוב כמה לאט אתה הולך, כל עוד אתה לא עוצר.',
  'היום תעשה משהו שהעצמי של מחר יודה לך עליו.',
  'שינוי גדול מתחיל בהחלטה קטנה.',
  'אמונה בעצמך היא הצעד הראשון.',
  'כל יום שבו ניסית – נחשב.',
  'הכוח שלך נמצא בעקביות שלך.',
  'חייך – עוד יום של צמיחה מחכה לך.',
] as const;
