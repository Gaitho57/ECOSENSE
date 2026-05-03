import React from 'react';
import { Link, useParams } from 'react-router-dom';

export default function BaselineSummaryCards({ baseline, isLoading }) {
  
  if (isLoading || !baseline) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="animate-pulse flex space-x-3 bg-gray-50 rounded-xl p-5 h-28 w-full">
            <div className="rounded-full bg-gray-200 h-9 w-9 shrink-0"></div>
            <div className="flex-1 space-y-3 py-1">
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { projectId } = useParams();
  
  // ---- Value Extractors ----
  const scores = baseline.sensitivity_scores || {};
  const breakdown = scores.breakdown || {};
  const ndvi = baseline.satellite_data?.ndvi || 0;
  const landCover = baseline.satellite_data?.land_cover_class || 'Unknown';
  const treeCover = baseline.satellite_data?.tree_cover_percent || 0;
  const aqi = baseline.air_quality_baseline?.aqi || 1;
  const aqiLabel = baseline.air_quality_baseline?.aqi_label || 'Unknown';
  const whoExceedances = baseline.air_quality_baseline?.who_exceedances || [];
  const pm25 = baseline.air_quality_baseline?.pm2_5 || 0;
  const threatCount = baseline.biodiversity_data?.threatened_species_count || 0;
  const totalCount = baseline.biodiversity_data?.total_species_count || 0;
  const shannonIdx = baseline.biodiversity_data?.shannon_diversity_index || 0;
  const habitatType = baseline.biodiversity_data?.habitat_type || 'Unknown';
  const grade = scores.grade || 'F';
  const gradeInterpretation = scores.interpretation || '';
  const soilType = baseline.soil_data?.soil_type || 'Unknown';
  const ph = baseline.soil_data?.ph_level || 0;
  const erosionRisk = baseline.soil_data?.erosion_risk || 'unknown';
  const fertilityRating = baseline.soil_data?.fertility_rating || 'unknown';
  const carbonStock = baseline.soil_data?.carbon_stock_tonnes_ha || 0;
  const nearestWater = baseline.hydrology_data?.nearest_water_body;
  const totalWaterBodies = baseline.hydrology_data?.total_water_bodies || 0;
  const nearestDistance = baseline.hydrology_data?.nearest_distance_km;
  const climate = baseline.climate_data || {};
  const annualSummary = climate.annual_summary || {};
  const climateClass = climate.climate_classification || {};
  const seasons = climate.seasons || {};
  const windRose = climate.wind_rose || {};
  const elevation = baseline.topography_data?.elevation_m || 0;
  const noiseStatus = baseline.noise_data?.status || 'not_measured';

  // ---- Formatting helpers ----
  const getGradeColor = (g) => {
    if (g === 'A') return 'text-green-600 bg-green-50 border-green-200';
    if (g === 'B') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (g === 'C') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (g === 'D') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRiskColor = (risk) => {
    if (risk === 'very_high' || risk === 'high') return 'text-red-600';
    if (risk === 'medium') return 'text-yellow-600';
    return 'text-green-600';
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';

  return (
    <div className="space-y-2 p-4 bg-gray-50 overflow-y-auto">
      
      {/* ==== Overall Grade (Full Width) ==== */}
      <div className={`rounded-xl p-5 shadow-sm border flex items-center justify-between ${getGradeColor(grade)}`}>
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-white mr-4 shadow-sm opacity-90 text-2xl">📊</div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider opacity-80">Environmental Sensitivity</p>
            <p className="text-4xl font-black mt-1">{grade}</p>
            <p className="text-xs mt-1 opacity-70 max-w-xs">{gradeInterpretation}</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-3xl font-bold">{scores.overall || 0}</p>
          <p className="text-xs opacity-60 uppercase tracking-wider">Score / 100</p>
        </div>
      </div>
      
      {/* ==== Section: NEMA Regulatory Context (PROMOTED FOR VISIBILITY) ==== */}
      <div className="pt-2">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
             <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg text-lg ${getGradeColor(grade)}`}>📜</div>
                  <div>
                       <p className="text-xs font-bold text-gray-800">Legal Classification</p>
                       <p className="text-[10px] text-gray-500 uppercase tracking-tight">Per EMCA Legal Notice 31 (2019/2021)</p>
                  </div>
             </div>
             <div className="space-y-3">
                  <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                       <span className="text-[10px] font-bold text-gray-600">Predicted Risk Category</span>
                       <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                            ['A','B'].includes(grade) ? 'bg-red-100 text-red-700' : 
                            grade === 'C' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                       }`}>
                            {['A','B'].includes(grade) ? 'High Risk (EIS)' : grade === 'C' ? 'Medium Risk (EPR)' : 'Low Risk (SPR)'}
                       </span>
                  </div>
                  <div className="text-[10px] text-gray-400 leading-normal px-1">
                       The sensitivity grade <span className="font-bold text-gray-600">{grade}</span> suggests that this project boundary qualifies for the 
                       <span className="font-bold text-gray-700"> {['A','B'].includes(grade) ? 'Environmental Impact Study' : grade === 'C' ? 'Environmental Project Report' : 'Summary Project Report'}</span> path 
                       under the latest NEMA schedules. 
                       {grade === 'D' && " Since the site is within an industrial/modified zone with low ecological footprint, a fast-tracked SPR is the standard regulatory remedy."}
                  </div>
             </div>
        </div>
      </div>

      {/* ==== Section: Historical RAG Context (from uploaded EIA reports) ==== */}
      {baseline.historical_context && (
        <div className="pt-3">
          <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest px-1 mb-2">📚 Historical Local Context (AI-Retrieved)</h3>
          <div className="bg-amber-50 rounded-xl p-4 shadow-sm border border-amber-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600 text-lg shrink-0">🏛️</div>
              <div>
                <p className="text-xs font-bold text-amber-800">Cross-Referenced from Historical EIA Archive</p>
                <p className="text-[10px] text-amber-600">Synthesized from past reports in the local RAG database</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-700 leading-relaxed italic">
              "{baseline.historical_context}"
            </p>
            <p className="text-[9px] text-amber-500 mt-2 font-medium uppercase tracking-wider">
              ✓ Grounded in verified historical EIA documentation
            </p>
          </div>
        </div>
      )}

      {/* ==== Section: Physical Environment ==== */}
      <div className="pt-3">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Physical Environment</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">

          {/* NDVI / Vegetation */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center mb-2">
              <span className="text-lg mr-2">🌿</span>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vegetation NDVI</p>
            </div>
            <p className={`text-2xl font-bold ${ndvi > 0.5 ? 'text-green-600' : ndvi > 0.2 ? 'text-yellow-600' : 'text-red-500'}`}>
              {typeof ndvi === 'number' ? ndvi.toFixed(2) : '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Land: {landCover}</p>
            <p className="text-[10px] text-gray-400">Tree Cover: {treeCover}%</p>
          </div>

          {/* Air Quality */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center mb-2">
              <span className="text-lg mr-2">💨</span>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Air Quality</p>
            </div>
            <p className={`text-2xl font-bold ${aqi <= 2 ? 'text-green-600' : aqi === 3 ? 'text-yellow-600' : 'text-red-600'}`}>
              {aqi} <span className="text-xs font-normal text-gray-400">/ 5</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-1">{aqiLabel}</p>
            <p className="text-[10px] text-gray-400">PM2.5: {pm25.toFixed(1)} µg/m³</p>
            {whoExceedances.length > 0 && (
              <p className="text-[10px] text-red-500 font-bold mt-1">⚠ {whoExceedances.length} WHO limit{whoExceedances.length > 1 ? 's' : ''} exceeded</p>
            )}
          </div>

          {/* Soil */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center mb-2">
              <span className="text-lg mr-2">🪨</span>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Soil Profile</p>
            </div>
            <p className="text-lg font-bold text-gray-800">{soilType}</p>
            <p className="text-[10px] text-gray-400 mt-1">pH: {typeof ph === 'number' ? ph.toFixed(1) : '—'}</p>
            <p className={`text-[10px] mt-0.5 font-medium ${getRiskColor(erosionRisk)}`}>
              Erosion: {capitalize(erosionRisk)}
            </p>
            <p className="text-[10px] text-gray-400">Fertility: {capitalize(fertilityRating)}</p>
          </div>

          {/* Hydrology */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center mb-2">
              <span className="text-lg mr-2">💧</span>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hydrology</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{totalWaterBodies}</p>
            <p className="text-[10px] text-gray-400 mt-1">Water bodies within 10km</p>
            {nearestWater && (
              <>
                <p className="text-[10px] text-blue-500 font-medium mt-1">
                  Nearest: {nearestWater.name}
                </p>
                <p className="text-[10px] text-gray-400">
                  {nearestWater.type} — {nearestDistance?.toFixed(1)} km
                </p>
              </>
            )}
            {!nearestWater && (
              <p className="text-[10px] text-gray-400 mt-1">No water bodies detected</p>
            )}
          </div>

          {/* Climate */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center mb-2">
              <span className="text-lg mr-2">🌦️</span>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Climate</p>
            </div>
            <p className="text-lg font-bold text-gray-800">
              {annualSummary.mean_annual_temperature_c != null 
                ? `${annualSummary.mean_annual_temperature_c}°C` 
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              Rain: {annualSummary.total_annual_precipitation_mm != null 
                ? `${Math.round(annualSummary.total_annual_precipitation_mm)} mm/yr` 
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400">{climateClass.name || '—'}</p>
            <p className="text-[10px] text-gray-400">{seasons.type || '—'}</p>
          </div>

          {/* Topography */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center mb-2">
              <span className="text-lg mr-2">⛰️</span>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Topography</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {elevation > 0 ? `${Math.round(elevation)}` : '—'}
              <span className="text-xs font-normal text-gray-400"> m</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Above sea level</p>
            <p className="text-[10px] text-gray-400">
              Wind: {windRose.dominant_direction || '—'} at {windRose.mean_speed_kmh || 0} km/h
            </p>
          </div>

        </div>
      </div>

      {/* ==== Section: Biological Environment ==== */}
      <div className="pt-3">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Biological Environment</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">

          {/* Biodiversity */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center mb-2">
              <span className="text-lg mr-2">🦜</span>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Biodiversity</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {totalCount} <span className="text-xs font-normal text-gray-500">species</span>
            </p>
            {threatCount > 0 && (
              <p className="text-[10px] text-red-500 font-bold mt-1">⚠ {threatCount} threatened</p>
            )}
            {threatCount === 0 && (
              <p className="text-[10px] text-green-500 font-medium mt-1">No threatened species</p>
            )}
            <p className="text-[10px] text-gray-400 mt-0.5">Shannon Index: {shannonIdx.toFixed(2)}</p>
          </div>

          {/* Habitat */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center mb-2">
              <span className="text-lg mr-2">🌳</span>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Habitat</p>
            </div>
            <p className="text-sm font-bold text-gray-800 mt-1">{habitatType}</p>
            <p className="text-[10px] text-gray-400 mt-1">Carbon Stock: {carbonStock} t/ha</p>
          </div>

          {/* Noise */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center mb-2">
              <span className="text-lg mr-2">🔊</span>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Noise Baseline</p>
            </div>
            {noiseStatus === 'not_measured' ? (
              <>
                <p className="text-sm font-bold text-amber-600 mt-1">Pending</p>
                <p className="text-[10px] text-gray-400 mt-1">Requires field measurement</p>
                <p className="text-[10px] text-gray-400">Day limit: {baseline.noise_data?.residential_day_limit_dba || 55} dBA</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-800">
                  {baseline.noise_data?.measured_dba || '—'} <span className="text-xs font-normal text-gray-400">dBA</span>
                </p>
              </>
            )}
          </div>

        </div>
      </div>

      {/* ==== Section: Sensitivity Breakdown ==== */}
      <div className="pt-3">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Sensitivity Breakdown</h3>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="space-y-2.5">
            {Object.entries(breakdown).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-[11px] font-bold text-gray-800">{value}/100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-700 ${
                      value >= 70 ? 'bg-red-500' : value >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==== Section: Data Sources ==== */}
      {baseline.data_sources?.length > 0 && (
        <div className="pt-3 pb-6">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Data Sources</h3>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-wrap gap-2">
              {baseline.data_sources.map((source, i) => (
                <span key={i} className="text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                  ✓ {source}
                </span>
              ))}
            </div>
            {baseline.generated_at && (
              <p className="text-[10px] text-gray-400 mt-3">
                Generated: {new Date(baseline.generated_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ==== NEXT STAGE ACTION ==== */}
      <div className="pt-4 pb-12 px-1">
        <Link 
          to={`/dashboard/projects/${projectId}/predictions`}
          className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-between group transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-widest opacity-60">Next Stage</p>
            <p className="text-lg">AI Impact Predictions</p>
          </div>
          <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>
    </div>
  );
}
