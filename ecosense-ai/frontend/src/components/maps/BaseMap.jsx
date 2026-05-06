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
      const onMoveEnd = () => {
        if (onMove) {
          const c = map.getCenter();
          onMove([c.lng, c.lat]);
        }
      };
      map.on('moveend', onMoveEnd);
      return () => map.off('moveend', onMoveEnd);
    }
  }, [map, setMap, onMove]);

  useEffect(() => {
    if (map && center) {
      const current = map.getCenter();
      const dist = Math.sqrt(Math.pow(current.lng - center[0], 2) + Math.pow(current.lat - center[1], 2));
      if (dist > 0.0001) {
        map.setView([center[1], center[0]], zoom || map.getZoom(), { animate: true });
      }
    }
  }, [center, zoom, map]);
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
  const { map, setMap, engine, setEngine } = useMap();
  const mapContainer = useRef(null);
  
  const STYLES = {
    satellite: 'https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_key',
    light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
  };

  const SATELLITE_FALLBACK = {
    "version": 8,
    "sources": {
      "esri-satellite": {
        "type": "raster",
        "tiles": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        "tileSize": 256,
        "attribution": "Esri"
      }
    },
    "layers": [
      {
        "id": "esri-satellite-layer",
        "type": "raster",
        "source": "esri-satellite"
      }
    ]
  };

  const LEAFLET_TILES = {
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    light: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  };

  const [currentStyle, setCurrentStyle] = useState('satellite');

  useImperativeHandle(ref, () => map, [map]);

  useEffect(() => {
    if (engine === 'leaflet' || !mapContainer.current) return;

    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!(window.WebGLRenderingContext && gl);
      } catch (e) { return false; }
    };

    if (!checkWebGL()) {
      console.warn("WebGL not supported. Switching to Leaflet fallback.");
      setEngine('leaflet');
      return;
    }

    let mapInstance;
    try {
      const style = currentStyle === 'satellite' ? SATELLITE_FALLBACK : STYLES[currentStyle];
      mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: style,
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
          setEngine('leaflet');
        }
      });

    } catch (err) {
      console.error("Failed to initialize MapLibre GL:", err);
      setEngine('leaflet');
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove();
        setMap(null);
      }
    };
  }, [engine, setEngine, setMap]); // Dependency on engine to allow fallback
  
  useEffect(() => {
    if (!map || engine !== 'maplibre' || !center) return;
    
    const current = map.getCenter();
    const dist = Math.sqrt(Math.pow(current.lng - center[0], 2) + Math.pow(current.lat - center[1], 2));
    
    // Only fly if distance is significant to avoid "fighting" with user interaction
    if (dist > 0.01) {
      map.flyTo({
        center: center,
        zoom: zoom,
        essential: true,
        speed: 1.2,
        curve: 1.4
      });
    }
  }, [center?.[0], center?.[1], zoom, map, engine]);

  const handleStyleChange = (styleKey) => {
    setCurrentStyle(styleKey);
    if (!map) return;
    if (map.setStyle) {
      map.setStyle(STYLES[styleKey]);
    }
  };

  // Robust coordinate validation to prevent "ocean" bugs
  const isValidCoord = (c) => c !== null && c !== undefined && !isNaN(c) && (Math.abs(c) > 0.0001);
  const safeCenter = (isValidCoord(center[0]) && isValidCoord(center[1])) 
    ? center 
    : [36.8219, -1.2921]; // Default to Nairobi if invalid

  return (
    <div style={{ height: height, width: '100%', position: 'relative' }} className="bg-slate-900 overflow-hidden">
      {engine !== 'leaflet' ? (
        <>
          <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
          {children}
        </>
      ) : (
        <MapContainer 
          key={currentStyle}
          center={[safeCenter[1], safeCenter[0]]} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
          zoomControl={false}
        >
          <TileLayer
            key={currentStyle}
            attribution='&copy; Esri | EcoSense AI'
            url={currentStyle === 'satellite' 
              ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              : LEAFLET_TILES[currentStyle]}
            maxZoom={20}
          />
          <LeafletMapSync setMap={setMap} center={safeCenter} zoom={zoom} onMove={onMove} />
          {map && children}
        </MapContainer>
      )}

      {/* Layer/Style Switcher Panel */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-1 bg-white/90 backdrop-blur p-1.5 rounded-xl shadow-2xl border border-white/20">
        {Object.keys(LEAFLET_TILES).map((s) => (
          <button
            key={s}
            onClick={() => handleStyleChange(s)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              currentStyle === s 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Fallback Notice Overlay (Subtle) */}
      {engine === 'leaflet' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-amber-500/90 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur shadow-xl border border-amber-400">
          ⚠️ Performance Fallback Mode Active
        </div>
      )}
    </div>
  );
});

export default BaseMap;
