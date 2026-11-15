/**
 * Signal/quality readings per DDish device, as the staff described them:
 * which values each device can show and what a reading means.
 *
 * Shared by the diagnosis form (instant verdict in the UI) and the Nandia chat
 * route (a note appended to the question). Decided in code because the fast
 * model mixed devices up — e.g. treated Награ 0,0 (frozen → reset) like
 * Арион 0,0 (antenna not aligned). Keep in sync with the knowledge section
 * "Дохио, чанарын боломжит утга (бүх төхөөрөмжид адил)".
 */

export type Reading = number | null;

export interface DeviceRule {
  id: string;
  /** Name as in Nandia's knowledge titles. */
  name: string;
  /** Lower-case words staff use for the device (Latin and Cyrillic). */
  aliases: string[];
  strengthLabel: string;
  qualityLabel: string;
  /** Values this device can show. */
  hint?: string;
  /** A short warning when the readings are impossible for this device. */
  check?: (strength: Reading, quality: Reading) => string | null;
  /** What the readings mean. */
  verdict?: (strength: Reading, quality: Reading) => string | null;
}

/** Follows a coded verdict; without it the model sometimes mixed in its own guess. */
export const VERDICT_INSTRUCTION = "Энэ дүгнэлтийг үнэн гэж хүлээн авч, зөвхөн түүнд тохирох алхмыг бич. Өөр дүгнэлт бүү гарга.";

/** What Nandia does when the readings can't come from the named device. */
export const IMPOSSIBLE_READING_REPLY =
  'Оношлохгүй: "Энэ төхөөрөмж ийм тоо заадаггүй. Төхөөрөмжийн загвар болон харж буй цонхоо сайн баталгаажуулна уу" гэж хэлж, боломжит утгыг сануул.';

const outOf = (v: Reading, min: number, max: number) => v !== null && (v < min || v > max);

const THREE_O_VERDICT = (s: Reading) => (s === 4 ? "Дохио 4: онцгой тохиолдол, холболтын заавар өгнө." : null);

// Signal 4 is the known special case (connection problem); quality can then be anything.
const THREE_O_CHECK = (s: Reading, q: Reading) =>
  s !== 4 && ((s !== null && s < 18) || (q !== null && q < 10))
    ? "3.0, 4K-ийн дохио хамгийн багадаа 18 (онцгой үед 4), чанар хамгийн багадаа 10 байдаг."
    : null;

export const DEVICE_RULES: DeviceRule[] = [
  {
    id: "konka",
    name: "Konka",
    aliases: ["konka", "конка", "конко", "konko"],
    strengthLabel: "I (дохионы хүч)",
    qualityLabel: "Q (дохионы чанар)",
    hint: "I: 11–99 · Q: 0–60 (I, Q зөвхөн Konka дээр гардаг)",
    check: (s, q) => (outOf(s, 11, 99) || outOf(q, 0, 60) ? "Konka-гийн I 11–99, Q 0–60 хооронд л заадаг." : null),
    verdict: (s, q) => {
      if (s === null) return null;
      if (s < 80) return "I 80-аас доош: кабель утас, дуран (LNB), оролтуудаа шалгана.";
      if (q === null) return null;
      if (q < 45) return "I хэвийн, Q 45-аас бага: антен тааралгүй байна, антенаа тааруулна.";
      return "I, Q хэвийн: дохио таарсан байна.";
    },
  },
  {
    id: "nagra",
    name: "Награ",
    aliases: ["nagra", "награ"],
    strengthLabel: "Дохио",
    qualityLabel: "Чанар",
    hint: "Дохио: 0–100 · Чанар: 6, 7 эсвэл 100 (гацсан үед 0, 0)",
    // Quality 0 only comes with signal 0 (frozen).
    check: (s, q) =>
      outOf(s, 0, 100) || (q !== null && ![0, 6, 7, 100].includes(q)) || (q === 0 && s !== null && s !== 0)
        ? "Награ-гийн чанар зөвхөн 6, 7 эсвэл 100 (гацсан үед 0, 0) байдаг."
        : null,
    verdict: (s, q) => {
      if (s === 0 && q === 0) return "0, 0: төхөөрөмж гацсан байна, reset хийнэ (антен тааруулах шаардлагагүй).";
      if (q === 6 || q === 7) return `Чанар ${q}: антен тааралгүй байна, антенаа тааруулна.`;
      if (q === 100) return "Чанар 100: антен таарсан, дохио хэвийн байна.";
      return null;
    },
  },
  {
    id: "arion",
    name: "Арион",
    aliases: ["arion", "арион"],
    strengthLabel: "Дохио",
    qualityLabel: "Чанар",
    hint: "Тааралгүй үед 0, 0 · Таарвал дохио 90, чанар 50-аас дээш",
    // Either both 0 (not aligned) or both up (signal 90, quality 50+); nothing in between.
    check: (s, q) =>
      (q !== null && q > 0 && q < 50) || (s !== null && q !== null && (s === 0) !== (q === 0))
        ? "Арион тааралгүй үед 0, 0, таарвал дохио 90, чанар 50-аас дээш л заадаг."
        : null,
    verdict: (s, q) => {
      if (s === 0 && q === 0) return "0, 0: антен тааралгүй байна, антенаа тааруулна.";
      if (q !== null && q >= 50) return "Чанар 50-аас дээш: антен таарсан, дохио хэвийн байна.";
      return null;
    },
  },
  {
    id: "intek",
    name: "Интек",
    aliases: ["intek", "интек"],
    strengthLabel: "Дохио",
    qualityLabel: "Чанар",
    hint: "Дохио: 1–90 (ихэвчлэн 70–80) · Чанар: тааралгүй үед 2, таарахаараа шууд 70–90",
    // Quality jumps straight from 2 to about 70, so 3–69 never shows.
    check: (s, q) =>
      outOf(s, 1, 90) || (q !== null && q !== 2 && outOf(q, 70, 90))
        ? "Интекийн дохио 1–90, чанар 2 эсвэл 70–90 хооронд л заадаг."
        : null,
    verdict: (s, q) => {
      if (s === null) return null;
      if (s < 70) return "Дохио 70-аас доош: холболт хэвийн биш байна, кабель утас, дуран (LNB), оролтуудаа шалгана.";
      if (q === null) return null;
      if (q === 2) return "Дохио хэвийн, чанар 2: антен тааралгүй байна, антенаа тааруулна.";
      return "Дохио, чанар хэвийн: антен таарсан байна.";
    },
  },
  {
    id: "d30",
    name: "3.0",
    aliases: ["3.0", "3,0"],
    strengthLabel: "Дохио",
    qualityLabel: "Чанар",
    hint: "Энгийн үед дохио ≥ 18, чанар ≥ 10 · онцгой үед дохио 4",
    check: THREE_O_CHECK,
    verdict: THREE_O_VERDICT,
  },
  {
    id: "d4k",
    name: "4K",
    aliases: ["4k", "4к"],
    strengthLabel: "Дохио",
    qualityLabel: "Чанар",
    hint: "Энгийн үед дохио ≥ 18, чанар ≥ 10 · онцгой үед дохио 4",
    check: THREE_O_CHECK,
    verdict: THREE_O_VERDICT,
  },
];

/** The device a message names (the latest mention wins when several messages are given). */
export function findDeviceRule(texts: string[]): DeviceRule | null {
  for (let i = texts.length - 1; i >= 0; i--) {
    const text = texts[i].toLowerCase();
    // 4K is checked before 3.0 so "3.0 4K" means the 4K box.
    for (const id of ["d4k", "konka", "nagra", "arion", "intek", "d30"]) {
      const rule = DEVICE_RULES.find((r) => r.id === id)!;
      if (rule.aliases.some((a) => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(a)}($|[^\\p{L}\\p{N}])`, "u").test(text))) {
        return rule;
      }
    }
  }
  return null;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STRENGTH_WORDS = ["huch", "hvch", "хүч", "dohio", "dohioo", "дохио", "signal", "i"];
const QUALITY_WORDS = ["chanar", "чанар", "quality", "q"];

function keyed(text: string, words: string[]): Reading {
  for (const w of words) {
    const m = new RegExp(`(?:^|[^\\p{L}])${escape(w)}\\s*[=:\\-]?\\s*(\\d{1,3})(?!\\d)`, "u").exec(text);
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * Reads signal and quality from a staff message: "nagra dohio 0 chanar 0",
 * "konka I 85 Q 20", "nagra 0.0", "награ 0,0", "arion 90 60". Returns nulls
 * when the message isn't about readings (e.g. software versions).
 */
export function parseReadings(text: string, rule: DeviceRule): { strength: Reading; quality: Reading } {
  let t = text.toLowerCase();
  if (/\bsw\b|software|хувилбар|\d+\.\d+\.\d+/.test(t)) return { strength: null, quality: null };
  for (const a of rule.aliases) t = t.split(a).join(" ");

  let strength = keyed(t, STRENGTH_WORDS);
  let quality = keyed(t, QUALITY_WORDS);
  if (strength === null || quality === null) {
    const pair = numberPair(t);
    if (pair) {
      strength ??= pair[0];
      quality ??= pair[1];
    }
  }
  return { strength, quality };
}

// Prices and durations ("1 sar 30 honog", "une 129,000") are not readings.
const NOT_READINGS = new RegExp(
  "(^|[^\\p{L}])(төг|tug|₮|үн[эи]|un[ei]|сар|sar|хоног|honog|өдөр|odor|udur|жил|jil|цаг(?!аан)|tsag(?!aan)|минут|minut|удаа|udaa|мянг|myng)",
  "u"
);

/**
 * Unlabelled readings: exactly two numbers written side by side — "0.0",
 * "0 0", "70/6", "90 60". Labelled ones ("dohio 70 chanar 6") are read by keyed().
 */
function numberPair(t: string): [number, number] | null {
  if (NOT_READINGS.test(t)) return null;
  // new RegExp: lookbehind is ES2018 syntax and tsconfig targets ES2017.
  const found = [...t.matchAll(new RegExp("(?<!\\d)(\\d{1,3})(?!\\d)", "g"))];
  if (found.length !== 2) return null;
  const [a, b] = found;
  const between = t.slice(a.index! + a[0].length, b.index);
  if (!/^%?\s*[.,/\-:]?\s*$/.test(between)) return null;
  // "129,000" is one number with a thousands separator.
  if (/[.,]/.test(between) && b[0].length === 3) return null;
  return [Number(a[1]), Number(b[1])];
}

/**
 * A note for Nandia about the readings in the latest message, or null when
 * there is no device or no readings. Used by the chat route.
 */
export function signalNote(userTexts: string[]): string | null {
  const latest = userTexts.at(-1);
  if (!latest) return null;
  const rule = findDeviceRule(userTexts);
  if (!rule) return null;
  const { strength, quality } = parseReadings(latest, rule);
  if (strength === null && quality === null) return null;

  const readings = `${rule.name}: ${rule.strengthLabel.split(" ")[0]} ${strength ?? "?"}, ${rule.qualityLabel.split(" ")[0]} ${quality ?? "?"}`;
  const warning = rule.check?.(strength, quality);
  if (warning) {
    return `[Тэмдэглэл (код шалгасан): ${readings}. ${warning} ${IMPOSSIBLE_READING_REPLY}]`;
  }
  const verdict = rule.verdict?.(strength, quality);
  if (!verdict) return null;
  return `[Тэмдэглэл (код шалгасан): ${readings}. Мэдлэгийн дагуу дүгнэлт: ${verdict} ${VERDICT_INSTRUCTION}]`;
}
