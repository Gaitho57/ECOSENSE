import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMap } from './MapContext';

// Leaflet Fallback Imports
import { MapContainer, TileLayer, useMap as useLeafletMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Component to capture leaflet map instance and share it via context
const LeafletMapSync = ({ setMap, center, zoom, onMove }) => {
  const map = useLeafletMap();
  useEffect(() => {
    if (map) {
      setMap(map);
      if (center) {
        map.setView([center[1], center[0]], zoom || map.getZoom());
      }
      
      const onMoveEnd = () => {
        if (onMove) {
          const c = map.getCenter();
          onMove([c.lng, c.lat]);
        }
      };
      
      map.on('moveend', onMoveEnd);
      return () => map.off('moveend', onMoveEnd);
    }
  }, [map, setMap, center, zoom, onMove]);
  return null;
};

// MapLibre doesn't require a commercial token for custom raster sources
const BaseMap = forwardRef(({ 
  center = [36.8219, -1.2921], // Default Nairobi
  zoom = 12, 
  height = '100%', 
  onMove,
  children 
}, ref) => {
  const mapContainer = useRef(null);
  const { map, setMap, setEngine } = useMap();
  
  // Style Definition: Public Sources for END TO END VALIDATION (Eco-Green Logic)
  const STYLES = {
    satellite: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
            "esri-satellite": {
                type: "raster",
                tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.jpg"],
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
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
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
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
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

  const LEAFLET_TILES = {
    satellite: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    light: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  };

  const [currentStyle, setCurrentStyle] = useState('satellite');

  useImperativeHandle(ref, () => map, [map]);

  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    // Check if we already decided to use fallback or if mapContainer is gone
    if (webglError || !mapContainer.current) return;

    // Native WebGL support check (more robust than library-specific calls)
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!(window.WebGLRenderingContext && gl);
      } catch (e) {
        return false;
      }
    };

    if (!checkWebGL()) {
      console.warn("WebGL not supported. Switching to Leaflet fallback.");
      setWebglError(true);
      setEngine('leaflet');
      return;
    }

    let mapInstance;
    try {
      mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: STYLES[currentStyle],
        center: center,
        zoom: zoom,
        failIfMajorPerformanceCaveat: false, 
        antialias: false,
      });

      mapInstance.on('load', () => {
        setMap(mapInstance);
        setEngine('maplibre');
        const nav = new maplibregl.NavigationControl();
        mapInstance.addControl(nav, 'top-left');
      });

      mapInstance.on('moveend', () => {
        if (onMove) {
          const c = mapInstance.getCenter();
          onMove([c.lng, c.lat]);
        }
      });

      mapInstance.on('error', (e) => {
        console.error("MapLibre error:", e);
        if (e.error?.message?.includes("WebGL") || e.error?.message?.includes("context lost")) {
          setWebglError(true);
        }
      });

    } catch (err) {
      console.error("Failed to initialize MapLibre GL:", err);
      setWebglError(true);
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove();
        setMap(null);
      }
    };
  }, [webglError]); // Dependency on webglError to allow retry logic if we reset it
  
  // Watch for center/zoom prop changes and move map only if difference is significant
  useEffect(() => {
    if (map) {
      const currentMapCenter = map.getCenter();
      const currentLng = currentMapCenter.lng || currentMapCenter.x;
      const currentLat = currentMapCenter.lat || currentMapCenter.y;
      
      const dist = Math.sqrt(
        Math.pow(currentLng - center[0], 2) + 
        Math.pow(currentLat - center[1], 2)
      );

      // Only move if significantly different (> 0.001 degrees ~100m) or zoom changed
      if (dist > 0.001 || Math.abs((map.getZoom()) - zoom) > 0.1) {
        if (map.jumpTo) {
          map.jumpTo({ center: center, zoom: zoom });
        } else if (map.setView) {
          map.setView([center[1], center[0]], zoom);
        }
      }
    }
  }, [map, center, zoom]);

  const handleStyleSwitch = (styleKey) => {
    setCurrentStyle(styleKey);
    if (!map) return;
    if (map.setStyle) {
      map.setStyle(STYLES[styleKey]);
    }
  };

  return (
    <div style={{ height: height, width: '100%', position: 'relative' }} className="bg-slate-900 overflow-hidden">
      {!webglError ? (
        <>
          <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
          {children}
        </>
      ) : (
        <MapContainer 
          key={currentStyle}
          center={[center[1], center[0]]} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
          zoomControl={false}
        >
          <TileLayer
            key={currentStyle}
            attribution='&copy; Google | Esri | EcoSense AI'
            url={currentStyle === 'satellite' 
              ? "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              : LEAFLET_TILES[currentStyle]}
            maxZoom={20}
          />
          <LeafletMapSync setMap={setMap} center={center} zoom={zoom} onMove={onMove} />
          {map && children}
        </MapContainer>
      )}
      
      {/* Fallback Notice Overlay (Subtle) */}
      {webglError && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-amber-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-lg flex items-center gap-2">
          <span>⚠️ Low-Power Mode (2D Fallback)</span>
          <button 
            onClick={() => setWebglError(false)}
            className="underline hover:text-amber-100"
          >
            Retry 3D
          </button>
        </div>
      )}

      {/* Map Style Switcher */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 p-1.5 z-[1000] flex text-[10px] font-black uppercase tracking-widest overflow-hidden transition-all hover:shadow-xl">
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
