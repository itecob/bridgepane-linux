import assert from "node:assert/strict";
import test from "node:test";
import { parseRpcMessage } from "../src/protocol.js";

test("parses requests, notifications, and responses", () => {
  assert.deepEqual(parseRpcMessage('{"id":1,"method":"account/read","params":{}}'), {
    id: 1,
    method: "account/read",
    params: {},
  });
  assert.deepEqual(parseRpcMessage('{"method":"initialized"}'), { method: "initialized" });
  assert.deepEqual(parseRpcMessage('{"id":"a","result":{"ok":true}}'), {
    id: "a",
    result: { ok: true },
  });
});

test("rejects malformed messages", () => {
  assert.throws(() => parseRpcMessage("[]"), /JSON object/);
  assert.throws(() => parseRpcMessage('{"id":{},"method":"x"}'), /RPC id/);
  assert.throws(() => parseRpcMessage('{"hello":"world"}'), /Invalid RPC/);
});
