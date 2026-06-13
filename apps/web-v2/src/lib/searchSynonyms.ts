/**
 * Search synonym expansion (Task #6). Each search token is OR-expanded with its
 * synonyms so users find the right garages regardless of:
 *   • script:   انفينيتي ⇄ infiniti, مرسيدس ⇄ mercedes
 *   • dialect:  ثلاجة → تكييف, سلف/دينمو → كهرباء, دبرياج/كلتش → قير
 *   • spelling: tyres → tires/تواير, زيت → زيوت, بطارية → بطاريات
 *
 * Keys and values are stored ALREADY-NORMALIZED (same rules as normalizeArabic:
 * ة→ه, lowercased, etc.) and re-normalized at runtime for safety. The matched
 * `search_text` column is itself normalized, so we compare normalized↔normalized.
 *
 * To make a brand/term findable under another spelling, add an entry here — no
 * data migration needed.
 */
export const SEARCH_SYNONYMS: Record<string, string[]> = {
  // ── dialect → specialty ──
  "ثلاجه": ["تكييف"],            // الثلاجة = AC
  "سلف": ["كهرباء"],             // starter → auto-electric
  "دينمو": ["كهرباء"],           // alternator → auto-electric
  "دبرياج": ["قير", "كلتش"],     // clutch → transmission
  "كلتش": ["قير", "فتيس"],
  "عفشه": ["ميكانيكا"],          // suspension
  "رادييتر": ["رادياتير", "تبريد", "ميكانيكا"],
  "راديتر": ["رادياتير", "تبريد"],
  "بريك": ["فرامل"],
  "سمكره": ["بودي", "صبغ", "حداده"],
  "حداده": ["بودي", "صبغ"],
  "زيت": ["زيوت"],
  "بطاريه": ["بطاريات"],
  "دهان": ["صبغ", "بودي"],
  "بويه": ["صبغ", "بودي"],
  "مكيف": ["تكييف"],
  "كمبروسر": ["تكييف"],
  "بواجي": ["كهرباء"],
  "شمعات": ["كهرباء"],
  "حساس": ["كهرباء", "كمبيوتر"],
  "ميزان": ["تواير", "ميزان عجلات"],
  "تنجيد": ["دواسر", "فرش"],
  "مكينه": ["مكاين", "ميكانيكا"],
  "كشن": ["دواسر", "فرش"],
  "كشنات": ["دواسر", "فرش", "تنجيد"],

  // ── english → arabic ──
  "brakes": ["فرامل"],
  "brake": ["فرامل"],
  "gearbox": ["قير", "فتيس"],
  "transmission": ["قير", "فتيس"],
  "tyres": ["تواير", "tires"],
  "tyre": ["تواير", "tire"],
  "tires": ["تواير"],
  "tire": ["تواير"],
  "battery": ["بطاريات"],
  "batteries": ["بطاريات"],
  "engine": ["مكاين", "ميكانيكا"],
  "oil": ["زيوت"],
  "wash": ["غسيل"],
  "paint": ["صبغ", "بودي"],
  "bodyshop": ["بودي", "صبغ"],
  "towing": ["ونش", "سحب"],
  "recovery": ["ونش", "سحب"],
  "ac": ["تكييف"],
  "electric": ["كهرباء"],
  "electrical": ["كهرباء"],

  // ── makes: arabic ⇄ english ──
  "تويوتا": ["toyota"], "toyota": ["تويوتا"],
  "نيسان": ["nissan"], "nissan": ["نيسان"],
  "هوندا": ["honda"], "honda": ["هوندا"],
  "لكزس": ["lexus"], "lexus": ["لكزس"],
  "مرسيدس": ["mercedes", "benz"], "mercedes": ["مرسيدس"], "benz": ["مرسيدس"],
  "بمw": ["bmw"], "bmw": ["بي ام دبليو", "بي إم دبليو"],
  "جيب": ["jeep"], "jeep": ["جيب"],
  "فورد": ["ford"], "ford": ["فورد"],
  "شفروليه": ["chevrolet", "chevy"], "chevrolet": ["شفروليه"],
  "هيونداي": ["hyundai"], "hyundai": ["هيونداي"],
  "كيا": ["kia"], "kia": ["كيا"],
  "ميتسوبيشي": ["mitsubishi"], "mitsubishi": ["ميتسوبيشي"],
  "جمس": ["gmc", "جي ام سي"], "gmc": ["جمس", "جي ام سي"],
  "رنج": ["range rover", "land rover", "رنج روفر"],
  "لاندكروزر": ["land cruiser", "landcruiser"],
  "باترول": ["patrol", "nissan patrol"],
  "بورش": ["porsche"], "porsche": ["بورش"],
  "فولفو": ["volvo"], "volvo": ["فولفو"],
  "جاكوار": ["jaguar"], "jaguar": ["جاكوار"],
  "رينو": ["renault"], "renault": ["رينو"],
  "بيجو": ["peugeot"], "peugeot": ["بيجو"],
  "انفينيتي": ["infiniti"], "infiniti": ["انفينيتي"],
  "كاديلاك": ["cadillac"], "cadillac": ["كاديلاك"],
  "اودي": ["audi"], "audi": ["اودي"],
  "مازda": ["mazda"], "mazda": ["مازدا"], "مازدا": ["mazda"],

  // ── dealers: arabic ⇄ english ──
  "الغانم": ["alghanim", "al ghanim"], "alghanim": ["الغانم"],
  "الساير": ["al sayer", "sayer", "alsayer"], "sayer": ["الساير"],
  "البابطين": ["al babtain", "babtain", "albabtain"], "babtain": ["البابطين"],
  "الزياني": ["zayani", "al zayani"], "zayani": ["الزياني"],
  "الملا": ["al mulla", "almulla", "mulla"], "mulla": ["الملا"],
  "بهبهاني": ["behbehani"], "behbehani": ["بهبهاني"],
};

/**
 * Generic action/filler words that aren't discriminating — dropped so the
 * meaningful noun carries the query (e.g. "تغيير زيت" → "زيت", "افضل كراج تكييف"
 * → "كراج تكييف"). NOT including specialty words (صيانة) or entity words that
 * appear in names. Callers must fall back to the raw tokens if filtering empties
 * the query.
 */
export const SEARCH_STOPWORDS = new Set([
  "تغيير", "تبديل", "تصليح", "اصلاح", "خدمه", "خدمات", "افضل", "احسن", "ارخص",
  "اقرب", "رقم", "نمبر", "سعر", "اسعار", "best", "cheap", "near", "نظافه",
]);

/** Expand one normalized token into a deduped list of normalized match terms. */
export function expandToken(token: string): string[] {
  const syns = SEARCH_SYNONYMS[token] ?? [];
  return [...new Set([token, ...syns])];
}
