import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readJsonObject } from "../json-body";

function request(body: string): Request {
  return new Request("https://degself.com/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

test("readJsonObject accepts plain JSON objects", async () => {
  assert.deepEqual(await readJsonObject(request('{"name":"دق سلف"}')), {
    name: "دق سلف",
  });
  assert.deepEqual(await readJsonObject(request("{}")), {});
});

test("readJsonObject rejects valid non-object JSON values", async () => {
  for (const body of ["null", "[]", '"text"', "42", "true"]) {
    assert.equal(await readJsonObject(request(body)), null);
  }
});

test("readJsonObject rejects malformed JSON", async () => {
  assert.equal(await readJsonObject(request("{")), null);
});

test("public object-shaped JSON endpoints use the guarded parser", async () => {
  const routes = [
    "../../app/api/admin/login/route.ts",
    "../../app/api/asaali/route.ts",
    "../../app/api/offers/[token]/accept/route.ts",
    "../../app/api/quotes/route.ts",
    "../../app/api/report-workshop/route.ts",
    "../../app/api/reviews/route.ts",
    "../../app/api/submit-offer/[token]/route.ts",
  ];

  for (const route of routes) {
    const source = await readFile(new URL(route, import.meta.url), "utf8");
    assert.match(source, /readJsonObject\(/, route);
  }
});
