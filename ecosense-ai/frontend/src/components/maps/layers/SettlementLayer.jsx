import React, { useEffect, useRef } from 'react';
import { useMap } from '../MapContext';
import L from 'leaflet';

export default function SettlementLayer({ settlement_data, isVisible = true }) {
  const { map } = useMap();
  const leafletLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !settlement_data) return;

    const isMapLibre = !!map.addSource;
    const isLeaflet = !!map.addLayer && !isMapLibre;

    if (isMapLibre) {
      if (!map.isStyleLoaded()) return;

      const sourceId = 'settlement-source';
      const fillLayerId = 'settlement-fill';
      const borderLayerId = 'settlement-border';

      const addLayer = () => {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: settlement_data
          });
        } else {
          map.getSource(sourceId).setData(settlement_data);
        }

        if (!map.getLayer(fillLayerId)) {
          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#94a3b8',
              'fill-opacity': 0.6
            }
          });
        }

        if (!map.getLayer(borderLayerId)) {
          map.addLayer({
            id: borderLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#475569',
              'line-width': 1
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
          if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      };
    } else if (isLeaflet) {
      if (isVisible) {
        if (leafletLayerRef.current) map.removeLayer(leafletLayerRef.current);

        leafletLayerRef.current = L.geoJSON(settlement_data, {
          style: {
            color: '#475569',
            weight: 1,
            fillColor: '#94a3b8',
            fillOpacity: 0.6
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
  }, [map, settlement_data, isVisible]);

  return null;
}
