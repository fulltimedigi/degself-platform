#!/usr/bin/env python3
"""
إعادة تصنيف السجلات الموجودة لتمييز خدمات الطوارئ:
1. كراج متنقل / Mobile Mechanic (mobile=true)
2. ونش وسحب / Tow Truck (موجود أصلاً كتخصص)

نضيف حقل جديد: emergency_service (boolean) + service_mode ('mobile'|'fixed'|'tow')
"""
import json
import re
from pathlib import Path

DATA = Path('/home/user/workspace/degself-platform/webapp/client/public/data/workshops.json')

with open(DATA) as f:
    workshops = json.load(f)

# كلمات تدل على الخدمة المتنقلة
MOBILE_PATTERNS = [
    'متنقل', 'متنقله', 'المتنقل', 'المتنقله', 'المتنقلة', 'متنقّل',
    'mobile', 'Mobile', 'MOBILE',
    'خدمة طرق', 'خدمة منازل', 'خدمه طرق', 'خدمه منازل',
    'خدمة طريق', 'خدمه طريق',
    'road service', 'home service',
    'تصليح في الموقع', 'اصلاح في الموقع',
    'في موقعك', 'عند البيت', 'امام البيت', 'أمام البيت',
]

TOW_PATTERNS = [
    'سطحة', 'سطحه', 'السطحة', 'السطحه',
    'ونش', 'الونش', 'ونشات',
    'كرين', 'الكرين',
    'tow', 'Tow', 'TOW', 'winch', 'Winch', 'WINCH', 'crane', 'Crane',
    'سحب سيارات', 'سحب السيارات',
    'road assistance', 'Road Assistance',
]

def is_mobile(record):
    name = (record.get('name') or '')
    cat = (record.get('category_raw') or '')
    text = f"{name} {cat}".lower()
    name_text = name + ' ' + cat
    return any(p.lower() in text for p in MOBILE_PATTERNS) or any(p in name_text for p in MOBILE_PATTERNS)

def is_tow(record):
    name = (record.get('name') or '')
    cat = (record.get('category_raw') or '')
    spec = (record.get('specialty') or '')
    if spec == 'ونش وسحب':
        return True
    text = f"{name} {cat}"
    return any(p in text for p in TOW_PATTERNS)

mobile_count = 0
tow_count = 0
both_count = 0
updated = 0

for w in workshops:
    mobile = is_mobile(w)
    tow = is_tow(w)
    
    # Default
    service_mode = 'fixed'
    emergency = False
    
    if mobile and tow:
        # سطحة + خدمة متنقلة (مثل ونش بنشر متنقل)
        service_mode = 'tow'  # السطحة أولوية - عادة سطحة فيها بنشر متنقل
        emergency = True
        both_count += 1
    elif tow:
        service_mode = 'tow'
        emergency = True
        tow_count += 1
    elif mobile:
        service_mode = 'mobile'
        emergency = True
        # إعادة تصنيف التخصص إذا لم يكن مرتبط بطوارئ
        if w.get('specialty') in ['ميكانيكا','صيانة عامة','كهرباء سيارات','بطاريات','تواير وبنشر','بودي وصبغ','كمبيوتر وتشخيص','قير وفتيس','زيوت وصيانة','تكييف','فرامل']:
            # نحتفظ بالتخصص الأصلي في secondary_specialty لكن نغير الأساسي
            w['secondary_specialty'] = w.get('specialty')
            w['specialty'] = 'كراج متنقل'
        mobile_count += 1
    
    w['service_mode'] = service_mode
    w['emergency_service'] = emergency
    if mobile or tow:
        updated += 1

print(f"Total: {len(workshops)}")
print(f"Tow (سطحة/ونش): {tow_count}")
print(f"Mobile (كراج متنقل): {mobile_count}")
print(f"Both: {both_count}")
print(f"Total emergency: {updated}")

with open(DATA, 'w', encoding='utf-8') as f:
    json.dump(workshops, f, ensure_ascii=False, indent=0)

print(f"\n✅ Saved to {DATA}")

# Show a few samples
print("\n=== Mobile samples ===")
mobile_samples = [w for w in workshops if w.get('service_mode')=='mobile'][:5]
for w in mobile_samples:
    print(f"  {w['name'][:60]} | {w['specialty']} | secondary: {w.get('secondary_specialty','-')}")

print("\n=== Tow samples ===")
tow_samples = [w for w in workshops if w.get('service_mode')=='tow'][:5]
for w in tow_samples:
    print(f"  {w['name'][:60]} | {w['specialty']}")
