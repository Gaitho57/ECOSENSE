import React, { useEffect, useRef } from 'react';
import { useMap } from '../MapContext';
import L from 'leaflet';

export default function ProjectBoundaryLayer({ boundaryGeoJSON, isVisible = true }) {
  const { map } = useMap();
  const leafletLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !boundaryGeoJSON) return;

    // Check if map is MapLibre or Leaflet
    const isMapLibre = !!map.addSource;
    const isLeaflet = !!map.addLayer && !isMapLibre;

    if (isMapLibre) {
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

      if (isVisible) {
        addLayer();
        map.on('style.load', addLayer);
      }

      return () => {
        map.off('style.load', addLayer);
        if (map && map.getStyle()) {
            if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      };
    } else if (isLeaflet) {
      // Leaflet Implementation
      if (isVisible) {
        if (leafletLayerRef.current) {
          map.removeLayer(leafletLayerRef.current);
        }

        leafletLayerRef.current = L.geoJSON(boundaryGeoJSON, {
          style: {
            color: '#22c55e',
            weight: 3,
            dashArray: '5, 5',
            fillOpacity: 0
          }
        }).addTo(map);

        // Zoom to boundary if it's new
        try {
          const bounds = leafletLayerRef.current.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds);
        } catch (e) {}
      } else if (leafletLayerRef.current) {
        map.removeLayer(leafletLayerRef.current);
        leafletLayerRef.current = null;
      }

      return () => {
        if (leafletLayerRef.current) {
          map.removeLayer(leafletLayerRef.current);
        }
      };
    }
  }, [map, boundaryGeoJSON, isVisible]);

  return null;
}
