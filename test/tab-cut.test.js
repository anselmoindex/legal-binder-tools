import { test } from "node:test";
import assert from "node:assert/strict";
import { cutOptions, recommendCut, tabLayout, workingLength, EDGES, WORKING_EDGE_IN } from "../index.js";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("working length is the edge less 1 inch of die margin", () => {
  assert.equal(workingLength(), WORKING_EDGE_IN);
  assert.equal(workingLength(EDGES.letter), 10);
  assert.equal(workingLength(EDGES.legal), 13);
  assert.equal(workingLength(EDGES.bottom), 7.5);
  assert.throws(() => workingLength(1), RangeError);
  assert.throws(() => workingLength("11"), RangeError);
});

test("cutOptions: banks, last bank and tab length", () => {
  const o = cutOptions(12);
  assert.equal(o.length, 8);
  const five = o.find((x) => x.cut === 5);
  assert.deepEqual({ ...five, tabIn: undefined }, { cut: 5, banks: 3, lastBank: 2, tabIn: undefined, exact: false });
  close(five.tabIn, 2);
  const six = o.find((x) => x.cut === 6);
  assert.equal(six.exact, true);
  assert.equal(six.lastBank, 6);
  // Ranked by banks, then longest tab.
  assert.deepEqual(o.map((x) => x.cut), [6, 7, 8, 9, 10, 4, 5, 3]);
});

test("a set smaller than the cut fits in one bank and counts as exact", () => {
  const o = cutOptions(2).find((x) => x.cut === 5);
  assert.equal(o.banks, 1);
  assert.equal(o.lastBank, 2);
  assert.equal(o.exact, true);
});

test("recommendCut picks the fewest banks with readable tabs", () => {
  assert.equal(recommendCut(12).cut, 6);
  assert.equal(recommendCut(5).cut, 5);
  assert.equal(recommendCut(3).cut, 3);
  assert.equal(recommendCut(1).cut, 3);
  assert.equal(recommendCut(20).cut, 10);
  const r = recommendCut(31);
  assert.equal(r.cut, 8);
  assert.equal(r.banks, 4);
});

test("recommendCut falls back when no tab reaches 1 inch", () => {
  // A 5" edge has 4" of working length: only 1/3 and 1/4 give tabs >= 1".
  const r = recommendCut(12, { edgeIn: 5 });
  assert.equal(r.cut, 4);
  const tiny = recommendCut(12, { edgeIn: 2, cuts: [5, 10] });
  assert.equal(tiny.cut, 10);
});

test("tabLayout gives each tab its bank, position and span", () => {
  const l = tabLayout(7, 5);
  assert.equal(l.banks, 2);
  assert.equal(l.lastBank, 2);
  assert.equal(l.workingIn, 10);
  close(l.tabIn, 2);
  assert.deepEqual(l.positions.map((p) => [p.tab, p.bank, p.position]), [
    [1, 1, 1], [2, 1, 2], [3, 1, 3], [4, 1, 4], [5, 1, 5], [6, 2, 1], [7, 2, 2],
  ]);
  close(l.positions[0].startIn, 0.5);
  close(l.positions[4].endIn, 10.5);
  close(l.positions[5].startIn, 0.5);
});

test("tabLayout on a legal edge", () => {
  const l = tabLayout(8, 8, { edgeIn: EDGES.legal });
  close(l.tabIn, 13 / 8);
  close(l.positions[7].endIn, 13.5);
});

test("tabLayout rejects bad input", () => {
  assert.throws(() => tabLayout(0, 5), RangeError);
  assert.throws(() => tabLayout(5, 0), RangeError);
  assert.throws(() => tabLayout(5, 2.5), RangeError);
  assert.throws(() => cutOptions(-1), RangeError);
});
