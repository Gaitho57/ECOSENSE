import React from 'react';

export default function LayerControl({ layers, setLayers }) {
  const handleToggle = (key) => {
    setLayers((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10 w-48 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Map Layers</h3>
      <div className="space-y-3">
        
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.ndvi}
            onChange={() => handleToggle('ndvi')}
            className="form-checkbox h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
          />
          <span className="text-sm text-gray-700 font-medium">NDVI Heatmap</span>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.hydrology}
            onChange={() => handleToggle('hydrology')}
            className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 font-medium">Hydrology</span>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.biodiversity}
            onChange={() => handleToggle('biodiversity')}
            className="form-checkbox h-4 w-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
          />
          <span className="text-sm text-gray-700 font-medium">Biodiversity</span>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.air_quality}
            onChange={() => handleToggle('air_quality')}
            className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
          />
          <span className="text-sm text-gray-700 font-medium">Air Quality</span>
        </label>

      </div>
    </div>
  );
}
