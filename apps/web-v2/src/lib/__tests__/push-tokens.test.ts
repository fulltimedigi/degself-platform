import { test } from "node:test";
import assert from "node:assert/strict";

import {
  chunkPushMessages,
  EXPO_PUSH_CHUNK_SIZE,
  isValidExpoPushToken,
  normalizePlatform,
  parseRegisterBody,
  sendExpoPush,
  type ExpoPushMessage,
} from "../push-tokens";

test("isValidExpoPushToken accepts real Expo token shapes and rejects junk", () => {
  assert.equal(isValidExpoPushToken("ExponentPushToken[abcDEF0123_-.]"), true);
  assert.equal(isValidExpoPushToken("ExpoPushToken[xxxxxxxx]"), true);
  assert.equal(isValidExpoPushToken("fcm-raw-token"), false);
  assert.equal(isValidExpoPushToken("ExponentPushToken[]"), false);
  assert.equal(isValidExpoPushToken("ExponentPushToken[abc"), false);
  assert.equal(isValidExpoPushToken(""), false);
  assert.equal(isValidExpoPushToken(42), false);
  assert.equal(isValidExpoPushToken(null), false);
});

test("normalizePlatform only allows the three known platforms", () => {
  assert.equal(normalizePlatform("ios"), "ios");
  assert.equal(normalizePlatform("android"), "android");
  assert.equal(normalizePlatform("web"), "web");
  assert.equal(normalizePlatform("windows"), null);
  assert.equal(normalizePlatform(undefined), null);
});

test("parseRegisterBody returns a clean registration or null", () => {
  assert.deepEqual(
    parseRegisterBody({ token: "ExponentPushToken[abc]", platform: "android" }),
    { token: "ExponentPushToken[abc]", platform: "android" },
  );
  // extra fields are ignored, only token+platform survive
  assert.deepEqual(
    parseRegisterBody({ token: "ExpoPushToken[z]", platform: "ios", evil: "x" }),
    { token: "ExpoPushToken[z]", platform: "ios" },
  );
  assert.equal(parseRegisterBody(null), null);
  assert.equal(parseRegisterBody("nope"), null);
  assert.equal(parseRegisterBody({ token: "bad", platform: "ios" }), null);
  assert.equal(parseRegisterBody({ token: "ExpoPushToken[z]" }), null);
  assert.equal(parseRegisterBody({ token: "ExpoPushToken[z]", platform: "nope" }), null);
});

test("chunkPushMessages splits at the Expo 100-per-request limit", () => {
  const many: ExpoPushMessage[] = Array.from({ length: 250 }, (_, i) => ({
    to: `ExponentPushToken[${i}]`,
  }));
  const chunks = chunkPushMessages(many);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].length, EXPO_PUSH_CHUNK_SIZE);
  assert.equal(chunks[1].length, EXPO_PUSH_CHUNK_SIZE);
  assert.equal(chunks[2].length, 50);
  assert.equal(chunkPushMessages([]).length, 0);
});

test("sendExpoPush chunks requests and concatenates the returned tickets", async () => {
  const many: ExpoPushMessage[] = Array.from({ length: 150 }, (_, i) => ({
    to: `ExponentPushToken[${i}]`,
    title: "عرض جديد",
  }));

  const calls: number[] = [];
  const fakeFetch = (async (_url: string, init?: RequestInit) => {
    const sent = JSON.parse(String(init?.body)) as ExpoPushMessage[];
    calls.push(sent.length);
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: sent.map(() => ({ status: "ok" })) }),
    };
  }) as unknown as typeof fetch;

  const tickets = await sendExpoPush(many, fakeFetch);
  assert.deepEqual(calls, [100, 50]);
  assert.equal(tickets.length, 150);
});

test("sendExpoPush throws on a non-OK response", async () => {
  const fakeFetch = (async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
  })) as unknown as typeof fetch;

  await assert.rejects(
    () => sendExpoPush([{ to: "ExponentPushToken[a]" }], fakeFetch),
    /Expo push send failed: 500/,
  );
});
