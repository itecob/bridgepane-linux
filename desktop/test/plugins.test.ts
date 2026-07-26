import assert from "node:assert/strict";
import test from "node:test";
import { assertMarketplaceSource, assertPluginName, normalizePlugins } from "../main/plugins.js";

test("plugin names accept registry and scoped identifiers", () => {
  assert.equal(assertPluginName("github/yeet"), "github/yeet");
  assert.equal(assertPluginName("@team/plugin-name"), "@team/plugin-name");
});

test("plugin names reject shell syntax and empty input", () => {
  assert.throws(() => assertPluginName(""));
  assert.throws(() => assertPluginName("plugin; touch nope"));
  assert.throws(() => assertPluginName("plugin\nnext"));
});

test("marketplace sources reject control characters", () => {
  assert.equal(assertMarketplaceSource("https://github.com/example/plugins"), "https://github.com/example/plugins");
  assert.throws(() => assertMarketplaceSource("https://example.test/a\n--flag"));
});

test("current Codex plugin list JSON merges installed and available plugins", () => {
  const plugins = normalizePlugins({
    installed: [{ pluginId: "github@openai-curated", name: "github", marketplaceName: "openai-curated", installed: true }],
    available: [{ pluginId: "linear@openai-curated", name: "linear", marketplaceName: "openai-curated", installed: false }],
  });
  assert.deepEqual(plugins, [
    { name: "github@openai-curated", installed: true, source: "openai-curated" },
    { name: "linear@openai-curated", installed: false, source: "openai-curated" },
  ]);
});
