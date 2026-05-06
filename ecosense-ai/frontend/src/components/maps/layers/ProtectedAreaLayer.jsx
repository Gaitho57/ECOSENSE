import React, { useEffect } from 'react';
import { useMap } from '../MapContext';
import { GeoJSON } from 'react-leaflet';

export default function ProtectedAreaLayer({ protected_areas = [], isVisible = true }) {
  const { map, isLeaflet, isMapLibre } = useMap();

  const geoJsonData = React.useMemo(() => {
    if (!protected_areas.length) return null;
    return {
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
  }, [protected_areas]);

  useEffect(() => {
    if (!map || !geoJsonData || !isMapLibre || !isVisible) return;
    if (!map.isStyleLoaded()) return;

    const sourceId = 'pa-source';
    const fillLayerId = 'pa-fill';
    const lineLayerId = 'pa-line';

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
          paint: { 'fill-color': '#059669', 'fill-opacity': 0.3 }
        });

        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: { 'line-color': '#10b981', 'line-width': 2, 'line-opacity': 0.8 }
        });
      }
    };

    updateOrAddSource();
    map.on('style.load', updateOrAddSource);
    
    return () => {
      map.off('style.load', updateOrAddSource);
      if (map && map.getStyle()) {
          if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
          if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, geoJsonData, isMapLibre, isVisible]);

  if (isLeaflet && geoJsonData && isVisible) {
    return (
        <GeoJSON 
            data={geoJsonData}
            style={{
                color: '#10b981',
                weight: 2,
                fillColor: '#059669',
                fillOpacity: 0.3
            }}
            onEachFeature={(feature, layer) => {
                layer.bindPopup(`
                  <div style="padding: 10px; min-width: 150px;">
                    <div style="font-size: 10px; font-weight: bold; color: #059669; margin-bottom: 4px; text-transform: uppercase;">PROTECTED AREA</div>
                    <strong style="color: #065f46; font-size: 14px; display: block;">${feature.properties.name}</strong>
                    <span style="font-size: 10px; color: #6b7280; text-transform: uppercase;">${feature.properties.designation}</span>
                  </div>
                `);
            }}
        />
    );
  }

  return null;
}
