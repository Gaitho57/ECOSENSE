import React, { useEffect } from 'react';
import { useMap } from '../MapContext';

export default function BiodiversityLayer({ biodiversity_data, center, isVisible = true }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !map.isStyleLoaded() || !biodiversity_data) return;
    
    // Check if we need to render the pulsing hotspot
    const threatened = biodiversity_data.threatened_species_count || 0;
    if (threatened === 0) return;

    const sourceId = 'bio-source';
    const layerId = 'bio-layer';
    const highlightLayerId = 'bio-layer-highlight';

    // Map scientific occurrences to GeoJSON
    const features = (biodiversity_data.occurrence_points || []).map((p, idx) => ({
      type: 'Feature',
      id: idx,
      geometry: {
        type: 'Point',
        coordinates: [p.lng, p.lat]
      },
      properties: {
        species: p.species,
        class: p.class,
        id: p.key
      }
    }));

    const geoJsonData = {
      type: 'FeatureCollection',
      features: features
    };

    const addLayer = () => {
      const source = map.getSource(sourceId);
      if (!source) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geoJsonData,
          generateId: true
        });
      } else {
        source.setData(geoJsonData);
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              10, 4,
              15, 8
            ],
            'circle-color': [
              'match',
              ['get', 'class'],
              'Mammalia', '#f43f5e', // Rose
              'Aves', '#3b82f6', // Blue
              'Reptilia', '#10b981', // Emerald
              'Amphibia', '#8b5cf6', // Violet
              'Magnoliopsida', '#16a34a', // Green
              '#f59e0b' // Amber default
            ],
            'circle-opacity': 0.8,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff'
          }
        });

        // Precise Highlight Layer
        map.addLayer({
          id: highlightLayerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              10, 8,
              15, 12
            ],
            'circle-color': '#ffffff',
            'circle-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.4,
              0
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
      }

      // Precision Hover Interactions
      map.on('mousemove', layerId, (e) => {
        if (e.features.length > 0) {
          map.getCanvas().style.cursor = 'pointer';
          map.setFeatureState(
            { source: sourceId, id: e.features[0].id },
            { hover: true }
          );
        }
      });

      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
        // Feature state cleanup handled in generic event or cleanup effect
      });
    };

    if (isVisible) {
      addLayer();
      map.on('style.load', addLayer);
    }

    return () => {
      map.off('style.load', addLayer);
      if (map && map.getStyle()) {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getLayer(highlightLayerId)) map.removeLayer(highlightLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, biodiversity_data, center, isVisible]);

  return null;
}
