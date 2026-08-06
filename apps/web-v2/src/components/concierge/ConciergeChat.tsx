"use client";

/**
 * Interactive Degself assistant — conversational UI with real service actions.
 * Not a clone of /isal-degself: chat bubbles + intents + open quote form / diagnose / emergency.
 */

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/track";
import { detectConciergeIntent } from "@/lib/concierge-intent";
import { NewQuoteForm, type QuoteFormPrefill } from "@/components/NewQuoteForm";
import type { AsaaliResponse, VehicleContext } from "@/lib/asaali-schema";

type Chip = { id: string; label: string; payload: string };

type Action =
  | { id: string; kind: "open_quote"; label: string }
  | { id: string; kind: "link"; label: string; href: string }
  | { id: string; kind: "reply"; label: string; payload: string };

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  chips?: Chip[];
  actions?: Action[];
  workshops?: NonNullable<AsaaliResponse["recommended_workshops"]>;
};

type Panel = "chat" | "quote";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ConciergeChat({ onClose }: { onClose?: () => void }) {
  const t = useTranslations("concierge");
  const locale = useLocale();
  const listRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const [panel, setPanel] = useState<Panel>("chat");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [history, setHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [vehicle, setVehicle] = useState<VehicleContext>({});
  const [lastDiagnosis, setLastDiagnosis] = useState<AsaaliResponse | null>(null);
  const [quotePrefill, setQuotePrefill] = useState<QuoteFormPrefill>({});
  const [awaitingVehicle, setAwaitingVehicle] = useState(false);

  // Welcome once on mount
  useEffect(() => {
    setMessages([
      {
        id: uid(),
        role: "assistant",
        text: t("welcome"),
        chips: [
          { id: "c1", label: t("chipDiagnose"), payload: "__diagnose__" },
          { id: "c2", label: t("chipQuote"), payload: "__quote__" },
          { id: "c3", label: t("chipEmergency"), payload: "__emergency__" },
          { id: "c4", label: t("chipFind"), payload: "__find__" },
        ],
      },
    ]);
    track("concierge", { action: "welcome" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- welcome once
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, panel]);

  function pushAssistant(msg: Omit<Msg, "id" | "role">) {
    setMessages((m) => [...m, { id: uid(), role: "assistant", ...msg }]);
  }

  function pushUser(text: string) {
    setMessages((m) => [...m, { id: uid(), role: "user", text }]);
  }

  function openQuoteForm(prefill: QuoteFormPrefill) {
    setQuotePrefill(prefill);
    setPanel("quote");
    track("concierge", { action: "open_quote_form", source: prefill.source ?? "concierge" });
  }

  function buildQuotePrefillFromDiagnosis(data: AsaaliResponse): QuoteFormPrefill {
    return {
      service: data.quote_service || "",
      problem: data.problem_summary || data.explanation || "",
      carMake: vehicle.make || "",
      carModel: vehicle.model || "",
      carYear: vehicle.year ? String(vehicle.year) : "",
      matchedWorkshops: (data.recommended_workshops ?? []).map((w) => ({
        place_id: w.id,
        name: w.name,
        phone: w.phone,
      })),
      source: "concierge",
    };
  }

  async function runDiagnosis(text: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/asaali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          vehicle,
          conversation_history: history,
          locale,
        }),
      });
      const data = (await res.json()) as AsaaliResponse;
      setLastDiagnosis(data);
      setHistory((h) => [
        ...h,
        { role: "user", content: text },
        {
          role: "assistant",
          content:
            data.problem_summary ??
            data.follow_up_question ??
            data.fallback_message ??
            "",
        },
      ]);

      if (data.status === "needs_vehicle_info") {
        setAwaitingVehicle(true);
        pushAssistant({
          text: data.follow_up_question || t("askVehicle"),
          chips: [
            { id: "v1", label: "Toyota", payload: "__veh:Toyota__" },
            { id: "v2", label: "Nissan", payload: "__veh:Nissan__" },
            { id: "v3", label: "Hyundai", payload: "__veh:Hyundai__" },
            { id: "v4", label: "Kia", payload: "__veh:Kia__" },
            { id: "v5", label: t("skipVehicle"), payload: "__veh_skip__" },
          ],
        });
        return;
      }

      if (data.status === "needs_more_info") {
        pushAssistant({
          text: data.follow_up_question || t("needMore"),
        });
        return;
      }

      if (data.fallback_message && data.status !== "ok") {
        pushAssistant({ text: data.fallback_message });
        return;
      }

      const parts: string[] = [];
      if (data.problem_summary) parts.push(data.problem_summary);
      if (data.explanation) parts.push(data.explanation);
      if (data.warning && data.warning.severity !== "safe") {
        parts.push(`⚠ ${data.warning.message} — ${data.warning.action}`);
      }

      pushAssistant({
        text: parts.join("\n\n") || t("diagnosisDone"),
        workshops: data.recommended_workshops,
        actions: [
          { id: "a1", kind: "open_quote", label: t("actionOpenQuote") },
          { id: "a2", kind: "link", label: t("actionFindGarage"), href: "/search" },
          ...(data.whatsapp_message
            ? ([
                {
                  id: "a3",
                  kind: "reply",
                  label: t("actionCopyWa"),
                  payload: `__copywa__`,
                },
              ] as Action[])
            : []),
        ],
      });
      track("concierge", {
        action: "diagnosis",
        status: data.status,
        from_partners: Boolean(data.from_partners),
      });
    } catch {
      pushAssistant({ text: t("errConn") });
    } finally {
      setLoading(false);
    }
  }

  async function handleText(raw: string, opts?: { silentUser?: boolean }) {
    const text = raw.trim();
    if (!text || loading) return;

    // Special payloads from chips
    if (text === "__quote__") {
      if (!opts?.silentUser) pushUser(t("chipQuote"));
      pushAssistant({ text: t("openingQuote") });
      openQuoteForm({ source: "concierge" });
      return;
    }
    if (text === "__diagnose__") {
      if (!opts?.silentUser) pushUser(t("chipDiagnose"));
      pushAssistant({ text: t("askProblem") });
      return;
    }
    if (text === "__emergency__") {
      if (!opts?.silentUser) pushUser(t("chipEmergency"));
      pushAssistant({
        text: t("emergencyHelp"),
        actions: [
          { id: "e1", kind: "link", label: t("linkTow"), href: "/emergency?type=tow" },
          { id: "e2", kind: "link", label: t("linkMobile"), href: "/karaj-mutanaqil" },
          { id: "e3", kind: "link", label: t("linkTire"), href: "/bansher-mutanaqil" },
        ],
      });
      return;
    }
    if (text === "__find__") {
      if (!opts?.silentUser) pushUser(t("chipFind"));
      pushAssistant({
        text: t("findHelp"),
        actions: [
          { id: "f1", kind: "link", label: t("actionFindGarage"), href: "/search" },
          { id: "f2", kind: "link", label: t("actionBest"), href: "/best" },
        ],
      });
      return;
    }
    if (text === "__copywa__") {
      const wa = lastDiagnosis?.whatsapp_message;
      if (wa) {
        try {
          await navigator.clipboard.writeText(wa);
          pushAssistant({ text: t("copiedWa") });
        } catch {
          pushAssistant({ text: wa });
        }
      }
      return;
    }
    if (text.startsWith("__veh:")) {
      const make = text.slice("__veh:".length).replace(/__$/, "");
      setVehicle((v) => ({ ...v, make }));
      setAwaitingVehicle(false);
      if (!opts?.silentUser) pushUser(make);
      pushAssistant({ text: t("vehicleNoted", { make }) });
      // Re-run last user fault if we have history
      const lastUser = [...history].reverse().find((h) => h.role === "user");
      if (lastUser) {
        await runDiagnosis(lastUser.content);
      } else {
        pushAssistant({ text: t("askProblem") });
      }
      return;
    }
    if (text === "__veh_skip__") {
      setAwaitingVehicle(false);
      if (!opts?.silentUser) pushUser(t("skipVehicle"));
      pushAssistant({ text: t("askProblem") });
      return;
    }

    if (!opts?.silentUser) pushUser(text);
    setInput("");

    if (awaitingVehicle && !text.startsWith("__")) {
      // Free-text make
      setVehicle((v) => ({ ...v, make: text.slice(0, 40) }));
      setAwaitingVehicle(false);
      pushAssistant({ text: t("vehicleNoted", { make: text.slice(0, 40) }) });
      const lastUser = [...history].reverse().find((h) => h.role === "user");
      if (lastUser) await runDiagnosis(lastUser.content);
      else pushAssistant({ text: t("askProblem") });
      return;
    }

    const intent = detectConciergeIntent(text);
    track("concierge", { action: "message", intent });

    if (intent === "greeting") {
      pushAssistant({
        text: t("welcomeShort"),
        chips: [
          { id: "c1", label: t("chipDiagnose"), payload: "__diagnose__" },
          { id: "c2", label: t("chipQuote"), payload: "__quote__" },
          { id: "c3", label: t("chipEmergency"), payload: "__emergency__" },
        ],
      });
      return;
    }
    if (intent === "quote") {
      pushAssistant({ text: t("openingQuote") });
      const fromDiag = lastDiagnosis
        ? buildQuotePrefillFromDiagnosis(lastDiagnosis)
        : {};
      const problemFromText =
        text.length >= 10 && !QUOTE_LIKE_ONLY(text) ? text : "";
      openQuoteForm({
        source: "concierge",
        ...fromDiag,
        problem: fromDiag.problem || problemFromText,
      });
      return;
    }
    if (intent === "emergency") {
      pushAssistant({
        text: t("emergencyHelp"),
        actions: [
          { id: "e1", kind: "link", label: t("linkTow"), href: "/emergency?type=tow" },
          { id: "e2", kind: "link", label: t("linkMobile"), href: "/karaj-mutanaqil" },
        ],
      });
      return;
    }
    if (intent === "find_garage") {
      pushAssistant({
        text: t("findHelp"),
        actions: [
          { id: "f1", kind: "link", label: t("actionFindGarage"), href: "/search" },
        ],
      });
      return;
    }

    // diagnose / unknown long text
    await runDiagnosis(text);
  }

  function onAction(action: Action) {
    if (action.kind === "open_quote") {
      const prefill = lastDiagnosis
        ? buildQuotePrefillFromDiagnosis(lastDiagnosis)
        : { source: "concierge" as const };
      pushAssistant({ text: t("openingQuote") });
      openQuoteForm(prefill);
      return;
    }
    if (action.kind === "reply") {
      void handleText(action.payload, { silentUser: true });
      return;
    }
    // link handled by <Link>
  }

  if (panel === "quote") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              setPanel("chat");
              pushAssistant({
                text: t("backToChat"),
                chips: [
                  { id: "b1", label: t("chipDiagnose"), payload: "__diagnose__" },
                  { id: "b2", label: t("chipQuote"), payload: "__quote__" },
                ],
              });
            }}
            className="rounded-lg border border-neutral-700 px-2.5 py-1 text-xs font-bold text-neutral-200 hover:bg-neutral-800"
          >
            ← {t("back")}
          </button>
          <span className="text-sm font-extrabold text-[#FFD60A]">{t("quotePanelTitle")}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <NewQuoteForm
            compact
            initialService={quotePrefill.service}
            initialProblem={quotePrefill.problem}
            initialCarMake={quotePrefill.carMake}
            initialCarModel={quotePrefill.carModel}
            initialCarYear={quotePrefill.carYear}
            initialMatchedWorkshops={quotePrefill.matchedWorkshops}
            source={quotePrefill.source ?? "concierge"}
            onDone={() => {
              track("concierge", { action: "quote_submitted" });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-neutral-800 text-neutral-100"
                  : "rounded-bl-md border border-yellow-400/25 bg-yellow-400/10 text-neutral-100"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>

              {m.workshops && m.workshops.length > 0 && (
                <ul className="mt-2 space-y-1.5 border-t border-neutral-700/60 pt-2">
                  {m.workshops.slice(0, 3).map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium">{w.name}</span>
                      {w.phone && (
                        <a
                          href={`tel:${w.phone}`}
                          className="shrink-0 rounded bg-[#FFD60A] px-2 py-0.5 font-bold text-black"
                        >
                          {t("call")}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {m.chips && m.chips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.chips.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={loading}
                      onClick={() => void handleText(c.payload)}
                      className="rounded-full border border-[#FFD60A]/50 bg-neutral-950 px-3 py-1 text-xs font-bold text-[#FFD60A] hover:bg-[#FFD60A] hover:text-black disabled:opacity-50"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {m.actions.map((a) =>
                    a.kind === "link" ? (
                      <Link
                        key={a.id}
                        href={a.href}
                        onClick={() => {
                          track("concierge", { action: "link", href: a.href });
                          onClose?.();
                        }}
                        className="rounded-lg border border-neutral-600 bg-neutral-950 px-3 py-2 text-center text-xs font-bold text-neutral-100 hover:border-[#FFD60A]"
                      >
                        {a.label}
                      </Link>
                    ) : (
                      <button
                        key={a.id}
                        type="button"
                        disabled={loading}
                        onClick={() => onAction(a)}
                        className="rounded-lg bg-[#FFD60A] px-3 py-2 text-xs font-extrabold text-black hover:bg-yellow-300 disabled:opacity-50"
                      >
                        {a.label}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-bl-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs text-neutral-400">
              {t("typing")}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleText(input);
        }}
        className="border-t border-neutral-800 p-2"
      >
        <label htmlFor={inputId} className="sr-only">
          {t("inputLabel")}
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder")}
            disabled={loading}
            maxLength={500}
            className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-[#FFD60A]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-[#FFD60A] px-3.5 text-sm font-extrabold text-black hover:bg-yellow-300 disabled:opacity-40"
          >
            {t("send")}
          </button>
        </div>
      </form>
    </div>
  );
}

function QUOTE_LIKE_ONLY(text: string): boolean {
  return /^(أبي|أبغى|ابي|ابغى|أريد|اريد)?\s*(عرض\s*سعر|اسعار|أسعار)\s*!*$/i.test(
    text.trim()
  );
}
