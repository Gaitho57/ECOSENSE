import React, { useEffect } from 'react';
import { useMap } from '../MapContext';

export default function NDVILayer({ ndvi_score, center, isVisible = true }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !map.isStyleLoaded() || typeof ndvi_score !== 'number') return;

    const sourceId = 'ndvi-source';
    const layerId = 'ndvi-layer';

    // Ensure map 'style.load' triggers re-adds for resilient context passing
    const addLayer = () => {
      const source = map.getSource(sourceId);
      const data = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: center
        },
        properties: {
          ndvi: ndvi_score
        }
      };

      if (!source) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: data
        });
      } else {
        source.setData(data);
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              10, 50,
              15, 150
            ],
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'ndvi'],
              0.1, '#dc2626', // Bright Red (Vulnerable)
              0.4, '#fbbf24', // Amber (Moderate)
              0.8, '#16a34a'  // Forest Green (Healthy)
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
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
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, ndvi_score, center, isVisible]);

  return null; // Logic-only component handling Mapbox GL JS context interactions
}
