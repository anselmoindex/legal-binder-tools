import { test } from "node:test";
import assert from "node:assert/strict";
import { toRoman, toLetters, lettersToIndex, generateSequence } from "../index.js";

test("toRoman converts standard values", () => {
  const cases = { 1: "I", 4: "IV", 9: "IX", 14: "XIV", 40: "XL", 90: "XC", 400: "CD", 1994: "MCMXCIV", 2026: "MMXXVI" };
  for (const [n, r] of Object.entries(cases)) assert.equal(toRoman(Number(n)), r);
});

test("toRoman limits: clamps below 1, standard max is 3999, no cap above", () => {
  assert.equal(toRoman(0), "I");
  assert.equal(toRoman(-5), "I");
  assert.equal(toRoman(NaN), "I");
  assert.equal(toRoman(3.9), "III");
  assert.equal(toRoman(3999), "MMMCMXCIX");
  assert.equal(toRoman(4000), "MMMM");
});

test("toLetters rolls over past Z", () => {
  assert.equal(toLetters(1), "A");
  assert.equal(toLetters(26), "Z");
  assert.equal(toLetters(27), "AA");
  assert.equal(toLetters(28), "AB");
  assert.equal(toLetters(52), "AZ");
  assert.equal(toLetters(53), "BA");
  assert.equal(toLetters(702), "ZZ");
  assert.equal(toLetters(703), "AAA");
  assert.equal(toLetters(0), "A");
});

test("lettersToIndex inverts toLetters", () => {
  for (const n of [1, 26, 27, 52, 702, 703, 18278]) assert.equal(lettersToIndex(toLetters(n)), n);
  assert.equal(lettersToIndex("aa"), 27);
  assert.equal(lettersToIndex(" c "), 3);
  assert.equal(lettersToIndex("A1"), 1);
  assert.equal(lettersToIndex(""), 1);
});

test("generateSequence for each style", () => {
  assert.deepEqual(generateSequence("numbers", "101", 3), ["101", "102", "103"]);
  assert.deepEqual(generateSequence("numbers", "", 2), ["1", "2"]);
  assert.deepEqual(generateSequence("letters", "Y", 4), ["Y", "Z", "AA", "AB"]);
  assert.deepEqual(generateSequence("roman", 8, 3), ["VIII", "IX", "X"]);
  assert.deepEqual(generateSequence("months", "nov", 3), ["November", "December", "January"]);
  assert.deepEqual(generateSequence("months", "xyz", 1), ["January"]);
  assert.deepEqual(generateSequence("letters", "A", 0), []);
  assert.deepEqual(generateSequence("numbers", 1, -3), []);
  assert.throws(() => generateSequence("emoji", 1, 1), TypeError);
});
