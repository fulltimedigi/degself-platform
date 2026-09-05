// Localized copy for the "اسأل دق سلف" (Ask DEGSELF) assistant screen. Kept
// separate from the strict i18n Dict so the feature is self-contained. Arabic
// and English are authored fully; hi/ur fall back to English (the assistant
// still understands input in any language — the reply language is driven by the
// `locale` sent to the server).
export type AsaaliLocale = "ar" | "en" | "hi" | "ur";

type Copy = {
  badge: string;
  title: string;
  subtitle: string;
  inputPlaceholder: string;
  ask: string;
  asking: string;
  newChat: string;
  vehicleToggleShow: string;
  vehicleToggleHide: string;
  vehicleHint: string;
  makeLabel: string;
  makePh: string;
  modelLabel: string;
  modelPh: string;
  yearLabel: string;
  pick: string;
  followUpLabel: string;
  summaryLabel: string;
  explanationLabel: string;
  workshopsLabel: string;
  officialTermLabel: string;
  whatsappLabel: string;
  warnUrgent: string;
  warnCaution: string;
  callBtn: string;
  whatsappBtn: string;
  shareBtn: string;
  viewAllWorkshops: string;
  errConn: string;
  emptyTitle: string;
  emptyExamples: readonly string[];
  disclaimer: string;
};

const ar: Copy = {
  badge: "مساعد ذكي · مجانًا",
  title: "اسأل دق سلف",
  subtitle: "اكتب مشكلة سيارتك بكلماتك، ونحدّد لك نوع العطل، ونرشّح كراجات مختصة، ونجهّز رسالة جاهزة ترسلها إلى الكراج.",
  inputPlaceholder: "مثال: تتلعثم السيارة عند تشغيلها صباحًا، ويصدر صوت من الأمام…",
  ask: "شخِّص المشكلة",
  asking: "جارٍ التشخيص…",
  newChat: "محادثة جديدة",
  vehicleToggleShow: "أضف بيانات سيارتك (اختياري)",
  vehicleToggleHide: "إخفاء بيانات السيارة",
  vehicleHint: "اختياري — يرفع دقة التشخيص، ويمكنك السؤال بدونه.",
  makeLabel: "الماركة",
  makePh: "مثال: تويوتا",
  modelLabel: "الطراز",
  modelPh: "مثال: كامري",
  yearLabel: "سنة الصنع",
  pick: "اختر",
  followUpLabel: "سؤال بسيط لتوضيح المشكلة",
  summaryLabel: "ملخّص المشكلة",
  explanationLabel: "السبب المحتمل",
  workshopsLabel: "كراجات مختصة مقترحة",
  officialTermLabel: "المصطلح الرسمي (للفنّي)",
  whatsappLabel: "رسالة جاهزة للكراج",
  warnUrgent: "تحذير — عاجل",
  warnCaution: "انتبه",
  callBtn: "اتصال",
  whatsappBtn: "واتساب",
  shareBtn: "أرسل الرسالة",
  viewAllWorkshops: "تصفّح كل الكراجات",
  errConn: "تعذّر الاتصال، حاول مرة أخرى.",
  emptyTitle: "جرّب وصف مشكلتك بهذا الشكل:",
  emptyExamples: [
    "صرير في الفرامل والدوّاسة تهبط",
    "ناقل الحركة ينتفض والقابض ينزلق",
    "طقطقة في نظام التعليق عند المطبّات",
    "المكيّف لا يبرّد",
  ],
  disclaimer: "التشخيص تقديري لمساعدتك في الوصول إلى الكراج المناسب، والقرار النهائي للفنّي بعد الفحص.",
};

const en: Copy = {
  badge: "AI assistant · free",
  title: "Ask DEGSELF",
  subtitle: "Describe your car problem in your own words — we understand it, tell you the fault type, suggest specialist garages, and prepare a ready message to send them.",
  inputPlaceholder: "e.g. The car stutters on a cold start and there's a noise from the front…",
  ask: "Diagnose",
  asking: "Diagnosing…",
  newChat: "New chat",
  vehicleToggleShow: "Add your car details (optional)",
  vehicleToggleHide: "Hide car details",
  vehicleHint: "Optional — improves accuracy, but you can ask without it.",
  makeLabel: "Make",
  makePh: "e.g. Toyota",
  modelLabel: "Model",
  modelPh: "e.g. Camry",
  yearLabel: "Year",
  pick: "Select",
  followUpLabel: "A quick question to clarify",
  summaryLabel: "Problem summary",
  explanationLabel: "Likely cause",
  workshopsLabel: "Suggested specialist garages",
  officialTermLabel: "Official term (for the technician)",
  whatsappLabel: "Ready message for the garage",
  warnUrgent: "Warning — urgent",
  warnCaution: "Heads up",
  callBtn: "Call",
  whatsappBtn: "WhatsApp",
  shareBtn: "Send message",
  viewAllWorkshops: "Browse all garages",
  errConn: "Couldn't connect, please try again.",
  emptyTitle: "Try describing your problem like this:",
  emptyExamples: [
    "The brakes squeal and the pedal sinks",
    "The gearbox jerks and the clutch slips",
    "A knock in the suspension over bumps",
    "The A/C isn't cooling",
  ],
  disclaimer: "The diagnosis is an estimate to help you reach the right garage — the final call is the technician's after inspection.",
};

const TABLE: Record<AsaaliLocale, Copy> = { ar, en, hi: en, ur: en };

export function asaaliCopy(locale: string): Copy {
  return TABLE[(locale as AsaaliLocale)] ?? ar;
}
