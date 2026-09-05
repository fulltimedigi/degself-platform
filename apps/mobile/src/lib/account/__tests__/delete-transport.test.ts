import assert from "node:assert/strict";
import test from "node:test";
import { performDeletionRequest } from "../delete-transport";

function jsonResponse(ok: boolean, body: unknown): Response {
  return {
    ok,
    json: async () => body,
  } as unknown as Response;
}

const deps = (fetchImpl: typeof fetch, timeoutMs = 15_000) => ({
  fetchImpl,
  baseUrl: "https://example.test",
  timeoutMs,
});

test("success ONLY on HTTP 2xx + {ok:true}", async () => {
  const fetchImpl = (async () => jsonResponse(true, { ok: true })) as unknown as typeof fetch;
  assert.deepEqual(await performDeletionRequest("tok", "DELETE", deps(fetchImpl)), {
    ok: true,
  });
});

test("HTTP ok but {ok:false} is NOT success — maps the server code", async () => {
  const fetchImpl = (async () =>
    jsonResponse(true, { ok: false, code: "AUTH_TOO_OLD" })) as unknown as typeof fetch;
  assert.deepEqual(await performDeletionRequest("tok", "DELETE", deps(fetchImpl)), {
    ok: false,
    code: "AUTH_TOO_OLD",
  });
});

test("non-2xx with a known code is surfaced", async () => {
  const fetchImpl = (async () =>
    jsonResponse(false, { ok: false, code: "RATE_LIMITED" })) as unknown as typeof fetch;
  assert.deepEqual(await performDeletionRequest("tok", "DELETE", deps(fetchImpl)), {
    ok: false,
    code: "RATE_LIMITED",
  });
});

test("non-JSON body never reads as success", async () => {
  const fetchImpl = (async () =>
    ({
      ok: true,
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as Response) as unknown as typeof fetch;
  assert.deepEqual(await performDeletionRequest("tok", "DELETE", deps(fetchImpl)), {
    ok: false,
    code: "SERVER_ERROR",
  });
});

test("network error maps to a safe SERVER_ERROR", async () => {
  const fetchImpl = (async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;
  assert.deepEqual(await performDeletionRequest("tok", "DELETE", deps(fetchImpl)), {
    ok: false,
    code: "SERVER_ERROR",
  });
});

test("timeout aborts the request and maps to SERVER_ERROR (no hang)", async () => {
  // fetch that never resolves until its signal aborts.
  const fetchImpl = ((_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal) {
        signal.addEventListener("abort", () =>
          reject(Object.assign(new Error("Aborted"), { name: "AbortError" }))
        );
      }
    })) as unknown as typeof fetch;

  const started = Date.now();
  const result = await performDeletionRequest("tok", "DELETE", deps(fetchImpl, 30));
  assert.deepEqual(result, { ok: false, code: "SERVER_ERROR" });
  assert.ok(Date.now() - started < 5_000, "should resolve promptly after abort");
});

test("missing token / base url fail closed before any request", async () => {
  const fetchImpl = (async () => {
    throw new Error("should not be called");
  }) as unknown as typeof fetch;
  assert.deepEqual(await performDeletionRequest("", "DELETE", deps(fetchImpl)), {
    ok: false,
    code: "NOT_AUTHENTICATED",
  });
  assert.deepEqual(
    await performDeletionRequest("tok", "DELETE", {
      fetchImpl,
      baseUrl: "",
      timeoutMs: 15_000,
    }),
    { ok: false, code: "SERVER_ERROR" }
  );
});
