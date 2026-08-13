import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSettlementConfirmationInteractive,
  parseSettlementButtonReply,
  SETTLEMENT_BUTTON_NO,
  SETTLEMENT_BUTTON_YES,
  SETTLEMENT_BUTTONS,
  settlementConfirmationTemplateComponents,
  settlementConfirmationTemplateParams,
} from "../settlement-confirmation";

test("parseSettlementButtonReply maps only our button ids", () => {
  assert.equal(parseSettlementButtonReply(SETTLEMENT_BUTTON_YES), "confirmed");
  assert.equal(parseSettlementButtonReply(SETTLEMENT_BUTTON_NO), "no_show");
  assert.equal(parseSettlementButtonReply("some_other_button"), null);
  assert.equal(parseSettlementButtonReply(null), null);
  assert.equal(parseSettlementButtonReply(undefined), null);
});

test("reply-button titles obey WhatsApp's 20-char limit", () => {
  for (const b of SETTLEMENT_BUTTONS) {
    assert.ok(b.title.length <= 20, `button "${b.title}" too long`);
    assert.ok(b.id.length <= 256);
  }
});

test("interactive body names the specific booking (keeps it Utility, not Marketing)", () => {
  const msg = buildSettlementConfirmationInteractive({
    customerName: "أحمد",
    workshopName: "كراج الشويخ",
    service: "تغيير زيت",
  });
  assert.equal(msg.type, "button");
  assert.match(msg.body.text, /أحمد/);
  assert.match(msg.body.text, /كراج الشويخ/);
  assert.match(msg.body.text, /تغيير زيت/);
  assert.equal(msg.action.buttons.length, 2);
  assert.equal(msg.action.buttons[0].reply.id, SETTLEMENT_BUTTON_YES);
});

test("template components: body params + two quick-reply payloads route back", () => {
  const comps = settlementConfirmationTemplateComponents({
    customerName: "أحمد",
    service: "تغيير زيت",
    workshopName: "كراج الشويخ",
  }) as Array<Record<string, unknown>>;
  const body = comps.find((c) => c.type === "body") as {
    parameters: { text: string }[];
  };
  assert.deepEqual(body.parameters.map((p) => p.text), ["أحمد", "تغيير زيت", "كراج الشويخ"]);
  const payloads = comps
    .filter((c) => c.type === "button")
    .map((c) => (c as { parameters: { payload: string }[] }).parameters[0].payload);
  assert.deepEqual(payloads, [SETTLEMENT_BUTTON_YES, SETTLEMENT_BUTTON_NO]);
});

test("blank customer name falls back gracefully", () => {
  const msg = buildSettlementConfirmationInteractive({
    customerName: "   ",
    workshopName: "X",
    service: "Y",
  });
  assert.match(msg.body.text, /عميلنا/);
  assert.deepEqual(
    settlementConfirmationTemplateParams({ customerName: "", service: "Y", workshopName: "X" }),
    ["عميلنا", "Y", "X"]
  );
});
