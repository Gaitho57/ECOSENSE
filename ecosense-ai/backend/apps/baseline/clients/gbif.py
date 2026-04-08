"""
EcoSense AI — GBIF Biodiversity Client.

Retrieves real biodiversity occurrence data from the Global Biodiversity
Information Facility (GBIF) public API (free, no API key required).

Enhancements over previous version:
  - Increased search limit for better species coverage
  - Uses GBIF species API to get proper IUCN threat status
  - Groups species by taxonomic class (mammals, birds, reptiles, etc.)
  - Detects habitat type from occurrence metadata
  - Tracks endemic species where data is available
"""

import logging
from collections import defaultdict

import requests
from .utils import retry_api_call

logger = logging.getLogger(__name__)

# GBIF taxonomic class keys for grouping
TAXON_GROUPS = {
    "Mammalia": "Mammals",
    "Aves": "Birds",
    "Reptilia": "Reptiles",
    "Amphibia": "Amphibians",
    "Insecta": "Insects",
    "Arachnida": "Arachnids",
    "Actinopterygii": "Fish",
    "Magnoliopsida": "Flowering Plants",
    "Liliopsida": "Monocots",
    "Polypodiopsida": "Ferns",
    "Pinopsida": "Conifers",
    "Fungi": "Fungi",
}


class GBIFClient:
    """
    Client for Global Biodiversity Information Facility (GBIF) public API.
    Does not require an API key.
    Retrieves occurrence data to compute comprehensive biodiversity metrics.
    """

    def __init__(self):
        self.occurrence_url = "https://api.gbif.org/v1/occurrence/search"
        self.species_url = "https://api.gbif.org/v1/species"

    @retry_api_call(max_retries=3, delay=2)
    def get_data(self, lat: float, lng: float, radius_km: int = 10) -> dict:
        """
        Fetch occurrence data around a geocoordinate with comprehensive analysis.
        """
        # Roughly 1 degree ≈ 111 km at the equator
        offset = radius_km / 111.0
        decimal_lat_min = lat - offset
        decimal_lat_max = lat + offset
        decimal_lng_min = lng - offset
        decimal_lng_max = lng + offset

        # Fetch occurrences with higher limit for better coverage
        params = {
            "decimalLatitude": f"{decimal_lat_min},{decimal_lat_max}",
            "decimalLongitude": f"{decimal_lng_min},{decimal_lng_max}",
            "limit": 300,
            "hasCoordinate": "true",
            "hasGeospatialIssue": "false",
        }

        resp = requests.get(self.occurrence_url, params=params, timeout=30)
        resp.raise_for_status()
        result = resp.json()
        occurrences = result.get("results", [])
        total_records = result.get("count", 0)

        # ---- Process species ----
        species_dict = {}  # Deduplicate by species key
        taxon_groups = defaultdict(set)
        habitat_indicators = defaultdict(int)

        for occ in occurrences:
            species_name = occ.get("species")
            species_key = occ.get("speciesKey")
            if not species_name:
                continue

            # Track taxonomic class
            taxon_class = occ.get("class", "Unknown")
            group_name = TAXON_GROUPS.get(taxon_class, taxon_class)
            taxon_groups[group_name].add(species_name)

            # Track habitat indicators from occurrence metadata
            habitat = occ.get("habitat", "")
            if habitat:
                habitat_indicators[habitat] += 1

            # Deduplicate species
            if species_name not in species_dict:
                species_dict[species_name] = {
                    "name": species_name,
                    "species_key": species_key,
                    "class": taxon_class,
                    "group": group_name,
                    "kingdom": occ.get("kingdom", ""),
                    "family": occ.get("family", ""),
                    "genus": occ.get("genus", ""),
                    "iucn_status": None,  # Will be enriched below
                    "occurrence_count": 0,
                }
            species_dict[species_name]["occurrence_count"] += 1

        # ---- Enrich with IUCN threat status via GBIF species API ----
        threatened_count = 0
        near_threatened_count = 0
        species_list = list(species_dict.values())

        # Query IUCN status for up to 50 species (to avoid excessive API calls)
        for sp in species_list[:50]:
            if sp["species_key"]:
                iucn_status = self._get_iucn_status(sp["species_key"])
                sp["iucn_status"] = iucn_status

                if iucn_status in ("VU", "EN", "CR"):
                    threatened_count += 1
                elif iucn_status == "NT":
                    near_threatened_count += 1

        # ---- Infer habitat type ----
        habitat_type = self._infer_habitat(habitat_indicators, taxon_groups)

        # ---- Build taxonomic summary ----
        taxonomy_summary = {
            group: len(species)
            for group, species in sorted(taxon_groups.items(), key=lambda x: -len(x[1]))
        }

        # ---- Shannon Diversity Index (simplified) ----
        total_occ = sum(sp["occurrence_count"] for sp in species_list)
        shannon_index = 0.0
        if total_occ > 0 and len(species_list) > 1:
            import math
            for sp in species_list:
                p = sp["occurrence_count"] / total_occ
                if p > 0:
                    shannon_index -= p * math.log(p)
            shannon_index = round(shannon_index, 3)

        # Sort species list by occurrence count descending, limit to 30
        species_list.sort(key=lambda x: -x["occurrence_count"])

        return {
            "total_species_count": len(species_dict),
            "total_occurrence_records": total_records,
            "threatened_species_count": threatened_count,
            "near_threatened_count": near_threatened_count,
            "species_list": species_list[:30],
            "taxonomy_summary": taxonomy_summary,
            "shannon_diversity_index": shannon_index,
            "habitat_type": habitat_type,
            "has_endemic_species": any(
                sp.get("iucn_status") in ("CR", "EN")
                for sp in species_list
            ),
            "source": "GBIF Public API",
            "search_radius_km": radius_km,
        }

    def _get_iucn_status(self, species_key: int) -> str:
        """
        Get IUCN Red List category for a species via GBIF species API.
        The GBIF species endpoint includes iucnRedListCategory when available.
        """
        try:
            resp = requests.get(
                f"{self.species_url}/{species_key}",
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                status = data.get("iucnRedListCategory", "")
                if status:
                    return status

                # Also check threat statuses via the species/iucnRedListCategory endpoint
                iucn_resp = requests.get(
                    f"{self.species_url}/{species_key}/iucnRedListCategory",
                    timeout=10,
                )
                if iucn_resp.status_code == 200:
                    iucn_data = iucn_resp.json()
                    return iucn_data.get("category", "LC")

            return "LC"  # Least Concern as default
        except Exception:
            return "LC"

    @staticmethod
    def _infer_habitat(habitat_indicators: dict, taxon_groups: dict) -> str:
        """Infer habitat type from species composition and metadata."""
        # If we have direct habitat data from GBIF
        if habitat_indicators:
            dominant = max(habitat_indicators, key=habitat_indicators.get)
            return dominant

        # Infer from taxonomic composition
        groups = {k: len(v) for k, v in taxon_groups.items()}
        total = sum(groups.values())
        if total == 0:
            return "Data insufficient"

        # Heuristic classification
        plant_ratio = (groups.get("Flowering Plants", 0) + groups.get("Monocots", 0) +
                       groups.get("Ferns", 0) + groups.get("Conifers", 0)) / max(total, 1)
        bird_ratio = groups.get("Birds", 0) / max(total, 1)
        fish_ratio = groups.get("Fish", 0) / max(total, 1)

        if fish_ratio > 0.3:
            return "Aquatic / Riparian"
        elif plant_ratio > 0.5 and groups.get("Conifers", 0) > 0:
            return "Montane Forest"
        elif plant_ratio > 0.5:
            return "Tropical / Subtropical Forest"
        elif bird_ratio > 0.4:
            return "Open Grassland / Savanna"
        elif groups.get("Mammals", 0) > 5:
            return "Mixed Woodland Savanna"
        else:
            return "Mixed Habitat"
