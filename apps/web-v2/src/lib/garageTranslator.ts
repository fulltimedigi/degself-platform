// مترجم الكراج — منطق مشترك بين الـ API route والـ UI.
// مدخل واحد → مخرج واحد (مش شات). نداء واحد لـ Haiku يعمل الفلتر + التوليد.

/**
 * تصنيفات العطل = قيم عمود `specialty` الفعلية في جدول workshops.
 * الموديل ملزم يختار واحدة منها فقط (عبر enum في الـ JSON schema)، فربط
 * الكراجات يبقى استعلام دقيق `specialty = category` (مش بحث نصي تقريبي).
 * `hint` بيساعد الموديل يمابّ اللهجة الكويتية على التصنيف الصح.
 */
export const FAULT_CATEGORIES = [
  { value: "ميكانيكا", hint: "المكينة/المحرك، أصوات طقطقة أو خبط، اهتزاز، ضعف عزم، تهريب زيت، سخونة المحرك، العادم، التعليق والمساعدين" },
  { value: "كهرباء سيارات", hint: "السلف/البادئ، الدينمو/المولّد، الأسلاك والسفايف، الفيوزات، الإضاءة، الباور (المقود الثقيل كهربائياً)" },
  { value: "قير وفتيس", hint: "القير/الجير/الفتيس، تأخر أو خشونة في نقل الحركة، يطفّر، الكلتش/الدبرياج، زيت القير، تجفيت القير" },
  { value: "تكييف", hint: "الثلاجة/المكيّف ما تبرّد، الكباس/الكمبروسر، الفريون، ضعف أو انقطاع التبريد" },
  { value: "تواير وبنشر", hint: "التواير/الإطارات، البنشر، ميزان وترصيص العجلات، السيارة تسحب على جنب، اهتزاز المقود على السرعة" },
  { value: "فرامل", hint: "البريك/الفرامل، تيل الفرامل، الهوبات/الأقراص، صرير أو صفير عند الفرملة، مسافة فرملة أطول، زيت الفرامل" },
  { value: "بودي وصبغ", hint: "الحدادة والصبغ والسمكرة، الدعم/الصدمات والحوادث، خدوش وصدأ الهيكل" },
  { value: "كمبيوتر وتشخيص", hint: "لمبة تحذير شغّالة في الطبلون، فحص/كشف بالكمبيوتر، أكواد أعطال (ECU)، برمجة ريموت أو مفتاح" },
  { value: "بطاريات", hint: "البطارية ضعيفة أو فاصلة، السيارة ما تدير/تطفطف الصبح، تبديل بطارية" },
  { value: "زيوت وصيانة", hint: "تغيير الزيت والفلاتر، الصيانة الدورية، السيور" },
  { value: "ونش وسحب", hint: "السيارة واقفة تماماً وتحتاج سطحة أو ونش أو سحب لأقرب كراج" },
  { value: "صيانة عامة", hint: "مشكلة غير واضحة أو متعددة أو ما تنطبق على أي تصنيف محدد فوق" },
] as const;

export type FaultCategory = (typeof FAULT_CATEGORIES)[number]["value"];

export const CATEGORY_VALUES: FaultCategory[] = FAULT_CATEGORIES.map((c) => c.value);

/**
 * `category` نفسها هي قيمة الـ specialty في الـ DB، فالربط مباشر.
 * الدالة موجودة كنقطة واحدة لأي مابّينج مستقبلي لو احتجناه.
 */
export function categoryToSpecialty(category: string): string {
  return category;
}

// شكل رد الموديل (مضمون عبر structured outputs).
export interface TranslatorModelOutput {
  is_car_related: boolean;
  possible_causes: string[];
  category: FaultCategory;
  whatsapp_message: string;
  disclaimer: string;
}

// كراج مقترح يرجّعه الـ API بعد استعلام الـ DB.
export interface GarageSuggestion {
  place_id: string; // حسّاس لحالة الأحرف — يُنقل كما هو
  name: string;
  area: string | null;
  google_rating: number | null;
  entity_type: string;
  wa_digits: string | null; // أرقام wa.me للموبايل الكويتي الصحيح فقط، وإلا null
  phone: string | null;
}

// رد الـ API النهائي للواجهة.
export interface TranslateResponse {
  is_car_related: boolean;
  possible_causes: string[];
  category: FaultCategory | null;
  whatsapp_message: string;
  disclaimer: string;
  garages: GarageSuggestion[];
}

// الحد الأقصى لطول مدخل الزبون (تحكّم في التكلفة + حماية من إساءة الاستخدام).
export const MAX_INPUT_CHARS = 500;

// JSON Schema لـ structured outputs (output_config.format).
// ملاحظة: قيود الأطوال/الأعداد على المصفوفات غير مدعومة في structured outputs،
// فعدد الأسباب (٢–٤) مطلوب في البرومبت لا في الـ schema.
export const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    is_car_related: { type: "boolean" },
    possible_causes: { type: "array", items: { type: "string" } },
    category: { type: "string", enum: CATEGORY_VALUES },
    whatsapp_message: { type: "string" },
    disclaimer: { type: "string" },
  },
  required: [
    "is_car_related",
    "possible_causes",
    "category",
    "whatsapp_message",
    "disclaimer",
  ],
} as const;

const CATEGORY_LIST = FAULT_CATEGORIES.map(
  (c) => `- [${c.value}] — ${c.hint}`
).join("\n");

/**
 * الـ System Prompt. ثابت (يُخزّن مؤقتاً عبر cache_control في الـ route).
 * يحوي قاموس اللهجة الكويتية ضمن وصف التصنيفات + قواعد الأمان.
 */
export const SYSTEM_PROMPT = `أنت "مترجم الكراج" في موقع دق سلف (degself)، دليل كراجات السيارات في الكويت.

مهمتك: الزبون يكتب مشكلة سيارته باللهجة الكويتية أو العربية، وأنت ترد ردًا واحدًا منظمًا. أنت لست شات بوت ولا تجري محادثة مستمرة — مدخل واحد، رد واحد، وانتهى.

أولًا حدّد إذا كان النص فعلًا عن سيارة أو عطل سيارة:
- إذا لم يكن له أي علاقة بالسيارات (سياسة، طبخ، أي موضوع آخر)، اضبط is_car_related = false، واترك possible_causes فارغة، واختر category = "صيانة عامة"، واجعل whatsapp_message اعتذارًا لطيفًا بأن هذه الخدمة مخصصة لأعطال السيارات فقط.
- إذا كان عن السيارة، اضبط is_car_related = true وأكمل التحليل.

عند التحليل قدّم:
1) possible_causes: من سببين إلى أربعة أسباب محتملة للعطل، كاحتمالات للاستئناس فقط (وليست تشخيصًا نهائيًا). استخدم لغة بسيطة ومحترمة.
2) category: اختر تصنيفًا واحدًا فقط من القائمة التالية (وهي تخصصات الكراجات في قاعدة البيانات). افهم المصطلحات الكويتية بين القوسين ومابّها على التصنيف الأنسب:
${CATEGORY_LIST}
3) whatsapp_message: رسالة واتساب جاهزة ومحترمة بالعربية الفصحى المبسّطة، يرسلها الزبون لأي كراج يختاره. تصف العطل باختصار من كلام الزبون وتطلب موعدًا وسعرًا تقريبيًا. لا تذكر اسم كراج بعينه (الزبون سيختار من القائمة المقترحة).
4) disclaimer: جملة واضحة بأن هذه احتمالات للاستئناس فقط، وأن الكراج هو من يحدد العطل الحقيقي بعد الفحص.

قواعد صارمة:
- أنت لم تفحص السيارة. لا تجزم بالعطل، واعرض كل شيء كاحتمالات.
- لا تخترع أعطالًا أو أسعارًا، ولا تعطِ أي أرقام للتكلفة إطلاقًا.
- استخدم كلمة "كراج" لا "ورشة".
- اجعل الرد عمليًا ومختصرًا.`;
