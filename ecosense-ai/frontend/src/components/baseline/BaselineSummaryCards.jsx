import React from 'react';

export default function BaselineSummaryCards({ baseline, isLoading }) {
  
  if (isLoading || !baseline) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex space-x-4 bg-gray-50 rounded-xl p-6 h-32 w-full">
            <div className="rounded-full bg-gray-200 h-10 w-10"></div>
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Value Extractors
  const scores = baseline.sensitivity_scores || {};
  const ndvi = baseline.satellite_data?.ndvi || 0;
  const aqi = baseline.air_quality_baseline?.aqi || 1;
  const threatCount = baseline.biodiversity_data?.threatened_species_count || 0;
  const totalCount = baseline.biodiversity_data?.total_species_count || 0;
  const grade = scores.grade || 'F';
  const soilType = baseline.soil_data?.soil_type || 'Unknown';
  const ph = baseline.soil_data?.ph_level || 0;

  // Formatting helpers
  const getGradeColor = (g) => {
      if (g === 'A') return 'text-green-600 bg-green-50';
      if (g === 'B') return 'text-green-500 bg-green-50';
      if (g === 'C') return 'text-yellow-600 bg-yellow-50';
      if (g === 'D') return 'text-orange-600 bg-orange-50';
      return 'text-red-600 bg-red-50';
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 border-t border-gray-200">
        
      {/* Card 1: NDVI */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start">
        <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">🌿</div>
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">NDVI Health</p>
          <p className={`text-2xl font-bold mt-1 ${ndvi > 0.5 ? 'text-green-600' : 'text-yellow-600'}`}>
            {ndvi.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Card 2: Air Quality */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start">
        <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">💨</div>
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Air Quality (AQI)</p>
          <p className={`text-2xl font-bold mt-1 ${aqi <= 2 ? 'text-green-600' : aqi === 3 ? 'text-yellow-600' : 'text-red-600'}`}>
            {aqi} <span className="text-sm font-normal text-gray-400">/ 5</span>
          </p>
        </div>
      </div>

      {/* Card 3: Biodiversity */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start">
        <div className="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">🦜</div>
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Biodiversity</p>
          <p className="text-2xl font-bold mt-1 text-gray-800">
            {totalCount} <span className="text-sm font-normal text-gray-500">species</span>
          </p>
          <p className="text-xs text-red-500 font-medium mt-1">{threatCount} threatened</p>
        </div>
      </div>

      {/* Card 4: Overall Grade */}
      <div className={`rounded-xl p-5 shadow-sm border border-gray-100 flex items-start ${getGradeColor(grade)}`}>
        <div className="p-3 rounded-full bg-white mr-4 shadow-sm opacity-90">📊</div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider opacity-80">Sensitivity Grade</p>
          <p className="text-4xl font-black mt-1">
            {grade}
          </p>
        </div>
      </div>

      {/* Card 5: Soil */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start">
        <div className="p-3 rounded-full bg-amber-100 text-amber-700 mr-4">🌍</div>
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Soil Profile</p>
          <p className="text-xl font-bold mt-1 text-gray-800">{soilType}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">pH: {ph.toFixed(1)}</p>
        </div>
      </div>
      
    </div>
  );
}
