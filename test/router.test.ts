import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import test from "node:test";
import type { RpcMessage, RpcRequest } from "../src/protocol.js";
import { RpcRouter } from "../src/router.js";

class FakeAppServer extends EventEmitter {
  sent: RpcMessage[] = [];

  send(message: RpcMessage): void {
    this.sent.push(message);
  }
}

test("remaps client request IDs and restores them on responses", async () => {
  const appServer = new FakeAppServer();
  const router = new RpcRouter(appServer);
  router.connectClient();

  router.receiveFromClient({ id: 7, method: "account/read", params: { refreshToken: false } });
  const forwarded = appServer.sent[0] as RpcRequest;
  assert.equal(forwarded.method, "account/read");
  assert.match(String(forwarded.id), /^client:/);

  const responsePromise = once(router, "clientMessage");
  appServer.emit("response", { id: forwarded.id, result: { account: null } });
  const [response] = await responsePromise;
  assert.deepEqual(response, { id: 7, result: { account: null } });
});

test("routes server approval requests and restores their IDs", async () => {
  const appServer = new FakeAppServer();
  const router = new RpcRouter(appServer);
  router.connectClient();

  const requestPromise = once(router, "clientMessage");
  appServer.emit("request", {
    id: 44,
    method: "item/commandExecution/requestApproval",
    params: { command: "git status" },
  });
  const [request] = (await requestPromise) as [RpcRequest];
  assert.match(String(request.id), /^server:/);

  router.receiveFromClient({ id: request.id, result: { decision: "decline" } });
  assert.deepEqual(appServer.sent.at(-1), { id: 44, result: { decision: "decline" } });
});

test("fails server requests closed without an interactive client", () => {
  const appServer = new FakeAppServer();
  new RpcRouter(appServer);

  appServer.emit("request", {
    id: "approval-1",
    method: "item/fileChange/requestApproval",
    params: {},
  });
  assert.deepEqual(appServer.sent[0], {
    id: "approval-1",
    error: { code: -32000, message: "No interactive client connected; request denied" },
  });
});

test("rejects API-key login before it reaches app-server", async () => {
  const appServer = new FakeAppServer();
  const router = new RpcRouter(appServer);
  router.connectClient();
  const responsePromise = once(router, "clientMessage");

  router.receiveFromClient({
    id: 9,
    method: "account/login/start",
    params: { type: "apiKey", apiKey: "secret" },
  });

  const [response] = await responsePromise;
  assert.equal(appServer.sent.length, 0);
  assert.deepEqual(response, {
    id: 9,
    error: { code: -32602, message: "Only ChatGPT OAuth or ChatGPT device-code login is permitted" },
  });
});
