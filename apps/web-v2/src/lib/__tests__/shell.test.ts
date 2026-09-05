import { test } from "node:test";
import assert from "node:assert/strict";

import { isNativeShell, NATIVE_SHELL_UA_MARKER } from "../shell";

// isNativeShell drives whether the browser PWA install prompts are shown. It must
// be true ONLY when the DEGSELF native shell's UA marker is present, so a normal
// mobile/desktop browser still gets the install nudge while the app never does.

function withUserAgent(ua: string | undefined, fn: () => void) {
  const original = globalThis.navigator;
  try {
    if (ua === undefined) {
      // @ts-expect-error simulate a non-browser (SSR) environment
      delete globalThis.navigator;
    } else {
      Object.defineProperty(globalThis, "navigator", {
        value: { userAgent: ua },
        configurable: true,
        writable: true,
      });
    }
    fn();
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      value: original,
      configurable: true,
      writable: true,
    });
  }
}

test("detects the native shell from its UA marker", () => {
  withUserAgent(
    `Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36 ${NATIVE_SHELL_UA_MARKER}/1.0`,
    () => assert.equal(isNativeShell(), true),
  );
});

test("a normal Android Chrome browser is NOT the native shell", () => {
  withUserAgent(
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36",
    () => assert.equal(isNativeShell(), false),
  );
});

test("a normal iOS Safari browser is NOT the native shell", () => {
  withUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    () => assert.equal(isNativeShell(), false),
  );
});

test("returns false without throwing when there is no navigator (SSR)", () => {
  withUserAgent(undefined, () => assert.equal(isNativeShell(), false));
});
