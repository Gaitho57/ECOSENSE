import React, { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from '../MapContext';

export default function ProtectedAreaLayer({ protected_areas = [], isVisible = true }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !protected_areas.length) return;

    const sourceId = 'pa-source';
    const fillLayerId = 'pa-fill';
    const lineLayerId = 'pa-line';

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

    const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    const addLayer = () => {
      if (!map.isStyleLoaded()) return;

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

        // Interactivity
        map.on('mousemove', fillLayerId, (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const props = e.features[0].properties;
            
            map.setPaintProperty(lineLayerId, 'line-width', [
                'case',
                ['==', ['get', 'name'], props.name], 6,
                2
            ]);

            popup.setLngLat(e.lngLat)
                .setHTML(`
                    <div style="padding: 10px; font-family: sans-serif; min-width: 150px;">
                        <div style="font-size: 10px; uppercase font-bold text-emerald-600 mb-1">Protected Area</div>
                        <strong style="color: #065f46; font-size: 14px; display: block;">${props.name}</strong>
                        <span style="font-size: 10px; color: #6b7280; text-transform: uppercase;">${props.designation}</span>
                    </div>
                `)
                .addTo(map);
        });

        map.on('mouseleave', fillLayerId, () => {
            map.getCanvas().style.cursor = '';
            popup.remove();
            map.setPaintProperty(lineLayerId, 'line-width', 2);
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
          if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
          if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, protected_areas, isVisible]);

  return null;
}
