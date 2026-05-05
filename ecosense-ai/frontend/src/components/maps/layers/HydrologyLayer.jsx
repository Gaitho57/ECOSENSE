import React, { useEffect } from 'react';
import { useMap } from '../MapContext';
import { GeoJSON } from 'react-leaflet';

export default function HydrologyLayer({ hydrology_data, isVisible = true }) {
  const { map, isLeaflet, isMapLibre } = useMap();

  const geoJsonData = React.useMemo(() => {
    if (!hydrology_data) return null;
    if (hydrology_data?.streams) return hydrology_data.streams;
    if (hydrology_data?.features?.type === 'FeatureCollection') return hydrology_data.features;
    if (hydrology_data?.type === 'FeatureCollection') return hydrology_data;
    return null;
  }, [hydrology_data]);

  useEffect(() => {
    if (!map || !geoJsonData || !isMapLibre || !isVisible) return;
    if (!map.isStyleLoaded()) return;

    const sourceId = 'hydro-source';
    const fillLayerId = 'hydro-fill';
    const lineLayerId = 'hydro-line';

    const addLayer = () => {
      const source = map.getSource(sourceId);
      if (!source) {
        map.addSource(sourceId, { type: 'geojson', data: geoJsonData, generateId: true });
      } else {
        source.setData(geoJsonData);
      }

      if (!map.getLayer(fillLayerId)) {
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          filter: ['==', '$type', 'Polygon'],
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.4 }
        });
      }

      if (!map.getLayer(lineLayerId)) {
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          filter: ['==', '$type', 'LineString'],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#0ea5e9',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4, 18, 8],
            'line-opacity': 0.8
          }
        });
      }
    };

    addLayer();
    map.on('style.load', addLayer);
    
    return () => {
      map.off('style.load', addLayer);
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
            style={(feature) => {
                if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                    return { color: '#3b82f6', weight: 1, fillOpacity: 0.4 };
                }
                return { color: '#0ea5e9', weight: 3, opacity: 0.8 };
            }}
        />
    );
  }

  return null;
}
