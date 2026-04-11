import React, { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from '../MapContext';

export default function WaterTowerLayer({ proximity_data, isVisible = true }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !proximity_data?.is_sensitive) return;

    const sourceId = 'tower-source';
    const pointLayerId = 'tower-point';
    const towerLabelId = 'tower-label';

    const towerCoords = {
        'Mau Complex': [35.82, -0.65],
        'Mt. Kenya': [37.30, -0.15],
        'Mt. Elgon': [34.55, 1.15],
        'Cherangani Hills': [35.45, 1.25],
        'Aberdare Range': [36.70, -0.40]
    }[proximity_data.nearest_tower] || [36.8, -1.2];

    const geoJsonData = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [towerCoords[0], towerCoords[1]] },
        properties: {
          name: proximity_data.nearest_tower,
          distance: proximity_data.distance_km
        }
      }]
    };

    const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    const addLayer = () => {
      if (!map.isStyleLoaded()) return;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data: geoJsonData });
      }

      if (!map.getLayer(pointLayerId)) {
        map.addLayer({
          id: pointLayerId,
          type: 'symbol',
          source: sourceId,
          layout: {
            'text-field': '⛰️',
            'text-size': 24,
            'text-allow-overlap': true
          }
        });

        map.addLayer({
            id: towerLabelId,
            type: 'symbol',
            source: sourceId,
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
                'text-offset': [0, 1.5],
                'text-anchor': 'top',
                'text-size': 12
            },
            paint: {
                'text-color': '#065f46',
                'text-halo-color': '#FFFFFF',
                'text-halo-width': 2
            }
        });

        // Interactivity
        map.on('mousemove', pointLayerId, (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const props = e.features[0].properties;
            map.setLayoutProperty(pointLayerId, 'text-size', 36);
            
            popup.setLngLat(e.lngLat)
                .setHTML(`
                    <div style="padding: 10px; font-family: sans-serif; min-width: 180px; border-left: 4px solid #059669;">
                        <div style="font-size: 10px; uppercase font-bold text-emerald-600 mb-1">Kenyan Water Tower</div>
                        <strong style="color: #064e3b; font-size: 15px; display: block;">${props.name}</strong>
                        <div style="margin-top: 5px; font-size: 11px; color: #374151;">
                            <strong>Distance:</strong> ${props.distance} km
                        </div>
                    </div>
                `)
                .addTo(map);
        });

        map.on('mouseleave', pointLayerId, () => {
            map.getCanvas().style.cursor = '';
            popup.remove();
            map.setLayoutProperty(pointLayerId, 'text-size', 24);
        });
      }
    };

    if (isVisible) {
      if (map.isStyleLoaded()) addLayer();
      map.on('style.load', addLayer);
    }

    return () => {
      map.off('style.load', addLayer);
      popup.remove();
      if (map && map.getStyle()) {
          if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
          if (map.getLayer(towerLabelId)) map.removeLayer(towerLabelId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, proximity_data, isVisible]);

  return null;
}
