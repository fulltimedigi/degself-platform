import type { Metadata } from "next";
import Link from "next/link";
import { fetchQuote, fetchOffers, statusMeta, urgencyClass, type Quote, type QuoteOffer } from "@/lib/quotes";
import { formatArabicDate, relativeArabic, kuwaitWhatsAppDigits } from "@/lib/utils";
import { QuoteAdminControls } from "@/components/QuoteAdminControls";

export const metadata: Metadata = {
  title: "تفاصيل الطلب",
  robots: { index: false, follow: false }, // private admin tool — never index
};

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border py-3 first:border-t-0">
      <dt className="mb-1 text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function fullDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  const time = new Intl.DateTimeFormat("ar-KW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${formatArabicDate(iso.slice(0, 10))} · ${time} · ${relativeArabic(iso)}`;
}

function MatchedWorkshops({ value }: { value: Quote["matched_workshops"] }) {
  if (!Array.isArray(value) || value.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <ul className="flex flex-col gap-1">
      {value.map((w, i) => {
        const o = (w ?? {}) as Record<string, unknown>;
        const name = typeof o.name === "string" ? o.name : "";
        const phone = typeof o.phone === "string" ? o.phone : "";
        const price = o.quoted_price != null ? String(o.quoted_price) : "";
        return (
          <li key={i} className="rounded-lg border border-border bg-background px-3 py-2">
            <span className="font-bold">{name || `كراج ${i + 1}`}</span>
            {phone && <span dir="ltr" className="mx-2 font-mono text-[#FFD60A]">{phone}</span>}
            {price && <span className="text-muted-foreground">— {price} د.ك</span>}
          </li>
        );
      })}
    </ul>
  );
}

function NotFound() {
  return (
    <main className="mx-auto w-full max-w-lg px-6 py-16 text-center">
      <p className="mb-2 text-5xl font-extrabold text-[#FFD60A]">٤٠٤</p>
      <h1 className="mb-2 text-xl font-extrabold">الطلب غير موجود</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        قد يكون هذا الطلب حُذف أو أن الرابط غير صحيح.
      </p>
      <Link
        href="/admin/quotes"
        className="inline-block rounded-lg bg-[#FFD60A] px-4 py-3 text-sm font-extrabold text-[#0A0A0A]"
      >
        ← رجوع لقائمة الطلبات
      </Link>
    </main>
  );
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let quote: Quote | null = null;
  let offers: QuoteOffer[] = [];
  let loadError = false;
  try {
    quote = await fetchQuote(id);
    if (quote) offers = await fetchOffers(id);
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-lg px-6 py-16 text-center">
        <h1 className="mb-2 text-xl font-extrabold">تعذّر جلب الطلب</h1>
        <p className="mb-6 text-sm text-muted-foreground">مشكلة في الاتصال بقاعدة البيانات.</p>
        <Link href="/admin/quotes" className="text-[#FFD60A] underline">
          ← رجوع للقائمة
        </Link>
      </main>
    );
  }

  if (!quote) return <NotFound />;

  const q = quote;
  const waDigits = kuwaitWhatsAppDigits(q.customer_phone);
  const sm = statusMeta(q.status);
  const car = [q.car_make, q.car_model, q.car_year].filter(Boolean).join(" ");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/admin/quotes"
        className="mb-4 inline-block text-sm font-bold text-[#FFD60A]"
      >
        ← رجوع لقائمة الطلبات
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{q.customer_name}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sm.className}`}>
          {sm.label}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${urgencyClass(q.urgency)}`}>
          {q.urgency}
        </span>
      </div>

      {/* Contact actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <a
          href={`tel:${q.customer_phone}`}
          dir="ltr"
          className="rounded-lg bg-[#FFD60A] px-4 py-2.5 text-sm font-extrabold text-[#0A0A0A]"
        >
          📞 {q.customer_phone}
        </a>
        {waDigits && (
          <a
            href={`https://wa.me/${waDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-[#FFD60A] px-4 py-2.5 text-sm font-extrabold text-[#FFD60A]"
          >
            واتساب
          </a>
        )}
      </div>

      {/* Interactive admin controls: status, offers, send-to-customer */}
      <div className="mb-6">
        <QuoteAdminControls quoteId={q.id} initialStatus={q.status} offers={offers} />
      </div>

      <dl className="rounded-xl border border-border bg-card px-4 py-1">
        <Row label="الخدمة">{q.service}</Row>
        <Row label="وصف المشكلة">
          <p className="whitespace-pre-wrap leading-relaxed">{q.problem_description}</p>
        </Row>
        <Row label="السيارة">{car || "—"}</Row>
        <Row label="المحافظة">{q.area || "—"}</Row>
        <Row label="الإلحاح">{q.urgency}</Row>
        <Row label="مصدر الطلب">{q.source}</Row>
        <Row label="تاريخ الطلب">{fullDate(q.created_at)}</Row>
        {q.updated_at && q.updated_at !== q.created_at && (
          <Row label="آخر تحديث">{fullDate(q.updated_at)}</Row>
        )}
        {q.expires_at && <Row label="ينتهي في">{fullDate(q.expires_at)}</Row>}
        {q.photos && q.photos.length > 0 && (
          <Row label="الصور">
            <div className="flex flex-wrap gap-2">
              {q.photos.map((p, i) => (
                <a
                  key={i}
                  href={p}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FFD60A] underline"
                >
                  صورة {i + 1}
                </a>
              ))}
            </div>
          </Row>
        )}
        <Row label="الكراجات المُوجّه إليها">
          <MatchedWorkshops value={q.matched_workshops} />
        </Row>
        {q.admin_notes && (
          <Row label="ملاحظات إدارية">
            <p className="whitespace-pre-wrap leading-relaxed">{q.admin_notes}</p>
          </Row>
        )}
        <Row label="معرّف الطلب">
          <span dir="ltr" className="font-mono text-xs text-muted-foreground">{q.id}</span>
        </Row>
      </dl>
    </main>
  );
}
