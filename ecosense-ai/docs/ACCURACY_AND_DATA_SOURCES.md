# EcoSense AI — Data Accuracy & Coverage (Any Location in Kenya)

This document states, per data layer, what is real and location-specific, what
is approximate, and what you must configure or validate before treating a report
as submission-grade for NEMA.

## What is location-specific and real

| Layer | Source | Accuracy |
|---|---|---|
| Biodiversity | GBIF live query around the exact lat/lng | Real occurrence records for the point |
| Climate (rainfall, temp, humidity) | NASA POWER / Open-Meteo for the point | Real |
| Air quality | OpenWeather for the point | Real |
| Hydrology (rivers, lakes, wetlands, proximity) | OpenStreetMap / Overpass | Real |
| Satellite (NDVI, land cover, tree cover) | Google Earth Engine — **requires credentials** | Real when GEE is configured; otherwise estimated |
| County & regional context (basin, water agency, road, soil, flora, fauna, vulnerability) | 47-county resolver (`county_profiles.py`) | Correct county anywhere in Kenya |

## Enable real satellite data everywhere (recommended)

Without Google Earth Engine credentials, NDVI/land-cover fall back to estimates
derived from climate + a regional atlas. To get true satellite reads for any
coordinate, set:

```
GEE_SERVICE_ACCOUNT=<your-service-account>@<project>.iam.gserviceaccount.com
GEE_KEY_PATH=/absolute/path/to/gee-service-account.json
```

The Earth Engine client (`clients/google_earth_engine.py`) auto-detects these
and switches from the REST fallback to real Sentinel-2 / ESA WorldCover / Hansen
tree-cover reads.

## County resolution (all 47 counties)

`county_profiles.py` resolves any Kenyan coordinate to the correct county and
returns its drainage basin, Water Works Development Agency, major road, soil,
agro-ecological zone, dominant flora/fauna and key environmental vulnerability.
This replaced the previous behaviour where 40 of 47 counties silently defaulted
to Nairobi's context.

Default resolution is **nearest administrative centroid**, which is accurate for
most projects. For sub-county precision near borders, drop an official county
boundary GeoJSON (e.g. from KNBS/IEBC) on disk and set:

```
COUNTY_GEOJSON_PATH=/absolute/path/to/kenya_counties.geojson
```

Resolution then uses point-in-polygon.

## Impact predictions

Predictions now use the **real** baseline features for the site (NDVI, threatened
species count, air-quality index, rainfall from the climate baseline, distance to
water from hydrology, and urban proximity from population density) instead of the
previous hardcoded constants.

The severity/probability themselves come from EcoSense's deterministic expert-rules
engine unless you train and ship XGBoost models (`ml/train.py`). Until trained on a
**real labelled EIA outcome dataset**, treat predictions as a calibrated expert
heuristic — each prediction reports `prediction_method` (`ml_model` vs
`expert_rules`) and a confidence so reviewers can see how it was produced.

## Compliance

The compliance engine now evaluates the project's **actual** data — expert
certification, baseline coverage, VEC/prediction coverage, drafted report
sections, recorded community engagement, and configured monitoring — and returns
a *warning* (not a pass) when the supporting evidence is absent. The resulting
score/grade therefore reflects real project completeness and rises as the project
matures.

It is a compliance **aid**, not a substitute for a NEMA-registered Lead Expert's
professional judgment.

## Honest boundaries before NEMA submission

A generated report is a strong, location-aware **first draft**. Before it is
submission-grade you should:

1. Configure GEE so satellite metrics are real for the site (above).
2. Have a **NEMA-registered Lead Expert** review the content and apply their
   registration number and certification stamp (the platform enforces that this
   exists for EMCA-003, but cannot certify competence).
3. Validate a sample of generated reports against known, approved EIAs for the
   same regions and project types, and correct any template/knowledge-base gaps.
4. If you rely on the impact predictions quantitatively, train the models on a
   real labelled dataset rather than the rules-bootstrapped default.

With GEE configured and expert sign-off, the data layer and regional context are
accurate anywhere in Kenya; the predictive and compliance layers are decision-
support that still require professional validation.
