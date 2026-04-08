import React, { useEffect } from 'react';
import { useMap } from '../MapContext';

export default function HydrologyLayer({ hydrology_data, isVisible = true }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !map.isStyleLoaded() || !hydrology_data) return;

    const sourceId = 'hydro-source';
    const fillLayerId = 'hydro-fill';
    const lineLayerId = 'hydro-line';

    // Support both FeatureCollections and raw feature arrays for resiliency
    let geoJsonData = { type: 'FeatureCollection', features: [] };
    if (hydrology_data) {
        if (hydrology_data.type === 'FeatureCollection' && Array.isArray(hydrology_data.features)) {
            geoJsonData = hydrology_data;
        } else if (Array.isArray(hydrology_data)) {
            geoJsonData = { type: 'FeatureCollection', features: hydrology_data };
        } else if (hydrology_data.type === 'Feature') {
            geoJsonData = { type: 'FeatureCollection', features: [hydrology_data] };
        }
    }

    const hasData = geoJsonData.features.length > 0;

    const addLayer = () => {
      const source = map.getSource(sourceId);
      if (!source) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geoJsonData
        });
      } else {
        source.setData(geoJsonData);
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
            'line-color': '#00b4ff', // Electric eco-blue
            'line-width': 5,
            'line-opacity': 0.9
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
      if (map && map.getStyle()) {
          if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
          if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, hydrology_data, isVisible]);

  return null;
}
