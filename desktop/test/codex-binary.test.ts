import assert from "node:assert/strict";
import test from "node:test";
import { compareVersions, MINIMUM_CODEX_VERSION } from "../main/codex-binary.js";

test("Codex compatibility baseline is ordered semantically", () => {
  assert.equal(MINIMUM_CODEX_VERSION, "0.145.0");
  assert.equal(compareVersions("0.145.0", "0.145.0"), 0);
  assert.equal(compareVersions("0.146.0", "0.145.9"), 1);
  assert.equal(compareVersions("0.99.0", "0.145.0"), -1);
  assert.equal(compareVersions("1.0.0", "0.999.999"), 1);
});
