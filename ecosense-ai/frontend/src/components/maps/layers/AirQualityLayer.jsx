import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from '../MapContext';
import L from 'leaflet';

export default function AirQualityLayer({ air_quality_baseline, center, isVisible = true }) {
  const { map } = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !air_quality_baseline || !isVisible) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const isMapLibre = !!map.addSource;
    const isLeaflet = !!map.addLayer && !isMapLibre;

    const aqi = air_quality_baseline.aqi || 1;
    let badgeColor = '#22c55e';
    let textColor = 'text-green-900';
    let label = 'Good';

    if (aqi === 3) {
      badgeColor = '#eab308';
      textColor = 'text-yellow-900';
      label = 'Moderate';
    } else if (aqi >= 4) {
      badgeColor = '#ef4444';
      textColor = 'text-white';
      label = 'Poor';
    }

    const el = document.createElement('div');
    el.className = `px-3 py-1 bg-white rounded-full font-bold shadow-lg flex items-center gap-2 border-2 whitespace-nowrap`;
    el.style.borderColor = badgeColor;
    el.innerHTML = `
      <div style="background-color: ${badgeColor}; width: 100px; min-width: 12px; height: 12px; border-radius: 50%;"></div>
      <span class="text-xs ${textColor}">AQI: ${label}</span>
    `;

    if (isMapLibre) {
      if (!markerRef.current) {
        markerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(center)
          .setOffset([0, -40])
          .addTo(map);
      } else {
          markerRef.current.setLngLat(center);
      }
    } else if (isLeaflet) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
      
      const icon = L.divIcon({
        html: el.outerHTML,
        className: 'aqi-leaflet-badge',
        iconSize: [80, 30],
        iconAnchor: [40, 40]
      });

      markerRef.current = L.marker([center[1], center[0]], { icon }).addTo(map);
    }

    return () => {
      if (!isVisible && markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, air_quality_baseline, center, isVisible]);

  useEffect(() => {
    return () => {
        if (markerRef.current) {
            markerRef.current.remove();
        }
    }
  }, [])

  return null;
}
