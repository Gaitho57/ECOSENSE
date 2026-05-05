import React, { useEffect, useRef } from 'react';
import { useMap } from '../MapContext';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export default function AirQualityLayer({ air_quality_baseline, center, isVisible = true }) {
  const { map, isLeaflet, isMapLibre } = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !air_quality_baseline || !isMapLibre || !isVisible) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const aqi = air_quality_baseline.aqi || 1;
    let badgeColor = '#22c55e';
    let label = 'Good';

    if (aqi === 3) {
      badgeColor = '#eab308';
      label = 'Moderate';
    } else if (aqi >= 4) {
      badgeColor = '#ef4444';
      label = 'Poor';
    }

    const el = document.createElement('div');
    el.className = `px-3 py-1 bg-white rounded-full font-bold shadow-lg flex items-center gap-2 border-2 whitespace-nowrap`;
    el.style.borderColor = badgeColor;
    el.innerHTML = `
      <div style="background-color: ${badgeColor}; width: 12px; height: 12px; border-radius: 50%;"></div>
      <span style="font-size: 10px; color: #111827">AQI: ${label}</span>
    `;

    if (!markerRef.current) {
        // @ts-ignore
        markerRef.current = new window.maplibregl.Marker({ element: el })
            .setLngLat(center)
            .setOffset([0, -40])
            .addTo(map);
    } else {
        markerRef.current.setLngLat(center);
    }

    return () => {
        if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }
    };
  }, [map, air_quality_baseline, center, isMapLibre, isVisible]);

  if (isLeaflet && air_quality_baseline && center && isVisible) {
    const aqi = air_quality_baseline.aqi || 1;
    let badgeColor = '#22c55e';
    let label = 'Good';

    if (aqi === 3) {
      badgeColor = '#eab308';
      label = 'Moderate';
    } else if (aqi >= 4) {
      badgeColor = '#ef4444';
      label = 'Poor';
    }

    const icon = L.divIcon({
        html: `
          <div class="px-3 py-1 bg-white rounded-full font-bold shadow-lg flex items-center gap-2 border-2 whitespace-nowrap" style="border-color: ${badgeColor}; transform: translate(-50%, -100%);">
            <div style="background-color: ${badgeColor}; width: 12px; height: 12px; border-radius: 50%;"></div>
            <span style="font-size: 10px; color: #111827">AQI: ${label}</span>
          </div>
        `,
        className: 'aqi-leaflet-badge',
        iconSize: [80, 30],
        iconAnchor: [0, 0]
    });

    return (
        <Marker position={[center[1], center[0]]} icon={icon}>
            <Popup>Air Quality Index: ${label}</Popup>
        </Marker>
    );
  }

  return null;
}
