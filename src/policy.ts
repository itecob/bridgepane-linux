import { isRecord, type RpcRequest } from "./protocol.js";

export class PolicyError extends Error {
  readonly code = -32602;
}

const BROKER_OWNED_METHODS = new Set(["initialize"]);

export function validateClientRequest(request: RpcRequest): void {
  if (BROKER_OWNED_METHODS.has(request.method)) {
    throw new PolicyError(`Method ${request.method} is owned by the local bridge`);
  }

  if (request.method !== "account/login/start") return;
  if (!isRecord(request.params)) {
    throw new PolicyError("account/login/start requires an object payload");
  }

  const loginType = request.params.type;
  if (loginType !== "chatgpt" && loginType !== "chatgptDeviceCode") {
    throw new PolicyError("Only ChatGPT OAuth or ChatGPT device-code login is permitted");
  }
}
