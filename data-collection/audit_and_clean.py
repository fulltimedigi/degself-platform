#!/usr/bin/env python3
"""
Comprehensive audit + cleaning script for workshops.json
- Removes all main_image fields (Google-sourced photos may have inappropriate content)
- Re-classifies entity_type and specialty based on name + category_raw + existing hints
- Removes obvious duplicates (same name + area)
- Outputs change log to changes.txt
"""
import json, re, sys
from pathlib import Path
from collections import Counter, defaultdict

WORKSHOPS = Path(__file__).parent.parent / "webapp/client/public/data/workshops.json"
LOG = Path(__file__).parent / "audit_changes.txt"


# ============================================================================
# CLASSIFICATION RULES — order matters (first match wins for specialty)
# ============================================================================

# Specialty keywords — checked against name + category_raw + specialty_hints
SPECIALTY_RULES = [
    # (specialty, [keywords in arabic and english])
    ("ونش وسحب", ["ونش", "سحب", "سطحه", "سطحة", "tow", "towing", "wrecker", "روود اسستنس", "road assist", "نقل سيارات", "خدمة سحب"]),
    ("تواير وبنشر", ["تاير", "تواير", "إطار", "إطارات", "اطار", "بنشر", "بنشره", "tire", "tyre", "بانشر"]),
    ("بطاريات", ["بطاري", "بطارية", "battery", "batteries"]),
    ("بودي وصبغ", ["بودي", "صبغ", "صباغ", "سمكره", "سمكرة", "هياكل", "حدادة", "حداده", "body", "paint", "denter", "smash", "bumper", "صدم"]),
    ("تظليل وزجاج", ["تظليل", "زجاج", "شيشه", "شيشة", "glass", "tint", "windscreen", "windshield"]),
    ("غسيل وتلميع", ["غسيل", "غسل", "تلميع", "بوليش", "تنظيف سيار", "wash", "polish", "detail", "ceramic", "سيراميك"]),
    ("دواسر وفرش", ["دواسر", "دعاسات", "فرش", "كنب", "تنجيد", "upholster", "interior", "leather"]),
    ("كهرباء سيارات", ["كهرباء", "كهربائي", "إلكتروني", "electric", "electronic", "ecu", "ايسيو"]),
    ("كمبيوتر وتشخيص", ["كمبيوتر", "تشخيص", "برمج", "diagnostic", "scan", "obd", "programming"]),
    ("قير وفتيس", ["قير", "فتيس", "ترانز", "جير بوكس", "gear", "transmission", "gearbox", "differential"]),
    ("تكييف", ["تكييف", "مكيف", "فريون", "ac repair", "a/c", "air condition", "auto ac"]),
    ("فرامل", ["فرامل", "بريك", "مكابح", "brake", "brakes"]),
    ("زيوت وصيانة", ["زيت", "زيوت", "تغيير زيت", "صيانة دورية", "oil change", "lube", "lubricant"]),
    ("قطع غيار", ["قطع غيار", "قطع الغيار", "parts", "spare", "auto parts", "spareparts"]),
    ("إكسسوارات", ["إكسسوارات", "اكسسوارات", "كماليات", "accessor", "tuning", "تيونينج"]),
    ("فحص فني", ["فحص فني", "فحص سيارات", "inspection", "تيست", "test"]),
    ("ميكانيكا", ["ميكاني", "محرك", "mechanic", "engine", "motor", "موتور"]),
    ("كراج متنقل", ["متنقل", "mobile", "موبايل ورشة"]),
    ("وكيل", ["وكيل", "وكالة", "وكالات", "dealer", "agent", "agency"]),
]

# Category-based fallback (when name has no specialty keyword)
CATEGORY_RAW_SPECIALTY = {
    "متجر إطارات": "تواير وبنشر",
    "محطة غسل سيارات": "غسيل وتلميع",
    "متجر قطع غيار سيارات": "قطع غيار",
    "متجر كماليات السيارات": "إكسسوارات",
    "متجر أجهزة إلكترونية": "كهرباء سيارات",
    "ورشة إصلاح هياكل سيارات": "بودي وصبغ",
    "خدمة كهرباء سيارات": "كهرباء سيارات",
    "خدمة سحب سيارات": "ونش وسحب",
    "خدمة العناية الشاملة بالسيارة": "غسيل وتلميع",
    "محطة فحص سيارات": "فحص فني",
    "ورشة ميكانيكا سيارات": "ميكانيكا",
    "ميكانيكي": "ميكانيكا",
    "ورشة إصلاح سيارات": "صيانة عامة",
    "تصليح سيارات": "صيانة عامة",
}

# Entity type rules — checked in order, smart mapping per specialty
ENTITY_TYPE_BY_SPECIALTY = {
    # محل لـ منتجات/قطع
    "تواير وبنشر": "محل",
    "بطاريات": "محل",
    "قطع غيار": "محل",
    "إكسسوارات": "محل",
    "تظليل وزجاج": "محل",
    "دواسر وفرش": "محل",
    # خدمة لـ خدمات تأتي للعميل
    "ونش وسحب": "خدمة",
    "كراج متنقل": "خدمة",
    # مركز للأعمال الكبيرة
    "بودي وصبغ": "مركز",
    "غسيل وتلميع": "مركز",
    "فحص فني": "مركز",
    "كمبيوتر وتشخيص": "مركز",
    # كراج هو الافتراضي للميكانيكا/الصيانة
    "ميكانيكا": "كراج",
    "صيانة عامة": "كراج",
    "كهرباء سيارات": "كراج",
    "قير وفتيس": "كراج",
    "تكييف": "كراج",
    "فرامل": "كراج",
    "زيوت وصيانة": "كراج",
    "وكيل": "وكيل",
}

# Override by name keyword (highest priority)
ENTITY_NAME_OVERRIDES = [
    (["وكيل", "وكالة", "وكالات", "dealer", "agency"], "وكيل"),
    (["مركز", "center", "centre"], "مركز"),
    (["محل", "shop", "store", "متجر"], "محل"),
    (["معرض", "showroom"], "معرض"),
    (["خدمة", "service"], None),  # leave to specialty
]


def classify_specialty(name: str, category_raw: str, hints: list, current: str) -> tuple[str, str]:
    """Returns (new_specialty, reason)"""
    haystack = f"{name} {category_raw} {' '.join(hints or [])}".lower()
    # Try keyword match
    for spec, kws in SPECIALTY_RULES:
        for kw in kws:
            if kw.lower() in haystack:
                return (spec, f"keyword:{kw}")
    # Fallback to category_raw mapping
    if category_raw in CATEGORY_RAW_SPECIALTY:
        return (CATEGORY_RAW_SPECIALTY[category_raw], f"category:{category_raw}")
    # Keep current
    return (current, "keep")


def classify_entity_type(name: str, specialty: str, current: str) -> tuple[str, str]:
    """Returns (new_entity_type, reason)"""
    name_lower = name.lower()
    # Name overrides
    for kws, etype in ENTITY_NAME_OVERRIDES:
        for kw in kws:
            if kw in name_lower:
                if etype:
                    return (etype, f"name:{kw}")
                break
    # By specialty
    if specialty in ENTITY_TYPE_BY_SPECIALTY:
        return (ENTITY_TYPE_BY_SPECIALTY[specialty], f"specialty:{specialty}")
    return (current, "keep")


def main():
    with open(WORKSHOPS, "r", encoding="utf-8") as f:
        data = json.load(f)

    log_lines = []
    log_lines.append(f"# Audit started — {len(data)} records\n")

    # 1. Remove duplicates (keep first occurrence)
    seen_keys = {}
    deduped = []
    dups_removed = 0
    for i, r in enumerate(data):
        key = (r.get("name", "").strip().lower(), r.get("area", "").strip().lower())
        if key in seen_keys:
            log_lines.append(f"[DUP REMOVED] idx={i} name={r.get('name')} area={r.get('area')}")
            dups_removed += 1
            continue
        seen_keys[key] = i
        deduped.append(r)
    data = deduped
    log_lines.append(f"\n# Duplicates removed: {dups_removed}\n")

    # 2. Re-classify and strip images
    img_stripped = 0
    spec_changed = 0
    entity_changed = 0
    for r in data:
        # Strip image
        if r.get("main_image"):
            r["main_image"] = ""
            img_stripped += 1

        # Re-classify specialty
        old_spec = r.get("specialty", "")
        new_spec, spec_reason = classify_specialty(
            r.get("name", ""),
            r.get("category_raw", ""),
            r.get("specialty_hints", []),
            old_spec,
        )
        if new_spec != old_spec:
            log_lines.append(
                f"[SPEC] {r.get('name','')[:50]} | {old_spec} -> {new_spec} ({spec_reason})"
            )
            r["specialty"] = new_spec
            spec_changed += 1

        # Re-classify entity_type
        old_ent = r.get("entity_type", "")
        new_ent, ent_reason = classify_entity_type(r.get("name", ""), r["specialty"], old_ent)
        if new_ent != old_ent:
            log_lines.append(
                f"[ENT]  {r.get('name','')[:50]} | {old_ent} -> {new_ent} ({ent_reason})"
            )
            r["entity_type"] = new_ent
            entity_changed += 1

    log_lines.append(f"\n# Images stripped: {img_stripped}")
    log_lines.append(f"# Specialty re-classifications: {spec_changed}")
    log_lines.append(f"# Entity type re-classifications: {entity_changed}")
    log_lines.append(f"# Final record count: {len(data)}\n")

    # Distributions after
    log_lines.append("\n## NEW ENTITY TYPE DIST")
    for k, v in Counter(r["entity_type"] for r in data).most_common():
        log_lines.append(f"  {k}: {v}")
    log_lines.append("\n## NEW SPECIALTY DIST")
    for k, v in Counter(r["specialty"] for r in data).most_common():
        log_lines.append(f"  {k}: {v}")

    # Save
    with open(WORKSHOPS, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    with open(LOG, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))

    print(f"✅ Done. {dups_removed} dups, {img_stripped} images, {spec_changed} spec, {entity_changed} entity")
    print(f"Log: {LOG}")


if __name__ == "__main__":
    main()
