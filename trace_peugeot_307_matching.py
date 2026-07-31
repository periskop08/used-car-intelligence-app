import pandas as pd
import re

CSV_PATH = "apps/api/TorqueScout_Global_Vehicle_Variant_Database_2000_2026.csv"
SATARIZ_PATH = "apps/satariz_vehicle_taxonomy.xlsx"

def normalize_str(s):
    if not s:
        return ""
    s = str(s).lower().strip()
    s = re.sub(r'[^a-z0-9]', '', s)
    s = s.replace('serisi', '').replace('series', '').replace('sinifi', '').replace('class', '')
    return s

df_csv = pd.read_csv(CSV_PATH)
df_agg = df_csv.groupby(['brand', 'model', 'body_type', 'fuel_type', 'engine_name', 'trim']).agg(
    min_year=('year', 'min'),
    max_year=('year', 'max')
).reset_index()

spec_index = {}
for idx, r in df_agg.iterrows():
    b_key = normalize_str(r['brand'])
    m_key = normalize_str(r['model'])
    key = f"{b_key}:{m_key}"
    if key not in spec_index:
        spec_index[key] = []
    spec_index[key].append(r)
    
brand_fallback = {}
for idx, r in df_agg.iterrows():
    b_key = normalize_str(r['brand'])
    if b_key not in brand_fallback:
        brand_fallback[b_key] = []
    brand_fallback[b_key].append(r)

b_norm = normalize_str("Peugeot")
m_norm = normalize_str("307")
key = f"{b_norm}:{m_norm}"

matched_specs = spec_index.get(key, [])
print(f"Direct match for '{key}': found {len(matched_specs)} specs.")

if not matched_specs:
    print("No direct match. Trying fallback...")
    brand_specs = brand_fallback.get(b_norm, [])
    best_spec = None
    best_score = 0
    for spec in brand_specs:
        spec_m_norm = normalize_str(spec['model'])
        if spec_m_norm in m_norm or m_norm in spec_m_norm:
            score = max(len(spec_m_norm), len(m_norm))
            if score > best_score:
                best_score = score
                best_spec = spec
                print(f"  Candidate: '{spec['model']}' (norm: {spec_m_norm}) vs '{m_norm}' -> score: {score}")
                
    if best_spec is not None:
        best_model_key = f"{normalize_str(best_spec['brand'])}:{normalize_str(best_spec['model'])}"
        print(f"Best fallback model key: '{best_model_key}'")
        matched_specs = spec_index.get(best_model_key, [])
        print(f"Matched specs count: {len(matched_specs)}")
        # Print a few matched specs
        for i, s in enumerate(matched_specs[:5]):
            print(f"  - {s['brand']} {s['model']} | Engine: {s['engine_name']} | Trim: {s['trim']}")
else:
    for i, s in enumerate(matched_specs[:5]):
        print(f"  - {s['brand']} {s['model']} | Engine: {s['engine_name']} | Trim: {s['trim']}")
