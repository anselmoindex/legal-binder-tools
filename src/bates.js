/**
 * Bates numbering: format Bates labels and assign page ranges across a
 * production of several documents, continuing the count from one document to
 * the next.
 *
 * @module bates
 */

/** Input limits used by the Bates numbering tool. */
export const BATES_LIMITS = Object.freeze({
  maxFiles: 200,
  maxPrefix: 20,
  maxLabel: 40,
  minDigits: 1,
  maxDigits: 10,
});

/**
 * @typedef {object} BatesFormat
 * @property {string} [prefix=""] Text before the number, e.g. "SMITH".
 * @property {number} [digits=6] Zero-padding width, e.g. 6 gives 000001.
 * @property {string} [suffix=""] Text after the number, e.g. "-CONF".
 */

function checkInt(name, n, min) {
  if (!Number.isSafeInteger(n) || n < min) {
    throw new RangeError(`${name} must be an integer >= ${min} (got ${n})`);
  }
}

function checkFormat({ digits = 6 } = {}) {
  if (!Number.isInteger(digits) || digits < BATES_LIMITS.minDigits || digits > BATES_LIMITS.maxDigits) {
    throw new RangeError(`digits must be an integer from ${BATES_LIMITS.minDigits} to ${BATES_LIMITS.maxDigits} (got ${digits})`);
  }
}

/**
 * Format one Bates number.
 *
 * The number is zero-padded to `digits`. Padding never truncates: a number
 * wider than `digits` is printed in full (999999 + 1 at 6 digits is 1000000).
 *
 * @param {BatesFormat} format
 * @param {number} n The page number (integer >= 0).
 * @returns {string}
 * @example batesNumber({ prefix: "SMITH", digits: 6 }, 1) // "SMITH000001"
 */
export function batesNumber(format, n) {
  checkFormat(format);
  checkInt("n", n, 0);
  const { prefix = "", digits = 6, suffix = "" } = format;
  return `${prefix}${String(n).padStart(digits, "0")}${suffix}`;
}

/**
 * Generate `count` consecutive Bates numbers starting at `start`.
 *
 * @param {BatesFormat & { start?: number, count: number }} options
 * @returns {string[]}
 * @example batesSequence({ prefix: "ABC", start: 1, digits: 4, count: 3 })
 * // ["ABC0001", "ABC0002", "ABC0003"]
 */
export function batesSequence({ start = 1, count, ...format }) {
  checkInt("start", start, 0);
  checkInt("count", count, 0);
  checkFormat(format);
  return Array.from({ length: count }, (_, i) => batesNumber(format, start + i));
}

/**
 * @typedef {object} BatesRange
 * @property {string} name Document name as given.
 * @property {number} pages Page count of the document.
 * @property {number} firstNumber First page's number.
 * @property {number} lastNumber Last page's number.
 * @property {string} first First page's Bates label.
 * @property {string} last Last page's Bates label.
 * @property {string} fileName Suggested output file name, "FIRST-LAST name.pdf".
 */

/**
 * Assign Bates ranges to a list of documents in order. Each document starts
 * one number after the previous document's last page.
 *
 * @param {{ name: string, pages: number }[]} documents
 * @param {BatesFormat & { start?: number }} [options]
 * @returns {BatesRange[]}
 * @example
 * batesRanges([{ name: "Contract.pdf", pages: 3 }, { name: "Emails.pdf", pages: 2 }],
 *   { prefix: "SMITH", start: 1, digits: 6 })
 * // Contract.pdf: SMITH000001 - SMITH000003, Emails.pdf: SMITH000004 - SMITH000005
 */
export function batesRanges(documents, { start = 1, ...format } = {}) {
  checkInt("start", start, 0);
  checkFormat(format);
  let n = start;
  return documents.map(({ name, pages }) => {
    checkInt(`pages for "${name}"`, pages, 1);
    const firstNumber = n;
    const lastNumber = n + pages - 1;
    n = lastNumber + 1;
    const first = batesNumber(format, firstNumber);
    const last = batesNumber(format, lastNumber);
    const base = String(name).replace(/\.pdf$/i, "");
    return { name, pages, firstNumber, lastNumber, first, last, fileName: `${first}-${last} ${base}.pdf` };
  });
}
