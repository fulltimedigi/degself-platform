import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  computeChatCost,
  hashIp,
  isWithinBudget,
  logUsage,
} from "@/lib/asaali-cost-guard";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import {
  CONCIERGE_ROUTER_MAX_INPUT_CHARS,
  CONCIERGE_ROUTER_MODEL,
  CONCIERGE_ROUTER_RATE_LIMIT_PER_HOUR,
  CONCIERGE_ROUTER_SYSTEM_PROMPT,
  CONCIERGE_ROUTER_TOOLS,
  conciergeDecisionFromToolUse,
} from "@/lib/concierge-router";

export const runtime = "nodejs";
export const maxDuration = 10;

const SUPPORTED_LOCALES = new Set(["ar", "en", "hi", "ur"]);

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return noStoreJson({ error: "router_unavailable" }, 503);
  }

  let text = "";
  let locale = "ar";
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
    locale =
      typeof body?.locale === "string" && SUPPORTED_LOCALES.has(body.locale)
        ? body.locale
        : "ar";
  } catch {
    return noStoreJson({ error: "invalid_request" }, 400);
  }

  if (!text) return noStoreJson({ error: "empty_text" }, 400);
  if (text.length > CONCIERGE_ROUTER_MAX_INPUT_CHARS) {
    return noStoreJson({ error: "text_too_long" }, 400);
  }

  // The router shares the same hard monthly LLM budget as diagnosis/translation.
  // Fail closed before making a paid call if the budget ledger is unavailable.
  const budget = await isWithinBudget();
  if (!budget.ok) {
    return noStoreJson({ error: "budget_exceeded" }, 503);
  }

  const ipHash = hashIp(clientIp(req));
  if (
    !(await consumeRateLimit(
      ipHash,
      "concierge_router",
      CONCIERGE_ROUTER_RATE_LIMIT_PER_HOUR,
      { failClosed: true }
    ))
  ) {
    return noStoreJson({ error: "rate_limited" }, 429);
  }

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.messages.create({
      model: CONCIERGE_ROUTER_MODEL,
      max_tokens: 128,
      system: [
        {
          type: "text",
          text: CONCIERGE_ROUTER_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `UI locale: ${locale}\n<user_message>${text}</user_message>`,
        },
      ],
      // JSON cloning intentionally drops readonly tuple types from the central
      // contract while preserving the exact runtime schemas expected by the SDK.
      // This endpoint never executes tools; it only validates the selected route.
      tools: JSON.parse(JSON.stringify(CONCIERGE_ROUTER_TOOLS)),
      tool_choice: { type: "any" },
    });

    const inputTokens = message.usage?.input_tokens ?? 0;
    const outputTokens = message.usage?.output_tokens ?? 0;
    await logUsage({
      ip_hash: ipHash,
      model: CONCIERGE_ROUTER_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: computeChatCost(inputTokens, outputTokens, CONCIERGE_ROUTER_MODEL),
      endpoint: "chat",
      cache_hit: false,
      // Deliberately no user text, locale, vehicle data, or tool arguments in logs.
      meta: { feature: "concierge_router" },
    });

    if (message.stop_reason === "refusal") {
      return noStoreJson({ error: "router_refused" }, 422);
    }

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return noStoreJson({ error: "missing_tool_call" }, 502);
    }

    const decision = conciergeDecisionFromToolUse(toolUse.name, toolUse.input);
    if (!decision) {
      return noStoreJson({ error: "invalid_tool_call" }, 502);
    }

    return noStoreJson(decision);
  } catch (err) {
    console.error("concierge router: model call failed", err);
    return noStoreJson({ error: "router_failed" }, 502);
  }
}
