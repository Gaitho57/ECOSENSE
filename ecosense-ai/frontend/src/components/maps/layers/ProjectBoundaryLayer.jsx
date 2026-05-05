import React, { useEffect } from 'react';
import { useMap } from '../MapContext';
import { GeoJSON } from 'react-leaflet';

export default function ProjectBoundaryLayer({ boundaryGeoJSON, isVisible = true }) {
  const { map, isLeaflet, isMapLibre } = useMap();

  useEffect(() => {
    if (!map || !boundaryGeoJSON || !isMapLibre || !isVisible) return;
    if (!map.isStyleLoaded()) return;

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
            'line-dasharray': [2, 2]
          }
        });
      }
    };

    addLayer();
    map.on('style.load', addLayer);
    
    return () => {
      map.off('style.load', addLayer);
      if (map && map.getStyle()) {
          if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, boundaryGeoJSON, isMapLibre, isVisible]);

  if (isLeaflet && boundaryGeoJSON && isVisible) {
    return (
        <GeoJSON 
            data={boundaryGeoJSON}
            style={{
                color: '#22c55e',
                weight: 3,
                dashArray: '5, 5',
                fillOpacity: 0
            }}
        />
    );
  }

  return null;
}
