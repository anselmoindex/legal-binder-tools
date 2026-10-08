import { test } from "node:test";
import assert from "node:assert/strict";
import { batesNumber, batesSequence, batesRanges, BATES_LIMITS } from "../index.js";

test("batesNumber pads, prefixes and suffixes", () => {
  assert.equal(batesNumber({ prefix: "SMITH", digits: 6 }, 1), "SMITH000001");
  assert.equal(batesNumber({ prefix: "ABC", digits: 4, suffix: "-CONF" }, 42), "ABC0042-CONF");
  assert.equal(batesNumber({}, 7), "000007");
});

test("batesNumber never truncates a number wider than the padding", () => {
  assert.equal(batesNumber({ prefix: "X", digits: 3 }, 999), "X999");
  assert.equal(batesNumber({ prefix: "X", digits: 3 }, 1000), "X1000");
  assert.equal(batesNumber({ digits: 1 }, 123456), "123456");
});

test("batesNumber accepts zero and the digit limits", () => {
  assert.equal(batesNumber({ digits: 1 }, 0), "0");
  assert.equal(batesNumber({ digits: BATES_LIMITS.maxDigits }, 5), "0000000005");
});

test("batesNumber rejects bad input", () => {
  assert.throws(() => batesNumber({ digits: 0 }, 1), RangeError);
  assert.throws(() => batesNumber({ digits: 11 }, 1), RangeError);
  assert.throws(() => batesNumber({ digits: 2.5 }, 1), RangeError);
  assert.throws(() => batesNumber({}, -1), RangeError);
  assert.throws(() => batesNumber({}, 1.5), RangeError);
});

test("batesSequence generates consecutive labels", () => {
  assert.deepEqual(batesSequence({ prefix: "ABC", start: 1, digits: 4, count: 3 }), ["ABC0001", "ABC0002", "ABC0003"]);
  assert.deepEqual(batesSequence({ start: 99, digits: 2, count: 3 }), ["99", "100", "101"]);
  assert.deepEqual(batesSequence({ count: 0 }), []);
  assert.throws(() => batesSequence({ count: -1 }), RangeError);
});

test("batesRanges continues the count across documents", () => {
  const r = batesRanges(
    [{ name: "Contract.pdf", pages: 3 }, { name: "Emails.PDF", pages: 2 }, { name: "Photo", pages: 1 }],
    { prefix: "SMITH", start: 1, digits: 6 },
  );
  assert.deepEqual(r.map((x) => [x.first, x.last]), [
    ["SMITH000001", "SMITH000003"],
    ["SMITH000004", "SMITH000005"],
    ["SMITH000006", "SMITH000006"],
  ]);
  assert.deepEqual(r.map((x) => [x.firstNumber, x.lastNumber]), [[1, 3], [4, 5], [6, 6]]);
  assert.equal(r[0].fileName, "SMITH000001-SMITH000003 Contract.pdf");
  assert.equal(r[1].fileName, "SMITH000004-SMITH000005 Emails.pdf");
  assert.equal(r[2].fileName, "SMITH000006-SMITH000006 Photo.pdf");
});

test("batesRanges handles an empty list and rejects empty documents", () => {
  assert.deepEqual(batesRanges([]), []);
  assert.throws(() => batesRanges([{ name: "a", pages: 0 }]), RangeError);
});
