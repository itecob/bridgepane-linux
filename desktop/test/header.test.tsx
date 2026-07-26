import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { cleanup, fireEvent, render } from "@testing-library/react";

test("mode switch keeps both labels visible and selects Codex", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://local.invalid/" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
  });
  const { Header } = await import("../renderer/src/App.js");
  let selected = "";
  const rendered = render(<Header mode="codex" setMode={(mode) => { selected = mode; }} openPlugins={() => undefined} />);
  const chatGpt = rendered.getByRole("button", { name: "ChatGPT" });
  const codex = rendered.getByRole("button", { name: "Codex" });
  assert.equal(chatGpt.textContent, "ChatGPT");
  assert.equal(codex.textContent, "Codex");
  assert.equal(codex.classList.contains("active"), true);
  assert.equal(chatGpt.classList.contains("active"), false);
  fireEvent.click(chatGpt);
  assert.equal(selected, "chatgpt");
  cleanup();
  dom.window.close();
});
