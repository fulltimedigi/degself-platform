"use client";

import { useEffect, useMemo, useState } from "react";

type CustomItem = { label: string; value: string };
type CustomSection = { title: string; items: CustomItem[] };

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
  custom_sections: CustomSection[] | null;
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
  const [sections, setSections] = useState<CustomSection[]>([]);
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
      setSections(Array.isArray(data.override?.custom_sections) ? data.override.custom_sections : []);
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

  function addSection() {
    if (sections.length >= 8) return;
    setSections((prev) => [...prev, { title: "", items: [{ label: "", value: "" }] }]);
  }

  function updateSectionTitle(sectionIndex: number, title: string) {
    setSections((prev) =>
      prev.map((section, i) => (i === sectionIndex ? { ...section, title } : section))
    );
  }

  function removeSection(sectionIndex: number) {
    setSections((prev) => prev.filter((_, i) => i !== sectionIndex));
  }

  function addItem(sectionIndex: number) {
    setSections((prev) =>
      prev.map((section, i) =>
        i === sectionIndex && section.items.length < 20
          ? { ...section, items: [...section.items, { label: "", value: "" }] }
          : section
      )
    );
  }

  function updateItem(sectionIndex: number, itemIndex: number, field: keyof CustomItem, value: string) {
    setSections((prev) =>
      prev.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              items: section.items.map((item, j) =>
                j === itemIndex ? { ...item, [field]: value } : item
              ),
            }
          : section
      )
    );
  }

  function removeItem(sectionIndex: number, itemIndex: number) {
    setSections((prev) =>
      prev.map((section, i) =>
        i === sectionIndex
          ? { ...section, items: section.items.filter((_, j) => j !== itemIndex) }
          : section
      )
    );
  }

  async function save() {
    if (!form) return;
    for (const section of sections) {
      if (!section.title.trim()) {
        setError("اكتب اسم الخانة الإضافية قبل الحفظ.");
        return;
      }
      for (const item of section.items) {
        if (!item.label.trim() || !item.value.trim()) {
          setError("كل عنصر في الخانات الإضافية يحتاج اسمًا وقيمة.");
          return;
        }
      }
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${apiBase}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, custom_sections: sections }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذّر الحفظ.");
      setOverride(data.override);
      setSections(Array.isArray(data.override?.custom_sections) ? data.override.custom_sections : []);
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
          custom_sections: sections,
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
            أي تعديل تحفظه هنا يظهر في المنصة، ويُحمى من أن يمسحه تحديث كتالوج لاحق.
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
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">خانات إضافية</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              أضف أي خانة خاصة بهذا الكراج، مثل أشهر الخدمات والأسعار أو الضمان أو طرق الدفع.
            </p>
          </div>
          <button
            type="button"
            onClick={addSection}
            disabled={sections.length >= 8}
            className="rounded-lg border border-[#FFD60A]/50 bg-[#FFD60A]/10 px-4 py-2 text-sm font-extrabold text-[#FFD60A] disabled:opacity-40"
          >
            + إضافة خانة
          </button>
        </div>

        {sections.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            لا توجد خانات إضافية بعد. اضغط «+ إضافة خانة» لإنشاء أول خانة.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-end gap-2">
                  <label className="flex-1">
                    <span className="mb-1 block text-sm font-bold">اسم الخانة</span>
                    <input
                      value={section.title}
                      onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                      placeholder="مثال: أشهر الخدمات"
                      maxLength={80}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:border-[#FFD60A] focus:outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeSection(sectionIndex)}
                    className="rounded-lg px-3 py-2.5 text-sm font-bold text-red-400"
                  >
                    حذف الخانة
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        value={item.label}
                        onChange={(e) => updateItem(sectionIndex, itemIndex, "label", e.target.value)}
                        placeholder="الخدمة — مثال: تغيير زيت"
                        maxLength={120}
                        className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:border-[#FFD60A] focus:outline-none"
                      />
                      <input
                        value={item.value}
                        onChange={(e) => updateItem(sectionIndex, itemIndex, "value", e.target.value)}
                        placeholder="القيمة — مثال: 8 د.ك"
                        maxLength={120}
                        className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:border-[#FFD60A] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(sectionIndex, itemIndex)}
                        className="rounded-lg px-3 py-2 text-sm font-bold text-red-400"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addItem(sectionIndex)}
                  disabled={section.items.length >= 20}
                  className="mt-3 text-sm font-extrabold text-[#FFD60A] disabled:opacity-40"
                >
                  + إضافة عنصر داخل الخانة
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">الحد الأقصى: 8 خانات، و20 عنصرًا داخل كل خانة.</p>
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

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-lg bg-[#FFD60A] px-5 py-2.5 text-sm font-extrabold text-[#0A0A0A] disabled:opacity-50"
      >
        {saving ? "جارٍ الحفظ…" : "حفظ كل التعديلات"}
      </button>

      {(error || message) && (
        <div className={`rounded-lg border p-3 text-sm ${error ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-green-500/40 bg-green-500/10 text-green-400"}`}>
          {error || message}
        </div>
      )}
    </div>
  );
}
