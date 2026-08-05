import type { Metadata } from "next";
import Link from "next/link";
import { fetchQuotes } from "@/lib/quotes";
import { relativeArabic } from "@/lib/utils";
import { AdminQuotesList, type QuoteRow } from "@/components/AdminQuotesList";

export const metadata: Metadata = {
  title: "طلبات عروض الأسعار",
  robots: { index: false, follow: false }, // private admin tool — never index
};

// Always render fresh — the admin needs to see new requests the moment they land.
export const dynamic = "force-dynamic";

export default async function AdminQuotesPage() {
  let rows: QuoteRow[] = [];
  let loadError = false;
  try {
    const quotes = await fetchQuotes();
    const now = Date.now();
    rows = quotes.map((q) => ({
      id: q.id,
      status: q.status,
      customer_name: q.customer_name,
      customer_phone: q.customer_phone,
      service: q.service,
      car: [q.car_make, q.car_model, q.car_year].filter(Boolean).join(" "),
      area: q.area ?? "",
      urgency: q.urgency,
      created_label: relativeArabic(q.created_at, now),
    }));
  } catch {
    loadError = true;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">طلبات عروض الأسعار</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إجمالي الطلبات: <span className="font-bold text-foreground">{rows.length}</span>
          </p>
        </div>
        <Link
          href="/admin/quotes"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold transition hover:border-[#FFD60A]"
        >
          تحديث ↻
        </Link>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-400">
          تعذّر جلب الطلبات من قاعدة البيانات. تأكد من إعداد المفاتيح وحاول مرة أخرى.
        </div>
      ) : (
        <AdminQuotesList rows={rows} />
      )}
    </main>
  );
}
