import React, { useEffect, useRef } from 'react';
import { useMap } from '../MapContext';
import L from 'leaflet';

export default function FloodLayer({ geoJSON, isVisible = true }) {
  const { map } = useMap();
  const leafletLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !geoJSON) return;

    const isMapLibre = !!map.addSource;
    const isLeaflet = !!map.addLayer && !isMapLibre;

    if (isMapLibre) {
      if (!map.isStyleLoaded()) return;

      const sourceId = 'flood-source';
      const fillLayerId = 'flood-fill';
      const outlineLayerId = 'flood-outline';

      const addLayer = () => {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: geoJSON
          });
        } else {
          map.getSource(sourceId).setData(geoJSON);
        }

        if (!map.getLayer(fillLayerId)) {
          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.4
            }
          });
        }

        if (!map.getLayer(outlineLayerId)) {
          map.addLayer({
            id: outlineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 2,
              'line-opacity': 0.8
            }
          });
        }
      };

      if (isVisible) {
        addLayer();
        map.on('style.load', addLayer);
      } else {
          if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
          if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
      }

      return () => {
        map.off('style.load', addLayer);
        if (map && map.getStyle()) {
          if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
          if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      };
    } else if (isLeaflet) {
      if (isVisible) {
        if (leafletLayerRef.current) map.removeLayer(leafletLayerRef.current);

        leafletLayerRef.current = L.geoJSON(geoJSON, {
          style: (feature) => ({
            color: feature.properties.color,
            weight: 2,
            fillColor: feature.properties.color,
            fillOpacity: 0.4
          })
        }).addTo(map);
      } else if (leafletLayerRef.current) {
        map.removeLayer(leafletLayerRef.current);
        leafletLayerRef.current = null;
      }

      return () => {
        if (leafletLayerRef.current) map.removeLayer(leafletLayerRef.current);
      };
    }
  }, [map, geoJSON, isVisible]);

  if (!isVisible || !geoJSON) return null;

  return (
      <div className="absolute bottom-6 left-6 bg-white p-3 rounded-lg shadow-lg border border-gray-100 z-[1000] w-48 pointer-events-auto">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-2 border-b pb-1">Hydrological Bounds</h4>
          <div className="space-y-2 text-sm font-medium">
              <div className="flex items-center"><span className="w-4 h-4 rounded-sm bg-[#4FC3F7] opacity-60 border border-[#4FC3F7] mr-2"></span>10 Year Flood Risk</div>
              <div className="flex items-center"><span className="w-4 h-4 rounded-sm bg-[#0288D1] opacity-60 border border-[#0288D1] mr-2"></span>100 Year Flood Risk</div>
          </div>
      </div>
  );
}
