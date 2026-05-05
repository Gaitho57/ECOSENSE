import React, { useEffect, useRef } from 'react';
import { useMap } from '../MapContext';
import L from 'leaflet';

export default function ProtectedAreaLayer({ protected_areas = [], isVisible = true }) {
  const { map } = useMap();
  const leafletLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !protected_areas.length) return;

    const isMapLibre = !!map.addSource;
    const isLeaflet = !!map.addLayer && !isMapLibre;

    const geoJsonData = {
      type: 'FeatureCollection',
      features: protected_areas.map(pa => ({
        type: 'Feature',
        geometry: pa.geometry,
        properties: {
          name: pa.name,
          designation: pa.desig,
          status: pa.status
        }
      }))
    };

    if (isMapLibre) {
      if (!map.isStyleLoaded()) return;

      const sourceId = 'pa-source';
      const fillLayerId = 'pa-fill';
      const lineLayerId = 'pa-line';

      const addLayer = () => {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, { type: 'geojson', data: geoJsonData });
        }

        if (!map.getLayer(fillLayerId)) {
          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#059669',
              'fill-opacity': 0.3
            }
          });

          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#10b981',
              'line-width': 2,
              'line-opacity': 0.8
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
    } else if (isLeaflet) {
      if (isVisible) {
        if (leafletLayerRef.current) map.removeLayer(leafletLayerRef.current);

        leafletLayerRef.current = L.geoJSON(geoJsonData, {
          style: {
            color: '#10b981',
            weight: 2,
            fillColor: '#059669',
            fillOpacity: 0.3
          },
          onEachFeature: (feature, layer) => {
            layer.bindPopup(`
              <div style="padding: 10px; font-family: sans-serif; min-width: 150px;">
                <div style="font-size: 10px; uppercase font-bold text-emerald-600 mb-1">Protected Area</div>
                <strong style="color: #065f46; font-size: 14px; display: block;">${feature.properties.name}</strong>
                <span style="font-size: 10px; color: #6b7280; text-transform: uppercase;">${feature.properties.designation}</span>
              </div>
            `);
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
  }, [map, protected_areas, isVisible]);

  return null;
}
