// Localized copy for the Settings hub, the "my requests" screen, and the local
// contact-profile editor. Self-contained (ar/en authored; hi/ur fall back to
// en), matching the pattern of the other feature copy modules.
export type SettingsLocale = "ar" | "en" | "hi" | "ur";

type Copy = {
  title: string;
  accountSection: string;
  appSection: string;
  emailLabel: string;
  emailManagedNote: string;
  profileTitle: string;
  profileHint: string;
  nameLabel: string;
  namePh: string;
  whatsappLabel: string;
  whatsappPh: string;
  save: string;
  saved: string;
  savedGarages: string;
  myQuotes: string;
  language: string;
  appearance: string;
  privacy: string;
  about: string;
  version: string;
  signIn: string;
  signInHint: string;
  // "my requests" screen
  myQuotesTitle: string;
  myQuotesEmpty: string;
  myQuotesClear: string;
  myQuotesNote: string;
  // saved screen (now reached from Settings)
  savedTitle: string;
};

const ar: Copy = {
  title: "الإعدادات",
  accountSection: "ضبط الحساب",
  appSection: "ضبط التطبيق",
  emailLabel: "البريد الإلكتروني",
  emailManagedNote: "يُدار عبر تسجيل الدخول بحسابك.",
  profileTitle: "بياناتي للطلب",
  profileHint: "تُحفظ على جهازك، وتُملأ تلقائيًا في نموذج طلب عرض السعر.",
  nameLabel: "الاسم",
  namePh: "الاسم",
  whatsappLabel: "رقم الواتساب",
  whatsappPh: "مثال: 9xxxxxxx",
  save: "حفظ",
  saved: "تم الحفظ",
  savedGarages: "الكراجات المحفوظة",
  myQuotes: "طلباتي لعروض الأسعار",
  language: "اللغة",
  appearance: "المظهر",
  privacy: "الخصوصية وحذف البيانات",
  about: "عن التطبيق",
  version: "الإصدار",
  signIn: "تسجيل الدخول",
  signInHint: "سجّل الدخول لمزامنة محفوظاتك عبر أجهزتك.",
  myQuotesTitle: "طلباتي لعروض الأسعار",
  myQuotesEmpty: "لم ترسل أي طلب عرض سعر بعد.",
  myQuotesClear: "مسح السجل",
  myQuotesNote: "هذه نسخة محلية على جهازك لطلباتك المُرسلة من التطبيق.",
  savedTitle: "الكراجات المحفوظة",
};

const en: Copy = {
  title: "Settings",
  accountSection: "Account",
  appSection: "App",
  emailLabel: "Email",
  emailManagedNote: "Managed by your sign-in account.",
  profileTitle: "My request details",
  profileHint: "Stored on your device and pre-filled into the quote request form.",
  nameLabel: "Name",
  namePh: "Name",
  whatsappLabel: "WhatsApp number",
  whatsappPh: "e.g. 9xxxxxxx",
  save: "Save",
  saved: "Saved",
  savedGarages: "Saved garages",
  myQuotes: "My quote requests",
  language: "Language",
  appearance: "Appearance",
  privacy: "Privacy & data deletion",
  about: "About",
  version: "Version",
  signIn: "Sign in",
  signInHint: "Sign in to sync your saved garages across devices.",
  myQuotesTitle: "My quote requests",
  myQuotesEmpty: "You haven't sent any quote requests yet.",
  myQuotesClear: "Clear history",
  myQuotesNote: "This is a local record on your device of requests sent from the app.",
  savedTitle: "Saved garages",
};

const TABLE: Record<SettingsLocale, Copy> = { ar, en, hi: en, ur: en };

export function settingsCopy(locale: string): Copy {
  return TABLE[(locale as SettingsLocale)] ?? ar;
}
