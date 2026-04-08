import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMap } from './MapContext';

// MapLibre doesn't require a commercial token for custom raster sources
const BaseMap = forwardRef(({ 
  center = [36.8219, -1.2921], // Default Nairobi
  zoom = 12, 
  height = '100%', 
  children 
}, ref) => {
  const mapContainer = useRef(null);
  const { map, setMap } = useMap();
  
  // Style Definition: Public Sources for END TO END VALIDATION (Eco-Green Logic)
  const STYLES = {
    satellite: {
        version: 8,
        sources: {
            "esri-satellite": {
                type: "raster",
                tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
                tileSize: 256,
                attribution: "Esri | EcoSense AI"
            }
        },
        layers: [{
            id: "satellite",
            type: "raster",
            source: "esri-satellite",
            minzoom: 0,
            maxzoom: 22
        }]
    },
    light: {
        version: 8,
        sources: {
            "osm": {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "&copy; OpenStreetMap"
            }
        },
        layers: [{
            id: "osm",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19
        }]
    },
    dark: {
        version: 8,
        sources: {
            "carto-dark": {
                type: "raster",
                tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"],
                tileSize: 256,
                attribution: "&copy; CartoDB"
            }
        },
        layers: [{
            id: "carto-dark",
            type: "raster",
            source: "carto-dark",
            minzoom: 0,
            maxzoom: 20
        }]
    }
  };

  const [currentStyle, setCurrentStyle] = useState('satellite');

  useImperativeHandle(ref, () => map, [map]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLES[currentStyle],
      center: center,
      zoom: zoom,
    });

    mapInstance.on('load', () => {
      setMap(mapInstance);
    });

    return () => {
      mapInstance.remove();
      setMap(null);
    };
  }, []); // Run once on mount
  
  // Watch for center/zoom prop changes and move map (Eco-Green logic fix)
  useEffect(() => {
    if (map) {
      map.jumpTo({ center: center, zoom: zoom });
    }
  }, [map, center, zoom]);

  const handleStyleSwitch = (styleKey) => {
    if (!map) return;
    map.setStyle(STYLES[styleKey]);
    setCurrentStyle(styleKey);
  };

  return (
    <div style={{ height: height, width: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
      
      {/* Map Style Switcher (Premium Open Logic) */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 p-1.5 z-10 flex text-[10px] font-black uppercase tracking-widest overflow-hidden transition-all hover:shadow-xl">
        <button 
          onClick={() => handleStyleSwitch('satellite')}
          className={`px-4 py-2 rounded-lg transition-all ${currentStyle === 'satellite' ? 'bg-green-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-400'}`}
        >
          Satellite
        </button>
        <button 
          onClick={() => handleStyleSwitch('light')}
          className={`px-4 py-2 rounded-lg transition-all ${currentStyle === 'light' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-400'}`}
        >
          Light
        </button>
        <button 
          onClick={() => handleStyleSwitch('dark')}
          className={`px-4 py-2 rounded-lg transition-all ${currentStyle === 'dark' ? 'bg-slate-900 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-400'}`}
        >
          Dark
        </button>
      </div>

      {map && children}
    </div>
  );
});

BaseMap.displayName = 'BaseMap';
export default BaseMap;
