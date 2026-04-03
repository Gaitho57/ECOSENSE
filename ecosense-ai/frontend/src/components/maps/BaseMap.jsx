import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMap } from './MapContext';

// Set Token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.dev-mapbox-token-placeholder';

const BaseMap = forwardRef(({ 
  center = [36.8219, -1.2921], // Default Nairobi
  zoom = 12, 
  style = 'mapbox://styles/mapbox/satellite-streets-v12', 
  height = '100%', 
  children 
}, ref) => {
  const mapContainer = useRef(null);
  const { map, setMap } = useMap();
  const [currentStyle, setCurrentStyle] = useState(style);

  useImperativeHandle(ref, () => map, [map]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: currentStyle,
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

  // Watch for style changes externally or via switcher
  useEffect(() => {
    if (map && style !== currentStyle) {
      map.setStyle(style);
      setCurrentStyle(style);
      // Re-trigger layers (handled by map 'style.load' event usually, but keeping it simple)
    }
  }, [style, map]);

  const handleStyleSwitch = (newStyle) => {
    if (!map) return;
    map.setStyle(newStyle);
    setCurrentStyle(newStyle);
  };

  return (
    <div style={{ height: height, width: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
      
      {/* Map Style Switcher */}
      <div className="absolute top-4 left-4 bg-white rounded-md shadow-md p-1 z-10 flex text-xs">
        <button 
          onClick={() => handleStyleSwitch('mapbox://styles/mapbox/satellite-streets-v12')}
          className={`px-3 py-1 rounded transition-colors ${currentStyle.includes('satellite') ? 'bg-green-100 text-green-800 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          Satellite
        </button>
        <button 
          onClick={() => handleStyleSwitch('mapbox://styles/mapbox/light-v11')}
          className={`px-3 py-1 rounded transition-colors ${currentStyle.includes('light') ? 'bg-green-100 text-green-800 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          Light
        </button>
        <button 
          onClick={() => handleStyleSwitch('mapbox://styles/mapbox/dark-v11')}
          className={`px-3 py-1 rounded transition-colors ${currentStyle.includes('dark') ? 'bg-green-100 text-green-800 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
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
