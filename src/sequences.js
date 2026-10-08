/**
 * Label sequences for tab sets and exhibits: numbers, letters
 * (spreadsheet-column style: A..Z, AA, AB, ...), Roman numerals and months.
 *
 * @module sequences
 */

/** @typedef {"numbers" | "letters" | "roman" | "months"} SequenceStyle */

/** The styles {@link generateSequence} accepts. */
export const SEQUENCE_STYLES = Object.freeze(["numbers", "letters", "roman", "months"]);

export const MONTHS = Object.freeze([
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]);

const ROMAN = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

/**
 * Convert a number to Roman numerals.
 *
 * Roman numerals have no zero or negatives, so values below 1 are clamped to 1
 * ("I"). Values are floored. There is no upper cap: 4000 and above repeat "M"
 * (4000 is "MMMM"), since standard notation stops at 3999 (MMMCMXCIX).
 *
 * @param {number} num
 * @returns {string}
 * @example toRoman(14) // "XIV"
 */
export function toRoman(num) {
  let n = Math.max(1, Math.floor(Number(num) || 0));
  let out = "";
  for (const [v, r] of ROMAN) {
    while (n >= v) {
      out += r;
      n -= v;
    }
  }
  return out;
}

/**
 * Convert a 1-based number to letters, spreadsheet-column style:
 * 1 is A, 26 is Z, 27 is AA, 28 is AB, 702 is ZZ, 703 is AAA.
 * Values below 1 are clamped to 1 ("A").
 *
 * @param {number} num
 * @returns {string}
 */
export function toLetters(num) {
  let n = Math.max(1, Math.floor(Number(num) || 0));
  let out = "";
  while (n > 0) {
    n--;
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

/**
 * Inverse of {@link toLetters}: "A" is 1, "Z" is 26, "AA" is 27.
 * Case-insensitive. Anything that is not letters A-Z returns 1.
 *
 * @param {string} s
 * @returns {number}
 */
export function lettersToIndex(s) {
  let n = 0;
  for (const c of String(s).trim().toUpperCase()) {
    if (c < "A" || c > "Z") return 1;
    n = n * 26 + (c.charCodeAt(0) - 64);
  }
  return n || 1;
}

/**
 * Generate `count` labels of a style, starting at `start`.
 *
 * `start` is read per style: a number for "numbers" and "roman" (default 1),
 * a letter run such as "C" or "AA" for "letters", or a month name or prefix
 * such as "Jan" for "months" (months wrap from December to January).
 *
 * @param {SequenceStyle} style
 * @param {string | number} start
 * @param {number} count
 * @returns {string[]}
 * @example generateSequence("letters", "Y", 4) // ["Y", "Z", "AA", "AB"]
 */
export function generateSequence(style, start, count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const s = String(start ?? "");
  switch (style) {
    case "numbers": {
      const first = Math.floor(Number(s)) || 1;
      return Array.from({ length: n }, (_, i) => String(first + i));
    }
    case "letters": {
      const first = lettersToIndex(s);
      return Array.from({ length: n }, (_, i) => toLetters(first + i));
    }
    case "roman": {
      const first = Math.floor(Number(s)) || 1;
      return Array.from({ length: n }, (_, i) => toRoman(first + i));
    }
    case "months": {
      const q = s.trim().toLowerCase();
      let first = MONTHS.findIndex((m) => m.toLowerCase().startsWith(q));
      if (first < 0 || !q) first = 0;
      return Array.from({ length: n }, (_, i) => MONTHS[(first + i) % 12]);
    }
    default:
      throw new TypeError(`unknown style "${style}"; expected one of ${SEQUENCE_STYLES.join(", ")}`);
  }
}
