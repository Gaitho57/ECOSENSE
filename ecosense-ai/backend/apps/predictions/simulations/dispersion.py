"""
Gas Dispersion Plume Simulator.
Calculates a Pasquill-Gifford Gaussian dispersion plume generating GeoJSON polygons at specific concentration bounds.
"""

import math
import numpy as np
from shapely.geometry import MultiPoint, mapping
from pyproj import Geod

def get_dispersion_coefficients(stability_class, x_km):
    """
    Approximates Pasquill-Gifford horizontal (sigma_y) and vertical (sigma_z) dispersion coefficients.
    Formulas simplify bounds generically for the stability class spanning ranges.
    """
    # A=0, B=1, C=2, D=3, E=4, F=5
    # Coefficients [a, c, d, f] for sigma_y = a * x^0.894 and sigma_z = c * x^d + f
    coeffs = {
        'A': (213, 440.8, 1.941, 9.27),
        'B': (156, 106.6, 1.149, 3.3),
        'C': (104, 61.0, 0.911, 0),
        'D': (68, 33.2, 0.725, -1.7),
        'E': (50.5, 22.8, 0.678, -1.3),
        'F': (34, 14.35, 0.74, -0.35)
    }
    
    a, c, d, f = coeffs.get(stability_class.upper(), coeffs['C'])
    
    # Calculate sigmas
    sigma_y = a * (x_km ** 0.894)
    sigma_z = c * (x_km ** d) + f
    
    return max(0.1, sigma_y), max(0.1, sigma_z)


def calculate_dispersion(lat, lng, emission_rate_kg_h, wind_speed_ms, wind_direction_deg, stability_class='C'):
    """
    Executes structural dispersion algorithms evaluating a cross-grid mesh dynamically constructing bounds.
    """
    try:
        # Convert Q to g/s (kg/h * 1000 / 3600)
        q_g_s = emission_rate_kg_h * (1000.0 / 3600.0)
        # We need Q in micrograms per second to yield ug/m3
        q_ug_s = q_g_s * 1000000.0

        u = max(0.5, float(wind_speed_ms))
        
        # Wind direction represents where wind is coming from. 
        # Plume travels towards: wind_direction_deg + 180
        plume_dir_rad = math.radians((wind_direction_deg + 180) % 360)
        
        # Generator for spatial grid up to 5km radius
        grid_points = []
        geod = Geod(ellps="WGS84")
        
        # Sweep radially and laterally to define grid
        distances_m = np.linspace(10, 5000, 50)
        angles_rad = np.linspace(plume_dir_rad - math.pi/2, plume_dir_rad + math.pi/2, 40)
        
        # Target concentration bounds (ug/m3) array mapped to colors
        levels = [
            {"conc": 1, "color": "#fef08a"},    # light yellow
            {"conc": 5, "color": "#fde047"},    # yellow
            {"conc": 10, "color": "#f59e0b"},   # amber
            {"conc": 25, "color": "#ea580c"},   # orange
            {"conc": 50, "color": "#dc2626"},   # red
            {"conc": 100, "color": "#991b1b"},  # dark red
        ]
        
        # Pre-allocate containers for points meeting threshold
        level_points = {lvl["conc"]: [] for lvl in levels}
        
        for d in distances_m:
            x_km = d / 1000.0
            sig_y, sig_z = get_dispersion_coefficients(stability_class, x_km)
            
            for ang in angles_rad:
                # Downwind distance x (along plume axis) and crosswind y
                angle_diff = ang - plume_dir_rad
                downwind_x = d * math.cos(angle_diff)
                crosswind_y = d * math.sin(angle_diff)
                
                if downwind_x <= 0:
                     continue
                     
                # Gaussian formula (ground level concentration z=0)
                # C = (Q / (pi * sig_y * sig_z * u)) * exp(-y^2 / (2 * sig_y^2))
                # Note: Ground reflection doubles the concentration, so uses pi instead of 2*pi
                exponent = - (crosswind_y**2) / (2 * sig_y**2)
                if exponent < -50: # Avoid underflow
                     conc = 0
                else:
                     conc = (q_ug_s / (math.pi * sig_y * sig_z * u)) * math.exp(exponent)
                
                if conc >= 1.0:
                    # Determine coordinates
                    azimuth = math.degrees(ang)
                    # geod.fwd handles exact wgs84 projected coordinates structurally 
                    new_lng, new_lat, _ = geod.fwd(lng, lat, azimuth, d)
                    
                    point_geom = (new_lng, new_lat)
                    for lvl in levels:
                        if conc >= lvl["conc"]:
                            level_points[lvl["conc"]].append(point_geom)
                            
        # Build geometries
        features = []
        for lvl in sorted(levels, key=lambda x: x["conc"]):
             pts = level_points[lvl["conc"]]
             if len(pts) >= 3:
                 hull = MultiPoint(pts).convex_hull
                 # Add source point explicitly mitigating cutoff visualization
                 hull = hull.union(MultiPoint(pts + [(lng, lat)]).convex_hull)
                 if hull.geom_type == 'Polygon' or hull.geom_type == 'MultiPolygon':
                     features.append({
                         "type": "Feature",
                         "geometry": mapping(hull),
                         "properties": {
                             "concentration_ugm3": lvl["conc"],
                             "color": lvl["color"]
                         }
                     })

        return {
            "type": "FeatureCollection",
            "features": features
        }
        
    except Exception as e:
        return {
            "type": "FeatureCollection",
            "features": [],
            "error": str(e)
        }
