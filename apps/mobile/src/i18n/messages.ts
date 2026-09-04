import type { Locale } from "./direction";

// OWNED strings for the mobile app. M0 shipped the foundation copy; M1 adds
// auth, favorites, and the account-deletion Danger Zone. next-intl is web-bound
// and intentionally not imported. Long-term translation-data ownership (reusing
// the canonical web catalog) is still deferred until real shared product screens
// exist — this remains a small, owned surface.

export type Dict = {
  appName: string;
  foundation: string;
  tabs: { home: string; search: string; saved: string; account: string };
  placeholder: string;
  languageLabel: string;
  directionLabel: string;
  rtlReloadNote: string;
  auth: {
    signedOutTitle: string;
    signedOutBody: string;
    continueWithGoogle: string;
    continueWithApple: string;
    appleIosOnly: string;
    signOut: string;
    signedInAs: string;
    cancelled: string;
    genericError: string;
  };
  saved: {
    guestTitle: string;
    guestBody: string;
    authTitle: string;
    empty: string;
    count: string; // "%d saved"
    remove: string;
    devAddSample: string;
  };
  workshops: {
    homeIntro: string;
    featured: string;
    searchAction: string;
    searchPlaceholder: string;
    resultCount: string;
    loading: string;
    loadError: string;
    retry: string;
    empty: string;
    noResults: string;
    openDetails: string;
    save: string;
    removeSaved: string;
    partner: string;
    hours: string;
    call: string;
    whatsapp: string;
    directions: string;
    website: string;
    verifyDetails: string;
    notFound: string;
    back: string;
    linkError: string;
  };
  privacy: { title: string; body: string; openPolicy: string };
  danger: {
    title: string;
    intro: string;
    consequences: string;
    deleteButton: string;
    step1Continue: string;
    typeToConfirm: string; // instructs typing the literal token DELETE
    confirmPlaceholder: string;
    confirmDelete: string;
    cancel: string;
    deleting: string;
    reauthNeeded: string;
    reauthButton: string;
    success: string;
  };
  errors: {
    deleteErrNotAuthenticated: string;
    deleteErrInvalidConfirmation: string;
    deleteErrAuthTooOld: string;
    deleteErrRateLimited: string;
    deleteErrPrivilegedRole: string;
    deleteErrClaimedWorkshop: string;
    deleteErrGeneric: string;
  };
};

export const MESSAGES: Record<Locale, Dict> = {
  ar: {
    appName: "دق سلف",
    foundation: "تطبيق الموبايل الأصلي",
    tabs: { home: "الرئيسية", search: "البحث", saved: "المحفوظة", account: "حسابي" },
    placeholder: "شاشة مبدئية — بلا بيانات إنتاج بعد.",
    languageLabel: "اللغة",
    directionLabel: "الاتجاه",
    rtlReloadNote:
      "قلب اتجاه التخطيط بالكامل (RTL/LTR) يتطلب إعادة تشغيل التطبيق في React Native.",
    auth: {
      signedOutTitle: "سجّل الدخول",
      signedOutBody: "سجّل الدخول لحفظ ورش السيارات ومزامنتها عبر أجهزتك.",
      continueWithGoogle: "المتابعة عبر Google",
      continueWithApple: "المتابعة عبر Apple",
      appleIosOnly: "تسجيل الدخول عبر Apple متاح على أجهزة iOS فقط.",
      signOut: "تسجيل الخروج",
      signedInAs: "مُسجّل الدخول باسم",
      cancelled: "أُلغِي تسجيل الدخول.",
      genericError: "تعذّر تسجيل الدخول. حاول مرة أخرى.",
    },
    saved: {
      guestTitle: "المحفوظة (كضيف)",
      guestBody: "محفوظاتك على هذا الجهاز فقط. سجّل الدخول لمزامنتها.",
      authTitle: "المحفوظة",
      empty: "لا توجد ورش محفوظة بعد.",
      count: "%d محفوظة",
      remove: "إزالة",
      devAddSample: "إضافة عنصر تجريبي (تطوير)",
    },
    workshops: {
      homeIntro: "ابحث بين ورش وكراجات السيارات في الكويت واحفظ الأنسب لك.",
      featured: "كراجات مقترحة",
      searchAction: "ابحث عن كراج",
      searchPlaceholder: "ابحث بالاسم أو الخدمة أو المنطقة",
      resultCount: "%d نتيجة",
      loading: "جارٍ تحميل الكراجات…",
      loadError: "تعذّر تحميل الكراجات الآن. تحقق من الاتصال وحاول مرة أخرى.",
      retry: "إعادة المحاولة",
      empty: "لا توجد كراجات متاحة حاليًا.",
      noResults: "لا توجد نتائج مطابقة. جرّب اسم خدمة أو منطقة أخرى.",
      openDetails: "عرض تفاصيل الكراج",
      save: "حفظ الكراج",
      removeSaved: "إزالة من المحفوظة",
      partner: "ضمن شبكة دق سلف",
      hours: "ساعات العمل",
      call: "اتصال",
      whatsapp: "واتساب",
      directions: "الاتجاهات على الخريطة",
      website: "الموقع الإلكتروني",
      verifyDetails: "ننصح بالتواصل مع الكراج لتأكيد المواعيد والخدمات قبل الزيارة.",
      notFound: "هذا الكراج غير متاح أو لم يعد مدرجًا.",
      back: "رجوع",
      linkError: "تعذّر فتح الرابط على هذا الجهاز.",
    },
    privacy: {
      title: "الخصوصية وحذف البيانات",
      body: "اطّلع على البيانات التي يستخدمها التطبيق وكيفية طلب حذف الحساب والبيانات.",
      openPolicy: "فتح سياسة الخصوصية",
    },
    danger: {
      title: "منطقة الخطر",
      intro: "حذف الحساب إجراء دائم لا يمكن التراجع عنه.",
      consequences:
        "سيتم حذف هويتك وملفك الشخصي وكل ورشك المحفوظة نهائيًا. لا يمكن استرجاع الحساب.",
      deleteButton: "حذف الحساب",
      step1Continue: "متابعة الحذف",
      typeToConfirm: "اكتب DELETE للتأكيد.",
      confirmPlaceholder: "اكتب DELETE",
      confirmDelete: "حذف حسابي نهائيًا",
      cancel: "إلغاء",
      deleting: "جارٍ الحذف…",
      reauthNeeded:
        "لأمانك، أعد تسجيل الدخول ثم أعد المحاولة لتأكيد الحذف.",
      reauthButton: "إعادة تسجيل الدخول",
      success: "تم حذف حسابك.",
    },
    errors: {
      deleteErrNotAuthenticated: "انتهت الجلسة. سجّل الدخول من جديد.",
      deleteErrInvalidConfirmation: "نص التأكيد غير صحيح. اكتب DELETE تمامًا.",
      deleteErrAuthTooOld:
        "يجب تسجيل دخول حديث. أعد تسجيل الدخول ثم أعد المحاولة.",
      deleteErrRateLimited: "محاولات كثيرة. حاول لاحقًا.",
      deleteErrPrivilegedRole:
        "لا يمكن حذف حساب مشرف ذاتيًا. تواصل مع الدعم.",
      deleteErrClaimedWorkshop:
        "حسابك مرتبط بورشة مُطالَب بها. أزِل الارتباط أولًا.",
      deleteErrGeneric: "تعذّر حذف الحساب. حاول مرة أخرى.",
    },
  },
  en: {
    appName: "DEGSELF",
    foundation: "Native mobile app",
    tabs: { home: "Home", search: "Search", saved: "Saved", account: "Account" },
    placeholder: "Placeholder screen — no production data yet.",
    languageLabel: "Language",
    directionLabel: "Direction",
    rtlReloadNote:
      "Full RTL/LTR layout mirroring requires an app restart in React Native.",
    auth: {
      signedOutTitle: "Sign in",
      signedOutBody: "Sign in to save workshops and sync them across your devices.",
      continueWithGoogle: "Continue with Google",
      continueWithApple: "Continue with Apple",
      appleIosOnly: "Sign in with Apple is available on iOS devices only.",
      signOut: "Sign out",
      signedInAs: "Signed in as",
      cancelled: "Sign-in cancelled.",
      genericError: "Couldn't sign in. Please try again.",
    },
    saved: {
      guestTitle: "Saved (guest)",
      guestBody: "Saved on this device only. Sign in to sync them.",
      authTitle: "Saved",
      empty: "No saved workshops yet.",
      count: "%d saved",
      remove: "Remove",
      devAddSample: "Add sample item (dev)",
    },
    workshops: {
      homeIntro: "Find car workshops across Kuwait and save the right ones for you.",
      featured: "Recommended workshops",
      searchAction: "Find a workshop",
      searchPlaceholder: "Search by name, service, or area",
      resultCount: "%d results",
      loading: "Loading workshops…",
      loadError: "Workshops couldn't be loaded. Check your connection and try again.",
      retry: "Try again",
      empty: "No workshops are available right now.",
      noResults: "No matching results. Try another service or area.",
      openDetails: "Open workshop details",
      save: "Save workshop",
      removeSaved: "Remove from saved",
      partner: "DEGSELF network",
      hours: "Opening hours",
      call: "Call",
      whatsapp: "WhatsApp",
      directions: "Get directions",
      website: "Website",
      verifyDetails: "Contact the workshop to confirm hours and services before visiting.",
      notFound: "This workshop is unavailable or no longer listed.",
      back: "Back",
      linkError: "This link couldn't be opened on your device.",
    },
    privacy: {
      title: "Privacy and data deletion",
      body: "Learn what data the app uses and how to request account and data deletion.",
      openPolicy: "Open privacy policy",
    },
    danger: {
      title: "Danger zone",
      intro: "Deleting your account is permanent and cannot be undone.",
      consequences:
        "Your identity, profile, and all saved workshops are permanently deleted. The account cannot be recovered.",
      deleteButton: "Delete account",
      step1Continue: "Continue to delete",
      typeToConfirm: "Type DELETE to confirm.",
      confirmPlaceholder: "Type DELETE",
      confirmDelete: "Permanently delete my account",
      cancel: "Cancel",
      deleting: "Deleting…",
      reauthNeeded:
        "For your security, sign in again and retry to confirm deletion.",
      reauthButton: "Sign in again",
      success: "Your account has been deleted.",
    },
    errors: {
      deleteErrNotAuthenticated: "Your session expired. Please sign in again.",
      deleteErrInvalidConfirmation: "Confirmation text is incorrect. Type DELETE exactly.",
      deleteErrAuthTooOld: "A recent sign-in is required. Sign in again and retry.",
      deleteErrRateLimited: "Too many attempts. Please try again later.",
      deleteErrPrivilegedRole:
        "An admin account can't be self-deleted. Contact support.",
      deleteErrClaimedWorkshop:
        "Your account is linked to a claimed workshop. Unlink it first.",
      deleteErrGeneric: "Couldn't delete the account. Please try again.",
    },
  },
  hi: {
    appName: "DEGSELF",
    foundation: "नेटिव मोबाइल ऐप",
    tabs: { home: "होम", search: "खोज", saved: "सहेजे", account: "खाता" },
    placeholder: "प्लेसहोल्डर स्क्रीन — अभी कोई प्रोडक्शन डेटा नहीं।",
    languageLabel: "भाषा",
    directionLabel: "दिशा",
    rtlReloadNote:
      "पूर्ण RTL/LTR लेआउट मिररिंग के लिए React Native में ऐप रीस्टार्ट ज़रूरी है।",
    auth: {
      signedOutTitle: "साइन इन करें",
      signedOutBody: "वर्कशॉप सहेजने और डिवाइसों में सिंक करने के लिए साइन इन करें।",
      continueWithGoogle: "Google से जारी रखें",
      continueWithApple: "Apple से जारी रखें",
      appleIosOnly: "Apple से साइन इन केवल iOS डिवाइस पर उपलब्ध है।",
      signOut: "साइन आउट",
      signedInAs: "साइन इन:",
      cancelled: "साइन-इन रद्द किया गया।",
      genericError: "साइन इन नहीं हो सका। पुनः प्रयास करें।",
    },
    saved: {
      guestTitle: "सहेजे (अतिथि)",
      guestBody: "केवल इस डिवाइस पर सहेजे गए। सिंक के लिए साइन इन करें।",
      authTitle: "सहेजे",
      empty: "अभी कोई वर्कशॉप सहेजी नहीं गई।",
      count: "%d सहेजे",
      remove: "हटाएँ",
      devAddSample: "नमूना आइटम जोड़ें (dev)",
    },
    workshops: {
      homeIntro: "कुवैत में कार वर्कशॉप खोजें और सही विकल्प सहेजें।",
      featured: "सुझाई गई वर्कशॉप",
      searchAction: "वर्कशॉप खोजें",
      searchPlaceholder: "नाम, सेवा या क्षेत्र से खोजें",
      resultCount: "%d परिणाम",
      loading: "वर्कशॉप लोड हो रही हैं…",
      loadError: "वर्कशॉप लोड नहीं हुईं। कनेक्शन जाँचकर फिर प्रयास करें।",
      retry: "फिर प्रयास करें",
      empty: "अभी कोई वर्कशॉप उपलब्ध नहीं है।",
      noResults: "कोई मेल खाता परिणाम नहीं। दूसरी सेवा या क्षेत्र आज़माएँ।",
      openDetails: "वर्कशॉप विवरण खोलें",
      save: "वर्कशॉप सहेजें",
      removeSaved: "सहेजे से हटाएँ",
      partner: "DEGSELF नेटवर्क",
      hours: "खुलने का समय",
      call: "कॉल",
      whatsapp: "WhatsApp",
      directions: "दिशा-निर्देश",
      website: "वेबसाइट",
      verifyDetails: "जाने से पहले समय और सेवाओं की पुष्टि के लिए वर्कशॉप से संपर्क करें।",
      notFound: "यह वर्कशॉप उपलब्ध नहीं है या अब सूचीबद्ध नहीं है।",
      back: "वापस",
      linkError: "यह लिंक आपके डिवाइस पर नहीं खुल सका।",
    },
    privacy: {
      title: "गोपनीयता और डेटा हटाना",
      body: "जानें कि ऐप कौन-सा डेटा उपयोग करता है और खाता व डेटा हटाने का अनुरोध कैसे करें।",
      openPolicy: "गोपनीयता नीति खोलें",
    },
    danger: {
      title: "खतरा क्षेत्र",
      intro: "खाता हटाना स्थायी है और वापस नहीं किया जा सकता।",
      consequences:
        "आपकी पहचान, प्रोफ़ाइल और सभी सहेजी वर्कशॉप स्थायी रूप से हट जाएँगी। खाता वापस नहीं मिलेगा।",
      deleteButton: "खाता हटाएँ",
      step1Continue: "हटाना जारी रखें",
      typeToConfirm: "पुष्टि के लिए DELETE टाइप करें।",
      confirmPlaceholder: "DELETE टाइप करें",
      confirmDelete: "मेरा खाता स्थायी रूप से हटाएँ",
      cancel: "रद्द करें",
      deleting: "हटाया जा रहा है…",
      reauthNeeded:
        "आपकी सुरक्षा के लिए, फिर से साइन इन करें और पुनः प्रयास करें।",
      reauthButton: "फिर से साइन इन करें",
      success: "आपका खाता हटा दिया गया है।",
    },
    errors: {
      deleteErrNotAuthenticated: "सत्र समाप्त हो गया। फिर से साइन इन करें।",
      deleteErrInvalidConfirmation: "पुष्टि पाठ ग़लत है। बिलकुल DELETE टाइप करें।",
      deleteErrAuthTooOld: "हाल का साइन-इन आवश्यक है। फिर साइन इन करके पुनः प्रयास करें।",
      deleteErrRateLimited: "बहुत अधिक प्रयास। बाद में प्रयास करें।",
      deleteErrPrivilegedRole:
        "एडमिन खाता स्वयं नहीं हटाया जा सकता। सहायता से संपर्क करें।",
      deleteErrClaimedWorkshop:
        "आपका खाता एक दावाकृत वर्कशॉप से जुड़ा है। पहले उसे अनलिंक करें।",
      deleteErrGeneric: "खाता नहीं हटाया जा सका। पुनः प्रयास करें।",
    },
  },
  ur: {
    appName: "دق سلف",
    foundation: "نیٹو موبائل ایپ",
    tabs: { home: "ہوم", search: "تلاش", saved: "محفوظ", account: "اکاؤنٹ" },
    placeholder: "پلیس ہولڈر اسکرین — ابھی کوئی پروڈکشن ڈیٹا نہیں۔",
    languageLabel: "زبان",
    directionLabel: "سمت",
    rtlReloadNote:
      "مکمل RTL/LTR لے آؤٹ مررنگ کے لیے React Native میں ایپ ری اسٹارٹ ضروری ہے۔",
    auth: {
      signedOutTitle: "سائن ان کریں",
      signedOutBody: "ورکشاپس محفوظ کرنے اور آلات کے درمیان سنک کے لیے سائن ان کریں۔",
      continueWithGoogle: "Google کے ساتھ جاری رکھیں",
      continueWithApple: "Apple کے ساتھ جاری رکھیں",
      appleIosOnly: "Apple سے سائن ان صرف iOS آلات پر دستیاب ہے۔",
      signOut: "سائن آؤٹ",
      signedInAs: "سائن اِن بطور",
      cancelled: "سائن اِن منسوخ ہوگیا۔",
      genericError: "سائن ان نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
    },
    saved: {
      guestTitle: "محفوظ (مہمان)",
      guestBody: "صرف اسی آلے پر محفوظ۔ سنک کے لیے سائن ان کریں۔",
      authTitle: "محفوظ",
      empty: "ابھی کوئی ورکشاپ محفوظ نہیں۔",
      count: "%d محفوظ",
      remove: "ہٹائیں",
      devAddSample: "نمونہ آئٹم شامل کریں (dev)",
    },
    workshops: {
      homeIntro: "کویت میں کار ورکشاپس تلاش کریں اور مناسب انتخاب محفوظ کریں۔",
      featured: "تجویز کردہ ورکشاپس",
      searchAction: "ورکشاپ تلاش کریں",
      searchPlaceholder: "نام، سروس یا علاقے سے تلاش کریں",
      resultCount: "%d نتائج",
      loading: "ورکشاپس لوڈ ہو رہی ہیں…",
      loadError: "ورکشاپس لوڈ نہیں ہو سکیں۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔",
      retry: "دوبارہ کوشش",
      empty: "فی الحال کوئی ورکشاپ دستیاب نہیں۔",
      noResults: "کوئی مماثل نتیجہ نہیں۔ دوسری سروس یا علاقہ آزمائیں۔",
      openDetails: "ورکشاپ کی تفصیل کھولیں",
      save: "ورکشاپ محفوظ کریں",
      removeSaved: "محفوظ فہرست سے ہٹائیں",
      partner: "DEGSELF نیٹ ورک",
      hours: "کام کے اوقات",
      call: "کال",
      whatsapp: "واٹس ایپ",
      directions: "نقشے پر راستہ",
      website: "ویب سائٹ",
      verifyDetails: "جانے سے پہلے اوقات اور خدمات کی تصدیق کے لیے ورکشاپ سے رابطہ کریں۔",
      notFound: "یہ ورکشاپ دستیاب نہیں یا اب فہرست میں شامل نہیں۔",
      back: "واپس",
      linkError: "یہ لنک آپ کے آلے پر نہیں کھل سکا۔",
    },
    privacy: {
      title: "رازداری اور ڈیٹا حذف کرنا",
      body: "جانیں کہ ایپ کون سا ڈیٹا استعمال کرتی ہے اور اکاؤنٹ و ڈیٹا حذف کرنے کی درخواست کیسے کریں۔",
      openPolicy: "رازداری کی پالیسی کھولیں",
    },
    danger: {
      title: "خطرے کا زون",
      intro: "اکاؤنٹ حذف کرنا مستقل ہے اور واپس نہیں ہو سکتا۔",
      consequences:
        "آپ کی شناخت، پروفائل اور تمام محفوظ ورکشاپس مستقل طور پر حذف ہو جائیں گی۔ اکاؤنٹ بحال نہیں ہوگا۔",
      deleteButton: "اکاؤنٹ حذف کریں",
      step1Continue: "حذف جاری رکھیں",
      typeToConfirm: "تصدیق کے لیے DELETE لکھیں۔",
      confirmPlaceholder: "DELETE لکھیں",
      confirmDelete: "میرا اکاؤنٹ مستقل حذف کریں",
      cancel: "منسوخ",
      deleting: "حذف ہو رہا ہے…",
      reauthNeeded:
        "آپ کی حفاظت کے لیے، دوبارہ سائن ان کریں اور دوبارہ کوشش کریں۔",
      reauthButton: "دوبارہ سائن ان کریں",
      success: "آپ کا اکاؤنٹ حذف کر دیا گیا ہے۔",
    },
    errors: {
      deleteErrNotAuthenticated: "سیشن ختم ہوگیا۔ دوبارہ سائن ان کریں۔",
      deleteErrInvalidConfirmation: "تصدیقی متن غلط ہے۔ بالکل DELETE لکھیں۔",
      deleteErrAuthTooOld: "حالیہ سائن اِن ضروری ہے۔ دوبارہ سائن ان کر کے کوشش کریں۔",
      deleteErrRateLimited: "بہت زیادہ کوششیں۔ بعد میں کوشش کریں۔",
      deleteErrPrivilegedRole:
        "ایڈمن اکاؤنٹ خود حذف نہیں ہو سکتا۔ سپورٹ سے رابطہ کریں۔",
      deleteErrClaimedWorkshop:
        "آپ کا اکاؤنٹ ایک کلیم شدہ ورکشاپ سے منسلک ہے۔ پہلے اسے الگ کریں۔",
      deleteErrGeneric: "اکاؤنٹ حذف نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
    },
  },
};

export const LOCALE_LABEL: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
  hi: "हिन्दी",
  ur: "اردو",
};
