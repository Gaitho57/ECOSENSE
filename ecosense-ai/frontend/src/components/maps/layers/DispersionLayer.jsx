import React, { useEffect } from 'react';
import { useMap } from '../MapContext';
import { GeoJSON } from 'react-leaflet';

export default function DispersionLayer({ geoJSON, isVisible = true }) {
  const { map, isLeaflet, isMapLibre } = useMap();

  useEffect(() => {
    if (!map || !geoJSON || !isMapLibre || !isVisible) return;
    if (!map.isStyleLoaded()) return;

    const sourceId = 'dispersion-source';
    const fillLayerId = 'dispersion-fill';
    const outlineLayerId = 'dispersion-outline';

    const addLayer = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data: geoJSON });
      }

      if (!map.getLayer(fillLayerId)) {
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.6 }
        });

        map.addLayer({
          id: outlineLayerId,
          type: 'line',
          source: sourceId,
          paint: { 'line-color': ['get', 'color'], 'line-width': 1, 'line-opacity': 0.8 }
        });
      }
    };

    addLayer();
    map.on('style.load', addLayer);
    
    return () => {
      map.off('style.load', addLayer);
      if (map && map.getStyle()) {
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, geoJSON, isMapLibre, isVisible]);

  if (!isVisible || !geoJSON) return null;

  return (
    <>
      {isLeaflet && (
        <GeoJSON 
          key={JSON.stringify(geoJSON)}
          data={geoJSON}
          style={(feature) => ({
            color: feature.properties.color,
            weight: 1,
            fillColor: feature.properties.color,
            fillOpacity: 0.6
          })}
        />
      )}
      <div className="absolute bottom-6 right-6 bg-white p-3 rounded-lg shadow-lg border border-gray-100 z-[1000] w-48 pointer-events-auto">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-2 border-b pb-1">Con. limits (µg/m³)</h4>
          <div className="space-y-1.5 text-xs">
              <div className="flex items-center"><span className="w-3 h-3 rounded-sm bg-[#991b1b] mr-2"></span> &gt; 100 Critical</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-sm bg-[#dc2626] mr-2"></span> 50 - 100 High</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-sm bg-[#ea580c] mr-2"></span> 25 - 50 Elevated</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-sm bg-[#f59e0b] mr-2"></span> 10 - 25 Alert</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-sm bg-[#fde047] mr-2"></span> 5 - 10 Base</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-sm bg-[#fef08a] mr-2"></span> &lt; 5 Trace</div>
          </div>
      </div>
    </>
  );
}
