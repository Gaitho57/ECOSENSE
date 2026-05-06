import React, { useEffect } from 'react';
import { useMap } from '../MapContext';
import { GeoJSON } from 'react-leaflet';

export default function SettlementLayer({ settlement_data, isVisible = true }) {
  const { map, isLeaflet, isMapLibre } = useMap();

  useEffect(() => {
    if (!map || !settlement_data || !isMapLibre || !isVisible) return;
    if (!map.isStyleLoaded()) return;

    const sourceId = 'settlement-source';
    const fillLayerId = 'settlement-fill';
    const borderLayerId = 'settlement-border';

    const updateOrAddSource = () => {
      const source = map.getSource(sourceId);
      if (source) {
        source.setData(settlement_data);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: settlement_data
        });
      }

      if (!map.getLayer(fillLayerId)) {
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.6 }
        });
      }

      if (!map.getLayer(borderLayerId)) {
        map.addLayer({
          id: borderLayerId,
          type: 'line',
          source: sourceId,
          paint: { 'line-color': '#475569', 'line-width': 1 }
        });
      }
    };

    updateOrAddSource();
    map.on('style.load', updateOrAddSource);
    
    return () => {
      map.off('style.load', updateOrAddSource);
      if (map && map.getStyle()) {
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, settlement_data, isMapLibre, isVisible]);

  if (isLeaflet && settlement_data && isVisible) {
    return (
        <GeoJSON 
            data={settlement_data}
            style={{
                color: '#475569',
                weight: 1,
                fillColor: '#94a3b8',
                fillOpacity: 0.6
            }}
        />
    );
  }

  return null;
}
