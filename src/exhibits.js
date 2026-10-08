/**
 * Exhibit numbering, sticker/stamp headings and exhibit lists.
 *
 * @module exhibits
 */

import { toLetters, toRoman, lettersToIndex } from "./sequences.js";

/** Party designations offered by the exhibit tools. */
export const PARTIES = Object.freeze([
  "Plaintiff's", "Defendant's", "Joint", "Petitioner's", "Respondent's", "Government's",
]);

/** Input limits used by the exhibit list tool. */
export const EXHIBIT_LIMITS = Object.freeze({
  maxExhibits: 300,
  maxDesc: 300,
  maxField: 120,
  maxPrefix: 8,
  maxStickers: 500,
});

/** Columns of the exhibit list, in order. The last three are left blank for entries made in court. */
export const EXHIBIT_LIST_COLUMNS = Object.freeze(["No.", "Description", "Marked", "Offered", "Admitted"]);

/** @typedef {"numbers" | "letters" | "roman"} ExhibitNumbering */

/**
 * Zero-based exhibit index to letters: 0 is A, 25 is Z, 26 is AA, 27 is AB.
 *
 * @param {number} i
 * @returns {string}
 */
export function letterFor(i) {
  return toLetters(Math.floor(i) + 1);
}

/**
 * The stamp/sticker color the PDF exhibit stamp tool picks by default for a
 * party: yellow for plaintiff/petitioner, blue for defendant/respondent,
 * white otherwise. A common convention; check your court's local rules.
 *
 * @param {string} party
 * @returns {"Yellow" | "Blue" | "White"}
 */
export function defaultStampColor(party) {
  if (/^Defendant|^Respondent/i.test(party)) return "Blue";
  if (/^Plaintiff|^Petitioner/i.test(party)) return "Yellow";
  return "White";
}

/**
 * Normalize the `start` option for a numbering scheme to a 1-based position
 * (letters) or a first value (numbers, roman).
 */
function firstValue(numbering, start) {
  if (numbering === "letters") {
    if (start === undefined || start === null || start === "") return 1;
    return typeof start === "number" ? Math.max(1, Math.floor(start)) : lettersToIndex(start);
  }
  if (start === undefined || start === null || start === "") return 1;
  const n = Math.floor(Number(start));
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`start must be an integer >= 0 (got ${start})`);
  if (numbering === "roman" && n < 1) throw new RangeError("Roman numerals start at 1");
  return n;
}

/**
 * Generate exhibit identifiers.
 *
 * - "numbers": start, start+1, ... (default start 1)
 * - "letters": A..Z, AA, AB, ... (start may be a letter run such as "C", or a 1-based position)
 * - "roman":   I, II, III, ... (default start 1)
 *
 * @param {{ prefix?: string, numbering?: ExhibitNumbering, start?: number | string }} options
 * @param {number} count
 * @returns {string[]}
 * @example exhibitIds({ prefix: "PX-", numbering: "numbers", start: 101 }, 3) // ["PX-101", "PX-102", "PX-103"]
 */
export function exhibitIds({ prefix = "", numbering = "numbers", start } = {}, count) {
  if (!["numbers", "letters", "roman"].includes(numbering)) {
    throw new TypeError(`unknown numbering "${numbering}"; expected numbers, letters or roman`);
  }
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const first = firstValue(numbering, start);
  const core = (i) =>
    numbering === "letters" ? toLetters(first + i) : numbering === "roman" ? toRoman(first + i) : String(first + i);
  return Array.from({ length: n }, (_, i) => `${prefix}${core(i)}`);
}

/**
 * The heading printed on an exhibit sticker: "PLAINTIFF'S EXHIBIT",
 * "DEPOSITION EXHIBIT", or just "EXHIBIT" when no party is given. Text that
 * already contains the word "exhibit" is used as is (uppercased).
 *
 * @param {string} [party]
 * @returns {string}
 */
export function exhibitHeading(party = "") {
  const s = String(party).trim();
  if (!s) return "EXHIBIT";
  return (/exhibit/i.test(s) ? s : `${s} EXHIBIT`).toUpperCase();
}

/**
 * A full one-line exhibit label, e.g. "PLAINTIFF'S EXHIBIT 12".
 *
 * @param {string} party
 * @param {string} id
 * @returns {string}
 */
export function exhibitLabel(party, id) {
  return `${exhibitHeading(party)} ${id}`;
}

/**
 * Expand a sticker range into labels: "1-50", "101 to 150", "A-Z", or a list
 * separated by commas or new lines. Numeric ranges accept up to 4 digits and
 * are capped at 500 labels; letter ranges are single letters A-Z. List items
 * are trimmed to 16 characters.
 *
 * @param {string} input
 * @returns {string[]}
 * @example expandStickerLabels("101 to 103") // ["101", "102", "103"]
 */
export function expandStickerLabels(input) {
  const t = String(input).trim();
  const num = t.match(/^(\d{1,4})\s*(?:-|–|—|to)\s*(\d{1,4})$/i);
  if (num) {
    const a = +num[1], b = +num[2];
    const lo = Math.min(a, b);
    const hi = Math.min(Math.max(a, b), lo + EXHIBIT_LIMITS.maxStickers - 1);
    return Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i));
  }
  const let_ = t.match(/^([A-Z])\s*(?:-|–|—|to)\s*([A-Z])$/i);
  if (let_) {
    const a = let_[1].toUpperCase().charCodeAt(0), b = let_[2].toUpperCase().charCodeAt(0);
    return Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => String.fromCharCode(Math.min(a, b) + i));
  }
  return t
    .split(/[\n,]+/)
    .map((x) => x.trim().slice(0, 16))
    .filter(Boolean)
    .slice(0, EXHIBIT_LIMITS.maxStickers);
}

/**
 * Split pasted text into one exhibit description per non-empty line
 * (at most 300 lines, each at most 300 characters).
 *
 * @param {string} text
 * @returns {string[]}
 */
export function parseDescriptions(text) {
  return String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, EXHIBIT_LIMITS.maxExhibits)
    .map((l) => l.slice(0, EXHIBIT_LIMITS.maxDesc));
}

/**
 * @typedef {object} ExhibitRow
 * @property {string} no Exhibit identifier.
 * @property {string} description
 * @property {string} marked Blank, for entry in court.
 * @property {string} offered Blank, for entry in court.
 * @property {string} admitted Blank, for entry in court.
 */

/**
 * Build exhibit list rows: one numbered row per description.
 *
 * @param {{ descriptions: string[] | string, prefix?: string, numbering?: ExhibitNumbering, start?: number | string }} options
 *   `descriptions` may be an array or pasted text (one per line).
 * @returns {ExhibitRow[]}
 */
export function exhibitList({ descriptions, ...numbering }) {
  const list = Array.isArray(descriptions) ? descriptions.map((d) => String(d).trim()).filter(Boolean) : parseDescriptions(descriptions ?? "");
  const ids = exhibitIds(numbering, list.length);
  return list.map((description, i) => ({ no: ids[i], description, marked: "", offered: "", admitted: "" }));
}

function csvCell(v) {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Serialize exhibit rows as CSV (RFC 4180 quoting, CRLF line endings) with a
 * header row.
 *
 * @param {ExhibitRow[]} rows
 * @returns {string}
 */
export function exhibitListCsv(rows) {
  const lines = [EXHIBIT_LIST_COLUMNS, ...rows.map((r) => [r.no, r.description, r.marked, r.offered, r.admitted])];
  return lines.map((cells) => cells.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function mdCell(v) {
  return String(v).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * Serialize exhibit rows as a Markdown table.
 *
 * @param {ExhibitRow[]} rows
 * @returns {string}
 */
export function exhibitListMarkdown(rows) {
  const head = `| ${EXHIBIT_LIST_COLUMNS.join(" | ")} |`;
  const rule = `| ${EXHIBIT_LIST_COLUMNS.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${[r.no, r.description, r.marked, r.offered, r.admitted].map(mdCell).join(" | ")} |`);
  return [head, rule, ...body].join("\n") + "\n";
}
