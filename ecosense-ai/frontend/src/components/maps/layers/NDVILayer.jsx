import React, { useEffect } from 'react';
import { useMap } from '../MapContext';

export default function NDVILayer({ ndvi_score, ndvi_tile_url, center, isVisible = true }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    const sourceId = 'ndvi-raster-source';
    const layerId = 'ndvi-raster-layer';

    const addLayer = () => {
      // Prioritize High-Fidelity Raster Tiles from GEE
      if (ndvi_tile_url) {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'raster',
            tiles: [ndvi_tile_url],
            tileSize: 256,
            attribution: 'ESA WorldCover / Sentinel-2 GEE'
          });
        }

        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': 0.6,
              'raster-contrast': 0.1,
              'raster-brightness-min': 0.1
            }
          });
        }
      } 
      // Fallback to legacy marker if no tile URL is present
      else if (typeof ndvi_score === 'number') {
        const fallbackSourceId = 'ndvi-source-fallback';
        const fallbackLayerId = 'ndvi-layer-fallback';
        
        if (!map.getSource(fallbackSourceId)) {
          map.addSource(fallbackSourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: center },
              properties: { ndvi: ndvi_score }
            }
          });

          map.addLayer({
            id: fallbackLayerId,
            type: 'circle',
            source: fallbackSourceId,
            paint: {
              'circle-radius': 50,
              'circle-color': ndvi_score > 0.6 ? '#16a34a' : '#fbbf24',
              'circle-opacity': 0.5
            }
          });
        }
      }
    };

    if (isVisible) {
      addLayer();
      map.on('style.load', addLayer);
    }

    return () => {
      map.off('style.load', addLayer);
      if (map && map.getStyle()) {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
          if (map.getLayer('ndvi-layer-fallback')) map.removeLayer('ndvi-layer-fallback');
          if (map.getSource('ndvi-source-fallback')) map.removeSource('ndvi-source-fallback');
      }
    };
  }, [map, ndvi_score, ndvi_tile_url, center, isVisible]);

  return null;
}
