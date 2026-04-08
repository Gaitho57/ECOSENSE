import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useBaseline } from '../../hooks/useBaseline';
import { useMap, MapProvider } from '../../components/maps/MapContext';
import BaseMap from '../../components/maps/BaseMap';
import LayerControl from '../../components/maps/LayerControl';

// Simulation Layers
import DispersionLayer from '../../components/maps/layers/DispersionLayer';
import FloodLayer from '../../components/maps/layers/FloodLayer';

// Baseline Layers - Natively integrating environmental bounds
import NDVILayer from '../../components/maps/layers/NDVILayer';
import HydrologyLayer from '../../components/maps/layers/HydrologyLayer';
import BiodiversityLayer from '../../components/maps/layers/BiodiversityLayer';
import AirQualityLayer from '../../components/maps/layers/AirQualityLayer';
import ProjectBoundaryLayer from '../../components/maps/layers/ProjectBoundaryLayer';
import * as turf from '@turf/turf'; // We use turf to draw strict geographic boundary circles natively.

function BufferRingsLayer({ center }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !map.isStyleLoaded() || !center) return;

    const sourceId = 'buffer-rings';
    
    // Create dual rings using TurfJS generically
    const pt = turf.point(center);
    const ring500 = turf.circle(pt, 0.5, { steps: 64, units: 'kilometers' });
    const ring2k = turf.circle(pt, 2.0, { steps: 64, units: 'kilometers' });
    
    const fc = turf.featureCollection([ring500, ring2k]);

    const addLayer = () => {
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: 'geojson', data: fc });
            
            map.addLayer({
                id: 'buffer-rings-line',
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': '#FFFFFF',
                    'line-width': 1.5,
                    'line-dasharray': [2, 2],
                    'line-opacity': 0.7
                }
            });
        }
    };

    addLayer();
    map.on('style.load', addLayer);
    
    return () => {
        map.off('style.load', addLayer);
        if (map.getLayer('buffer-rings-line')) map.removeLayer('buffer-rings-line');
        if (map.getSource(sourceId)) map.removeSource(sourceId);
    };

  }, [map, center]);

  return null;
}

export default function GISPage() {
  const { projectId = 'placeholder-id' } = useParams();
  const [mapCenter, setMapCenter] = useState([36.8219, -1.2921]); // Default to Nairobi
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  
  // Data Fetching - Baseline context natively 
  const { data: baseline, isLoading: isLoadingBaseline } = useBaseline(projectId);

  // Tab State
  const [activeTab, setActiveTab] = useState('dispersion');

  // Simulation Parameters State
  const [dispersionParams, setDispersionParams] = useState({
      emission_rate: 100,
      wind_speed: 4,
      wind_direction: 90,
      stability_class: 'D'
  });

  // GeoJSON results State
  const [dispersionData, setDispersionData] = useState(null);
  const [floodData, setFloodData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Layers mapping - Synchronized with LayerControl keys
  const [layers, setLayers] = useState({
      dispersion: true,
      flood: true,
      ndvi: true,
      hydrology: true,
      biodiversity: true,
      air_quality: true,
      boundary: true
  });

  // Fetch Project Coordinates to center map generically 
  useEffect(() => {
      const fetchProject = async () => {
          try {
              const res = await axiosInstance.get(`/projects/${projectId}/`);
              const coords = res.data.data;
              if (coords && coords.coordinates) {
                  setMapCenter([coords.coordinates.lng, coords.coordinates.lat]);
              }
          } catch (e) {
              console.error("Failed to sync project coordinates natively.", e);
          } finally {
              setIsLoadingProject(false);
          }
      };
      fetchProject();
  }, [projectId]);

  // Transform Baseline data for layers
  const boundaryGeoJSON = baseline?.project_boundary
    ? {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: baseline.project_boundary,
          properties: { name: 'Project Boundary' },
        }],
      }
    : null;

  const hydrologyGeoJSON = baseline?.hydrology_data || null;

  // Handlers
  const runDispersion = async () => {
      setIsSimulating(true);
      setErrorMsg("");
      try {
          const res = await axiosInstance.get(`/projects/${projectId}/simulations/dispersion/`, {
              params: dispersionParams
          });
          if (res.data.error) setErrorMsg(res.data.error);
          else setDispersionData(res.data);
          
          setLayers(prev => ({...prev, dispersion: true}));
      } catch (e) {
          setErrorMsg("Failed to generate dispersion plume geometries.");
      }
      setIsSimulating(false);
  };

  const runFloodRisk = async () => {
      setIsSimulating(true);
      setErrorMsg("");
      try {
          const res = await axiosInstance.get(`/projects/${projectId}/simulations/flood/`);
          if (res.data.error) setErrorMsg(res.data.error);
          else setFloodData(res.data);

          setLayers(prev => ({...prev, flood: true}));
      } catch (e) {
          setErrorMsg("Failed to generate hydrological flood networks.");
      }
      setIsSimulating(false);
  };

  return (
    <div className="h-screen w-full relative flex overflow-hidden">
        
        {/* Full Screen Map Execution Canvas */}
       <div className="flex-1 h-full w-full absolute inset-0 z-0">
          {!isLoadingProject && (
              <MapProvider>
                  <BaseMap center={mapCenter} zoom={12} style="mapbox://styles/mapbox/satellite-v9">
                      
                      {/* Layer Control Top Right */}
                      <LayerControl layers={layers} setLayers={setLayers} />
                      
                      {/* Static Baseline Rings */}
                      <BufferRingsLayer center={mapCenter} />

                      {/* Baseline Environmental Layers */}
                      <ProjectBoundaryLayer 
                        boundaryGeoJSON={boundaryGeoJSON} 
                        isVisible={layers.boundary} 
                      />
                      
                      <NDVILayer 
                        ndvi_score={baseline?.satellite_data?.ndvi} 
                        center={mapCenter}
                        isVisible={layers.ndvi} 
                      />
                      
                      <HydrologyLayer 
                        hydrology_data={hydrologyGeoJSON} 
                        isVisible={layers.hydrology} 
                      />
                      
                      <BiodiversityLayer 
                        biodiversity_data={baseline?.biodiversity_data} 
                        center={mapCenter}
                        isVisible={layers.biodiversity} 
                      />
                      
                      <AirQualityLayer 
                        air_quality_baseline={baseline?.air_quality_baseline} 
                        center={mapCenter}
                        isVisible={layers.air_quality} 
                      />

                      {/* Dynamic Simulation Outputs */}
                      <DispersionLayer geoJSON={dispersionData} isVisible={layers.dispersion} />
                      <FloodLayer geoJSON={floodData} isVisible={layers.flood} />
                      
                  </BaseMap>
              </MapProvider>
          )}
          {isLoadingProject && (
              <div className="h-full w-full bg-slate-900 flex items-center justify-center">
                  <div className="text-white font-black animate-pulse">Initializing Geospatial Engine...</div>
              </div>
          )}
       </div>

       {/* Floating Sidebar Left */}
       <div className="absolute top-4 left-4 z-10 w-[380px] mt-12 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col pointer-events-auto max-h-[90vh]">
          
          {/* Header */}
          <div className="p-5 border-b border-gray-100">
               <h2 className="text-xl font-black text-gray-900 tracking-tight">GIS Simulations</h2>
               <p className="text-sm text-gray-500 mt-1">Real-time geospatial environmental bounding projections.</p>
          </div>

          {/* Toggles */}
          <div className="flex border-b border-gray-100">
              <button 
                  onClick={() => setActiveTab('dispersion')}
                  className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider ${activeTab === 'dispersion' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  Air Dispersion
              </button>
              <button 
                  onClick={() => setActiveTab('flood')}
                  className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider ${activeTab === 'flood' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  Flood Risk
              </button>
          </div>

          {/* Body Content */}
          <div className="p-6 flex-1 overflow-y-auto">
               
               {errorMsg && (
                   <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4 border border-red-100">
                       {errorMsg}
                   </div>
               )}

               {activeTab === 'dispersion' ? (
                   <div className="space-y-6">
                       
                       <div>
                           <div className="flex justify-between mb-1">
                               <label className="text-sm font-semibold text-gray-800">Emission Rate</label>
                               <span className="text-gray-500 text-sm font-mono">{dispersionParams.emission_rate} kg/h</span>
                           </div>
                           <input type="range" min="1" max="1000" step="10" 
                               value={dispersionParams.emission_rate}
                               onChange={e => setDispersionParams({...dispersionParams, emission_rate: e.target.value})}
                               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                           />
                       </div>

                       <div>
                           <div className="flex justify-between mb-1">
                               <label className="text-sm font-semibold text-gray-800">Wind Speed</label>
                               <span className="text-gray-500 text-sm font-mono">{dispersionParams.wind_speed} m/s</span>
                           </div>
                           <input type="range" min="0.1" max="20" step="0.5" 
                               value={dispersionParams.wind_speed}
                               onChange={e => setDispersionParams({...dispersionParams, wind_speed: e.target.value})}
                               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                           />
                       </div>

                       <div>
                           <div className="flex justify-between mb-1">
                               <label className="text-sm font-semibold text-gray-800">Wind Direction</label>
                               <span className="text-gray-500 text-sm font-mono">{dispersionParams.wind_direction}°</span>
                           </div>
                           <input type="range" min="0" max="360" step="5" 
                               value={dispersionParams.wind_direction}
                               onChange={e => setDispersionParams({...dispersionParams, wind_direction: e.target.value})}
                               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                           />
                       </div>

                       <div>
                           <label className="text-sm font-semibold text-gray-800 mb-1 block">Pasquill Stability Class</label>
                           <select 
                               value={dispersionParams.stability_class}
                               onChange={e => setDispersionParams({...dispersionParams, stability_class: e.target.value})}
                               className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 p-2 text-sm"
                           >
                               <option value="A">A - Very Unstable</option>
                               <option value="B">B - Moderately Unstable</option>
                               <option value="C">C - Slightly Unstable</option>
                               <option value="D">D - Neutral</option>
                               <option value="E">E - Slightly Stable</option>
                               <option value="F">F - Stable</option>
                           </select>
                       </div>

                       <div className="pt-2">
                           <button 
                               onClick={runDispersion}
                               disabled={isSimulating}
                               className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-md transition-colors"
                           >
                               {isSimulating ? 'Simulating Plume...' : 'Run Dispersion Simulation'}
                           </button>
                       </div>
                   </div>
               ) : (
                   <div className="space-y-6">
                       <p className="text-sm text-gray-600 leading-relaxed border-l-4 border-blue-200 pl-3">
                           Generates explicit convex bounds querying standard hydrological depths directly from local spatial elevation APIs simulating flooding constraints explicitly.
                       </p>
                       <div className="pt-4">
                           <button 
                               onClick={runFloodRisk}
                               disabled={isSimulating}
                               className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-md transition-colors"
                           >
                               {isSimulating ? 'Calculating Watersheds...' : 'Calculate Flood Risk Zones'}
                           </button>
                       </div>
                   </div>
               )}
           </div>

           {/* NEXT STAGE ACTION */}
           <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                <Link 
                    to={`/dashboard/projects/${projectId}/community`}
                    className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 px-4 rounded-xl flex items-center justify-between group transition-all shadow-lg active:scale-[0.98]"
                >
                    <div className="text-left">
                        <p className="text-[9px] uppercase tracking-widest opacity-60">Next Stage</p>
                        <p className="text-sm">Public Feedback</p>
                    </div>
                    <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                </Link>
           </div>
        </div>

    </div>
  );
}
