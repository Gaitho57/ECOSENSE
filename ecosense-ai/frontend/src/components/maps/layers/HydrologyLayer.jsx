import React, { useEffect } from 'react';
import { useMap } from '../MapContext';

export default function HydrologyLayer({ hydrology_data, isVisible = true }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !map.isStyleLoaded() || !hydrology_data) return;

    const sourceId = 'hydro-source';
    const fillLayerId = 'hydro-fill';
    const lineLayerId = 'hydro-line';

    // Mock geojson feature format processing
    const hasData = hydrology_data.features && hydrology_data.features.length > 0;
    
    // In scenarios lacking pure coordinate returns, build dummy spatial logic matching proximity triggers
    const geoJsonData = hasData ? hydrology_data : {
        type: 'FeatureCollection',
        features: []
    };

    const addLayer = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geoJsonData
        });
      }

      if (!map.getLayer(fillLayerId)) {
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.5
          }
        });
      }

      if (!map.getLayer(lineLayerId)) {
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          filter: ['==', '$type', 'LineString'],
          paint: {
            'line-color': '#2563eb',
            'line-width': 3
          }
        });
      }
    };

    if (isVisible) {
      addLayer();
      map.on('style.load', addLayer);
    }

    return () => {
      map.off('style.load', addLayer);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, hydrology_data, isVisible]);

  return null;
}
