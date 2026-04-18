import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBaseline, useGenerateBaseline, useTaskStatus } from '../../hooks/useBaseline';
import axiosInstance from '../../api/axiosInstance';

// Components
import { MapProvider } from '../../components/maps/MapContext';
import BaseMap from '../../components/maps/BaseMap';
import LayerControl from '../../components/maps/LayerControl';
import BaselineSummaryCards from '../../components/baseline/BaselineSummaryCards';

// Layers
import NDVILayer from '../../components/maps/layers/NDVILayer';
import HydrologyLayer from '../../components/maps/layers/HydrologyLayer';
import BiodiversityLayer from '../../components/maps/layers/BiodiversityLayer';
import AirQualityLayer from '../../components/maps/layers/AirQualityLayer';
import ProjectBoundaryLayer from '../../components/maps/layers/ProjectBoundaryLayer';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration for all 8 overrideable baseline categories
// ─────────────────────────────────────────────────────────────────────────────
const OVERRIDE_FIELDS = [
  {
    field: 'satellite_data',
    label: '🛰️ Satellite / Vegetation',
    hint: 'Correct NDVI or land cover if field survey differs from satellite reading.',
    inputs: [
      { key: 'ndvi', label: 'NDVI Score (−1 to 1)', type: 'number', min: -1, max: 1, step: 0.01, placeholder: 'e.g. 0.45' },
      { key: 'land_cover_class', label: 'Land Cover Class', type: 'text', placeholder: 'e.g. Grassland' },
      { key: 'tree_cover_percent', label: 'Tree Cover %', type: 'number', min: 0, max: 100, step: 0.1, placeholder: 'e.g. 18.5' },
    ],
  },
  {
    field: 'soil_data',
    label: '🪨 Soil',
    hint: 'Update soil type, pH, or texture from laboratory analysis or field description.',
    inputs: [
      { key: 'soil_type', label: 'Soil Type', type: 'text', placeholder: 'e.g. Vertisol (Black Cotton)' },
      { key: 'ph', label: 'Soil pH', type: 'number', min: 0, max: 14, step: 0.1, placeholder: 'e.g. 6.8' },
      { key: 'organic_carbon_percent', label: 'Organic Carbon %', type: 'number', min: 0, step: 0.1, placeholder: 'e.g. 2.1' },
      { key: 'erosion_risk', label: 'Erosion Risk', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
    ],
  },
  {
    field: 'air_quality_baseline',
    label: '💨 Air Quality',
    hint: 'Update AQI or pollutant levels from an onsite air quality meter.',
    inputs: [
      { key: 'aqi', label: 'AQI (1 = Good, 5 = Very Poor)', type: 'number', min: 1, max: 5, step: 1, placeholder: 'e.g. 2' },
      { key: 'pm10_ugm3', label: 'PM10 (µg/m³)', type: 'number', min: 0, step: 0.1, placeholder: 'e.g. 45.2' },
      { key: 'pm25_ugm3', label: 'PM2.5 (µg/m³)', type: 'number', min: 0, step: 0.1, placeholder: 'e.g. 18.0' },
      { key: 'source', label: 'Measurement Source', type: 'text', placeholder: 'e.g. Handheld AQI meter — site visit 12/04/2026' },
    ],
  },
  {
    field: 'noise_data',
    label: '🔊 Noise',
    hint: 'Log field noise measurements (dB readings from a calibrated sound level meter).',
    inputs: [
      { key: 'ambient_db', label: 'Ambient Noise (dB(A))', type: 'number', min: 0, step: 0.1, placeholder: 'e.g. 52.3' },
      { key: 'peak_db', label: 'Peak Noise (dB(A))', type: 'number', min: 0, step: 0.1, placeholder: 'e.g. 68.7' },
      { key: 'measurement_time', label: 'Measurement Time', type: 'text', placeholder: 'e.g. 09:00–11:00 weekday daytime' },
      { key: 'source', label: 'Noise Source Description', type: 'text', placeholder: 'e.g. Road traffic on Mombasa Road A104' },
    ],
  },
  {
    field: 'hydrology_data',
    label: '💧 Hydrology',
    hint: 'Correct proximity or flow data from field reconnaissance.',
    inputs: [
      { key: 'proximity', label: 'Nearest Water Body Type', type: 'select', options: ['none', 'river', 'lake', 'wetland', 'seasonal_stream', 'borehole'] },
      { key: 'distance_km', label: 'Distance to Water Body (km)', type: 'number', min: 0, step: 0.01, placeholder: 'e.g. 0.85' },
      { key: 'source_name', label: 'Water Body Name', type: 'text', placeholder: 'e.g. Athi River tributary' },
    ],
  },
  {
    field: 'climate_data',
    label: '🌦️ Climate',
    hint: 'Override climate parameters from a local met-station or KMD data.',
    inputs: [
      { key: 'mean_annual_rainfall_mm', label: 'Mean Annual Rainfall (mm)', type: 'number', min: 0, step: 1, placeholder: 'e.g. 850' },
      { key: 'mean_temp_c', label: 'Mean Temperature (°C)', type: 'number', step: 0.1, placeholder: 'e.g. 22.5' },
      { key: 'climate_zone', label: 'Climate Zone', type: 'text', placeholder: 'e.g. Semi-arid lowland savanna' },
    ],
  },
  {
    field: 'biodiversity_data',
    label: '🦁 Biodiversity',
    hint: 'Add field-identified species or correct counts not captured by the GBIF API.',
    inputs: [
      { key: 'threatened_species_count', label: 'Threatened Species Count', type: 'number', min: 0, step: 1, placeholder: 'e.g. 3' },
      { key: 'field_notes', label: 'Field Observation Notes', type: 'text', placeholder: 'e.g. Gyps africanus nesting observed 500 m north of site' },
    ],
  },
  {
    field: 'topography_data',
    label: '⛰️ Topography',
    hint: 'Correct elevation or slope from GPS survey or SRTM data.',
    inputs: [
      { key: 'elevation_m', label: 'Elevation (m asl)', type: 'number', step: 1, placeholder: 'e.g. 1523' },
      { key: 'slope_percent', label: 'Average Slope (%)', type: 'number', min: 0, step: 0.1, placeholder: 'e.g. 4.2' },
      { key: 'terrain_type', label: 'Terrain Type', type: 'text', placeholder: 'e.g. Flat plains, gentle undulation' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Override Modal Component
// ─────────────────────────────────────────────────────────────────────────────
function BaselineOverrideModal({ projectId, onClose, onSaved }) {
  const [activeCategory, setActiveCategory] = useState(OVERRIDE_FIELDS[0].field);
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const cat = OVERRIDE_FIELDS.find(f => f.field === activeCategory);

  const handleInput = (field, key, value) => {
    setSuccessMsg('');
    setErrorMsg('');
    setFormValues(prev => ({
      ...prev,
      [field]: { ...(prev[field] || {}), [key]: value },
    }));
  };

  // Count filled fields across all categories for the save button label
  const filledCount = Object.values(formValues).reduce((acc, obj) => {
    return acc + Object.values(obj).filter(v => v !== '').length;
  }, 0);

  const handleSave = async () => {
    const payload = {};
    for (const [field, vals] of Object.entries(formValues)) {
      const catDef = OVERRIDE_FIELDS.find(f => f.field === field);
      const typed = {};
      for (const [k, v] of Object.entries(vals)) {
        if (v === '' || v === null || v === undefined) continue;
        const inputDef = catDef?.inputs.find(i => i.key === k);
        typed[k] = inputDef?.type === 'number' ? parseFloat(v) : v;
      }
      if (Object.keys(typed).length > 0) payload[field] = typed;
    }

    if (Object.keys(payload).length === 0) {
      setErrorMsg('Please fill at least one field before saving.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await axiosInstance.patch(`/projects/${projectId}/baseline/`, payload);
      const updated = res.data?.data?.overridden_fields ?? [];
      setSuccessMsg(`✅ Saved — ${updated.length} field(s) updated: ${updated.join(', ')}`);
      setFormValues({});
      onSaved?.();
    } catch (err) {
      const detail = err.response?.data?.error?.message || 'Save failed. Check your input and try again.';
      setErrorMsg(`❌ ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const hasFilled = (field) => {
    const vals = formValues[field];
    return vals && Object.values(vals).some(v => v !== '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              ✏️ Manual Baseline Override
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Correct satellite/API data using field observations. Changes are deep-merged — unedited values are preserved.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
            aria-label="Close"
          >✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav className="w-52 border-r border-gray-100 overflow-y-auto bg-gray-50 shrink-0 py-2">
            {OVERRIDE_FIELDS.map(f => (
              <button
                key={f.field}
                onClick={() => setActiveCategory(f.field)}
                className={`w-full text-left px-4 py-3 text-xs font-bold transition-all border-l-4 flex items-center justify-between ${
                  activeCategory === f.field
                    ? 'bg-white border-amber-400 text-amber-800 shadow-sm'
                    : 'border-transparent text-gray-500 hover:bg-white hover:text-gray-700'
                }`}
              >
                <span>{f.label}</span>
                {hasFilled(f.field) && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-1" title="Has unsaved edits" />
                )}
              </button>
            ))}
          </nav>

          {/* Input Panel */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-5">
              <p className="text-xs text-amber-700 font-medium">⚠️ {cat.hint}</p>
            </div>
            <div className="space-y-4">
              {cat.inputs.map(inp => (
                <div key={inp.key}>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{inp.label}</label>
                  {inp.type === 'select' ? (
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-colors"
                      value={formValues[activeCategory]?.[inp.key] || ''}
                      onChange={e => handleInput(activeCategory, inp.key, e.target.value)}
                    >
                      <option value="">— select —</option>
                      {inp.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={inp.type}
                      min={inp.min}
                      max={inp.max}
                      step={inp.step}
                      placeholder={inp.placeholder}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-colors"
                      value={formValues[activeCategory]?.[inp.key] || ''}
                      onChange={e => handleInput(activeCategory, inp.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 bg-gray-50 shrink-0">
          <div className="flex-1 text-xs min-w-0">
            {successMsg && <span className="text-green-700 font-bold">{successMsg}</span>}
            {errorMsg   && <span className="text-red-600  font-bold">{errorMsg}</span>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || filledCount === 0}
            className="shrink-0 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-black shadow transition-all flex items-center gap-2"
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            {saving ? 'Saving…' : `Save ${filledCount > 0 ? `(${filledCount} change${filledCount > 1 ? 's' : ''})` : 'Overrides'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main BaselinePage
// ─────────────────────────────────────────────────────────────────────────────
export default function BaselinePage() {
  const { projectId = 'placeholder-id' } = useParams();

  const { data: baseline, isLoading: isLoadingBaseline, refetch } = useBaseline(projectId);
  const generateMutation = useGenerateBaseline(projectId);

  const [activeTaskId, setActiveTaskId] = useState(null);
  const [mapCenter, setMapCenter] = useState([36.8219, -1.2921]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const [layers, setLayers] = useState({
    satellite: true,
    ndvi: true,
    hydrology: true,
    biodiversity: false,
    air_quality: false,
    boundary: true,
  });

  const { data: taskStatus } = useTaskStatus(activeTaskId);

  useEffect(() => {
    if (taskStatus && (taskStatus.status === 'complete' || taskStatus.status === 'SUCCESS')) {
      setActiveTaskId(null);
      refetch();
    }
  }, [taskStatus, refetch]);

  useEffect(() => {
    if (baseline?.project_location) {
      setMapCenter([baseline.project_location.lng, baseline.project_location.lat]);
    }
  }, [baseline]);

  const handleGenerate = () => {
    generateMutation.mutate(undefined, {
      onSuccess: (res) => { if (res.task_id) setActiveTaskId(res.task_id); }
    });
  };

  const isGenerating = !!activeTaskId || generateMutation.isPending;

  const boundaryGeoJSON = baseline?.project_boundary
    ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: baseline.project_boundary, properties: { name: 'Project Boundary' } }] }
    : null;

  const hydrologyGeoJSON = baseline?.hydrology_data || null;

  if (isLoadingBaseline && !isGenerating && !baseline) {
    return <div className="p-8 text-center text-gray-500">Loading project data...</div>;
  }

  if ((!baseline && !isGenerating) || (baseline && Object.keys(baseline).length === 0 && !isGenerating)) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50 min-h-screen">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-lg border border-gray-100">
          <div className="text-4xl mb-4">🌍</div>
          <h2 className="text-xl font-bold text-gray-800">No Environmental Baseline Generated</h2>
          <p className="text-gray-500 mt-2 mb-6 tracking-tight">Aggregate planetary data, satellite health metrics, and biodiversity indices remotely to establish valid impact bounds.</p>
          <button onClick={handleGenerate} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
            Generate Baseline Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">EcoSense Intelligence</h1>
          <p className="text-sm font-medium text-gray-500">Project Baseline Dashboard Orchestrator</p>
        </div>
        <div className="flex items-center gap-3">
          {baseline?.data_sources?.length > 0 && (
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hidden lg:block">
              {baseline.data_sources.length} data sources
            </span>
          )}
          {baseline && !isGenerating && (
            <>
              <button
                onClick={() => setShowOverrideModal(true)}
                className="text-sm font-bold text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                title="Manually correct individual baseline fields from field measurements"
              >
                ✏️ Manual Override
              </button>
              <button
                onClick={handleGenerate}
                className="text-sm font-medium text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors"
              >
                Regenerate API Data
              </button>
            </>
          )}
        </div>
      </div>

      {isGenerating && (
        <div className="bg-blue-50 border-b border-blue-100 p-3 text-center shrink-0 shadow-inner">
          <span className="inline-flex items-center space-x-2 text-sm text-blue-800 font-medium tracking-wide">
            <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{taskStatus?.status === 'running' ? 'Analysing geospatial bounds… Please wait.' : 'Fetching satellite, climate, hydrology & biodiversity data…'}</span>
          </span>
        </div>
      )}

      {/* ── Main content ── */}
      <div className={`flex flex-col lg:flex-row flex-1 overflow-hidden transition-opacity duration-500 ${isGenerating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

        {/* Map — 60% */}
        <div className="lg:w-3/5 h-1/2 lg:h-full relative border-r border-gray-200">
          <MapProvider>
            <BaseMap center={mapCenter} zoom={13}>
              <LayerControl layers={layers} setLayers={setLayers} />
              {baseline && (
                <>
                  <ProjectBoundaryLayer boundaryGeoJSON={boundaryGeoJSON} isVisible={layers.boundary} />
                  <NDVILayer ndvi_score={baseline.satellite_data?.ndvi} center={mapCenter} isVisible={layers.ndvi} />
                  <HydrologyLayer hydrology_data={hydrologyGeoJSON} isVisible={layers.hydrology} />
                  <BiodiversityLayer biodiversity_data={baseline.biodiversity_data} center={mapCenter} isVisible={layers.biodiversity} />
                  <AirQualityLayer air_quality_baseline={baseline.air_quality_baseline} center={mapCenter} isVisible={layers.air_quality} />
                </>
              )}
            </BaseMap>
          </MapProvider>
        </div>

        {/* Data Panel — 40% */}
        <div className="lg:w-2/5 h-1/2 lg:h-full overflow-y-auto bg-gray-50 flex flex-col items-center">
          <div className="w-full h-full max-w-2xl pt-2">
            <BaselineSummaryCards baseline={baseline} isLoading={isGenerating || isLoadingBaseline} />
          </div>
        </div>
      </div>

      {/* Manual Override Modal */}
      {showOverrideModal && (
        <BaselineOverrideModal
          projectId={projectId}
          onClose={() => setShowOverrideModal(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}
