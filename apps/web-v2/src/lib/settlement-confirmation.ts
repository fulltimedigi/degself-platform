// Pure builders/parsers for the WhatsApp completion-confirmation message. No I/O,
// no server imports — the actual send is gated behind WHATSAPP_ENABLED +
// SETTLEMENT_ENABLED elsewhere and is NOT wired to auto-run in Phase A.
//
// Message architecture (from the WhatsApp API research): the confirmation is a
// Utility template with reply buttons ("نعم" / "لا"), tied to a specific booking
// so it stays Utility (not Marketing) and carries no incentive. The customer's
// tap opens a fresh 24h window, inside which the (future) rating Flow can be sent
// for free. Button titles must be <= 20 chars.

export const SETTLEMENT_BUTTON_YES = "settlement_confirm_yes";
export const SETTLEMENT_BUTTON_NO = "settlement_confirm_no";

export type SettlementButtonAction = "confirmed" | "no_show";

/** Map an inbound reply-button id to a settlement action (null = not ours). */
export function parseSettlementButtonReply(
  buttonId: string | null | undefined
): SettlementButtonAction | null {
  if (buttonId === SETTLEMENT_BUTTON_YES) return "confirmed";
  if (buttonId === SETTLEMENT_BUTTON_NO) return "no_show";
  return null;
}

/** Default Arabic reply-button labels (each <= 20 chars — WhatsApp limit). */
export const SETTLEMENT_BUTTONS = [
  { id: SETTLEMENT_BUTTON_YES, title: "نعم ✅" },
  { id: SETTLEMENT_BUTTON_NO, title: "لا ❌" },
] as const;

/**
 * Interactive reply-button payload for the confirmation. Kept as plain data so it
 * can be unit-tested and, later, sent inside an open 24h window; the initiating
 * (outside-window) send uses an approved Utility TEMPLATE with the same buttons.
 */
export function buildSettlementConfirmationInteractive(input: {
  customerName: string;
  workshopName: string;
  service: string;
}) {
  const name = input.customerName.trim() || "عميلنا";
  const body =
    `مرحبًا ${name} 👋\n` +
    `هل أتممت خدمة «${input.service}» في «${input.workshopName}»؟`;
  return {
    type: "button" as const,
    body: { text: body },
    action: {
      buttons: SETTLEMENT_BUTTONS.map((b) => ({
        type: "reply" as const,
        reply: { id: b.id, title: b.title },
      })),
    },
  };
}

/**
 * Named template-variable values for the approved Utility template
 * `settlement_confirm_ar` (body references the specific booking; quick-reply
 * buttons carry the yes/no payloads). Order matches the template's {{1}},{{2}},{{3}}.
 */
export function settlementConfirmationTemplateParams(input: {
  customerName: string;
  service: string;
  workshopName: string;
}): string[] {
  return [
    input.customerName.trim() || "عميلنا",
    input.service,
    input.workshopName,
  ];
}

/**
 * WhatsApp template components for the approved Utility template
 * `settlement_confirm_ar`: a body with {{1}},{{2}},{{3}} and two quick-reply
 * buttons whose payloads are our button ids (so the webhook can route the reply).
 */
export function settlementConfirmationTemplateComponents(input: {
  customerName: string;
  service: string;
  workshopName: string;
}): unknown[] {
  const [name, service, workshop] = settlementConfirmationTemplateParams(input);
  return [
    {
      type: "body",
      parameters: [
        { type: "text", text: name },
        { type: "text", text: service.slice(0, 120) },
        { type: "text", text: workshop.slice(0, 120) },
      ],
    },
    {
      type: "button",
      sub_type: "quick_reply",
      index: "0",
      parameters: [{ type: "payload", payload: SETTLEMENT_BUTTON_YES }],
    },
    {
      type: "button",
      sub_type: "quick_reply",
      index: "1",
      parameters: [{ type: "payload", payload: SETTLEMENT_BUTTON_NO }],
    },
  ];
}
