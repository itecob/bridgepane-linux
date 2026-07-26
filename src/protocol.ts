export type RequestId = string | number;

export interface RpcRequest {
  id: RequestId;
  method: string;
  params?: unknown;
}

export interface RpcNotification {
  method: string;
  params?: unknown;
  emittedAtMs?: number;
}

export interface RpcSuccess {
  id: RequestId;
  result: unknown;
}

export interface RpcFailure {
  id: RequestId;
  error: { code: number; message: string; data?: unknown };
}

export type RpcResponse = RpcSuccess | RpcFailure;
export type RpcMessage = RpcRequest | RpcNotification | RpcResponse;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isRequestId(value: unknown): value is RequestId {
  return (typeof value === "string" && value.length <= 256)
    || (typeof value === "number" && Number.isFinite(value));
}

export function validateRpcMessage(value: unknown): RpcMessage {
  if (!isRecord(value)) throw new Error("RPC message must be a JSON object");

  const includesId = Object.hasOwn(value, "id");
  if (includesId && !isRequestId(value.id)) throw new Error("RPC id must be a string of at most 256 characters or a finite number");

  if (Object.hasOwn(value, "method")) {
    if (typeof value.method !== "string" || !value.method || value.method.length > 256) {
      throw new Error("RPC method must be a non-empty string of at most 256 characters");
    }
    return value as unknown as RpcRequest | RpcNotification;
  }

  if (!includesId) throw new Error("Invalid RPC message shape");
  const includesResult = Object.hasOwn(value, "result");
  const includesError = Object.hasOwn(value, "error");
  if (includesResult === includesError) throw new Error("RPC response must contain exactly one of result or error");
  if (includesError) {
    if (!isRecord(value.error) || typeof value.error.code !== "number" || !Number.isFinite(value.error.code)
      || typeof value.error.message !== "string" || value.error.message.length > 4_096) {
      throw new Error("Invalid RPC error shape");
    }
  }
  return value as unknown as RpcResponse;
}

export function parseRpcMessage(text: string): RpcMessage {
  return validateRpcMessage(JSON.parse(text));
}

export function hasMethod(message: RpcMessage): message is RpcRequest | RpcNotification {
  return "method" in message;
}

export function hasId(message: RpcMessage): message is RpcRequest | RpcResponse {
  return "id" in message;
}

export function isResponse(message: RpcMessage): message is RpcResponse {
  return hasId(message) && !hasMethod(message);
}
