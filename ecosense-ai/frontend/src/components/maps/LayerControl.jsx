import React from 'react';

const LAYER_CONFIG = [
  { key: 'ndvi', label: 'NDVI Heatmap', color: 'text-green-600', ring: 'focus:ring-green-500' },
  { key: 'hydrology', label: 'Hydrology', color: 'text-blue-600', ring: 'focus:ring-blue-500' },
  { key: 'biodiversity', label: 'Biodiversity', color: 'text-orange-600', ring: 'focus:ring-orange-500' },
  { key: 'air_quality', label: 'Air Quality', color: 'text-red-600', ring: 'focus:ring-red-500' },
  { key: 'boundary', label: 'Site Boundary', color: 'text-emerald-600', ring: 'focus:ring-emerald-500' },
  { key: 'protected_areas', label: 'Protected Areas', color: 'text-emerald-800', ring: 'focus:ring-emerald-700' },
  { key: 'water_towers', label: 'Water Towers', color: 'text-cyan-600', ring: 'focus:ring-cyan-500' },
  { key: 'settlements', label: 'Settlements', color: 'text-slate-600', ring: 'focus:ring-slate-500' },
];

export default function LayerControl({ layers, setLayers }) {
  const handleToggle = (key) => {
    setLayers((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10 w-48 border border-gray-100">
      <h3 className="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-widest">Map Layers</h3>
      <div className="space-y-2.5">
        {LAYER_CONFIG.map(({ key, label, color, ring }) => (
          <label key={key} className="flex items-center space-x-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={!!layers[key]}
              onChange={() => handleToggle(key)}
              className={`form-checkbox h-3.5 w-3.5 ${color} rounded border-gray-300 ${ring} transition-all`}
            />
            <span className={`text-xs font-medium transition-colors ${layers[key] ? 'text-gray-700' : 'text-gray-400'}`}>
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
