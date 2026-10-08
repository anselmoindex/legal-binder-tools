import { test } from "node:test";
import assert from "node:assert/strict";
import {
  letterFor, exhibitIds, exhibitHeading, exhibitLabel, defaultStampColor,
  expandStickerLabels, parseDescriptions, exhibitList, exhibitListCsv, exhibitListMarkdown, EXHIBIT_LIMITS,
} from "../index.js";

test("letterFor is zero-based and rolls over past Z", () => {
  assert.equal(letterFor(0), "A");
  assert.equal(letterFor(25), "Z");
  assert.equal(letterFor(26), "AA");
  assert.equal(letterFor(27), "AB");
  assert.equal(letterFor(701), "ZZ");
  assert.equal(letterFor(702), "AAA");
});

test("exhibitIds: numbers, letters, roman, prefix", () => {
  assert.deepEqual(exhibitIds({}, 3), ["1", "2", "3"]);
  assert.deepEqual(exhibitIds({ prefix: "PX-", start: 101 }, 2), ["PX-101", "PX-102"]);
  assert.deepEqual(exhibitIds({ numbering: "numbers", start: 0 }, 2), ["0", "1"]);
  assert.deepEqual(exhibitIds({ numbering: "letters" }, 3), ["A", "B", "C"]);
  assert.deepEqual(exhibitIds({ numbering: "letters", start: "Z" }, 3), ["Z", "AA", "AB"]);
  assert.deepEqual(exhibitIds({ numbering: "letters", start: 27 }, 1), ["AA"]);
  assert.deepEqual(exhibitIds({ numbering: "roman", start: 3 }, 3), ["III", "IV", "V"]);
  assert.equal(exhibitIds({ numbering: "letters" }, 28).at(-1), "AB");
  assert.deepEqual(exhibitIds({}, 0), []);
});

test("exhibitIds rejects bad options", () => {
  assert.throws(() => exhibitIds({ numbering: "greek" }, 1), TypeError);
  assert.throws(() => exhibitIds({ numbering: "roman", start: 0 }, 1), RangeError);
  assert.throws(() => exhibitIds({ start: -1 }, 1), RangeError);
});

test("exhibit headings and labels", () => {
  assert.equal(exhibitHeading("Plaintiff's"), "PLAINTIFF'S EXHIBIT");
  assert.equal(exhibitHeading("Deposition"), "DEPOSITION EXHIBIT");
  assert.equal(exhibitHeading("Joint Exhibit"), "JOINT EXHIBIT");
  assert.equal(exhibitHeading(""), "EXHIBIT");
  assert.equal(exhibitHeading(), "EXHIBIT");
  assert.equal(exhibitLabel("Plaintiff's", "12"), "PLAINTIFF'S EXHIBIT 12");
  assert.equal(exhibitLabel("Defendant's", "A"), "DEFENDANT'S EXHIBIT A");
});

test("defaultStampColor follows the party", () => {
  assert.equal(defaultStampColor("Plaintiff's"), "Yellow");
  assert.equal(defaultStampColor("Petitioner's"), "Yellow");
  assert.equal(defaultStampColor("Defendant's"), "Blue");
  assert.equal(defaultStampColor("Respondent's"), "Blue");
  assert.equal(defaultStampColor("Joint"), "White");
});

test("expandStickerLabels: numeric ranges", () => {
  assert.deepEqual(expandStickerLabels("1-3"), ["1", "2", "3"]);
  assert.deepEqual(expandStickerLabels("101 to 103"), ["101", "102", "103"]);
  assert.deepEqual(expandStickerLabels("5 – 3"), ["3", "4", "5"]);
  assert.equal(expandStickerLabels("1-9999").length, EXHIBIT_LIMITS.maxStickers);
  assert.equal(expandStickerLabels("1-9999").at(-1), "500");
});

test("expandStickerLabels: letter ranges and lists", () => {
  assert.deepEqual(expandStickerLabels("a-d"), ["A", "B", "C", "D"]);
  assert.deepEqual(expandStickerLabels("C to A"), ["A", "B", "C"]);
  assert.equal(expandStickerLabels("A-Z").length, 26);
  assert.deepEqual(expandStickerLabels("1A, 1B,\n2 ,,"), ["1A", "1B", "2"]);
  assert.deepEqual(expandStickerLabels("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), ["ABCDEFGHIJKLMNOP"]);
  assert.deepEqual(expandStickerLabels(""), []);
});

test("parseDescriptions keeps non-empty lines within limits", () => {
  assert.deepEqual(parseDescriptions("  one \r\n\n two\n"), ["one", "two"]);
  const many = Array.from({ length: 400 }, (_, i) => `doc ${i}`).join("\n");
  assert.equal(parseDescriptions(many).length, EXHIBIT_LIMITS.maxExhibits);
  assert.equal(parseDescriptions("x".repeat(500))[0].length, EXHIBIT_LIMITS.maxDesc);
});

test("exhibitList numbers each description", () => {
  const rows = exhibitList({ descriptions: ["Contract", " ", "Invoice"], prefix: "DX-", numbering: "letters" });
  assert.deepEqual(rows, [
    { no: "DX-A", description: "Contract", marked: "", offered: "", admitted: "" },
    { no: "DX-B", description: "Invoice", marked: "", offered: "", admitted: "" },
  ]);
  assert.equal(exhibitList({ descriptions: "a\nb\nc", start: 10 }).at(-1).no, "12");
});

test("exhibitListCsv quotes commas, quotes and newlines", () => {
  const csv = exhibitListCsv([
    { no: "1", description: 'Email "re: delivery", 4/2/24', marked: "", offered: "", admitted: "" },
    { no: "2", description: "line one\nline two", marked: "", offered: "", admitted: "" },
  ]);
  assert.equal(
    csv,
    'No.,Description,Marked,Offered,Admitted\r\n1,"Email ""re: delivery"", 4/2/24",,,\r\n2,"line one\nline two",,,\r\n',
  );
  assert.equal(exhibitListCsv([]), "No.,Description,Marked,Offered,Admitted\r\n");
});

test("exhibitListMarkdown escapes pipes", () => {
  const md = exhibitListMarkdown([{ no: "1", description: "Invoice 1043 | unpaid", marked: "", offered: "", admitted: "" }]);
  assert.equal(
    md,
    "| No. | Description | Marked | Offered | Admitted |\n| --- | --- | --- | --- | --- |\n| 1 | Invoice 1043 \\| unpaid |  |  |  |\n",
  );
});
