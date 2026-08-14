"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { track } from "@/lib/track";

const SERVICES: { key: string; value: string }[] = [
  { key: "mechanics", value: "ميكانيكا ومكينة (توضيب، تجفيت، زيوت)" },
  { key: "gearbox", value: "قير / جير (تصليح، تجفيت، برمجة)" },
  { key: "electrical", value: "كهرباء وكمبيوتر السيارة" },
  { key: "ac", value: "تكييف وفريون" },
  { key: "suspension", value: "هيئة أمامية ومساعدات (مقصات، ميزان، دعاميات)" },
  { key: "brakes", value: "فرامل (تيل، دسكات، ABS)" },
  { key: "tires", value: "بنشر وتواير وبطاريات" },
  { key: "bodywork", value: "حدادة وصبغ (سمكرة وحوادث)" },
  { key: "exhaust", value: "إكسوز / شكمان (فم)" },
  { key: "detailing", value: "ديتيلنج وتلميع وحماية (PPF، تظليل)" },
  { key: "towing", value: "ونش / سطحة" },
  { key: "mobile", value: "خدمة متنقلة عند البيت" },
  { key: "other", value: "خدمة أخرى (اكتبها في وصف المشكلة)" },
];

const AREAS: { key: string; value: string }[] = [
  { key: "capital", value: "العاصمة" },
  { key: "hawalli", value: "حولي" },
  { key: "farwaniya", value: "الفروانية" },
  { key: "ahmadi", value: "الأحمدي" },
  { key: "jahra", value: "الجهراء" },
  { key: "mubarak", value: "مبارك الكبير" },
];

const YEARS = Array.from({ length: 2026 - 1980 + 1 }, (_, i) => String(2026 - i));

const URGENCIES: { key: string; value: string }[] = [
  { key: "normal", value: "عادي" },
  { key: "urgent", value: "مستعجل" },
  { key: "emergency", value: "طارئ" },
];

const FLOW_COPY = {
  ar: {
    issue: "ما المشكلة؟",
    car: "سيارتك",
    timing: "أين ومتى؟",
    contact: "كيف نرسل لك العروض؟",
    areaHint: "اختياري — يساعدنا نرسل الطلب لكراجات أقرب لك.",
    emergencyHint: "طارئ = السيارة متوقفة أو غير آمنة للقيادة.",
  },
  en: {
    issue: "What is the problem?",
    car: "Your vehicle",
    timing: "Where and how urgent?",
    contact: "Where should we send the offers?",
    areaHint: "Optional — helps us route your request to closer garages.",
    emergencyHint: "Emergency = the vehicle is stopped or unsafe to drive.",
  },
  hi: {
    issue: "समस्या क्या है?",
    car: "आपकी गाड़ी",
    timing: "कहाँ और कितनी जल्दी?",
    contact: "ऑफर कहाँ भेजें?",
    areaHint: "वैकल्पिक — इससे हम नज़दीकी गैरेज चुन सकते हैं।",
    emergencyHint: "आपातकाल = गाड़ी बंद है या चलाना सुरक्षित नहीं है।",
  },
  ur: {
    issue: "مسئلہ کیا ہے؟",
    car: "آپ کی گاڑی",
    timing: "کہاں اور کتنی جلدی؟",
    contact: "آفرز کہاں بھیجیں؟",
    areaHint: "اختیاری — اس سے ہم قریب کے گیراجوں کو درخواست بھیج سکتے ہیں۔",
    emergencyHint: "ایمرجنسی = گاڑی بند ہے یا چلانا محفوظ نہیں۔",
  },
} as const;

const MAX_PHOTOS = 3;

/**
 * Downscale a photo to a web-friendly JPEG before upload. Phone photos are often
 * 5-12MB and HEIC; drawing through a canvas both shrinks them and normalizes the
 * format (Safari decodes HEIC), so uploads stay small and pass the server's
 * JPEG/PNG/WEBP gate. Falls back to the original file if the browser can't decode.
 */
async function downscaleToJpeg(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export type QuoteMatchedWorkshop = {
  place_id: string;
  name: string;
  phone?: string;
};

export type QuoteFormPrefill = {
  service?: string;
  problem?: string;
  carMake?: string;
  carModel?: string;
  carYear?: string;
  matchedWorkshops?: QuoteMatchedWorkshop[];
  source?: "quote_bar" | "translator" | "asaali" | "concierge";
};

export function NewQuoteForm({
  initialService = "",
  initialProblem = "",
  initialCarMake = "",
  initialCarModel = "",
  initialCarYear = "",
  initialMatchedWorkshops,
  source = "quote_bar",
  compact = false,
  onDone,
}: {
  initialService?: string;
  initialProblem?: string;
  initialCarMake?: string;
  initialCarModel?: string;
  initialCarYear?: string;
  initialMatchedWorkshops?: QuoteMatchedWorkshop[];
  source?: QuoteFormPrefill["source"];
  compact?: boolean;
  onDone?: (quoteId: string) => void;
}) {
  const t = useTranslations("quote");
  const locale = useLocale();
  const flow = FLOW_COPY[(locale in FLOW_COPY ? locale : "ar") as keyof typeof FLOW_COPY];
  const startedRef = useRef(false);
  const serviceIsKnown = SERVICES.some((s) => s.value === initialService);
  const [service, setService] = useState(serviceIsKnown ? initialService : "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [carMake, setCarMake] = useState(initialCarMake);
  const [carModel, setCarModel] = useState(initialCarModel);
  const [carYear, setCarYear] = useState(initialCarYear);
  const [problem, setProblem] = useState(initialProblem);
  const [area, setArea] = useState("");
  const [urgency, setUrgency] = useState("عادي");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    markStarted();
    setPhotoError("");
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file after a remove
    if (!files.length) return;
    if (photos.length >= MAX_PHOTOS) {
      setPhotoError(t("photoMax"));
      return;
    }
    const batch = files.slice(0, MAX_PHOTOS - photos.length);
    setUploading(true);
    try {
      for (const f of batch) {
        if (!f.type.startsWith("image/")) {
          setPhotoError(t("photoErrType"));
          continue;
        }
        const blob = await downscaleToJpeg(f);
        const fd = new FormData();
        fd.append("file", new File([blob], "fault.jpg", { type: blob.type || "image/jpeg" }));
        try {
          const res = await fetch("/api/quote-photos", { method: "POST", body: fd });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || typeof data.url !== "string") {
            setPhotoError(data.error ?? t("photoErrUpload"));
            continue;
          }
          setPhotos((prev) => (prev.length < MAX_PHOTOS ? [...prev, data.url] : prev));
        } catch {
          setPhotoError(t("photoErrUpload"));
        }
      }
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    setPhotoError("");
    setPhotos((prev) => prev.filter((u) => u !== url));
  }

  useEffect(() => {
    track("quote_form_view", {
      source,
      locale,
      service: serviceIsKnown ? initialService : undefined,
      with_image: false,
    });
  }, [initialService, locale, serviceIsKnown, source]);

  function markStarted() {
    if (startedRef.current) return;
    startedRef.current = true;
    track("quote_start", {
      source,
      locale,
      service: service || undefined,
      with_image: photos.length > 0,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return; // don't submit with a photo still uploading
    setError("");
    if (customerName.trim().length < 2) return setError(t("errName"));
    if (!/^\d{8}$/.test(customerPhone.trim())) return setError(t("errPhone"));
    if (!service) return setError(t("errService"));
    if (problem.trim().length < 10) return setError(t("errProblem"));
    if (!carMake.trim()) return setError(t("errCarMake"));
    if (!carModel.trim()) return setError(t("errCarModel"));
    if (!carYear) return setError(t("errCarYear"));

    setStatus("sending");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          service,
          car_make: carMake,
          car_model: carModel,
          car_year: carYear,
          problem_description: problem,
          area,
          urgency,
          source,
          matched_workshops: initialMatchedWorkshops ?? [],
          photos,
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? t("errSend"));
        return;
      }
      track("quote_submit", { service, source, locale, with_image: photos.length > 0 });
      const id = typeof data.id === "string" ? data.id : "";
      setQuoteId(id);
      setStatus("done");
      onDone?.(id);
    } catch {
      setStatus("error");
      setError(t("errConn"));
    }
  }

  if (status === "done") {
    return (
      <div className={`rounded-2xl border-2 border-[#FFD60A] bg-[#0A0A0A] text-center text-white ${compact ? "p-4" : "p-6"}`}>
        <p className={`mb-3 font-extrabold ${compact ? "text-base" : "text-lg"}`}>{t("doneTitle")}</p>
        {quoteId && <p className="mb-3 text-sm text-gray-300">{t("doneId")} <span dir="ltr" className="font-mono text-[#FFD60A]">{quoteId}</span></p>}
        <p className="text-sm text-gray-300">{t("doneBody")}</p>
      </div>
    );
  }

  const inputCls = compact
    ? "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-[#FFD60A] focus:outline-none"
    : "w-full rounded-lg border border-border bg-card px-3 py-3 text-base focus:border-[#FFD60A] focus:outline-none";
  const labelCls = compact ? "mb-1 block text-xs font-bold text-neutral-300" : "mb-1 block text-sm font-bold";
  const req = <span className="text-red-500">*</span>;
  const sectionTitle = compact ? "text-sm font-extrabold text-[#FFD60A]" : "text-base font-extrabold text-[#FFD60A]";

  return (
    <form onSubmit={submit} onChangeCapture={markStarted} className={`flex flex-col ${compact ? "gap-3" : "gap-5"}`} noValidate>
      <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />

      <section className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
        <h3 className={sectionTitle}>{flow.issue}</h3>
        <div>
          <label className={labelCls}>{t("serviceLabel")} {req}</label>
          <select value={service} onChange={(e) => setService(e.target.value)} className={inputCls}>
            <option value="">{t("servicePlaceholder")}</option>
            {SERVICES.map((s) => <option key={s.key} value={s.value}>{t(`services.${s.key}`)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("problemLabel")} {req}</label>
          <textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder={t("problemPlaceholder")} className={inputCls} rows={compact ? 3 : 4} maxLength={1000} />
        </div>

        {/* Optional fault photos — documents the problem for a more accurate quote. */}
        <div>
          <label className={labelCls}>{t("photoLabel")}</label>
          <div className="flex flex-wrap items-center gap-2">
            {photos.map((url) => (
              <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  aria-label={t("photoRemove")}
                  className="absolute end-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition hover:border-[#FFD60A] disabled:opacity-60 ${compact ? "border-neutral-700 text-neutral-300" : "border-border text-muted-foreground"}`}
              >
                {uploading ? (
                  <span className="px-1 text-center text-[10px] leading-tight">{t("photoUploading")}</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    <span className="text-[10px] font-bold">{t("photoAdd")}</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPickPhotos}
              className="hidden"
              tabIndex={-1}
            />
          </div>
          {photoError && <p className="mt-1 text-xs text-red-400">{photoError}</p>}
          {!compact && <p className="mt-1 text-xs text-muted-foreground">{t("photoHint")}</p>}
        </div>
      </section>

      <section className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
        <h3 className={sectionTitle}>{flow.car}</h3>
        <div className={`grid grid-cols-1 ${compact ? "gap-3" : "gap-4 sm:grid-cols-3"}`}>
          <div><label className={labelCls}>{t("carMakeLabel")} {req}</label><input type="text" value={carMake} onChange={(e) => setCarMake(e.target.value)} placeholder={t("carMakePlaceholder")} className={inputCls} maxLength={60} /></div>
          <div><label className={labelCls}>{t("carModelLabel")} {req}</label><input type="text" value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder={t("carModelPlaceholder")} className={inputCls} maxLength={60} /></div>
          <div><label className={labelCls}>{t("carYearLabel")} {req}</label><select value={carYear} onChange={(e) => setCarYear(e.target.value)} className={inputCls}><option value="">{t("yearPlaceholder")}</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
        </div>
      </section>

      <section className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
        <h3 className={sectionTitle}>{flow.timing}</h3>
        <div>
          <label className={labelCls}>{t("areaLabel")}</label>
          <select value={area} onChange={(e) => setArea(e.target.value)} className={inputCls}>
            <option value="">{t("areaAny")}</option>
            {AREAS.map((a) => <option key={a.key} value={a.value}>{t(`areas.${a.key}`)}</option>)}
          </select>
          {!compact && <p className="mt-1 text-xs text-muted-foreground">{flow.areaHint}</p>}
        </div>
        <div>
          <span className={labelCls}>{t("urgencyLabel")}</span>
          <div className="grid grid-cols-3 gap-2">
            {URGENCIES.map((u) => (
              <button type="button" key={u.key} onClick={() => { markStarted(); setUrgency(u.value); }} className={`rounded-lg border py-2 text-sm font-bold transition ${urgency === u.value ? "border-[#FFD60A] bg-[#FFD60A] text-[#0A0A0A]" : "border-border bg-card text-foreground"}`}>{t(`urgency.${u.key}`)}</button>
            ))}
          </div>
          {!compact && <p className="mt-1.5 text-xs text-muted-foreground">{flow.emergencyHint}</p>}
        </div>
      </section>

      <section className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
        <h3 className={sectionTitle}>{flow.contact}</h3>
        <div className={`grid grid-cols-1 ${compact ? "gap-3" : "gap-4 sm:grid-cols-2"}`}>
          <div><label className={labelCls}>{t("nameLabel")} {req}</label><input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t("namePlaceholder")} className={inputCls} maxLength={60} /></div>
          <div><label className={labelCls}>{t("phoneLabel")} {req}</label><input type="tel" inputMode="numeric" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d]/g, ""))} placeholder={t("phonePlaceholder")} className={inputCls} dir="ltr" maxLength={8} />{!compact && <p className="mt-1 text-xs text-muted-foreground">{t("phoneNote")}</p>}</div>
        </div>
      </section>

      {error && <div className={compact ? "rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300" : "rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"}>{error}</div>}

      <button type="submit" disabled={status === "sending" || uploading} className={`rounded-lg bg-[#FFD60A] font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:opacity-60 ${compact ? "px-4 py-3 text-sm" : "px-4 py-4 text-base"}`}>
        {status === "sending" ? t("submitting") : uploading ? t("photoUploading") : t("submit")}
      </button>

      {!compact && <><p className="text-center text-xs text-muted-foreground">{t("footerFree")}</p><p className="text-center text-[11px] leading-relaxed text-muted-foreground">{t("consent")}</p></>}
    </form>
  );
}
