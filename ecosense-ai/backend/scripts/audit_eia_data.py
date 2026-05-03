import os
import json

all_47 = {
    'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta', 
    'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 
    'Tharaka Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 
    'Nyeri', 'Kirinyaga', 'Murang\'a', 'Kiambu', 'Turkana', 'West Pokot', 
    'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo Marakwet', 'Nandi', 
    'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 
    'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 
    'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi'
}

paths = ['data/reference_reports', 'media/historical_eias']
found_counties = set()
file_map = {}

for p in paths:
    if os.path.exists(p):
        for f in os.listdir(p):
            # Check for direct matches
            matched = False
            for c in all_47:
                if c.lower() in f.lower():
                    found_counties.add(c)
                    file_map.setdefault(c, []).append(f)
                    matched = True
            
            # Contextual mappings
            if not matched:
                nairobi_suburbs = ['Westlands', 'Parklands', 'Riverside', 'Kileleshwa', 'Riruta', 'Ngong Road', 'Nairobi']
                if any(sub.lower() in f.lower() for sub in nairobi_suburbs):
                    found_counties.add('Nairobi')
                    file_map.setdefault('Nairobi', []).append(f)
                
                machakos_towns = ['Mavoko', 'Athi River']
                if any(town.lower() in f.lower() for town in machakos_towns):
                    found_counties.add('Machakos')
                    file_map.setdefault('Machakos', []).append(f)
                
                kiambu_towns = ['Thika', 'Limuru', 'Kiambaa', 'Karunguru']
                if any(town.lower() in f.lower() for town in kiambu_towns):
                    found_counties.add('Kiambu')
                    file_map.setdefault('Kiambu', []).append(f)

missing = all_47 - found_counties

print(f"COUNTIES COVERED BY PDF DATA ({len(found_counties)}):")
for c in sorted(list(found_counties)):
    print(f" - {c} ({len(file_map[c])} reports)")

print(f"\nCOUNTIES STILL MISSING ({len(missing)}):")
print(sorted(list(missing)))
