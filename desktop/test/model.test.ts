import assert from "node:assert/strict";
import test from "node:test";
import { initialCodexState, reduceRpc, threadsFromResponse } from "../renderer/src/model.js";

test("thread list responses are normalized", () => {
  assert.deepEqual(threadsFromResponse({ data: [{ id: "t1", name: "Build it", cwd: "/work" }] }), [
    { id: "t1", name: "Build it", preview: "Build it", cwd: "/work" },
  ]);
});

test("agent deltas accumulate into one timeline entry", () => {
  const first = reduceRpc(initialCodexState, { method: "item/agentMessage/delta", params: { itemId: "a", delta: "Hello" } });
  const second = reduceRpc(first, { method: "item/agentMessage/delta", params: { itemId: "a", delta: " world" } });
  assert.equal(second.timeline[0]?.body, "Hello world");
});

test("server requests become explicit approval cards", () => {
  const next = reduceRpc(initialCodexState, { id: "server:1", method: "item/commandExecution/requestApproval", params: {} });
  assert.equal(next.approvals.length, 1);
});
