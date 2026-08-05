import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { clientIp } from "../rate-limit";

test("clientIp uses first x-forwarded-for hop", () => {
  const req = new NextRequest("https://degself.com/api/quotes", {
    headers: { "x-forwarded-for": " 1.2.3.4 , 5.6.7.8" },
  });
  assert.equal(clientIp(req), "1.2.3.4");
});

test("clientIp falls back to unknown", () => {
  const req = new NextRequest("https://degself.com/api/quotes");
  assert.equal(clientIp(req), "unknown");
});
