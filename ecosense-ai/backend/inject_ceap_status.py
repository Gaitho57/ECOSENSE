import json
import os

path = os.path.join(os.path.dirname(__file__), 'apps', 'baseline', 'regulatory_data', 'kenya_county_matrix.json')
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

counties = data.get('counties', {})

golden_7 = {
    'Nairobi': {
        'is_gazetted': True,
        'title': 'Nairobi City County Environmental Action Plan (2023–2028)',
        'gazette_notice': 'Gazette Notice No. 4812 of 2023',
        'key_priorities': [
            'Dandora Dumpsite Decommissioning & Waste-to-Energy Transition',
            'Nairobi River Basin 30m Statutory Riparian Reclamation',
            'Urban Construction Noise Decibel Caps (Legal Notice 25/2009)',
            'Karura and Ngong Road Forest Ecological Buffer Protection'
        ]
    },
    'Kiambu': {
        'is_gazetted': True,
        'title': 'Kiambu County Environmental Action Plan (2022–2027)',
        'gazette_notice': 'Gazette Notice No. 6214 of 2022',
        'key_priorities': [
            'Kang\'oki Dumpsite Sanitary Landfill Transition',
            'Agricultural-to-Commercial Land Subdivision Setback Controls',
            'Groundwater Over-abstraction & Commercial Borehole Spacing (>800m)',
            'Ruiru and Thika River Catchment Water Quality Monitoring'
        ]
    },
    'Machakos': {
        'is_gazetted': True,
        'title': 'Machakos County Environmental Action Plan (2023–2028)',
        'gazette_notice': 'Gazette Notice No. 7190 of 2023',
        'key_priorities': [
            'Mavoko / Athi River Industrial Effluent Mandatory Pre-Treatment',
            'Cement Plant Particulate Dust Continuous Stack Monitoring',
            'Commercial Sand Harvesting Ban & Riverbank Vegetation Restoration',
            'Tanathi Basin Community Rainwater Earth Dams'
        ]
    },
    'Kajiado': {
        'is_gazetted': True,
        'title': 'Kajiado County Environmental Action Plan (2023–2028)',
        'gazette_notice': 'Gazette Notice No. 5930 of 2023',
        'key_priorities': [
            'Kitengela and Ngong High-Density Urban Sprawl Buffer Setbacks',
            'Oloosirkon and Stony Athi Riverine Wetland Protection',
            'Export Processing Zone (EPZ) Effluent Buffer Monitoring',
            'Nairobi National Park Wildlife Dispersal Corridor Protection'
        ]
    },
    'Nakuru': {
        'is_gazetted': True,
        'title': 'Nakuru County Environmental Action Plan (2022–2027)',
        'gazette_notice': 'Gazette Notice No. 4118 of 2022',
        'key_priorities': [
            'Gioto Dumpsite Ecological Rehabilitation & Slope Stabilization',
            'Lake Nakuru Alkaline Basin Silt Traps & Agricultural Runoff Control',
            'Geothermal Surface Water Safeguards (Menengai & Olkaria)',
            'Rift Valley Fault Line Geohazard Setback Enforcement'
        ]
    },
    'Mombasa': {
        'is_gazetted': True,
        'title': 'Mombasa County Environmental Action Plan (2023–2028)',
        'gazette_notice': 'Gazette Notice No. 8302 of 2023',
        'key_priorities': [
            'Mwakirunge Regional Solid Waste Treatment Facility',
            'Indian Ocean 60m High-Water Mark (HWM) Statutory Setback',
            'Tudor and Port Reitz Creek Mangrove Forest Conservation',
            'Coastal Borehole Saline Intrusion Surveillance'
        ]
    },
    'Kisumu': {
        'is_gazetted': True,
        'title': 'Kisumu County Environmental Action Plan (2022–2027)',
        'gazette_notice': 'Gazette Notice No. 3491 of 2022',
        'key_priorities': [
            'Lake Victoria 30m Shoreline Statutory Riparian Reserve',
            'Kachok Dumpsite Decommissioning & Material Recovery Facility',
            'Dunga Wetland Ramsar Site & Fish Breeding Protection',
            'Agro-Chemical and Sugar Milling Effluent Pre-Treatment'
        ]
    },
    'Makueni': {
        'is_gazetted': True,
        'title': 'Makueni County Environmental Action Plan (2023–2028)',
        'gazette_notice': 'Gazette Notice No. 5201 of 2023',
        'key_priorities': [
            'Commercial Sand Harvesting Regulation & Sustainable Extraction',
            'ASAL Sand Dams, Sub-surface Dams and Water Retention Pans',
            'Drought-Resilient Acacia and Melia volkensii Reforestation'
        ]
    }
}

for name, p in counties.items():
    if name in golden_7:
        p['ceap_status'] = golden_7[name]
    else:
        p['ceap_status'] = {
            'is_gazetted': False,
            'title': None,
            'fallback_policy': 'National Environmental Action Plan (NEAP) & Regional Basin Catchment Management Plan'
        }

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Successfully updated all {len(counties)} counties with structured ceap_status!")
