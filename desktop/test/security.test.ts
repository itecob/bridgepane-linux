import assert from "node:assert/strict";
import test from "node:test";
import { isOfficialOpenAiUrl, isTrustedChatGptNavigation } from "../main/security.js";

test("accepts exact OpenAI hosts and their subdomains over HTTPS", () => {
  assert.equal(isOfficialOpenAiUrl("https://chatgpt.com/"), true);
  assert.equal(isOfficialOpenAiUrl("https://auth.openai.com/oauth"), true);
  assert.equal(isOfficialOpenAiUrl("http://chatgpt.com/"), false);
});

test("rejects lookalike, credential, and non-HTTPS URLs", () => {
  assert.equal(isOfficialOpenAiUrl("https://chatgpt.com.evil.example/"), false);
  assert.equal(isOfficialOpenAiUrl("https://chatgpt.com@evil.example/"), false);
  assert.equal(isOfficialOpenAiUrl("javascript:alert(1)"), false);
});

test("permits only explicit identity providers during ChatGPT navigation", () => {
  assert.equal(isTrustedChatGptNavigation("https://accounts.google.com/signin"), true);
  assert.equal(isTrustedChatGptNavigation("https://login.microsoftonline.com/common"), true);
  assert.equal(isTrustedChatGptNavigation("https://accounts.google.com.evil.example/"), false);
  assert.equal(isTrustedChatGptNavigation("https://github.com/login"), false);
});
