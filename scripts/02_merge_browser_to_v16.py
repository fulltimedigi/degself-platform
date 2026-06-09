#!/usr/bin/env python3
"""Merge wide_browse enrichment results into v15 → v16."""
import json
import re
import glob
from copy import deepcopy

result_files = sorted(glob.glob('/home/user/workspace/wide/browse_results_*.json'))
print(f"Found {len(result_files)} result files")

all_items = []
for f in result_files:
    with open(f) as fh:
        data = json.load(fh)
    items = data.get('results', [])
    print(f"  {f.split('/')[-1]}: {len(items)} items")
    all_items.extend(items)

print(f"\nTotal items: {len(all_items)}")

# Clean markdown link contamination
md_link_re = re.compile(r'\s*[,\.]?\s*\[(?:Google Maps|خرائط Google|google maps)\][^\s]*', re.IGNORECASE)
md_link_re2 = re.compile(r'\s*\[[^\]]*\]\([^\)]*\)')

def clean_text(v):
    if not isinstance(v, str):
        return v
    v = md_link_re.sub('', v)
    v = md_link_re2.sub('', v)
    return v.strip().rstrip(',').strip()

def clean_pid(pid):
    if not pid:
        return pid
    pid = clean_text(pid)
    m = re.match(r'^([A-Za-z0-9_-]+)', pid)
    return m.group(1) if m else pid

# Build index by cleaned placeId
enriched_idx = {}
for item in all_items:
    pid = clean_pid(item.get('Place ID') or item.get('place_id'))
    if not pid:
        ent = item.get('entity', '')
        m = re.search(r'place_id:([A-Za-z0-9_-]+)', ent)
        if m:
            pid = m.group(1)
    if pid:
        enriched_idx[pid] = item

print(f"Enriched index size: {len(enriched_idx)}")

# Load v15
with open('/home/user/workspace/shuwaikh_workshops_v15.json') as f:
    v15 = json.load(f)

def empty(v):
    if v is None: return True
    if isinstance(v, str) and not v.strip(): return True
    if isinstance(v, (list, dict)) and not v: return True
    return False

fields = ['phone', 'latitude', 'longitude', 'opening_hours', 'main_image',
          'address', 'rating', 'reviews_count', 'website']

def count_missing(data, field):
    return sum(1 for w in data if empty(w.get(field)))

before = {f: count_missing(v15, f) for f in fields}

v16 = deepcopy(v15)
matched = 0
filled_counts = {f: 0 for f in fields}

def is_geocode_placeholder(url):
    if not url: return True
    if 'default_geocode' in url: return True
    return False

for w in v16:
    pid = w.get('place_id')
    if not pid or pid not in enriched_idx:
        continue
    matched += 1
    e = enriched_idx[pid]

    e_phone = clean_text(e.get('Phone'))
    e_address = clean_text(e.get('Address'))
    e_hours = clean_text(e.get('Opening Hours'))
    e_image = e.get('Image URL') or ''
    e_website = clean_text(e.get('Website'))

    # phone
    if empty(w.get('phone')) and not empty(e_phone):
        w['phone'] = e_phone
        filled_counts['phone'] += 1

    # GPS
    lat = e.get('Latitude')
    lng = e.get('Longitude')
    if empty(w.get('latitude')) and lat not in (None, '', 0):
        w['latitude'] = lat; filled_counts['latitude'] += 1
    if empty(w.get('longitude')) and lng not in (None, '', 0):
        w['longitude'] = lng; filled_counts['longitude'] += 1

    # hours
    if empty(w.get('opening_hours')) and not empty(e_hours):
        w['opening_hours'] = e_hours
        filled_counts['opening_hours'] += 1

    # image (skip geocode placeholder)
    if empty(w.get('main_image')) and not empty(e_image) and not is_geocode_placeholder(e_image):
        w['main_image'] = e_image
        filled_counts['main_image'] += 1

    # address
    if empty(w.get('address')) and not empty(e_address):
        w['address'] = e_address
        filled_counts['address'] += 1

    # rating
    rating = e.get('Rating')
    if empty(w.get('rating')) and rating not in (None, '', 0):
        w['rating'] = rating
        filled_counts['rating'] += 1

    # reviews_count
    rc = e.get('Reviews')
    if empty(w.get('reviews_count')) and rc not in (None, ''):
        w['reviews_count'] = rc
        filled_counts['reviews_count'] += 1

    # website (skip if Google Maps URL)
    if empty(w.get('website')) and not empty(e_website):
        if 'google.com/maps' not in e_website.lower():
            w['website'] = e_website
            filled_counts['website'] += 1

    # permanently_closed
    if e.get('Permanently Closed') is True:
        w['permanently_closed'] = True

after = {f: count_missing(v16, f) for f in fields}

with open('/home/user/workspace/shuwaikh_workshops_v16.json', 'w', encoding='utf-8') as f:
    json.dump(v16, f, ensure_ascii=False, indent=2)

print(f"\nMatched: {matched} workshops")
print(f"\n{'Field':<18} | Before  | After   | Filled")
print('-' * 56)
for f in fields:
    print(f"{f:<18} | {before[f]:>6}  | {after[f]:>6}  | +{filled_counts[f]}")

print(f"\nSaved: /home/user/workspace/shuwaikh_workshops_v16.json")
