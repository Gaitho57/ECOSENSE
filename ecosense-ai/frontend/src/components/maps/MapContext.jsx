import React, { createContext, useContext, useState } from 'react';

const MapContext = createContext(null);

export const MapProvider = ({ children }) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [engine, setEngine] = useState(null); // 'leaflet' or 'maplibre'

  return (
    <MapContext.Provider value={{ 
      map: mapInstance, 
      setMap: setMapInstance,
      engine,
      setEngine,
      isLeaflet: engine === 'leaflet',
      isMapLibre: engine === 'maplibre'
    }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => useContext(MapContext);
