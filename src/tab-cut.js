/**
 * Index tab cut math.
 *
 * A "1/N cut" divides the tabbed edge of a divider into N tab positions. The
 * tabs cascade down the edge, one position per divider; after N dividers the
 * pattern starts again at the top. Each run of N positions is a "bank".
 *
 * Tabs are not spread over the whole edge: the die needs 1.0" of margin in
 * total (0.5" at each end), so an 11" letter edge has a 10" working length,
 * a 14" legal edge 13", and an 8.5" bottom edge 7.5".
 *
 * @module tab-cut
 */

/** Cuts the calculator compares when recommending a cut. */
export const STANDARD_CUTS = Object.freeze([3, 4, 5, 6, 7, 8, 9, 10]);

/** Total die margin along the tabbed edge, in inches (half at each end). */
export const DIE_MARGIN_IN = 1.0;

/** How far the tab sticks out past the sheet, in inches. */
export const TAB_EXTENSION_IN = 0.5;

/** Working length of the binding edge on a letter-size (11") side-tab divider, in inches. */
export const WORKING_EDGE_IN = 10;

/** Common tabbed edges, in inches. */
export const EDGES = Object.freeze({
  letter: 11, // 8.5 x 11, side tabs
  legal: 14, // 8.5 x 14, side tabs
  bottom: 8.5, // 8.5 x 11, tabs on the bottom edge
});

/**
 * Working length of a tabbed edge: the edge less the die margin.
 *
 * @param {number} [edgeIn=11]
 * @returns {number}
 */
export function workingLength(edgeIn = EDGES.letter) {
  if (!(typeof edgeIn === "number" && edgeIn > DIE_MARGIN_IN)) {
    throw new RangeError(`edge must be a number of inches greater than ${DIE_MARGIN_IN} (got ${edgeIn})`);
  }
  return edgeIn - DIE_MARGIN_IN;
}

function checkPositive(name, n) {
  if (!Number.isSafeInteger(n) || n < 1) throw new RangeError(`${name} must be an integer >= 1 (got ${n})`);
}

/**
 * @typedef {object} CutOption
 * @property {number} cut Positions per bank (the N in 1/N).
 * @property {number} banks Number of banks needed.
 * @property {number} lastBank Tabs in the final bank.
 * @property {number} tabIn Length of each tab along the edge, in inches.
 * @property {boolean} exact True when every bank is full (or everything fits in one bank).
 */

/**
 * Compare the standard cuts for a set of `tabs` tabs, ranked by fewest banks
 * and then by the longest tabs.
 *
 * @param {number} tabs Tabs in the set.
 * @param {{ edgeIn?: number, cuts?: number[] }} [options]
 * @returns {CutOption[]}
 */
export function cutOptions(tabs, { edgeIn = EDGES.letter, cuts = STANDARD_CUTS } = {}) {
  checkPositive("tabs", tabs);
  const work = workingLength(edgeIn);
  const opts = cuts.map((cut) => {
    checkPositive("cut", cut);
    const banks = Math.ceil(tabs / cut);
    return {
      cut,
      banks,
      lastBank: tabs - cut * (banks - 1),
      tabIn: work / cut,
      exact: tabs % cut === 0 || tabs <= cut,
    };
  });
  return opts.sort((a, b) => a.banks - b.banks || b.tabIn - a.tabIn);
}

/**
 * Recommend a cut: the fewest banks among cuts whose tabs are at least 1"
 * long, preferring a cut that fills its banks exactly.
 *
 * @param {number} tabs
 * @param {{ edgeIn?: number, cuts?: number[] }} [options]
 * @returns {CutOption}
 * @example recommendCut(12) // { cut: 6, banks: 2, lastBank: 6, tabIn: 1.666..., exact: true }
 */
export function recommendCut(tabs, options) {
  const opts = cutOptions(tabs, options);
  const readable = opts.filter((o) => o.tabIn >= 1);
  const pool = readable.length ? readable : opts;
  const exact = pool.filter((o) => o.exact && o.banks === pool[0].banks);
  return exact[0] ?? pool[0];
}

/**
 * @typedef {object} TabPosition
 * @property {number} tab 1-based tab number in the set.
 * @property {number} bank 1-based bank number.
 * @property {number} position 1-based position within the bank (1 = top of the edge).
 * @property {number} startIn Distance from the top of the edge to the start of the tab, in inches.
 * @property {number} endIn Distance from the top of the edge to the end of the tab, in inches.
 * @property {number} tabIn Tab length, in inches.
 */

/**
 * Lay out every tab of a set: its bank, its position in the bank, and where
 * it falls along the edge (measured from the top end of the tabbed edge).
 *
 * @param {number} tabs Tabs in the set.
 * @param {number} cut Positions per bank (the N in 1/N).
 * @param {{ edgeIn?: number }} [options]
 * @returns {{ cut: number, tabs: number, banks: number, lastBank: number, edgeIn: number, workingIn: number, tabIn: number, positions: TabPosition[] }}
 */
export function tabLayout(tabs, cut, { edgeIn = EDGES.letter } = {}) {
  checkPositive("tabs", tabs);
  checkPositive("cut", cut);
  const workingIn = workingLength(edgeIn);
  const tabIn = workingIn / cut;
  const top = (edgeIn - workingIn) / 2;
  const banks = Math.ceil(tabs / cut);
  const positions = Array.from({ length: tabs }, (_, i) => {
    const position = (i % cut) + 1;
    const startIn = top + (position - 1) * tabIn;
    return { tab: i + 1, bank: Math.floor(i / cut) + 1, position, startIn, endIn: startIn + tabIn, tabIn };
  });
  return { cut, tabs, banks, lastBank: tabs - cut * (banks - 1), edgeIn, workingIn, tabIn, positions };
}
