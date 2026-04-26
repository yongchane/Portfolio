import test from "node:test";
import assert from "node:assert/strict";

import { normalizeStringArray } from "./ingest-core.mjs";

test("normalizeStringArray converts a string into a single-item array", () => {
  assert.deepEqual(normalizeStringArray("daily").map((item) => item), ["daily"]);
});

test("normalizeStringArray trims array items and removes blanks", () => {
  assert.deepEqual(normalizeStringArray(["  planning  ", "", "done"]), ["planning", "done"]);
});
