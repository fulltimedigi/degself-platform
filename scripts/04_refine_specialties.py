#!/usr/bin/env python3
"""Further refine the 323 generic 'خدمات سيارات شاملة' workshops.
Strategy: use category_raw to map to clearer specialty.
"""
import json
from copy import deepcopy

with open('/home/user/workspace/shuwaikh_workshops_v17.json') as f:
    data = json.load(f)

v18 = deepcopy(data)

# Map category_raw → specialty for the generic ones
RAW_MAP = {
    'ورشة إصلاح سيارات': 'صيانة عامة',
    'تصليح سيارات': 'صيانة عامة',
    'خدمة العناية الشاملة بالسيارة': 'غسيل وتلميع',
    'مورد سيارات شيفروليه': 'وكيل',
    'مورد سيارات نيسان': 'وكيل',
    'مورد سيارات لكزس': 'وكيل',
    'موزع مرسيدس بنز': 'وكيل',
    'وكيل سيارات': 'وكيل',
    'متجر لإصلاح الدراجات الرباعية': 'دراجات وقوارب',
    'ورشة إصلاح دراجات': 'دراجات وقوارب',
    'متجر دراجات نارية': 'دراجات وقوارب',
    'ورشة إصلاح شاحنات': 'شاحنات وتجاري',
    'مزاد السيارات': 'بيع وشراء',
    'تاجر مركبات استجمام': 'بيع وشراء',
    'خدمة إصلاح الرادياتير': 'رادياتير',
    'ورشة إصلاح صندوق السيارة': 'صندوق ودرفات',
    'ورشة الآلات': 'خراطة',
    'ورشة لإصلاح الجرارات': 'شاحنات وتجاري',
    'متجر كماليات السيارات': 'إكسسوارات',
    'متجر قطع غيار سيارات': 'قطع غيار',
}

refined = 0
unmapped_generic = []
for w in v18:
    if w.get('specialty') in ('خدمات سيارات شاملة', 'صيانة شاملة'):
        raw = w.get('category_raw', '').strip()
        if raw in RAW_MAP:
            w['specialty'] = RAW_MAP[raw]
            refined += 1
        elif not raw:
            # No category_raw - try name keywords
            name = (w.get('name') or '').lower()
            if any(k in name for k in ['وكيل', 'agency', 'dealer', 'mercedes', 'مرسيدس', 'lexus', 'لكزس', 'audi', 'bmw', 'toyota', 'تويوتا', 'nissan', 'نيسان', 'showroom', 'معرض']):
                w['specialty'] = 'وكيل'
                refined += 1
            elif any(k in name for k in ['detail', 'shine', 'تلميع', 'العناية', 'care', 'wash', 'غسيل']):
                w['specialty'] = 'غسيل وتلميع'
                refined += 1
            elif any(k in name for k in ['shield', 'حماية', 'protection', 'ceramic', 'سيراميك']):
                w['specialty'] = 'حماية وطلاء سيراميك'
                refined += 1
            else:
                w['specialty'] = 'صيانة عامة'
                refined += 1
        else:
            # Unmapped category - default to صيانة عامة
            unmapped_generic.append(raw)
            w['specialty'] = 'صيانة عامة'
            refined += 1

print(f"Refined: {refined}")
print(f"Unmapped raw categories defaulted to 'صيانة عامة':")
from collections import Counter
for c, n in Counter(unmapped_generic).most_common():
    print(f"  {c}: {n}")

# Final specialty distribution
from collections import Counter
print("\n=== Final specialty distribution ===")
specs = Counter(w.get('specialty', '') for w in v18)
for s, n in specs.most_common():
    print(f"  {s or '(empty)':35s}: {n}")

# Save
with open('/home/user/workspace/shuwaikh_workshops_v18.json', 'w', encoding='utf-8') as f:
    json.dump(v18, f, ensure_ascii=False, indent=2)
print(f"\nSaved: /home/user/workspace/shuwaikh_workshops_v18.json")

# Quality
def has(field):
    return sum(1 for w in v18 if w.get(field) not in (None, '', [], {}))
total = len(v18)
specific_specialty = sum(1 for w in v18 if w.get('specialty') and w['specialty'] not in ('خدمات سيارات شاملة',))
print(f"\nWorkshops with specific specialty: {specific_specialty}/{total} ({specific_specialty/total*100:.1f}%)")
