import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const bin = fileURLToPath(new URL("../bin/legal-binder-tools.js", import.meta.url));
const run = (...args) => execFileSync(process.execPath, [bin, ...args], { encoding: "utf8" });

test("cli bates", () => {
  assert.equal(run("bates", "--prefix", "ABC", "--start", "1", "--count", "3"), "ABC000001\nABC000002\nABC000003\n");
  assert.deepEqual(JSON.parse(run("bates", "--count", "2", "--digits", "2", "--json")), ["01", "02"]);
});

test("cli exhibits with a party", () => {
  assert.equal(run("exhibits", "--party", "Defendant's", "--numbering", "letters", "--count", "2"), "DEFENDANT'S EXHIBIT A\nDEFENDANT'S EXHIBIT B\n");
});

test("cli cut and binder", () => {
  assert.match(run("cut", "--tabs", "12"), /^Recommended: 1\/6 cut, 2 bank\(s\)/);
  assert.match(run("binder", "--sheets", "250", "--tabs", "10"), /D-ring: +1-1\/2"/);
});

test("cli reports errors with a non-zero exit", () => {
  const r = spawnSync(process.execPath, [bin, "bates"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--count is required/);
});
