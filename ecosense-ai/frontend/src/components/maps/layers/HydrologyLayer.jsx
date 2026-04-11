import React, { useEffect } from 'react';
import { useMap } from '../MapContext';

export default function HydrologyLayer({ hydrology_data, isVisible = true }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !map.isStyleLoaded() || !hydrology_data) return;

    const sourceId = 'hydro-source';
    const fillLayerId = 'hydro-fill';
    const lineLayerId = 'hydro-line';

    // Support HydroSHEDS stream networks from GEE or fallback to OSM
    let geoJsonData = { type: 'FeatureCollection', features: [] };
    if (hydrology_data?.streams) {
        geoJsonData = hydrology_data.streams;
    } else if (hydrology_data?.type === 'FeatureCollection') {
        geoJsonData = hydrology_data;
    }

    const addLayer = () => {
      const source = map.getSource(sourceId);
      if (!source) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geoJsonData,
          generateId: true
        });
      } else {
        source.setData(geoJsonData);
      }

      // 1. Polygon Fill (Basins/Lakes)
      if (!map.getLayer(fillLayerId)) {
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.4
          }
        });
      }

      // 2. High-Fidelity Line String (Rivers/Streams)
      if (!map.getLayer(lineLayerId)) {
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          filter: ['==', '$type', 'LineString'],
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#0ea5e9', // Deep eco-blue
            'line-width': [
               'interpolate', ['linear'], ['zoom'],
               10, 2,
               14, 4,
               18, 8
            ],
            'line-opacity': 0.8
          }
        });

        // Add "Highlight" Glow Layer
        map.addLayer({
           id: `${lineLayerId}-glow`,
           type: 'line',
           source: sourceId,
           filter: ['==', '$type', 'LineString'],
           paint: {
             'line-color': '#38bdf8',
             'line-width': [
                'interpolate', ['linear'], ['zoom'],
                10, 4,
                14, 8,
                18, 16
             ],
             'line-opacity': [
               'case',
               ['boolean', ['feature-state', 'hover'], false],
               0.5,
               0
             ]
           }
        });
      }

      // High-precision hover logic
      map.on('mousemove', lineLayerId, (e) => {
        if (e.features.length > 0) {
          map.getCanvas().style.cursor = 'pointer';
          map.setFeatureState(
            { source: sourceId, id: e.features[0].id },
            { hover: true }
          );
        }
      });

      map.on('mouseleave', lineLayerId, () => {
        map.getCanvas().style.cursor = '';
        // Note: This requires the features to have numeric IDs for setFeatureState
      });
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
