"use client";

import { useEffect, useMemo, useState } from "react";

type Base = {
  place_id: string;
  name: string;
  phone: string | null;
  phone_intl: string | null;
  website: string | null;
  address: string | null;
  area: string | null;
  reviewed_specialty: string | null;
};

type Override = {
  name: string | null;
  phone: string | null;
  phone_intl: string | null;
  website: string | null;
  address: string | null;
  area: string | null;
  reviewed_specialty: string | null;
  hero_image_url: string | null;
  gallery_image_urls: string[] | null;
};

type FormState = {
  name: string;
  phone: string;
  phone_intl: string;
  website: string;
  address: string;
  area: string;
  reviewed_specialty: string;
};

function initialForm(base: Base, override: Override | null): FormState {
  return {
    name: override?.name ?? base.name ?? "",
    phone: override?.phone ?? base.phone ?? "",
    phone_intl: override?.phone_intl ?? base.phone_intl ?? "",
    website: override?.website ?? base.website ?? "",
    address: override?.address ?? base.address ?? "",
    area: override?.area ?? base.area ?? "",
    reviewed_specialty: override?.reviewed_specialty ?? base.reviewed_specialty ?? "",
  };
}

export function AdminWorkshopProfileEditor({ placeId }: { placeId: string }) {
  const [base, setBase] = useState<Base | null>(null);
  const [override, setOverride] = useState<Override | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const apiBase = useMemo(
    () => `/api/admin/partners/${encodeURIComponent(placeId)}`,
    [placeId]
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/profile`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذّر تحميل بيانات الكراج.");
      setBase(data.workshop);
      setOverride(data.override ?? null);
      setForm(initialForm(data.workshop, data.override ?? null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر التحميل.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${apiBase}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذّر الحفظ.");
      setOverride(data.override);
      if (data.workshop) setBase(data.workshop);
      setMessage("تم حفظ تعديلات صفحة الكراج ✓");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${apiBase}/media`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذّر رفع الصورة.");
      setOverride((prev) => ({
        ...(prev ?? {
          name: null,
          phone: null,
          phone_intl: null,
          website: null,
          address: null,
          area: null,
          reviewed_specialty: null,
          hero_image_url: null,
          gallery_image_urls: [],
        }),
        hero_image_url: data.hero_image_url,
        gallery_image_urls: data.gallery_image_urls,
      }));
      setMessage("تم رفع الصورة ✓");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر رفع الصورة.");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(url: string) {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${apiBase}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذّر حذف الصورة.");
      setOverride((prev) =>
        prev
          ? {
              ...prev,
              hero_image_url: data.hero_image_url,
              gallery_image_urls: data.gallery_image_urls,
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حذف الصورة.");
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">جارٍ تحميل بيانات الكراج…</p>;
  if (!base || !form) return <p className="text-sm text-red-400">{error || "الكراج غير متاح."}</p>;

  const fields: Array<{ key: keyof FormState; label: string; placeholder?: string }> = [
    { key: "name", label: "اسم الكراج" },
    { key: "phone", label: "الهاتف المحلي" },
    { key: "phone_intl", label: "الهاتف الدولي / واتساب" },
    { key: "website", label: "الموقع الإلكتروني", placeholder: "https://..." },
    { key: "area", label: "المنطقة" },
    { key: "address", label: "العنوان" },
    { key: "reviewed_specialty", label: "التخصص الظاهر" },
  ];
  const gallery = override?.gallery_image_urls ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-5">
          <p className="text-xs text-muted-foreground">القيم الأصلية تظل محفوظة في مصدر الدليل</p>
          <h2 className="mt-1 text-xl font-extrabold">تعديل البيانات العامة</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            أي تعديل تحفظه هنا يظهر مباشرة في المنصة، ويُحمى من أن يمسحه تحديث كتالوج لاحق.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <label key={f.key} className={f.key === "address" ? "sm:col-span-2" : ""}>
              <span className="mb-1 block text-sm font-bold">{f.label}</span>
              <input
                value={form[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-[#FFD60A] focus:outline-none"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="mt-5 rounded-lg bg-[#FFD60A] px-5 py-2.5 text-sm font-extrabold text-[#0A0A0A] disabled:opacity-50"
        >
          {saving ? "جارٍ الحفظ…" : "حفظ التعديلات"}
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-extrabold">صور الكراج الحقيقية</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          JPG / PNG / WEBP، بحد 5MB للصورة، وحتى 8 صور. أول صورة تصبح الصورة الرئيسية تلقائيًا وتظهر في Hero صفحة الكراج.
        </p>
        <label className="mt-4 inline-flex cursor-pointer rounded-lg border border-[#FFD60A]/50 bg-[#FFD60A]/10 px-4 py-2 text-sm font-extrabold text-[#FFD60A]">
          {uploading ? "جارٍ الرفع…" : "رفع صورة"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading || gallery.length >= 8}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.currentTarget.value = "";
            }}
          />
        </label>

        {gallery.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((url, i) => (
              <div key={url} className="overflow-hidden rounded-xl border border-border bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`صورة ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="text-[11px] text-muted-foreground">
                    {url === override?.hero_image_url ? "الصورة الرئيسية" : `صورة ${i + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeImage(url)}
                    className="text-xs font-bold text-red-400"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {(error || message) && (
        <div className={`rounded-lg border p-3 text-sm ${error ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-green-500/40 bg-green-500/10 text-green-400"}`}>
          {error || message}
        </div>
      )}
    </div>
  );
}
