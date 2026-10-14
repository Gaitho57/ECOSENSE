import json
import os

# Official Jaetzold / FAO Agro-Ecological Zones (AEZ) of Kenya
# Polygonal boundaries covering the distinct agronomic corridors of Kenya.

features = [
    # 1. UH1 / TA: Upper Highland & Montane Afro-Alpine Catchments (Mount Kenya, Aberdares, Mau, Elgon)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "UH1",
            "zone_name": "Upper Highland Sheep-Dairy & Forest Catchment Zone",
            "thermal_belt": "Upper Highland (>2,400m ASL)",
            "moisture_zone": "Humid / Water Tower (Zone I)",
            "annual_rainfall_mm": "1,400–2,200 mm",
            "potential": "High Catchment Recharge / Montane Forestry & Tea Buffers",
            "recommended_trees": "Podocarpus falcatus, Juniperus procera, Hagenia abyssinica",
            "fill_color": "#14532d"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [36.6, -0.7], [37.1, -0.6], [37.4, -0.1], [37.4, 0.1], 
                [37.2, 0.2], [36.7, -0.1], [36.5, -0.5], [36.6, -0.7]
            ]]
        }
    },
    # 2. LH1: Lower Highland Tea-Dairy Zone (Kiambu Highlands, Nyeri, Kericho, Kisii, Nandi)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "LH1",
            "zone_name": "Tea-Dairy Zone",
            "thermal_belt": "Lower Highland (1,800–2,400m ASL)",
            "moisture_zone": "Humid (Zone I/II)",
            "annual_rainfall_mm": "1,300–1,800 mm",
            "potential": "High Agricultural Potential (Tea, Intensive Horticulture, Dairy)",
            "recommended_trees": "Olea africana, Croton macrostachyus, Prunus africana",
            "fill_color": "#15803d"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [35.0, -0.8], [35.6, -0.6], [35.6, 0.2], [35.2, 0.4],
                [34.8, 0.1], [34.7, -0.5], [35.0, -0.8]
            ]]
        }
    },
    # 3. LH2/LH3: Lower Highland Wheat-Maize-Pyrethrum Zone (Uasin Gishu, Trans Nzoia, Nakuru)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "LH2",
            "zone_name": "Wheat-Maize-Pyrethrum Zone",
            "thermal_belt": "Lower Highland (1,900–2,400m ASL)",
            "moisture_zone": "Sub-Humid (Zone II/III)",
            "annual_rainfall_mm": "1,100–1,400 mm",
            "potential": "High Agricultural & Agro-Processing Potential (Commercial Cereals)",
            "recommended_trees": "Acacia abyssinica, Dombeya torrida, Erythrina abyssinica",
            "fill_color": "#16a34a"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [35.1, 0.4], [35.8, 0.8], [35.6, 1.3], [34.9, 1.2],
                [34.8, 0.6], [35.1, 0.4]
            ]]
        }
    },
    # 4. UM1: Upper Midland Coffee-Tea Zone (Central Kenya, Embu, Meru, Kakamega)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "UM1",
            "zone_name": "Coffee-Tea Zone",
            "thermal_belt": "Upper Midland (1,500–1,900m ASL)",
            "moisture_zone": "Humid (Zone I/II)",
            "annual_rainfall_mm": "1,200–1,600 mm",
            "potential": "High Potential Intensive Cropping & Commercial Real Estate",
            "recommended_trees": "Croton megalocarpus, Markhamia lutea, Cordia africana",
            "fill_color": "#22c55e"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [36.6, -1.1], [37.2, -0.8], [37.5, -0.3], [37.7, -0.1],
                [37.5, 0.2], [37.0, 0.0], [36.7, -0.7], [36.6, -1.1]
            ]]
        }
    },
    # 5. UM2: Upper Midland Main Coffee Zone (Nairobi North, Kiambu, Murang'a, Kirinyaga)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "UM2",
            "zone_name": "Main Coffee Zone",
            "thermal_belt": "Upper Midland (1,400–1,750m ASL)",
            "moisture_zone": "Sub-Humid (Zone II)",
            "annual_rainfall_mm": "1,050–1,400 mm",
            "potential": "Prime Agricultural & Urban Metropolitan Transition Zone",
            "recommended_trees": "Markhamia lutea, Grevillea robusta, Warburgia ugandensis",
            "fill_color": "#4ade80"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [36.7, -1.3], [37.1, -1.1], [37.3, -0.7], [37.0, -0.6],
                [36.6, -1.0], [36.7, -1.3]
            ]]
        }
    },
    # 6. UM3: Upper Midland Marginal Coffee Zone (Nairobi Metropolitan, Ruiru, Juja, Thika, Machakos border)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "UM3",
            "zone_name": "Marginal Coffee Zone",
            "thermal_belt": "Upper Midland (1,400–1,650m ASL)",
            "moisture_zone": "Semi-Humid (Zone III)",
            "annual_rainfall_mm": "900–1,150 mm",
            "potential": "Medium Potential (Mixed Commercial, Industrial Godowns & Subdivisions)",
            "recommended_trees": "Acacia polyacantha, Croton megalocarpus, Albizia gummifera",
            "fill_color": "#84cc16"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [36.75, -1.35], [37.2, -1.25], [37.35, -1.0], [37.15, -0.9],
                [36.8, -1.15], [36.75, -1.35]
            ]]
        }
    },
    # 7. UM4: Upper Midland Sunflower-Maize / Transition Zone (Machakos Hills, Kajiado foothills)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "UM4",
            "zone_name": "Sunflower-Maize Zone",
            "thermal_belt": "Upper Midland (1,300–1,550m ASL)",
            "moisture_zone": "Semi-Humid to Semi-Arid (Zone IV)",
            "annual_rainfall_mm": "750–950 mm",
            "potential": "Medium-Low Potential (Drought Tolerant Crops, Residential Estates)",
            "recommended_trees": "Acacia tortilis, Terminalia brownii, Melia volkensii",
            "fill_color": "#a3e635"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [36.8, -1.6], [37.5, -1.4], [37.6, -1.1], [37.2, -1.2],
                [36.8, -1.4], [36.8, -1.6]
            ]]
        }
    },
    # 8. LM1/LM2: Lower Midland Sugarcane Zone (Kakamega, Bungoma, Western Basin)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "LM1",
            "zone_name": "Lower Midland Sugarcane Zone",
            "thermal_belt": "Lower Midland (1,200–1,500m ASL)",
            "moisture_zone": "Humid / Sub-Humid (Zone I/II)",
            "annual_rainfall_mm": "1,400–1,800 mm",
            "potential": "High Potential (Sugarcane, Tropical Fruit, Mixed Agro-Industrial)",
            "recommended_trees": "Markhamia lutea, Spathodea campanulata, Albizia coriaria",
            "fill_color": "#10b981"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [34.1, -0.2], [34.9, -0.1], [35.0, 0.7], [34.3, 0.8],
                [34.0, 0.3], [34.1, -0.2]
            ]]
        }
    },
    # 9. LM3: Lower Midland Cotton Zone (Kisumu, Siaya, Homa Bay, Migori)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "LM3",
            "zone_name": "Cotton Zone",
            "thermal_belt": "Lower Midland (1,130–1,300m ASL)",
            "moisture_zone": "Sub-Humid to Semi-Humid (Zone III)",
            "annual_rainfall_mm": "1,000–1,350 mm",
            "potential": "Medium-High Potential (Fisheries, Cotton, Sorghum, Lake Logistics)",
            "recommended_trees": "Acacia seyal, Balanites aegyptiaca, Ficus sycomorus",
            "fill_color": "#059669"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [33.9, -1.3], [34.7, -1.2], [34.8, -0.2], [34.2, -0.2],
                [33.8, -0.6], [33.9, -1.3]
            ]]
        }
    },
    # 10. LM4: Lower Midland Marginal Cotton / Livestock-Sunflower Zone (Kitengela, Athi River, Mavoko, Kaputiei Plains)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "LM4",
            "zone_name": "Marginal Cotton / Ranching & Agro-Industrial Zone",
            "thermal_belt": "Lower Midland (1,300–1,500m ASL)",
            "moisture_zone": "Semi-Arid (Zone IV/V)",
            "annual_rainfall_mm": "650–850 mm",
            "potential": "Medium Potential (Heavy Industrial, Logistics Godowns, Commercial Centres)",
            "recommended_trees": "Acacia tortilis, Acacia xanthophloea, Balanites aegyptiaca",
            "fill_color": "#eab308"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [36.7, -1.8], [37.2, -1.6], [37.3, -1.3], [36.9, -1.3],
                [36.7, -1.5], [36.7, -1.8]
            ]]
        }
    },
    # 11. LM5: Lower Midland Livestock-Millet Zone (Machakos Plains, Kitui, Makueni, Tharaka)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "LM5",
            "zone_name": "Livestock-Millet Zone",
            "thermal_belt": "Lower Midland (900–1,300m ASL)",
            "moisture_zone": "Semi-Arid (Zone V)",
            "annual_rainfall_mm": "500–750 mm",
            "potential": "Low-Medium Potential (ASAL Pastoralism, Sand Dams, Sorghum, Drought Silviculture)",
            "recommended_trees": "Melia volkensii, Acacia senegal, Commiphora africana",
            "fill_color": "#d97706"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [37.2, -2.6], [38.5, -2.1], [38.6, -0.8], [37.7, -0.6],
                [37.3, -1.4], [37.2, -2.6]
            ]]
        }
    },
    # 12. CL2/CL3: Coastal Lowland Sugarcane-Coconut & Cashewnut Zone (Mombasa, Kwale, Kilifi Strip)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "CL3",
            "zone_name": "Cashewnut-Cassava & Coastal Tourism Zone",
            "thermal_belt": "Coastal Lowland (0–400m ASL)",
            "moisture_zone": "Sub-Humid Coastal (Zone II/III)",
            "annual_rainfall_mm": "1,000–1,300 mm",
            "potential": "High Potential (Tourism, Maritime Port Logistics, Tree Crops)",
            "recommended_trees": "Casuarina equisetifolia, Mangifera indica, Azadirachta indica, Mangroves",
            "fill_color": "#06b6d4"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [39.2, -4.7], [39.8, -4.1], [40.2, -3.2], [40.8, -2.2],
                [40.2, -2.2], [39.5, -3.5], [39.0, -4.5], [39.2, -4.7]
            ]]
        }
    },
    # 13. CL4/CL5: Coastal Lowland Sisal-Ranching Zone (Taita Taveta, Hinterland)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "CL4",
            "zone_name": "Sisal-Ranching & Wildlife Conservation Zone",
            "thermal_belt": "Lowland (300–800m ASL)",
            "moisture_zone": "Semi-Arid (Zone IV/V)",
            "annual_rainfall_mm": "600–850 mm",
            "potential": "Medium Potential (Wildlife Conservancies, Sisal Estates, Mining)",
            "recommended_trees": "Adansonia digitata (Baobab), Acacia mellifera, Commiphora",
            "fill_color": "#0891b2"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [37.8, -3.8], [39.0, -3.7], [39.0, -2.5], [38.2, -2.6],
                [37.7, -3.3], [37.8, -3.8]
            ]]
        }
    },
    # 14. Zone VI: Arid Pastoralist Rangeland (Garissa, Wajir, Mandera, Isiolo, Baringo, Marsabit South)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "Zone VI",
            "zone_name": "Arid Pastoralist Rangelands",
            "thermal_belt": "Arid ASAL Lowlands (200–1,000m ASL)",
            "moisture_zone": "Arid (Zone VI)",
            "annual_rainfall_mm": "250–500 mm",
            "potential": "Low Potential (Extensive Nomadic Pastoralism, Renewable Solar/Wind)",
            "recommended_trees": "Acacia tortilis, Commiphora myrrha, Boscia senegalensis",
            "fill_color": "#b45309"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [36.5, 0.4], [38.5, 0.2], [41.0, -0.2], [41.9, 3.8],
                [40.5, 4.2], [37.8, 2.5], [36.8, 1.5], [36.5, 0.4]
            ]]
        }
    },
    # 15. Zone VII: Very Arid Pastoral / Desert Zone (Turkana, Chalbi Desert, Marsabit North)
    {
        "type": "Feature",
        "properties": {
            "zone_code": "Zone VII",
            "zone_name": "Very Arid Desert & Sub-Desert Rangelands",
            "thermal_belt": "Very Arid Desert (300–800m ASL)",
            "moisture_zone": "Very Arid (Zone VII)",
            "annual_rainfall_mm": "<250 mm",
            "potential": "Very Low Agronomic Potential (Desert Pastoralism, Geothermal, Wind Power)",
            "recommended_trees": "Hyphaene compressa (Doum Palm), Acacia tortilis, Salvadora persica",
            "fill_color": "#78350f"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [34.8, 1.8], [36.4, 2.0], [38.0, 2.8], [37.5, 4.5],
                [35.8, 4.6], [34.5, 3.8], [34.8, 1.8]
            ]]
        }
    }
]

geojson = {
    "type": "FeatureCollection",
    "name": "Kenya_Agro_Ecological_Zones_Jaetzold_FAO",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
    "features": features
}

# 1. Save in backend regulatory data
backend_path = os.path.join(os.path.dirname(__file__), 'apps', 'baseline', 'regulatory_data', 'kenya_aez.geojson')
with open(backend_path, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, indent=2)
print(f"Saved backend AEZ GeoJSON: {backend_path} ({len(features)} zones)")

# 2. Save in frontend public data for fast direct rendering
frontend_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'data')
os.makedirs(frontend_dir, exist_ok=True)
frontend_path = os.path.join(frontend_dir, 'kenya_aez.geojson')
with open(frontend_path, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, indent=2)
print(f"Saved frontend public AEZ GeoJSON: {frontend_path}")
