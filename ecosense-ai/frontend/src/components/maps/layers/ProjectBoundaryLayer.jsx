import React, { useEffect } from 'react';
import { useMap } from '../MapContext';
import { GeoJSON } from 'react-leaflet';

export default function ProjectBoundaryLayer({ data, boundaryGeoJSON, isVisible = true }) {
  const { map, isLeaflet, isMapLibre } = useMap();

  // Unified GeoJSON source
  const geojson = boundaryGeoJSON || (data ? {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: data
    },
    properties: {}
  } : null);

  useEffect(() => {
    if (!map || !geojson || !isMapLibre || !isVisible) return;
    if (!map.isStyleLoaded()) return;

    const sourceId = 'boundary-source';
    const lineLayerId = 'boundary-line';
    const fillLayerId = 'boundary-fill';

    const addLayer = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        });
      }

      if (!map.getLayer(fillLayerId)) {
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#22c55e',
            'fill-opacity': 0.1
          }
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
          if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, geojson, isMapLibre, isVisible]);

  if (isLeaflet && geojson && isVisible) {
    return (
        <GeoJSON 
            key={JSON.stringify(geojson)}
            data={geojson}
            style={{
                color: '#22c55e',
                weight: 3,
                dashArray: '5, 5',
                fillColor: '#22c55e',
                fillOpacity: 0.1
            }}
        />
    );
  }

  return null;
}
