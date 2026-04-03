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
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: center
            },
            properties: {
              ndvi: ndvi_score
            }
          }
        });
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 100, // Fixed radius representing boundary expansion
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'ndvi'],
              0.2, '#ef4444', // Red
              0.5, '#eab308', // Yellow
              0.8, '#22c55e'  // Green
            ],
            'circle-opacity': 0.6,
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
