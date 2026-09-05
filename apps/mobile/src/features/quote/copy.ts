// Localized copy for the RFQ (request-for-quote) screen. Kept separate from the
// strict i18n Dict so this feature is self-contained. Arabic and English are
// authored fully; hi/ur fall back to English (the screen still functions and the
// service/area values it submits are Arabic-canonical regardless of UI locale).
export type QuoteLocale = "ar" | "en" | "hi" | "ur";

type Copy = {
  title: string; subtitle: string;
  serviceLabel: string; carLabel: string; makeLabel: string; makePh: string;
  modelLabel: string; modelPh: string; yearLabel: string;
  areaLabel: string; urgencyLabel: string; problemLabel: string; problemPh: string;
  nameLabel: string; namePh: string; phoneLabel: string; phonePh: string;
  pick: string; required: string; submit: string; submitting: string; free: string;
  successTitle: string; successBody: string; again: string;
  errName: string; errPhone: string; errService: string; errCar: string;
  errArea: string; errProblem: string; errGeneric: string; errRate: string;
};

const ar: Copy = {
  title: "اطلب عرض سعر",
  subtitle: "اكتب مشكلتك مرة واحدة، ونرسلها إلى الكراجات المتخصصة في منطقتك — لتصلك عروض تختار أنسبها.",
  serviceLabel: "نوع الخدمة", carLabel: "سيارتك", makeLabel: "الماركة", makePh: "مثال: تويوتا",
  modelLabel: "الطراز", modelPh: "مثال: كامري", yearLabel: "سنة الصنع",
  areaLabel: "المنطقة", urgencyLabel: "درجة الاستعجال", problemLabel: "اشرح المشكلة",
  problemPh: "مثال: صوت عند الفرامل، والسيارة تميل إلى أحد الجانبين…",
  nameLabel: "اسمك", namePh: "الاسم", phoneLabel: "رقم الواتساب", phonePh: "مثال: 9xxxxxxx",
  pick: "اختر", required: "مطلوب", submit: "أرسل الطلب — مجانًا", submitting: "جارٍ الإرسال…", free: "مجانًا · بدون رسوم",
  successTitle: "تم استلام طلبك ✅",
  successBody: "سنرسل مشكلتك إلى الكراجات المتخصصة في منطقتك، وتصلك عروض الأسعار عبر واتساب. تابع رسائلك.",
  again: "إرسال طلب آخر",
  errName: "اكتب اسمك (حرفان على الأقل).", errPhone: "اكتب رقم واتساب صحيحًا.",
  errService: "اختر نوع الخدمة.", errCar: "أكمل بيانات السيارة (الماركة والطراز والسنة).",
  errArea: "اختر المنطقة.", errProblem: "اشرح المشكلة (١٠ أحرف على الأقل).",
  errGeneric: "تعذّر إرسال الطلب، حاول مرة أخرى.", errRate: "أرسلت طلبًا قبل قليل، انتظر لحظات.",
};

const en: Copy = {
  title: "Request quotes",
  subtitle: "Describe your problem once — we route it to specialist garages near you, and offers come back for you to compare.",
  serviceLabel: "Service type", carLabel: "Your car", makeLabel: "Make", makePh: "e.g. Toyota",
  modelLabel: "Model", modelPh: "e.g. Camry", yearLabel: "Year",
  areaLabel: "Area", urgencyLabel: "Urgency", problemLabel: "Describe the problem",
  problemPh: "e.g. Noise when braking and the car pulls to one side…",
  nameLabel: "Your name", namePh: "Name", phoneLabel: "WhatsApp number", phonePh: "e.g. 9xxxxxxx",
  pick: "Select", required: "required", submit: "Send request — free", submitting: "Sending…", free: "Free · no fees",
  successTitle: "Request received ✅",
  successBody: "We'll route your problem to specialist garages in your area, and price offers will come back on WhatsApp. Keep an eye on your messages.",
  again: "Send another request",
  errName: "Enter your name (at least 2 characters).", errPhone: "Enter a valid WhatsApp number.",
  errService: "Choose a service type.", errCar: "Complete the car details (make, model, year).",
  errArea: "Choose your area.", errProblem: "Describe the problem (at least 10 characters).",
  errGeneric: "Couldn't send the request, please try again.", errRate: "You sent a request recently — please wait a bit.",
};

const TABLE: Record<QuoteLocale, Copy> = { ar, en, hi: en, ur: en };
export function quoteCopy(locale: string): Copy {
  return TABLE[(locale as QuoteLocale)] ?? ar;
}
