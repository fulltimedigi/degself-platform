import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { clientIp } from "../rate-limit";

test("clientIp prefers x-vercel-forwarded-for over spoofed XFF", () => {
  const req = new NextRequest("https://degself.com/api/quotes", {
    headers: {
      "x-forwarded-for": "1.2.3.4, 9.9.9.9",
      "x-vercel-forwarded-for": "203.0.113.50",
    },
  });
  assert.equal(clientIp(req), "203.0.113.50");
});

test("clientIp uses rightmost X-Forwarded-For hop when no vercel header", () => {
  const req = new NextRequest("https://degself.com/api/quotes", {
    headers: { "x-forwarded-for": " 1.2.3.4 , 5.6.7.8" },
  });
  assert.equal(clientIp(req), "5.6.7.8");
});

test("clientIp falls back to unknown", () => {
  const req = new NextRequest("https://degself.com/api/quotes");
  assert.equal(clientIp(req), "unknown");
});
