import React, { useEffect } from 'react';
import { useMap } from '../MapContext';

export default function ProjectBoundaryLayer({ boundaryGeoJSON, isVisible = true }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !map.isStyleLoaded() || !boundaryGeoJSON) return;

    const sourceId = 'boundary-source';
    const lineLayerId = 'boundary-line';

    const addLayer = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: boundaryGeoJSON
        });
      }

      if (!map.getLayer(lineLayerId)) {
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#22c55e',
            'line-width': 3,
            'line-dasharray': [2, 2] // Dashed line
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
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, boundaryGeoJSON, isVisible]);

  return null;
}
