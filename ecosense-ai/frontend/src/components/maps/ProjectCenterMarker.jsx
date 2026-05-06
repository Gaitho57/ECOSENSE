import React, { useEffect, useRef } from 'react';
import { useMap } from './MapContext';
import L from 'leaflet';
import maplibregl from 'maplibre-gl';
import { Marker, Popup, Circle, Tooltip } from 'react-leaflet';

export default function ProjectCenterMarker({ center }) {
  const { map, isLeaflet, isMapLibre } = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !center || !isMapLibre) return;
    
    // Safety check for maplibregl global or imported instance
    const MapLibre = window.maplibregl || maplibregl;
    
    if (MapLibre) {
        if (!markerRef.current) {
            markerRef.current = new MapLibre.Marker({ color: "#ef4444" })
                .setLngLat(center)
                .addTo(map);
        } else {
            markerRef.current.setLngLat(center);
        }
    }
    
    return () => { if (markerRef.current) markerRef.current.remove(); markerRef.current = null; };
  }, [map, center, isMapLibre]);

  if (isLeaflet && center?.[0] && center?.[1]) {
    const icon = L.divIcon({
        html: `
            <div style="position: relative; width: 24px; height: 24px;">
                <div style="position: absolute; width: 100%; height: 100%; background: rgba(239, 68, 68, 0.4); border-radius: 50%; animation: marker-pulse 2s infinite;"></div>
                <div style="position: absolute; top: 6px; left: 6px; width: 12px; height: 12px; background: #ef4444; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>
            </div>
        `,
        className: 'project-site-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    return (
        <>
            <style>{`
                @keyframes marker-pulse {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(4); opacity: 0; }
                }
            `}</style>
            <Marker position={[center[1], center[0]]} icon={icon}>
                <Tooltip permanent direction="top" offset={[0, -15]} opacity={1}>
                    <div className="bg-red-600 text-white px-2 py-1 rounded font-black text-[10px] uppercase tracking-widest shadow-xl border border-red-500">
                        📍 Site Center
                    </div>
                </Tooltip>
                <Popup>
                    <div className="p-1 text-center">
                        <p className="font-black text-gray-900 text-xs">Athi River Project</p>
                        <p className="text-[10px] text-gray-500">{center[1].toFixed(5)}, {center[0].toFixed(5)}</p>
                    </div>
                </Popup>
            </Marker>
            <Circle 
                center={[center[1], center[0]]} 
                radius={50} 
                pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1 }} 
            />
        </>
    );
  }
  return null;
}
