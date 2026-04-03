import React, { createContext, useContext, useState } from 'react';

const MapContext = createContext(null);

export const MapProvider = ({ children }) => {
  const [mapInstance, setMapInstance] = useState(null);

  return (
    <MapContext.Provider value={{ map: mapInstance, setMap: setMapInstance }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => useContext(MapContext);
