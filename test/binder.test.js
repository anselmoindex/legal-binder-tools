import { test } from "node:test";
import assert from "node:assert/strict";
import { binderPlan, sheetsAt, capacityChart, ROUND_FACTOR, D_FACTOR, PAPER } from "../index.js";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("sheetsAt matches the published chart figures", () => {
  assert.equal(sheetsAt(1, ROUND_FACTOR, PAPER[0].caliper), 182);
  assert.equal(sheetsAt(1, D_FACTOR, PAPER[0].caliper), 237);
  assert.equal(sheetsAt(1, ROUND_FACTOR, PAPER[1].caliper), 155);
  assert.equal(sheetsAt(3, D_FACTOR, PAPER[0].caliper), 712);
});

test("binderPlan: stack, headroom and ring picks", () => {
  const p = binderPlan({ sheets: 250, tabs: 10 });
  close(p.stack, 250 * 0.004 + 10 * 0.007);
  close(p.need, p.stack * 1.15);
  assert.equal(p.round.label, '2"');
  assert.equal(p.dRing.label, '1-1/2"');
});

test("binderPlan counts paper weight, tab stock and protectors", () => {
  const p = binderPlan({ sheets: 100, paper: "28", tabs: 5, tabStock: "poly", protectors: 20 });
  close(p.stack, 100 * 0.0058 + 5 * 0.015 + 20 * 0.006);
  assert.equal(p.paper.id, "28");
  assert.equal(p.tabStock.id, "poly");
});

test("binderPlan: an empty binder takes the smallest ring", () => {
  const p = binderPlan({ sheets: 0 });
  assert.equal(p.stack, 0);
  assert.equal(p.round.label, '1/2"');
  assert.equal(p.dRing.label, '1/2"');
});

test("binderPlan: a stack too thick for a round ring still gets a D-ring", () => {
  const p = binderPlan({ sheets: 600 });
  assert.equal(p.round, undefined);
  assert.equal(p.dRing.label, '3"');
});

test("binderPlan: a stack too thick for any ring", () => {
  const p = binderPlan({ sheets: 2000 });
  assert.equal(p.round, undefined);
  assert.equal(p.dRing, undefined);
});

test("binderPlan: exact boundary includes the ring", () => {
  // 1" D-ring holds 0.95"; need = stack * 1.15. Choose a stack whose need is just under it.
  const sheets = Math.floor(0.95 / 1.15 / 0.004);
  assert.equal(binderPlan({ sheets }).dRing.label, '1"');
  assert.equal(binderPlan({ sheets: sheets + 1 }).dRing.label, '1-1/2"');
});

test("binderPlan rejects bad input", () => {
  assert.throws(() => binderPlan({ sheets: -1 }), RangeError);
  assert.throws(() => binderPlan({ sheets: 10, paper: "32" }), RangeError);
  assert.throws(() => binderPlan({ sheets: 10, tabStock: "cardboard" }), RangeError);
  assert.throws(() => binderPlan({ sheets: NaN }), RangeError);
});

test("capacityChart: every ring, round cells blank above 3 inches", () => {
  const c = capacityChart();
  assert.equal(c.length, 7);
  assert.deepEqual(c[1], { size: 1, label: '1"', round: { 20: 182, 24: 155, 28: 125 }, dRing: { 20: 237, 24: 202, 28: 163 } });
  assert.equal(c[5].round["20"], null);
  assert.equal(c[6].dRing["20"], 1187);
});
