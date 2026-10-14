import React, { useEffect, useState } from 'react';
import { useMap } from '../MapContext';
import { GeoJSON } from 'react-leaflet';
import maplibregl from 'maplibre-gl';

export default function AEZLayer({ data, isVisible = true }) {
  const { map, isLeaflet, isMapLibre } = useMap();
  const [geoJsonData, setGeoJsonData] = useState(data || null);

  useEffect(() => {
    if (data) {
      setGeoJsonData(data);
      return;
    }
    // Fetch bundled Jaetzold/FAO Agro-Ecological Zones GeoJSON
    let isMounted = true;
    fetch('/data/kenya_aez.geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (isMounted) setGeoJsonData(json);
      })
      .catch((err) => {
        console.warn('Could not load /data/kenya_aez.geojson:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [data]);

  useEffect(() => {
    if (!map || !geoJsonData || !isMapLibre || !isVisible) return;
    if (!map.isStyleLoaded()) return;

    const sourceId = 'aez-source';
    const fillLayerId = 'aez-fill';
    const lineLayerId = 'aez-line';
    const labelLayerId = 'aez-label';

    let popup = null;

    const updateOrAddSource = () => {
      const source = map.getSource(sourceId);
      if (source) {
        source.setData(geoJsonData);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geoJsonData });
      }

      if (!map.getLayer(fillLayerId)) {
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': ['coalesce', ['get', 'fill_color'], '#16a34a'],
            'fill-opacity': 0.28,
          },
        });

        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': ['coalesce', ['get', 'fill_color'], '#15803d'],
            'line-width': 1.5,
            'line-opacity': 0.85,
          },
        });

        map.addLayer({
          id: labelLayerId,
          type: 'symbol',
          source: sourceId,
          minzoom: 8,
          layout: {
            'text-field': ['concat', ['get', 'zone_code'], ': ', ['get', 'zone_name']],
            'text-size': 11,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-allow-overlap': false,
            'text-max-width': 12,
          },
          paint: {
            'text-color': '#1f2937',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
          },
        });
      }
    };

    updateOrAddSource();
    map.on('style.load', updateOrAddSource);

    // MapLibre Interactive Popups & Hover State
    const handleClick = (e) => {
      if (!e.features || !e.features.length) return;
      const props = e.features[0].properties;
      const html = `
        <div style="padding: 10px; min-width: 230px; font-family: system-ui, sans-serif;">
          <div style="font-size: 10px; font-weight: 800; color: ${props.fill_color || '#15803d'}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
            Agro-Ecological Zone (Jaetzold / FAO)
          </div>
          <strong style="color: #111827; font-size: 14px; display: block; line-height: 1.25; margin-bottom: 6px;">
            ${props.zone_code}: ${props.zone_name}
          </strong>
          <div style="font-size: 11px; color: #4b5563; margin-bottom: 2px;">
            <strong>Thermal:</strong> ${props.thermal_belt || '—'}
          </div>
          <div style="font-size: 11px; color: #4b5563; margin-bottom: 2px;">
            <strong>Rainfall:</strong> ${props.annual_rainfall_mm || '—'}
          </div>
          <div style="font-size: 11px; color: #4b5563; margin-bottom: 4px;">
            <strong>Potential:</strong> ${props.potential || '—'}
          </div>
          <div style="font-size: 11px; color: #047857; background: #ecfdf5; padding: 4px 6px; border-radius: 4px; border: 1px solid #a7f3d0; margin-top: 6px;">
            <strong>EMP Planting Quota:</strong> ${props.recommended_trees || '—'}
          </div>
        </div>
      `;
      if (popup) popup.remove();
      popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', fillLayerId, handleClick);
    map.on('mouseenter', fillLayerId, handleMouseEnter);
    map.on('mouseleave', fillLayerId, handleMouseLeave);

    return () => {
      map.off('style.load', updateOrAddSource);
      map.off('click', fillLayerId, handleClick);
      map.off('mouseenter', fillLayerId, handleMouseEnter);
      map.off('mouseleave', fillLayerId, handleMouseLeave);
      if (popup) popup.remove();

      if (map && map.getStyle()) {
        if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, geoJsonData, isMapLibre, isVisible]);

  if (isLeaflet && geoJsonData && isVisible) {
    return (
      <GeoJSON
        data={geoJsonData}
        style={(feature) => ({
          color: feature?.properties?.fill_color || '#15803d',
          weight: 1.5,
          fillColor: feature?.properties?.fill_color || '#22c55e',
          fillOpacity: 0.28,
          opacity: 0.85,
        })}
        onEachFeature={(feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(`
            <div style="padding: 10px; min-width: 230px; font-family: system-ui, sans-serif;">
              <div style="font-size: 10px; font-weight: 800; color: ${props.fill_color || '#15803d'}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
                Agro-Ecological Zone (Jaetzold / FAO)
              </div>
              <strong style="color: #111827; font-size: 14px; display: block; line-height: 1.25; margin-bottom: 6px;">
                ${props.zone_code}: ${props.zone_name}
              </strong>
              <div style="font-size: 11px; color: #4b5563; margin-bottom: 2px;">
                <strong>Thermal:</strong> ${props.thermal_belt || '—'}
              </div>
              <div style="font-size: 11px; color: #4b5563; margin-bottom: 2px;">
                <strong>Rainfall:</strong> ${props.annual_rainfall_mm || '—'}
              </div>
              <div style="font-size: 11px; color: #4b5563; margin-bottom: 4px;">
                <strong>Potential:</strong> ${props.potential || '—'}
              </div>
              <div style="font-size: 11px; color: #047857; background: #ecfdf5; padding: 4px 6px; border-radius: 4px; border: 1px solid #a7f3d0; margin-top: 6px;">
                <strong>EMP Planting Quota:</strong> ${props.recommended_trees || '—'}
              </div>
            </div>
          `);
        }}
      />
    );
  }

  return null;
}
