"use client";

import { useMemo, useState } from "react";
import { PORTAL_AREAS, type GaragePortalView } from "@/lib/garage-portal";
import { BUSINESS_WA } from "@/lib/constants";

// Garage-facing self-serve page. Arabic-only by audience. The garage arrives via
// a magic link sent to its WhatsApp, reads who we are, confirms/edits its info,
// and opts in to receive RFQ (price-quote) requests with one tap.

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-3 text-base focus:border-[#FFD60A] focus:outline-none";
const labelCls = "mb-1.5 block text-sm font-extrabold";

// Common specialties offered as a datalist — the garage can also type its own.
const SPECIALTY_SUGGESTIONS = [
  "ميكانيكا ومكينة",
  "قير / جير",
  "كهرباء وكمبيوتر السيارة",
  "تكييف وفريون",
  "هيئة أمامية ومساعدات",
  "فرامل",
  "بنشر وتواير وبطاريات",
  "حدادة وصبغ (سمكرة)",
  "إكسوز / شكمان",
  "ديتيلنج وتلميع",
  "ونش / سطحة",
  "صيانة عامة",
];

function waContactUrl(name: string): string {
  const text = `السلام عليكم، أنا من كراج «${name}» ووصلني رابط صفحتي في دق سلف وعندي استفسار.`;
  return `https://wa.me/${BUSINESS_WA}?text=${encodeURIComponent(text)}`;
}

export function GaragePortalClient({
  token,
  garage,
}: {
  token: string;
  garage: GaragePortalView;
}) {
  const [isPartner, setIsPartner] = useState(garage.rfqEnabled);
  const [optBusy, setOptBusy] = useState(false);
  const [optMsg, setOptMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [form, setForm] = useState({
    whatsapp: garage.phoneLocal ?? garage.phoneIntl ?? "",
    area: garage.area ?? "",
    specialty: garage.specialty ?? "",
    hints: garage.specialtyHints.join("، "),
    hours: garage.openingHours ?? "",
    description: garage.selfDescription ?? "",
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editMsg, setEditMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);

  const contactUrl = useMemo(() => waContactUrl(garage.name), [garage.name]);

  async function optIn() {
    setOptBusy(true);
    setOptMsg(null);
    try {
      const r = await fetch(`/api/garage-portal/${encodeURIComponent(token)}/opt-in`, {
        method: "POST",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setOptMsg({ kind: "err", text: d.error ?? "تعذّر إتمام العملية، حاول مرة أخرى." });
        return;
      }
      setIsPartner(true);
      setOptMsg({ kind: "ok", text: "تم ✅ كراجك الآن يستقبل طلبات عروض الأسعار من دق سلف." });
    } catch {
      setOptMsg({ kind: "err", text: "تعذّر الاتصال، تأكد من الإنترنت وحاول مرة أخرى." });
    } finally {
      setOptBusy(false);
    }
  }

  async function saveEdits(e: React.FormEvent) {
    e.preventDefault();
    setEditBusy(true);
    setEditMsg(null);
    try {
      const hints = form.hints
        .split(/[،,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const r = await fetch(`/api/garage-portal/${encodeURIComponent(token)}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp: form.whatsapp,
          area: form.area,
          specialty: form.specialty,
          specialtyHints: hints,
          openingHours: form.hours,
          description: form.description,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setEditMsg({ kind: "err", text: d.error ?? "تعذّر حفظ التعديل." });
        return;
      }
      setSavedOnce(true);
      setEditMsg({ kind: "ok", text: "تم حفظ التعديلات ✅ شكراً لتحديث بيانات كراجك." });
    } catch {
      setEditMsg({ kind: "err", text: "تعذّر الاتصال، حاول مرة أخرى." });
    } finally {
      setEditBusy(false);
    }
  }

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6" dir="rtl">
      {/* Who we are */}
      <header className="mb-6 rounded-2xl border border-[#FFD60A]/40 bg-[#FFD60A]/5 p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-2xl">🔧</span>
          <h1 className="text-xl font-extrabold sm:text-2xl">دق سلف — دليل كراجات الكويت</h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          دق سلف منصة كويتية تجمع أصحاب السيارات بالكراجات الموثوقة. صاحب السيارة يكتب مشكلته
          مرة واحدة، ونرسلها للكراجات المناسبة، فيرجع له أكثر من عرض سعر ويختار الأنسب — بدون ما
          يلف على الكراجات بنفسه.
        </p>
        <p className="mt-2 text-sm font-bold">
          كراجك «{garage.name}» موجود عندنا في الدليل، وهذي صفحتك الخاصة.
        </p>
      </header>

      {/* Opt-in */}
      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-1 text-lg font-extrabold">استقبل طلبات عروض الأسعار</h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          لما تفعّل الخدمة، يوصلك على واتساب طلبات من عملاء يدوّرون على تصليح في تخصصك ومنطقتك،
          وتقدر ترسل لهم عرض سعرك مباشرة. الخدمة مجانية، وتقدر توقفها في أي وقت بمراسلتنا.
        </p>

        {isPartner ? (
          <div className="rounded-xl border-2 border-green-500/40 bg-green-500/10 p-4 text-center">
            <p className="mb-1 text-2xl">✅</p>
            <p className="text-sm font-extrabold text-green-400">
              كراجك مفعّل ويستقبل طلبات عروض الأسعار.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={optIn}
            disabled={optBusy}
            className="w-full rounded-xl bg-[#FFD60A] px-4 py-4 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {optBusy ? "جارٍ التفعيل…" : "فعّل استقبال طلبات الأسعار — بضغطة واحدة"}
          </button>
        )}

        {optMsg && (
          <div
            className={`mt-3 rounded-lg border p-3 text-sm ${
              optMsg.kind === "ok"
                ? "border-green-500/40 bg-green-500/10 text-green-400"
                : "border-red-500/40 bg-red-500/10 text-red-400"
            }`}
          >
            {optMsg.text}
          </div>
        )}
      </section>

      {/* Review + edit */}
      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-1 text-lg font-extrabold">راجع بيانات كراجك</h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          تأكد من صحة المعلومات وعدّل أي شيء ناقص أو غير دقيق. هذي البيانات هي اللي تظهر للعملاء
          وتحدد أي طلبات توصلك.
        </p>

        <form onSubmit={saveEdits} className="flex flex-col gap-4" noValidate>
          <div>
            <label className={labelCls}>رقم الواتساب</label>
            <input
              className={inputCls}
              dir="ltr"
              inputMode="tel"
              placeholder="مثال: 55123456"
              value={form.whatsapp}
              onChange={(e) => set({ whatsapp: e.target.value })}
              maxLength={20}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              هذا الرقم اللي يوصله طلبات العملاء — تأكد إنه رقم واتساب شغّال.
            </p>
          </div>

          <div>
            <label className={labelCls}>المنطقة</label>
            <select
              className={inputCls}
              value={form.area}
              onChange={(e) => set({ area: e.target.value })}
            >
              <option value="">اختر المنطقة</option>
              {PORTAL_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>التخصص الرئيسي</label>
            <input
              className={inputCls}
              list="specialty-suggestions"
              placeholder="مثال: ميكانيكا ومكينة"
              value={form.specialty}
              onChange={(e) => set({ specialty: e.target.value })}
              maxLength={120}
            />
            <datalist id="specialty-suggestions">
              {SPECIALTY_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label className={labelCls}>تخصصات إضافية</label>
            <input
              className={inputCls}
              placeholder="افصل بينها بفاصلة، مثال: تكييف، فرامل، كهرباء"
              value={form.hints}
              onChange={(e) => set({ hints: e.target.value })}
              maxLength={300}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              كل ما كانت تخصصاتك أوضح، وصلتك طلبات أنسب.
            </p>
          </div>

          <div>
            <label className={labelCls}>أوقات الدوام</label>
            <input
              className={inputCls}
              placeholder="مثال: السبت–الخميس ٩ص–٩م"
              value={form.hours}
              onChange={(e) => set({ hours: e.target.value })}
              maxLength={200}
            />
          </div>

          <div>
            <label className={labelCls}>نبذة قصيرة عن الكراج</label>
            <textarea
              className={inputCls}
              rows={3}
              placeholder="اكتب سطر أو سطرين عن خدماتك وما يميّزك."
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              maxLength={400}
            />
          </div>

          {editMsg && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                editMsg.kind === "ok"
                  ? "border-green-500/40 bg-green-500/10 text-green-400"
                  : "border-red-500/40 bg-red-500/10 text-red-400"
              }`}
            >
              {editMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={editBusy}
            className="rounded-lg border border-[#FFD60A] bg-transparent px-4 py-3.5 text-base font-extrabold text-[#FFD60A] transition hover:bg-[#FFD60A]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editBusy ? "جارٍ الحفظ…" : savedOnce ? "حفظ التعديلات مرة أخرى" : "حفظ التعديلات"}
          </button>
        </form>
      </section>

      {/* Contact */}
      <section className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="mb-3 text-sm text-muted-foreground">
          عندك استفسار أو تحتاج مساعدة؟ راسلنا مباشرة على واتساب ونرد عليك.
        </p>
        <a
          href={contactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-base font-extrabold text-white transition hover:brightness-95"
        >
          <span>💬</span> تواصل مع دق سلف
        </a>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        هذي صفحة خاصة بكراجك — لا تشاركها مع أحد. رابطها لا يظهر في محركات البحث.
      </p>
    </main>
  );
}
