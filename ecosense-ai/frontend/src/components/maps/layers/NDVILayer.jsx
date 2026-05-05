import React, { useEffect } from 'react';
import { useMap } from '../MapContext';
import { TileLayer, Circle } from 'react-leaflet';

export default function NDVILayer({ ndvi_score, ndvi_tile_url, center, isVisible = true }) {
  const { map, isLeaflet, isMapLibre } = useMap();

  useEffect(() => {
    if (!map || (!ndvi_score && !ndvi_tile_url) || !isMapLibre || !isVisible) return;
    if (!map.isStyleLoaded()) return;

    const sourceId = 'ndvi-raster-source';
    const layerId = 'ndvi-raster-layer';

    const addLayer = () => {
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
      else if (typeof ndvi_score === 'number') {
        const fallbackSourceId = 'ndvi-source-fallback';
        const fallbackLayerId = 'ndvi-layer-fallback';
        
        if (!map.getSource(fallbackSourceId)) {
          const points = [];
          const [lng, lat] = center;
          for (let i = -5; i <= 5; i++) {
            for (let j = -5; j <= 5; j++) {
              points.push({
                type: 'Feature',
                geometry: { 
                  type: 'Point', 
                  coordinates: [lng + (i * 0.002), lat + (j * 0.002)] 
                },
                properties: { 
                  ndvi: Math.max(0, Math.min(1, ndvi_score + (Math.random() * 0.2 - 0.1))) 
                }
              });
            }
          }

          map.addSource(fallbackSourceId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: points
            }
          });

          map.addLayer({
            id: fallbackLayerId,
            type: 'heatmap',
            source: fallbackSourceId,
            maxzoom: 15,
            paint: {
              'heatmap-weight': ['get', 'ndvi'],
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
              'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(239, 68, 68, 0)',
                0.2, 'rgb(239, 68, 68)',
                0.4, 'rgb(245, 158, 11)',
                0.6, 'rgb(16, 185, 129)',
                0.8, 'rgb(5, 150, 105)'
              ],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 40],
              'heatmap-opacity': 0.6
            }
          });
        }
      }
    };

    addLayer();
    map.on('style.load', addLayer);
    
    return () => {
      map.off('style.load', addLayer);
      if (map && map.getStyle()) {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
          if (map.getLayer('ndvi-layer-fallback')) map.removeLayer('ndvi-layer-fallback');
          if (map.getSource('ndvi-source-fallback')) map.removeSource('ndvi-source-fallback');
      }
    };
  }, [map, ndvi_score, ndvi_tile_url, center, isMapLibre, isVisible]);

  if (isLeaflet && isVisible) {
    if (ndvi_tile_url) {
        return (
            <TileLayer 
                url={ndvi_tile_url}
                opacity={0.6}
                attribution="Sentinel-2 GEE"
            />
        );
    } else if (typeof ndvi_score === 'number' && center) {
        return (
            <Circle 
                center={[center[1], center[0]]}
                radius={500}
                pathOptions={{ 
                    color: ndvi_score > 0.5 ? '#22c55e' : '#ef4444',
                    fillColor: ndvi_score > 0.5 ? '#22c55e' : '#ef4444',
                    fillOpacity: 0.4
                }}
            />
        );
    }
  }

  return null;
}
