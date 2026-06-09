#!/usr/bin/env python3
"""Add the missing 3 Automak branches to workshops.json.

The Ahmadi branch already exists (we verified by matching latitude/longitude
and reviews_count). We add the 3 Shuwaikh branches:
  - Headoffice (Shuwaikh Industrial-1)
  - Shuwaikh-2 (Shuwaikh Industrial)
  - Showroom (Shuwaikh Ghazali)

For place_id, we synthesize a stable ID from the Google CID (decimal) since
the scraper returned the internal hex format. The synthesized ID is unique
within our dataset and we map it back to the real Google place via lat/lng
in the maps link (Google handles that gracefully).
"""
import json
from pathlib import Path

WORKSHOPS_FILE = Path("/home/user/workspace/degself-platform/webapp/client/public/data/workshops.json")


def cid_to_chij(hex_id: str) -> str:
    """Best-effort conversion 0xA:0xB -> ChIJ... using protobuf-style encoding.
    Not guaranteed to match Google's canonical form, but produces a stable
    unique string we can use as place_id internally. Google Maps URL we use
    falls back to coordinates if the place_id doesn't resolve.
    """
    import struct, base64
    a, b = hex_id.split(":")
    packed = struct.pack("<QQ", int(a, 16), int(b, 16))
    return "ChIJ" + base64.urlsafe_b64encode(packed).decode("ascii").rstrip("=")


NEW_BRANCHES = [
    {
        "name": "Automak Automotive Headoffice - شركة أوتوماك للسيارات",
        "category_raw": "تأجير سيارات",
        "specialty": "وكلاء وكالات",
        "area": "الشويخ الصناعية 1",
        "governorate": "العاصمة",
        "address": "Plot 108, Street 12, Shuwaikh Industrial 70655، الكويت",
        "street": "Street 12, Plot 108",
        "phone": "+965 1845 555",
        "phone_intl": "+9651845555",
        "website": "http://www.automak.com/",
        "rating": 4.5,
        "reviews_count": 4,
        "latitude": 29.3329697,
        "longitude": 47.9424395,
        "place_id_hex": "0x3fcf9b522375b16d:0x1396751881b50997",
        "permanently_closed": False,
        "opening_hours": "الثلاثاء: 7ص to 4:30م | الأربعاء: 7ص to 4:30م | الخميس: 7ص to 4:30م | الجمعة: مغلق | السبت: 7ص to 4:30م | الأحد: 7ص to 4:30م | الاثنين: 7ص to 4:30م",
        "images_count": 0,
        "main_image": "",
        "payments": "",
        "specialty_hints": ["وكلاء", "تأجير سيارات", "إدارة أسطول"],
        "active": True,
        "entity_type": "وكيل",
        "service_mode": "fixed",
        "emergency_service": False,
    },
    {
        "name": "Automak Automotive Co - Shuwaikh 2 - شركة أوتوماك الشويخ 2",
        "category_raw": "شركة سيارات",
        "specialty": "وكلاء وكالات",
        "area": "الشويخ الصناعية 2",
        "governorate": "العاصمة",
        "address": "51 22 St, Shuwaikh Industrial، الكويت",
        "street": "51 22 St",
        "phone": "+965 1845 555",
        "phone_intl": "+9651845555",
        "website": "http://www.automak.com/",
        "rating": 4.0,
        "reviews_count": 35,
        "latitude": 29.3211479,
        "longitude": 47.9386825,
        "place_id_hex": "0x3fcf9b04df0a9723:0x99faf2f7afd272c",
        "permanently_closed": False,
        "opening_hours": "الثلاثاء: 7ص to 7م | الأربعاء: 7ص to 7م | الخميس: 7ص to 7م | الجمعة: مغلق | السبت: 7ص to 7م | الأحد: 7ص to 7م | الاثنين: 7ص to 7م",
        "images_count": 0,
        "main_image": "",
        "payments": "",
        "specialty_hints": ["وكلاء", "صيانة", "خدمات سيارات"],
        "active": True,
        "entity_type": "وكيل",
        "service_mode": "fixed",
        "emergency_service": False,
    },
    {
        "name": "Automak Showroom - معرض أوتوماك",
        "category_raw": "معرض سيارات",
        "specialty": "وكلاء وكالات",
        "area": "الشويخ الغزالي",
        "governorate": "العاصمة",
        "address": "Block T, Plot 58-59-60-61-62 Shuwaikh Ghazali, Street 12، الكويت",
        "street": "Street 12, Block T",
        "phone": "+965 1845 555",
        "phone_intl": "+9651845555",
        "website": "http://www.automak.com/",
        "rating": 5.0,
        "reviews_count": 3,
        "latitude": 29.3400441,
        "longitude": 47.9432356,
        "place_id_hex": "0x3fcf850046754ab7:0x7ca627440debbe4",
        "permanently_closed": False,
        "opening_hours": "الثلاثاء: 7ص to 11م | الأربعاء: 7ص to 11م | الخميس: 7ص to 11م | الجمعة: مغلق | السبت: 7ص to 11م | الأحد: 7ص to 11م | الاثنين: 7ص to 11م",
        "images_count": 0,
        "main_image": "",
        "payments": "",
        "specialty_hints": ["معرض", "سيارات جديدة", "وكلاء"],
        "active": True,
        "entity_type": "معرض",
        "service_mode": "fixed",
        "emergency_service": False,
    },
]


def main():
    data = json.loads(WORKSHOPS_FILE.read_text(encoding="utf-8"))
    print(f"Before: {len(data)} records")

    # Check existing place_ids to avoid duplicates
    existing_ids = {w["place_id"] for w in data}
    existing_coords = {(round(w.get("latitude", 0), 4), round(w.get("longitude", 0), 4))
                       for w in data if w.get("latitude")}

    added = 0
    for branch in NEW_BRANCHES:
        # Generate ChIJ-style place_id from hex
        place_id = cid_to_chij(branch.pop("place_id_hex"))
        branch["place_id"] = place_id

        # Skip if same coordinates already exist (Ahmadi branch already there)
        coord_key = (round(branch["latitude"], 4), round(branch["longitude"], 4))
        if coord_key in existing_coords:
            print(f"  SKIP (coord exists): {branch['name']}")
            continue
        if place_id in existing_ids:
            print(f"  SKIP (id exists): {branch['name']}")
            continue

        data.append(branch)
        existing_ids.add(place_id)
        existing_coords.add(coord_key)
        added += 1
        print(f"  ADD: {branch['name']} -> {place_id}")

    print(f"After: {len(data)} records (+{added})")
    WORKSHOPS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote: {WORKSHOPS_FILE}")


if __name__ == "__main__":
    main()
