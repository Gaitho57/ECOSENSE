import React, { useEffect } from 'react';
import { useMap } from '../MapContext';

export default function SettlementLayer({ settlement_data, isVisible = true }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !map.isStyleLoaded() || !settlement_data) return;

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
            'fill-color': '#94a3b8', // Slate grey for buildings
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
  }, [map, settlement_data, isVisible]);

  return null;
}
