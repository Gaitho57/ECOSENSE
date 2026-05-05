import React, { useEffect, useRef } from 'react';
import { useMap } from '../MapContext';
import L from 'leaflet';

export default function HydrologyLayer({ hydrology_data, isVisible = true }) {
  const { map } = useMap();
  const leafletLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !hydrology_data) return;

    const isMapLibre = !!map.addSource;
    const isLeaflet = !!map.addLayer && !isMapLibre;

    let geoJsonData = { type: 'FeatureCollection', features: [] };
    if (hydrology_data?.streams) {
        geoJsonData = hydrology_data.streams;
    } else if (hydrology_data?.features?.type === 'FeatureCollection') {
        geoJsonData = hydrology_data.features;
    } else if (hydrology_data?.type === 'FeatureCollection') {
        geoJsonData = hydrology_data;
    }

    if (isMapLibre) {
      if (!map.isStyleLoaded()) return;

      const sourceId = 'hydro-source';
      const fillLayerId = 'hydro-fill';
      const lineLayerId = 'hydro-line';

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
              'line-color': '#0ea5e9',
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4, 18, 8],
              'line-opacity': 0.8
            }
          });

          map.addLayer({
             id: `${lineLayerId}-glow`,
             type: 'line',
             source: sourceId,
             filter: ['==', '$type', 'LineString'],
             paint: {
               'line-color': '#38bdf8',
               'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 14, 8, 18, 16],
               'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.5, 0]
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
            if (map.getLayer(`${lineLayerId}-glow`)) map.removeLayer(`${lineLayerId}-glow`);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      };
    } else if (isLeaflet) {
      if (isVisible) {
        if (leafletLayerRef.current) map.removeLayer(leafletLayerRef.current);

        leafletLayerRef.current = L.geoJSON(geoJsonData, {
          style: (feature) => {
            if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
              return { color: '#3b82f6', weight: 1, fillOpacity: 0.4 };
            }
            return { color: '#0ea5e9', weight: 3, opacity: 0.8 };
          }
        }).addTo(map);
      } else if (leafletLayerRef.current) {
        map.removeLayer(leafletLayerRef.current);
        leafletLayerRef.current = null;
      }

      return () => {
        if (leafletLayerRef.current) map.removeLayer(leafletLayerRef.current);
      };
    }
  }, [map, hydrology_data, isVisible]);

  return null;
}
