#!/usr/bin/env python3
"""Merge round5 enriched data into v14 → v15."""
import json
from copy import deepcopy

with open('/home/user/workspace/shuwaikh_workshops_v14.json') as f:
    v14 = json.load(f)
with open('/home/user/workspace/round5_results_real.json') as f:
    enriched = json.load(f)

# Build index by placeId
enriched_idx = {}
for item in enriched:
    pid = item.get('placeId')
    if pid:
        enriched_idx[pid] = item

print(f"v14 workshops: {len(v14)}")
print(f"enriched items indexed: {len(enriched_idx)}")

# Stats before
def empty(v):
    if v is None: return True
    if isinstance(v, str) and not v.strip(): return True
    if isinstance(v, (list, dict)) and not v: return True
    return False

def count_missing(data, field):
    return sum(1 for w in data if empty(w.get(field)))

fields = ['phone', 'phone_intl', 'latitude', 'longitude', 'opening_hours',
          'main_image', 'address', 'rating', 'reviews_count', 'images_count', 'website']

before = {f: count_missing(v14, f) for f in fields}

# Merge
v15 = deepcopy(v14)
matched = 0
filled_counts = {f: 0 for f in fields}

def format_hours(oh):
    if not oh or not isinstance(oh, list):
        return ''
    parts = []
    for entry in oh:
        if isinstance(entry, dict):
            d = entry.get('day', '')
            h = entry.get('hours', '')
            if d and h:
                parts.append(f"{d}: {h}")
    return ' | '.join(parts)

for w in v15:
    pid = w.get('place_id')
    if not pid or pid not in enriched_idx:
        continue
    matched += 1
    e = enriched_idx[pid]

    # phone
    if empty(w.get('phone')) and not empty(e.get('phone')):
        w['phone'] = e['phone']; filled_counts['phone'] += 1
    if empty(w.get('phone_intl')) and not empty(e.get('phoneUnformatted')):
        w['phone_intl'] = e['phoneUnformatted']; filled_counts['phone_intl'] += 1

    # gps
    loc = e.get('location') or {}
    if empty(w.get('latitude')) and loc.get('lat') is not None:
        w['latitude'] = loc['lat']; filled_counts['latitude'] += 1
    if empty(w.get('longitude')) and loc.get('lng') is not None:
        w['longitude'] = loc['lng']; filled_counts['longitude'] += 1

    # hours
    if empty(w.get('opening_hours')) and not empty(e.get('openingHours')):
        formatted = format_hours(e['openingHours'])
        if formatted:
            w['opening_hours'] = formatted
            w['opening_hours_raw'] = e['openingHours']
            filled_counts['opening_hours'] += 1

    # image
    if empty(w.get('main_image')) and not empty(e.get('imageUrl')):
        w['main_image'] = e['imageUrl']; filled_counts['main_image'] += 1

    # address
    if empty(w.get('address')) and not empty(e.get('address')):
        w['address'] = e['address']; filled_counts['address'] += 1

    # rating / reviews / images
    if empty(w.get('rating')) and e.get('totalScore') is not None:
        w['rating'] = e['totalScore']; filled_counts['rating'] += 1
    if empty(w.get('reviews_count')) and e.get('reviewsCount') is not None:
        w['reviews_count'] = e['reviewsCount']; filled_counts['reviews_count'] += 1
    if empty(w.get('images_count')) and e.get('imagesCount') is not None:
        w['images_count'] = e['imagesCount']; filled_counts['images_count'] += 1

    # website (if Apify ever returns it)
    if empty(w.get('website')) and not empty(e.get('website')):
        w['website'] = e['website']; filled_counts['website'] += 1

after = {f: count_missing(v15, f) for f in fields}

# Save
with open('/home/user/workspace/shuwaikh_workshops_v15.json', 'w', encoding='utf-8') as f:
    json.dump(v15, f, ensure_ascii=False, indent=2)

print(f"\nmatched: {matched}")
print(f"\nField | Before missing | After missing | Filled")
print("-"*60)
for f in fields:
    print(f"{f:20s} | {before[f]:6d} | {after[f]:6d} | +{filled_counts[f]}")

print(f"\nSaved v15: /home/user/workspace/shuwaikh_workshops_v15.json")
