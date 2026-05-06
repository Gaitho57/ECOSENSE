import React, { useEffect } from 'react';
import { useMap } from '../MapContext';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export default function WaterTowerLayer({ proximity_data, isVisible = true }) {
  const { map, isLeaflet, isMapLibre } = useMap();

  const towerCoords = React.useMemo(() => {
    if (!proximity_data?.nearest_tower) return [36.8, -1.2];
    const coords = {
        'Mau Complex': [35.82, -0.65],
        'Mt. Kenya': [37.30, -0.15],
        'Mt. Elgon': [34.55, 1.15],
        'Cherangani Hills': [35.45, 1.25],
        'Aberdare Range': [36.70, -0.40]
    }[proximity_data.nearest_tower];
    return coords || [36.8, -1.2];
  }, [proximity_data]);

  useEffect(() => {
    if (!map || !proximity_data?.is_sensitive || !isMapLibre || !isVisible) return;
    if (!map.isStyleLoaded()) return;

    const sourceId = 'tower-source';
    const pointLayerId = 'tower-point';
    const towerLabelId = 'tower-label';

    const updateOrAddSource = () => {
      const geojson = {
          type: 'FeatureCollection',
          features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [towerCoords[0], towerCoords[1]] },
              properties: { name: proximity_data.nearest_tower }
          }]
      };

      const source = map.getSource(sourceId);
      if (source) {
        source.setData(geojson);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geojson });
      }

      if (!map.getLayer(pointLayerId)) {
        map.addLayer({
          id: pointLayerId,
          type: 'symbol',
          source: sourceId,
          layout: { 'text-field': '⛰️', 'text-size': 24, 'text-allow-overlap': true }
        });

        map.addLayer({
            id: towerLabelId,
            type: 'symbol',
            source: sourceId,
            layout: {
                'text-field': ['get', 'name'],
                'text-offset': [0, 1.5],
                'text-anchor': 'top',
                'text-size': 12
            },
            paint: { 'text-color': '#065f46', 'text-halo-color': '#FFFFFF', 'text-halo-width': 2 }
        });
      }
    };

    updateOrAddSource();
    map.on('style.load', updateOrAddSource);
    
    return () => {
      map.off('style.load', updateOrAddSource);
      if (map && map.getStyle()) {
          if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
          if (map.getLayer(towerLabelId)) map.removeLayer(towerLabelId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, proximity_data, towerCoords, isMapLibre, isVisible]);

  if (isLeaflet && proximity_data?.is_sensitive && isVisible) {
    const icon = L.divIcon({
        html: '<div style="font-size: 24px;">⛰️</div>',
        className: 'tower-leaflet-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    return (
        <Marker position={[towerCoords[1], towerCoords[0]]} icon={icon}>
            <Popup>
                <div style={{ padding: '10px', minWidth: '180px', borderLeft: '4px solid #059669' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669', marginBottom: '4px' }}>KENYAN WATER TOWER</div>
                    <strong style={{ color: '#064e3b', fontSize: '15px', display: 'block' }}>{proximity_data.nearest_tower}</strong>
                    <div style={{ marginTop: '5px', fontSize: '11px', color: '#374151' }}>
                        <strong>Distance:</strong> {proximity_data.distance_km} km
                    </div>
                </div>
            </Popup>
        </Marker>
    );
  }

  return null;
}
