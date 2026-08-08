import type { Locale } from "./direction";

// Minimal, OWNED placeholder strings for the M0 foundation only. This is not the
// product's translation system — it deliberately duplicates a handful of strings
// (per the architecture contract: do not over-engineer web↔mobile translation
// sharing in M0). Long-term translation-data ownership: reuse the canonical
// message data from the web catalog once real shared product screens exist
// (evaluated no earlier than M1/M2), not before.

export type Dict = {
  appName: string;
  foundation: string;
  tabs: { home: string; search: string; saved: string; account: string };
  placeholder: string;
  languageLabel: string;
  directionLabel: string;
  rtlReloadNote: string;
};

export const MESSAGES: Record<Locale, Dict> = {
  ar: {
    appName: "دق سلف",
    foundation: "الأساس الأصلي لتطبيق الموبايل (M0)",
    tabs: { home: "الرئيسية", search: "البحث", saved: "المحفوظة", account: "حسابي" },
    placeholder: "شاشة مبدئية — بلا بيانات إنتاج بعد.",
    languageLabel: "اللغة",
    directionLabel: "الاتجاه",
    rtlReloadNote:
      "قلب اتجاه التخطيط بالكامل (RTL/LTR) يتطلب إعادة تشغيل التطبيق في React Native.",
  },
  en: {
    appName: "DEGSELF",
    foundation: "Native mobile foundation (M0)",
    tabs: { home: "Home", search: "Search", saved: "Saved", account: "Account" },
    placeholder: "Placeholder screen — no production data yet.",
    languageLabel: "Language",
    directionLabel: "Direction",
    rtlReloadNote:
      "Full RTL/LTR layout mirroring requires an app restart in React Native.",
  },
  hi: {
    appName: "DEGSELF",
    foundation: "नेटिव मोबाइल फ़ाउंडेशन (M0)",
    tabs: { home: "होम", search: "खोज", saved: "सहेजे", account: "खाता" },
    placeholder: "प्लेसहोल्डर स्क्रीन — अभी कोई प्रोडक्शन डेटा नहीं।",
    languageLabel: "भाषा",
    directionLabel: "दिशा",
    rtlReloadNote:
      "पूर्ण RTL/LTR लेआउट मिररिंग के लिए React Native में ऐप रीस्टार्ट ज़रूरी है।",
  },
  ur: {
    appName: "دق سلف",
    foundation: "نیٹو موبائل فاؤنڈیشن (M0)",
    tabs: { home: "ہوم", search: "تلاش", saved: "محفوظ", account: "اکاؤنٹ" },
    placeholder: "پلیس ہولڈر اسکرین — ابھی کوئی پروڈکشن ڈیٹا نہیں۔",
    languageLabel: "زبان",
    directionLabel: "سمت",
    rtlReloadNote:
      "مکمل RTL/LTR لے آؤٹ مررنگ کے لیے React Native میں ایپ ری اسٹارٹ ضروری ہے۔",
  },
};

export const LOCALE_LABEL: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
  hi: "हिन्दी",
  ur: "اردو",
};
