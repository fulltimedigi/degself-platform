import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function text(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("conversion success events stay after API success guards", () => {
  const quote = text("src/components/NewQuoteForm.tsx");
  const offers = text("src/components/OffersChooser.tsx");
  const garage = text("src/components/GarageOfferForm.tsx");

  assert.ok(quote.indexOf("if (!res.ok)") < quote.indexOf('track("quote_submit"'));
  assert.ok(offers.indexOf("if (!res.ok)") < offers.indexOf('track("offer_accept"'));
  assert.ok(garage.indexOf("if (!r.ok)") < garage.indexOf('track("garage_offer_submit"'));
});
