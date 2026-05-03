import json
import os
import logging

logger = logging.getLogger(__name__)

class RegulatoryArchiveClient:
    def __init__(self):
        self.matrix = {}
        base_dir = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(os.path.dirname(base_dir), "regulatory_data", "statutory_matrix.json")
        
        try:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    self.matrix = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load Statutory Matrix: {e}")

    def get_compliance_package(self, sector, county):
        """
        Retrieves a complete legal package (Acts, Regulations, Permits) based on Sector and Region.
        """
        package = {
            "acts": ["EMCA 1999 (Amendment 2015)", "Constitution of Kenya 2010"],
            "regulations": ["Environmental (Impact Assessment and Audit) Regulations 2003"],
            "permits": ["NEMA EIA License"],
            "agencies": ["NEMA"]
        }

        # Sectoral Enrichment
        sector_key = str(sector).lower()
        if sector_key in self.matrix.get("sectors", {}):
            s = self.matrix["sectors"][sector_key]
            package["acts"].extend(s.get("acts", []))
            package["regulations"].extend(s.get("regulations", []))
            package["permits"].extend(s.get("permits", []))

        # Regional Enrichment
        if county in self.matrix.get("regional_bylaws", {}):
            r = self.matrix["regional_bylaws"][county]
            package["acts"].extend(r.get("statutes", []))
            package["agencies"].extend(r.get("agencies", []))

        # Deduplicate
        package["acts"] = list(set(package["acts"]))
        package["regulations"] = list(set(package["regulations"]))
        package["permits"] = list(set(package["permits"]))
        package["agencies"] = list(set(package["agencies"]))

        return package
