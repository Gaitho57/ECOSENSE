import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from '../MapContext';

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

    const aqi = air_quality_baseline.aqi || 1;
    let badgeColor = '#22c55e'; // Green
    let textColor = 'text-green-900';
    let label = 'Good';

    if (aqi === 3) {
      badgeColor = '#eab308'; // Yellow
      textColor = 'text-yellow-900';
      label = 'Moderate';
    } else if (aqi >= 4) {
      badgeColor = '#ef4444'; // Red
      textColor = 'text-white';
      label = 'Poor';
    }

    // Create a DOM element for the marker
    const el = document.createElement('div');
    el.className = `px-3 py-1 bg-white rounded-full font-bold shadow-lg flex items-center gap-2 border-2`;
    el.style.borderColor = badgeColor;
    
    el.innerHTML = `
      <div style="background-color: ${badgeColor}; width: 12px; height: 12px; border-radius: 50%;"></div>
      <span class="text-xs ${textColor}">AQI: ${label}</span>
    `;

    // Initialize marker if not exists
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(center)
        // Offset slightly above the center
        .setOffset([0, -40])
        .addTo(map);
    } else {
        markerRef.current.setLngLat(center);
    }

    return () => {
      // Don't unmount marker completely unless visibility false or torn down
      if (!isVisible && markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, air_quality_baseline, center, isVisible]);

  // Clean up forcefully on unmount
  useEffect(() => {
    return () => {
        if (markerRef.current) {
            markerRef.current.remove();
        }
    }
  }, [])

  return null;
}
