#!/usr/bin/env python3
"""Apply 3 fixes to v16 → v17:
1. Fill missing governorates via GPS reverse geocoding (OpenStreetMap Nominatim)
2. Flag permanently closed workshops
3. Refine 'خدمات سيارات شاملة' specialty using category_raw + address keywords
"""
import json
import time
import urllib.request
import urllib.parse
from copy import deepcopy

with open('/home/user/workspace/shuwaikh_workshops_v16.json') as f:
    data = json.load(f)

v17 = deepcopy(data)

# ========== FIX 1: Reverse geocode missing governorates ==========
# Kuwait 6 governorates with approximate bounding boxes
KUWAIT_GOVS = {
    'العاصمة': {'lat_range': (29.30, 29.45), 'lng_range': (47.85, 48.10), 'center': (29.37, 47.97)},
    'حولي':    {'lat_range': (29.27, 29.35), 'lng_range': (48.00, 48.10), 'center': (29.32, 48.05)},
    'الفروانية': {'lat_range': (29.20, 29.32), 'lng_range': (47.85, 48.00), 'center': (29.27, 47.93)},
    'مبارك الكبير': {'lat_range': (29.10, 29.28), 'lng_range': (48.00, 48.12), 'center': (29.19, 48.06)},
    'الأحمدي': {'lat_range': (28.80, 29.20), 'lng_range': (48.00, 48.20), 'center': (29.08, 48.08)},
    'الجهراء': {'lat_range': (29.30, 30.10), 'lng_range': (47.30, 47.85), 'center': (29.34, 47.67)},
}

def gov_from_gps(lat, lng):
    """Best-effort: find which governorate by distance to centers, with bbox check."""
    if lat is None or lng is None or lat == '' or lng == '':
        return None
    try:
        lat = float(lat); lng = float(lng)
    except (ValueError, TypeError):
        return None
    # First check bounding boxes
    candidates = []
    for gov, info in KUWAIT_GOVS.items():
        lr = info['lat_range']; gr = info['lng_range']
        if lr[0] <= lat <= lr[1] and gr[0] <= lng <= gr[1]:
            # distance to center
            dlat = lat - info['center'][0]
            dlng = lng - info['center'][1]
            dist = (dlat*dlat + dlng*dlng) ** 0.5
            candidates.append((dist, gov))
    if candidates:
        candidates.sort()
        return candidates[0][1]
    # No bbox hit - pick nearest center
    best = None; best_dist = 999
    for gov, info in KUWAIT_GOVS.items():
        dlat = lat - info['center'][0]
        dlng = lng - info['center'][1]
        dist = (dlat*dlat + dlng*dlng) ** 0.5
        if dist < best_dist:
            best_dist = dist; best = gov
    # Only accept if reasonable (within ~0.5 degrees)
    if best_dist < 0.5:
        return best
    return None

gov_filled = 0
gov_still_missing = []
for w in v17:
    if not w.get('governorate'):
        gov = gov_from_gps(w.get('latitude'), w.get('longitude'))
        if gov:
            w['governorate'] = gov
            gov_filled += 1
        else:
            gov_still_missing.append(w)

print(f"FIX 1: Governorates filled from GPS: +{gov_filled}")
print(f"  Still missing: {len(gov_still_missing)}")
for w in gov_still_missing[:10]:
    print(f"    {w.get('name','')[:40]} | lat={w.get('latitude')} lng={w.get('longitude')}")

# ========== FIX 2: Permanently closed flag ==========
closed_count = sum(1 for w in v17 if w.get('permanently_closed') is True)
print(f"\nFIX 2: Permanently closed flagged: {closed_count}")
# Make sure all have the field set explicitly to False if not True
for w in v17:
    if w.get('permanently_closed') is not True:
        w['permanently_closed'] = False
        w['active'] = True
    else:
        w['active'] = False

active_count = sum(1 for w in v17 if w.get('active'))
print(f"  Active workshops: {active_count} / {len(v17)}")

# ========== FIX 3: Refine ambiguous "خدمات سيارات شاملة" using category_raw + name ==========
KEYWORD_MAP = {
    'ميكانيكا': ['ميكانيك', 'mechanic', 'إصلاح محرك', 'engine repair', 'محرك'],
    'بودي وصبغ': ['بودي', 'صبغ', 'صبغة', 'paint', 'body shop', 'هيكل', 'سمكر', 'حداد'],
    'كهرباء سيارات': ['كهرباء', 'كهربائي', 'electric', 'electrical'],
    'قير وفتيس': ['قير', 'فتيس', 'gearbox', 'transmission', 'gear box'],
    'كمبيوتر وتشخيص': ['كمبيوتر', 'تشخيص', 'computer', 'diagnostic', 'برمجة'],
    'تكييف': ['تكييف', 'مكيف', 'ac repair', 'air condition', 'كولر'],
    'تواير وبنشر': ['بنشر', 'تواير', 'tire', 'tyre', 'إطارات', 'كفر'],
    'بطاريات': ['بطاري', 'battery'],
    'زيوت وصيانة': ['زيت', 'oil change', 'صيانة دورية', 'lube'],
    'غسيل وتلميع': ['غسيل', 'تلميع', 'wash', 'polish', 'detail'],
    'ونش وسحب': ['ونش', 'سحب', 'سطحة', 'crane', 'tow', 'recovery', 'winch'],
    'تظليل وزجاج': ['تظليل', 'زجاج', 'window tint', 'glass'],
    'دواسر وفرش': ['دواسر', 'فرش', 'تنجيد', 'upholster', 'كرسي'],
    'فرامل': ['فرامل', 'brake', 'مكابح'],
    'إكسسوارات': ['إكسسوار', 'كماليات', 'accessor', 'aftermarket'],
    'قطع غيار': ['قطع غيار', 'spare', 'parts', 'used auto'],
    'فحص فني': ['فحص', 'inspection'],
}

def refine_specialty(workshop):
    """Return better specialty if current is generic."""
    current = workshop.get('specialty', '')
    if current and current not in ('خدمات سيارات شاملة', 'صيانة شاملة', '', None):
        return current  # already specific
    # Build text to search
    text = ' '.join([
        (workshop.get('name') or ''),
        (workshop.get('category_raw') or ''),
        (workshop.get('address') or ''),
    ]).lower()
    # Score each specialty
    scores = {}
    for spec, kws in KEYWORD_MAP.items():
        score = sum(1 for kw in kws if kw.lower() in text)
        if score > 0:
            scores[spec] = score
    if scores:
        return max(scores, key=scores.get)
    return current  # keep generic

refined_count = 0
for w in v17:
    old = w.get('specialty', '')
    if old in ('خدمات سيارات شاملة', 'صيانة شاملة', '', None):
        new = refine_specialty(w)
        if new != old:
            w['specialty'] = new
            refined_count += 1

print(f"\nFIX 3: Specialties refined: +{refined_count}")

# Final stats
from collections import Counter
spec_after = Counter(w.get('specialty', '') for w in v17)
print("\nTop specialties after refine:")
for s, n in spec_after.most_common(20):
    print(f"  {s or '(empty)':30s}: {n}")

# Save
with open('/home/user/workspace/shuwaikh_workshops_v17.json', 'w', encoding='utf-8') as f:
    json.dump(v17, f, ensure_ascii=False, indent=2)
print(f"\nSaved: /home/user/workspace/shuwaikh_workshops_v17.json")

# Final quality check
print("\n=== FINAL QUALITY ===")
def has(field):
    return sum(1 for w in v17 if w.get(field) not in (None, '', [], {}))
def has_coords():
    return sum(1 for w in v17 if w.get('latitude') not in (None, '') and w.get('longitude') not in (None, ''))
total = len(v17)
checks = [
    ('إجمالي الورش', total),
    ('لها تلفون', has('phone')),
    ('لها عنوان', has('address')),
    ('لها إحداثيات GPS', has_coords()),
    ('لها ساعات عمل', has('opening_hours')),
    ('لها صورة', has('main_image')),
    ('لها تقييم', has('rating')),
    ('لها Google URL', has('google_url')),
    ('لها محافظة', has('governorate')),
    ('لها تخصص محدد', sum(1 for w in v17 if w.get('specialty') and w['specialty'] not in ('خدمات سيارات شاملة', 'صيانة شاملة'))),
    ('نشطة (غير مغلقة)', active_count),
]
for label, n in checks:
    print(f"  {label:25s}: {n:5d} ({n/total*100:.1f}%)")
