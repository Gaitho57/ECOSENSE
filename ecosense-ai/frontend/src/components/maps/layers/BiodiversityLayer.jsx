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
    const fillLayerId = 'bio-pulse-fill';
    const borderLayerId = 'bio-pulse-border';

    const addLayer = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: center
            }
          }
        });
      }

      if (!map.getLayer(fillLayerId)) {
        map.addLayer({
          id: fillLayerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 40,
            'circle-color': '#f97316', // Orange
            'circle-opacity': 0.4
          }
        });
      }
      
      if (!map.getLayer(borderLayerId)) {
        map.addLayer({
          id: borderLayerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 40,
            'circle-color': 'transparent',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#f97316'
          }
        });
      }
    };

    if (isVisible) {
      addLayer();
      map.on('style.load', addLayer);
    }

    return () => {
      map.off('style.load', addLayer);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, biodiversity_data, center, isVisible]);

  return null;
}
