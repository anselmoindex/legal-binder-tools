/**
 * Binder size: from sheets, tab dividers and sheet protectors to a stack
 * thickness and the smallest ring that holds it.
 *
 * Calipers are typical trade values; paper varies by mill and humidity, so a
 * ring is recommended only if it holds the stack plus 15% headroom. A round
 * ring holds about 73% of its nominal size before pages drag on the curve; a
 * D-ring's flat side carries about 95%.
 *
 * @module binder
 */

/** Paper calipers (inches per sheet). */
export const PAPER = Object.freeze([
  { id: "20", label: "20# bond (everyday copy paper)", caliper: 0.004 },
  { id: "24", label: "24# bond (heavier letterhead)", caliper: 0.0047 },
  { id: "28", label: "28# bond (premium/laser)", caliper: 0.0058 },
]);

/** Tab divider calipers (inches per divider). */
export const TAB_STOCK = Object.freeze([
  { id: "90", label: "90# index (standard paper tabs)", caliper: 0.007 },
  { id: "110", label: "110# index (heavy paper tabs)", caliper: 0.0085 },
  { id: "poly", label: ".015 poly (plastic tabs)", caliper: 0.015 },
]);

/** Nominal ring sizes. Round rings are listed only up to 3". */
export const RINGS = Object.freeze([
  { size: 0.5, label: '1/2"', round: true, d: true },
  { size: 1, label: '1"', round: true, d: true },
  { size: 1.5, label: '1-1/2"', round: true, d: true },
  { size: 2, label: '2"', round: true, d: true },
  { size: 3, label: '3"', round: true, d: true },
  { size: 4, label: '4"', round: false, d: true },
  { size: 5, label: '5"', round: false, d: true },
]);

/** Usable fraction of a round ring's nominal size. */
export const ROUND_FACTOR = 0.73;
/** Usable fraction of a D-ring's nominal size. */
export const D_FACTOR = 0.95;
/** Headroom multiplier: a ring must hold the stack plus 15%. */
export const HEADROOM = 1.15;
/** Thickness added by one loaded sheet protector, in inches. */
export const PROTECTOR_CALIPER = 0.006;

function findById(list, id, name) {
  const hit = list.find((x) => x.id === String(id));
  if (!hit) throw new RangeError(`unknown ${name} "${id}"; expected one of ${list.map((x) => x.id).join(", ")}`);
  return hit;
}

function checkCount(name, n) {
  if (!Number.isFinite(n) || n < 0) throw new RangeError(`${name} must be a number >= 0 (got ${n})`);
}

/**
 * @typedef {object} BinderPlan
 * @property {{ id: string, label: string, caliper: number }} paper
 * @property {{ id: string, label: string, caliper: number }} tabStock
 * @property {number} stack Stack thickness, in inches.
 * @property {number} need Stack thickness with headroom, in inches.
 * @property {(typeof RINGS)[number] | undefined} round Smallest round ring that fits, if any.
 * @property {(typeof RINGS)[number] | undefined} dRing Smallest D-ring that fits, if any.
 */

/**
 * Compute stack thickness and recommended ring sizes.
 *
 * `sheets` counts physical sheets of paper (a sheet printed on both sides is
 * one sheet). Sheet protectors add their own thickness on top of the sheets
 * loaded in them.
 *
 * @param {{ sheets: number, paper?: string, tabs?: number, tabStock?: string, protectors?: number }} input
 * @returns {BinderPlan}
 * @example binderPlan({ sheets: 250, tabs: 10 }).dRing.label // '1-1/2"'
 */
export function binderPlan({ sheets, paper = "20", tabs = 0, tabStock = "90", protectors = 0 }) {
  checkCount("sheets", sheets);
  checkCount("tabs", tabs);
  checkCount("protectors", protectors);
  const p = findById(PAPER, paper, "paper");
  const t = findById(TAB_STOCK, tabStock, "tab stock");
  const stack = sheets * p.caliper + tabs * t.caliper + protectors * PROTECTOR_CALIPER;
  const need = stack * HEADROOM;
  return {
    paper: p,
    tabStock: t,
    stack,
    need,
    round: RINGS.find((g) => g.round && g.size * ROUND_FACTOR >= need),
    dRing: RINGS.find((g) => g.d && g.size * D_FACTOR >= need),
  };
}

/**
 * How many sheets of one caliper fit in a ring.
 *
 * @param {number} sizeIn Nominal ring size, in inches.
 * @param {number} factor {@link ROUND_FACTOR} or {@link D_FACTOR}.
 * @param {number} caliper Sheet caliper, in inches.
 * @returns {number}
 * @example sheetsAt(1, ROUND_FACTOR, 0.004) // 182
 */
export function sheetsAt(sizeIn, factor, caliper) {
  return Math.floor((sizeIn * factor) / caliper);
}

/**
 * The binder capacity chart: sheets per ring size for each paper weight, in
 * round and D-ring. Round-ring cells are null above 3".
 *
 * @returns {{ size: number, label: string, round: Record<string, number | null>, dRing: Record<string, number> }[]}
 */
export function capacityChart() {
  return RINGS.map((r) => ({
    size: r.size,
    label: r.label,
    round: Object.fromEntries(PAPER.map((p) => [p.id, r.round ? sheetsAt(r.size, ROUND_FACTOR, p.caliper) : null])),
    dRing: Object.fromEntries(PAPER.map((p) => [p.id, sheetsAt(r.size, D_FACTOR, p.caliper)])),
  }));
}
