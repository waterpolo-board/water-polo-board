// שפות הממשק: עברית (מימין לשמאל), אנגלית וסרבית (לטינית, משמאל לימין).
// טקסטים קבועים ב-HTML מסומנים ב-data-i18n; טקסטים דינמיים עוברים דרך t().

export type Lang = "he" | "en" | "sr";
export const LANGS: Lang[] = ["he", "en", "sr"];
export const LANG_LABEL: Record<Lang, string> = { he: "עב", en: "EN", sr: "SR" };
const KEY = "wpb.lang";

const he = {
  "app.title": "לוח כדורמים",
  "app.language": "שפה",
  "tools": "כלים",
  "mode": "מצב",
  "mode.full": "בריכה מלאה",
  "mode.6v6": "6 על 6",
  "mode.6v5": "6 על 5",
  "draw": "כלי ציור",
  "tool.drag": "הזזה",
  "tool.move": "חץ תנועה",
  "tool.pass": "מסירה",
  "tool.numbers": "מספרים",
  "undo": "בטל",
  "redo": "חזור",
  "clear": "נקה חצים",
  "reset": "איפוס מערך",
  "board": "בריכת כדורמים",
  "timeline": "מהלך",
  "play": "הפעל מהלך",
  "stop": "עצור",
  "speed": "מהירות {s}×",
  "steps": "שלבים",
  "step.n": "שלב {n}",
  "step.add": "שלב",
  "step.delete": "מחק שלב",
  "video": "סרטון",
  "video.hint": "יצירת סרטון מהמהלך לשיתוף",
  "save": "שמור",
  "library": "ספרייה",
  "library.title": "ספריית מהלכים",
  "close": "סגור",
  "save.show": "שמירת המהלך שעל הלוח",
  "save.placeholder": "שם, למשל: 6 על 5 — העברת צד",
  "tags": "תגיות",
  "save.update": "עדכן את השמור",
  "save.asNew": "שמור כחדש",
  "save.new": "שמור בספרייה",
  "search": "חיפוש לפי שם",
  "search.label": "חיפוש מהלך",
  "filter": "סינון לפי תגית",
  "all": "הכול",
  "export": "ייצוא גיבוי",
  "import": "ייבוא גיבוי",
  "backup.file": "לוח-כדורמים-גיבוי",
  "toast.saved": "\"{name}\" נשמר בספרייה",
  "toast.updated": "\"{name}\" עודכן",
  "toast.deleted": "\"{name}\" נמחק",
  "toast.undo": "ביטול",
  "toast.exported": "נשמר קובץ גיבוי עם {n} מהלכים",
  "toast.notBackup": "הקובץ הזה הוא לא גיבוי של לוח כדורמים",
  "toast.imported": "יובאו {n} מהלכים",
  "toast.importedNone": "כל המהלכים בקובץ כבר נמצאים בספרייה",
  "toast.videoNeedsSteps": "לסרטון צריך לפחות שני שלבים — הוסיפו שלב עם \"+ שלב\"",
  "empty.none": "עוד אין מהלכים שמורים. בנו מהלך על הלוח ושמרו אותו כאן.",
  "empty.noMatch": "אין מהלכים שמתאימים לחיפוש.",
  "card.open": "פתח את {name}",
  "card.play": "נגן את {name}",
  "card.more": "פעולות נוספות",
  "card.video": "שתף כסרטון",
  "card.rename": "שנה שם",
  "card.renameLabel": "שם חדש",
  "card.duplicate": "שכפל",
  "card.delete": "מחק",
  "copy": "עותק",
  "untitled": "מהלך ללא שם",
  "play.default": "מהלך",
  "unsaved": "יש שינויים שלא נשמרו",
  "picker": "בחירת מספר",
  "team.w": "לבנים",
  "team.b": "כחולים",
  "goalie": "שוער",
  "picker.current": "כרגע {n}",
  "picker.swap": "יתחלף עם השחקן שיש לו את המספר הזה",
  "video.making": "מכין סרטון…",
  "video.ready": "הסרטון מוכן",
  "video.share": "שתף",
  "video.saveFile": "שמור לקובץ",
  "video.cancel": "ביטול",
  "video.failed": "לא הצלחנו ליצור סרטון",
  "video.failedHint": "נסו שוב, או עדכנו את הדפדפן.",
  "video.unsupported": "המכשיר הזה לא תומך ביצירת סרטונים",
  "video.recordFailed": "ההקלטה נכשלה",
  "video.stepOf": "שלב {n} מתוך {total}",
  "tag.attack": "התקפה",
  "tag.defense": "הגנה",
  "tag.manUp": "יתרון מספרי",
  "tag.manDown": "חסרון מספרי",
  "tag.start": "פתיחה",
  "tag.drill": "תרגיל",
  "example.1": "דוגמה · 6 על 5 — העברת צד וזריקה מהכנף",
  "example.2": "דוגמה · 6 על 5 — מסירה לעמדה",
  "example.3": "דוגמה · 6 על 6 — חדירה מהשטוח",
} as const;

export type Key = keyof typeof he;

const en: Record<Key, string> = {
  "app.title": "Water Polo Board",
  "app.language": "Language",
  "tools": "Tools",
  "mode": "Mode",
  "mode.full": "Full pool",
  "mode.6v6": "6 on 6",
  "mode.6v5": "6 on 5",
  "draw": "Drawing tools",
  "tool.drag": "Move",
  "tool.move": "Swim arrow",
  "tool.pass": "Pass",
  "tool.numbers": "Numbers",
  "undo": "Undo",
  "redo": "Redo",
  "clear": "Clear arrows",
  "reset": "Reset formation",
  "board": "Water polo pool",
  "timeline": "Play",
  "play": "Play",
  "stop": "Stop",
  "speed": "Speed {s}×",
  "steps": "Steps",
  "step.n": "Step {n}",
  "step.add": "Step",
  "step.delete": "Delete step",
  "video": "Video",
  "video.hint": "Make a video of this play to share",
  "save": "Save",
  "library": "Library",
  "library.title": "Play library",
  "close": "Close",
  "save.show": "Save the play on the board",
  "save.placeholder": "Name, e.g. 6 on 5 — switch sides",
  "tags": "Tags",
  "save.update": "Update saved play",
  "save.asNew": "Save as new",
  "save.new": "Save to library",
  "search": "Search by name",
  "search.label": "Search plays",
  "filter": "Filter by tag",
  "all": "All",
  "export": "Export backup",
  "import": "Import backup",
  "backup.file": "water-polo-board-backup",
  "toast.saved": "\"{name}\" saved to the library",
  "toast.updated": "\"{name}\" updated",
  "toast.deleted": "\"{name}\" deleted",
  "toast.undo": "Undo",
  "toast.exported": "Backup saved with {n} plays",
  "toast.notBackup": "This file isn't a Water Polo Board backup",
  "toast.imported": "Imported {n} plays",
  "toast.importedNone": "All plays in the file are already in the library",
  "toast.videoNeedsSteps": "A video needs at least two steps — add one with \"+ Step\"",
  "empty.none": "No saved plays yet. Build a play on the board and save it here.",
  "empty.noMatch": "No plays match your search.",
  "card.open": "Open {name}",
  "card.play": "Play {name}",
  "card.more": "More actions",
  "card.video": "Share as video",
  "card.rename": "Rename",
  "card.renameLabel": "New name",
  "card.duplicate": "Duplicate",
  "card.delete": "Delete",
  "copy": "copy",
  "untitled": "Untitled play",
  "play.default": "Play",
  "unsaved": "Unsaved changes",
  "picker": "Choose a number",
  "team.w": "White",
  "team.b": "Blue",
  "goalie": "goalkeeper",
  "picker.current": "now {n}",
  "picker.swap": "Swaps with the player who has this number",
  "video.making": "Making video…",
  "video.ready": "Video ready",
  "video.share": "Share",
  "video.saveFile": "Save to file",
  "video.cancel": "Cancel",
  "video.failed": "Couldn't create the video",
  "video.failedHint": "Try again, or update your browser.",
  "video.unsupported": "This device can't create videos",
  "video.recordFailed": "Recording failed",
  "video.stepOf": "Step {n} of {total}",
  "tag.attack": "Attack",
  "tag.defense": "Defense",
  "tag.manUp": "Man up",
  "tag.manDown": "Man down",
  "tag.start": "Sprint / start",
  "tag.drill": "Drill",
  "example.1": "Example · 6 on 5 — switch sides, shot from the wing",
  "example.2": "Example · 6 on 5 — pass to the post",
  "example.3": "Example · 6 on 6 — drive from the flat",
};

const sr: Record<Key, string> = {
  "app.title": "Vaterpolo tabla",
  "app.language": "Jezik",
  "tools": "Alati",
  "mode": "Režim",
  "mode.full": "Ceo bazen",
  "mode.6v6": "6 na 6",
  "mode.6v5": "6 na 5",
  "draw": "Alati za crtanje",
  "tool.drag": "Pomeranje",
  "tool.move": "Strelica kretanja",
  "tool.pass": "Dodavanje",
  "tool.numbers": "Brojevi",
  "undo": "Poništi",
  "redo": "Ponovi",
  "clear": "Obriši strelice",
  "reset": "Vrati postavu",
  "board": "Vaterpolo bazen",
  "timeline": "Akcija",
  "play": "Pusti akciju",
  "stop": "Zaustavi",
  "speed": "Brzina {s}×",
  "steps": "Koraci",
  "step.n": "Korak {n}",
  "step.add": "Korak",
  "step.delete": "Obriši korak",
  "video": "Video",
  "video.hint": "Napravi video akcije za deljenje",
  "save": "Sačuvaj",
  "library": "Biblioteka",
  "library.title": "Biblioteka akcija",
  "close": "Zatvori",
  "save.show": "Sačuvaj akciju sa table",
  "save.placeholder": "Naziv, npr. 6 na 5 — prebacivanje strane",
  "tags": "Oznake",
  "save.update": "Ažuriraj sačuvanu",
  "save.asNew": "Sačuvaj kao novu",
  "save.new": "Sačuvaj u biblioteku",
  "search": "Pretraga po nazivu",
  "search.label": "Pretraga akcija",
  "filter": "Filter po oznaci",
  "all": "Sve",
  "export": "Izvezi kopiju",
  "import": "Uvezi kopiju",
  "backup.file": "vaterpolo-tabla-kopija",
  "toast.saved": "\"{name}\" je sačuvana u biblioteci",
  "toast.updated": "\"{name}\" je ažurirana",
  "toast.deleted": "\"{name}\" je obrisana",
  "toast.undo": "Poništi",
  "toast.exported": "Rezervna kopija je sačuvana (akcija: {n})",
  "toast.notBackup": "Ovaj fajl nije rezervna kopija vaterpolo table",
  "toast.imported": "Uvezeno akcija: {n}",
  "toast.importedNone": "Sve akcije iz fajla su već u biblioteci",
  "toast.videoNeedsSteps": "Za video su potrebna bar dva koraka — dodajte korak sa \"+ Korak\"",
  "empty.none": "Još nema sačuvanih akcija. Napravite akciju na tabli i sačuvajte je ovde.",
  "empty.noMatch": "Nijedna akcija ne odgovara pretrazi.",
  "card.open": "Otvori {name}",
  "card.play": "Pusti {name}",
  "card.more": "Još radnji",
  "card.video": "Podeli kao video",
  "card.rename": "Preimenuj",
  "card.renameLabel": "Novi naziv",
  "card.duplicate": "Dupliraj",
  "card.delete": "Obriši",
  "copy": "kopija",
  "untitled": "Akcija bez naziva",
  "play.default": "Akcija",
  "unsaved": "Nesačuvane izmene",
  "picker": "Izbor broja",
  "team.w": "Beli",
  "team.b": "Plavi",
  "goalie": "golman",
  "picker.current": "trenutno {n}",
  "picker.swap": "Zameniće se sa igračem koji ima ovaj broj",
  "video.making": "Pravim video…",
  "video.ready": "Video je spreman",
  "video.share": "Podeli",
  "video.saveFile": "Sačuvaj fajl",
  "video.cancel": "Otkaži",
  "video.failed": "Pravljenje videa nije uspelo",
  "video.failedHint": "Pokušajte ponovo ili ažurirajte pregledač.",
  "video.unsupported": "Ovaj uređaj ne podržava pravljenje videa",
  "video.recordFailed": "Snimanje nije uspelo",
  "video.stepOf": "Korak {n} od {total}",
  "tag.attack": "Napad",
  "tag.defense": "Odbrana",
  "tag.manUp": "Igrač više",
  "tag.manDown": "Igrač manje",
  "tag.start": "Plivanje za loptu",
  "tag.drill": "Vežba",
  "example.1": "Primer · 6 na 5 — prebacivanje strane i šut sa krila",
  "example.2": "Primer · 6 na 5 — dodavanje centru",
  "example.3": "Primer · 6 na 6 — prodor sa bočne pozicije",
};

const DICT: Record<Lang, Record<Key, string>> = { he, en, sr };

const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch { /* אין אחסון */ }
  const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "he";
  if (nav.startsWith("en")) return "en";
  if (/^(sr|hr|bs|sh|me)/.test(nav)) return "sr";
  return "he";
}

let lang: Lang = initial();
const listeners = new Set<() => void>();

export const getLang = () => lang;
export const isRtl = () => lang === "he";

export function t(key: Key, params?: Record<string, string | number>): string {
  let s = DICT[lang][key] ?? he[key];
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** "N שלבים" עם צורת יחיד/רבים נכונה בכל שפה. */
export function stepCount(n: number): string {
  if (lang === "he") return n === 1 ? "שלב אחד" : `${n} שלבים`;
  if (lang === "en") return n === 1 ? "1 step" : `${n} steps`;
  const few = n % 10 === 1 && n % 100 !== 11;
  return `${n} ${few ? "korak" : "koraka"}`;
}

/** מעדכן את כל הטקסטים הקבועים ב-HTML לפי השפה הנוכחית. */
export function applyStatic(root?: ParentNode) {
  if (typeof document === "undefined") return;
  root ??= document;
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl() ? "rtl" : "ltr";
  document.title = t("app.title");
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n]")) el.textContent = t(el.dataset.i18n as Key);
  for (const [attr, data] of [["aria-label", "i18nAria"], ["placeholder", "i18nPlaceholder"], ["title", "i18nTitle"]] as const) {
    for (const el of root.querySelectorAll<HTMLElement>(`[data-${data.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}]`)) {
      el.setAttribute(attr, t(el.dataset[data] as Key));
    }
  }
}

export function setLang(next: Lang) {
  if (next === lang) return;
  lang = next;
  try { localStorage.setItem(KEY, next); } catch { /* לא קריטי */ }
  applyStatic();
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void) {
  listeners.add(fn);
}
