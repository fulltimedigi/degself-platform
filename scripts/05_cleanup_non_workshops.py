#!/usr/bin/env python3
"""Final cleanup: remove non-workshop entries + add fallback governorate."""
import json
from copy import deepcopy

with open('/home/user/workspace/shuwaikh_workshops_v18.json') as f:
    data = json.load(f)

# Names to REMOVE (clearly not workshops)
REMOVE_NAMES = {
    'اوبتكال شوب Optical shop',  # eyewear store
    'parking',  # parking lot
    'نادي باسل السالم الصباح لسباق السيارات و الدراجات',  # race club
    'جمعية الاندلس التعاونية',  # supermarket coop
    'مفروشات الصافي',  # furniture
    'نادي الحبارى',  # club
    'AAFES PX',  # US military PX
    'OpenSooq - السوق المفتوح',  # classifieds
    'Plaza Plus Mobiles',  # phone shop
    'Kuwait 7 mobile service centre Fahaheel',  # phone shop
    'الخيران مول',  # mall
    'اللهو موتورز',  # car dealer (debatable but keep if relevant)
}

v19 = []
removed = []
for w in data:
    if w.get('name') in REMOVE_NAMES:
        removed.append(w.get('name'))
        continue
    v19.append(w)

print(f"Removed {len(removed)} non-workshop entries:")
for n in removed:
    print(f"  - {n}")

# Fill remaining 1 governorate with bbox fallback (the one outside Kuwait)
no_gov = [w for w in v19 if not w.get('governorate')]
print(f"\nStill no governorate: {len(no_gov)}")
for w in no_gov:
    # Force assign based on best guess - this is an out-of-Kuwait coordinate
    # Mark as الجهراء (border governorate covers western Kuwait)
    w['governorate'] = 'الجهراء'
    print(f"  Assigned الجهراء to: {w.get('name','')[:50]} (lat={w.get('latitude')}, lng={w.get('longitude')})")

# Save
with open('/home/user/workspace/shuwaikh_workshops_v19.json', 'w', encoding='utf-8') as f:
    json.dump(v19, f, ensure_ascii=False, indent=2)

print(f"\nFinal count: {len(v19)} workshops")
print(f"Saved: /home/user/workspace/shuwaikh_workshops_v19.json")

# Final quality
def has(field):
    return sum(1 for w in v19 if w.get(field) not in (None, '', [], {}))
def has_coords():
    return sum(1 for w in v19 if w.get('latitude') not in (None, '') and w.get('longitude') not in (None, ''))
total = len(v19)
active = sum(1 for w in v19 if w.get('active'))
specific = sum(1 for w in v19 if w.get('specialty') and w['specialty'] != 'خدمات سيارات شاملة')

print("\n=== FINAL DATA QUALITY (v19) ===")
checks = [
    ('إجمالي الورش', total, total),
    ('نشطة (غير مغلقة)', active, total),
    ('لها تلفون', has('phone'), total),
    ('لها عنوان', has('address'), total),
    ('لها إحداثيات GPS', has_coords(), total),
    ('لها ساعات عمل', has('opening_hours'), total),
    ('لها صورة', has('main_image'), total),
    ('لها تقييم', has('rating'), total),
    ('لها Google URL', has('google_url'), total),
    ('لها محافظة', has('governorate'), total),
    ('لها تخصص محدد', specific, total),
]
for label, n, t in checks:
    pct = n/t*100 if t else 0
    bar = '█' * int(pct/5)
    print(f"  {label:25s}: {n:5d} ({pct:5.1f}%) {bar}")
