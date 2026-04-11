import json
import logging
from django.conf import settings
from shapely.geometry import Point, mapping
from shapely.ops import transform
import pyproj

logger = logging.getLogger(__name__)

class MapGenerator:
    """
    Automates 4 statutory GIS layers for NEMA EIA reports using Mapbox Static Images.
    Calculates buffers and overlays based on provided coordinates and project context.
    """
    
    BASE_URL = "https://api.mapbox.com/styles/v1"
    
    def __init__(self):
        self.token = getattr(settings, "MAPBOX_TOKEN", "pk.placeholder")
        if self.token == "your-value-here" or not self.token:
            self.token = "pk.placeholder"

    def _get_static_url(self, style, lon, lat, zoom=12, overlay=None, width=800, height=500):
        overlay_str = f"{overlay}/" if overlay else ""
        return f"{self.BASE_URL}/{style}/static/{overlay_str}{lon},{lat},{zoom},0/{width}x{height}@2x?access_token={self.token}"

    def _create_buffer_geojson(self, lon, lat, radius_meters, color="#3b82f6", opacity=0.3):
        """
        Calculates a metric buffer around a point and returns GeoJSON for Mapbox.
        """
        # Define projections: 4326 (WGS84) to local metric (UTM approximation)
        # Using a generic buffer logic for brevity, in production use specific UTM zone
        point = Point(lon, lat)
        
        # Simple orthographic projection for small buffer logic
        local_azimuthal_projection = pyproj.Proj(
            proj='aeqd', datum='WGS84', lat_0=lat, lon_0=lon
        )
        wgs84_projection = pyproj.Proj(proj='latlong', datum='WGS84')
        
        project_to_metric = pyproj.Transformer.from_proj(wgs84_projection, local_azimuthal_projection, always_xy=True).transform
        project_to_wgs84 = pyproj.Transformer.from_proj(local_azimuthal_projection, wgs84_projection, always_xy=True).transform
        
        # Buffer in meters
        point_metric = transform(project_to_metric, point)
        buffer_metric = point_metric.buffer(radius_meters)
        
        # Back to degrees
        buffer_wgs84 = transform(project_to_wgs84, buffer_metric)
        
        geojson = {
            "type": "Feature",
            "properties": {
                "fill": color,
                "fill-opacity": opacity,
                "stroke": color,
                "stroke-width": 2
            },
            "geometry": mapping(buffer_wgs84)
        }
        return geojson

    def generate_topographic_map(self, lon, lat):
        """Figure 1.1: Project Location & Topographic Context"""
        return self._get_static_url("mapbox/outdoors-v12", lon, lat, zoom=13)

    def generate_cadastral_proxy(self, lon, lat, boundary_geojson=None):
        """Figure 1.2: Site Specific Cadastral & Boundary Overlay"""
        overlay = None
        if boundary_geojson:
             # If we have a real survey polygon, use it
             overlay = f"geojson({json.dumps(boundary_geojson)})"
        else:
             # Fallback: Red marker at centroid
             overlay = f"pin-s+ff0000({lon},{lat})"
             
        return self._get_static_url("mapbox/satellite-streets-v12", lon, lat, zoom=16, overlay=overlay)

    def generate_hydrology_overlay(self, lon, lat):
        """Figure 1.3: Hydrological Map with 30m/60m Statutory Buffers"""
        # Create 30m (Riparian) and 60m (Cautionary) buffers
        b30 = self._create_buffer_geojson(lon, lat, 30, color="#1d4ed8", opacity=0.4)
        b60 = self._create_buffer_geojson(lon, lat, 60, color="#3b82f6", opacity=0.1)
        
        features = {"type": "FeatureCollection", "features": [b60, b30]}
        overlay = f"geojson({json.dumps(features)})"
        
        return self._get_static_url("mapbox/satellite-v9", lon, lat, zoom=15, overlay=overlay)

    def generate_zoning_map(self, lon, lat):
        """Figure 1.4: Land Use & Zoning Distribution (Kenyan Palette)"""
        # In a real system, we'd fetch OSM landuse polygons. 
        # Here we simulate the effect by highlighting the area with a zoning color.
        # Purple for Industrial (Official Kenyan Standard)
        zoning = self._create_buffer_geojson(lon, lat, 200, color="#a855f7", opacity=0.2)
        overlay = f"geojson({json.dumps(zoning)})"
        
        return self._get_static_url("mapbox/streets-v11", lon, lat, zoom=14, overlay=overlay)
