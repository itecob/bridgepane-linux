import assert from "node:assert/strict";
import test from "node:test";
import { codexChildEnvironment } from "../src/config.js";
import { validateClientRequest } from "../src/policy.js";

test("permits ChatGPT OAuth login methods", () => {
  assert.doesNotThrow(() =>
    validateClientRequest({ id: 1, method: "account/login/start", params: { type: "chatgpt" } }),
  );
  assert.doesNotThrow(() =>
    validateClientRequest({ id: 2, method: "account/login/start", params: { type: "chatgptDeviceCode" } }),
  );
});

test("rejects API keys and externally supplied ChatGPT tokens", () => {
  assert.throws(
    () =>
      validateClientRequest({
        id: 1,
        method: "account/login/start",
        params: { type: "apiKey", apiKey: "secret" },
      }),
    /Only ChatGPT OAuth/,
  );
  assert.throws(
    () =>
      validateClientRequest({
        id: 2,
        method: "account/login/start",
        params: { type: "chatgptAuthTokens", accessToken: "secret", chatgptAccountId: "account" },
      }),
    /Only ChatGPT OAuth/,
  );
});

test("reserves initialize for the bridge", () => {
  assert.throws(() => validateClientRequest({ id: 1, method: "initialize", params: {} }), /owned/);
});

test("removes API and automation credentials from the Codex child", () => {
  assert.deepEqual(
    codexChildEnvironment({
      PATH: "/usr/bin",
      OPENAI_API_KEY: "api-secret",
      CODEX_ACCESS_TOKEN: "automation-secret",
      SAFE_VALUE: "kept",
    }),
    { PATH: "/usr/bin", SAFE_VALUE: "kept" },
  );
});
