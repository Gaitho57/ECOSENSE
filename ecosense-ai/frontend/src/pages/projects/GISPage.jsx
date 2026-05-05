import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useBaseline } from '../../hooks/useBaseline';
import { useMap } from '../../components/maps/MapContext';
import BaseMap from '../../components/maps/BaseMap';
import LayerControl from '../../components/maps/LayerControl';
import L from 'leaflet';
import * as turf from '@turf/turf'; 

// Simulation Layers
import DispersionLayer from '../../components/maps/layers/DispersionLayer';
import FloodLayer from '../../components/maps/layers/FloodLayer';

// Baseline Layers - Natively integrating environmental bounds
import NDVILayer from '../../components/maps/layers/NDVILayer';
import HydrologyLayer from '../../components/maps/layers/HydrologyLayer';
import BiodiversityLayer from '../../components/maps/layers/BiodiversityLayer';
import AirQualityLayer from '../../components/maps/layers/AirQualityLayer';
import ProjectBoundaryLayer from '../../components/maps/layers/ProjectBoundaryLayer';
import ProtectedAreaLayer from '../../components/maps/layers/ProtectedAreaLayer';
import WaterTowerLayer from '../../components/maps/layers/WaterTowerLayer';
import SettlementLayer from '../../components/maps/layers/SettlementLayer';

import { Marker, Popup, Circle } from 'react-leaflet';

function ProjectCenterMarker({ center }) {
  const { map, isLeaflet, isMapLibre } = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !center || !isMapLibre) return;
    
    if (!markerRef.current) {
        // @ts-ignore
        markerRef.current = new window.maplibregl.Marker({ color: "#FF0000" })
            .setLngLat(center)
            .setPopup(new window.maplibregl.Popup().setHTML("<b>Project Center</b>"))
            .addTo(map);
    } else {
        markerRef.current.setLngLat(center);
    }

    return () => {
        if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }
    };
  }, [map, center, isMapLibre]);

  if (isLeaflet && center) {
    const icon = L.divIcon({
        html: '<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(239, 68, 68, 0.6); position: relative;"><div style="position: absolute; top: -25px; left: -20px; background: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 900; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">SITE CENTER</div></div>',
        className: 'project-center-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    return (
        <Marker position={[center[1], center[0]]} icon={icon}>
            <Popup><b>Project Center</b></Popup>
        </Marker>
    );
  }

  return null;
}

function BufferRingsLayer({ center }) {
  const { map, isLeaflet, isMapLibre } = useMap();

  useEffect(() => {
    if (!map || !center || !isMapLibre) return;
    if (!map.isStyleLoaded()) return;

    const sourceId = 'buffer-rings';
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
        if (map && map.getStyle()) {
            if (map.getLayer('buffer-rings-line')) map.removeLayer('buffer-rings-line');
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
    };
  }, [map, center, isMapLibre]);

  if (isLeaflet && center) {
    return (
        <>
            <Circle 
                center={[center[1], center[0]]}
                radius={500}
                pathOptions={{ color: '#FFFFFF', weight: 1.5, dashArray: '5, 5', fill: false, opacity: 0.7 }}
            />
            <Circle 
                center={[center[1], center[0]]}
                radius={2000}
                pathOptions={{ color: '#FFFFFF', weight: 1.5, dashArray: '5, 5', fill: false, opacity: 0.7 }}
            />
        </>
    );
  }

  return null;
}

export default function GISPage() {
  const { projectId } = useParams();
  const [mapCenter, setMapCenter] = useState([36.8219, -1.2921]); // Default to Nairobi
  const [projectData, setProjectData] = useState(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  
  const { data: baseline, isLoading: isLoadingBaseline } = useBaseline(projectId);

  const [activeTab, setActiveTab] = useState('dispersion');
  const [dispersionParams, setDispersionParams] = useState({
      emission_rate: 100,
      wind_speed: 4,
      wind_direction: 90,
      stability_class: 'D'
  });
  const [dispersionData, setDispersionData] = useState(null);
  const [floodData, setFloodData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [layers, setLayers] = useState({
      dispersion: true,
      flood: true,
      ndvi: true,
      hydrology: true,
      biodiversity: true,
      air_quality: true,
      boundary: true,
      protected_areas: true,
      water_towers: true,
      settlements: true
  });

  const fetchProject = async () => {
    try {
        const res = await axiosInstance.get(`/projects/${projectId}/`);
        const p = res.data.data;
        setProjectData(p);
        if (p && p.coordinates) {
            setMapCenter([p.coordinates.lng, p.coordinates.lat]);
        }
    } catch (e) {
        console.error("Failed to sync project coordinates natively.", e);
    } finally {
        setIsLoadingProject(false);
    }
  };

  useEffect(() => {
      fetchProject();
  }, [projectId]);

  // Force sync map to project coordinates once loaded
  useEffect(() => {
      if (projectData?.coordinates?.lng && projectData?.coordinates?.lat) {
          setMapCenter([projectData.coordinates.lng, projectData.coordinates.lat]);
      }
  }, [projectData]);

  const snapToProject = () => {
    if (projectData?.coordinates?.lng && projectData?.coordinates?.lat) {
        setMapCenter([projectData.coordinates.lng, projectData.coordinates.lat]);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
        const { longitude, latitude } = position.coords;
        setMapCenter([longitude, latitude]);
    }, (err) => {
        console.error("Geolocation error:", err);
        alert("Failed to get your current location.");
    });
  };

  const handleUpdateProjectLocation = async () => {
    if (!window.confirm("Set the current map center as the official project site location?")) return;
    setIsUpdatingLocation(true);
    try {
        await axiosInstance.patch(`/projects/${projectId}/`, {
            coordinates: { lng: mapCenter[0], lat: mapCenter[1] }
        });
        alert("✅ Project location updated successfully!");
        fetchProject();
    } catch (err) {
        console.error("Failed to update project location", err);
        alert("Error updating project location.");
    } finally {
        setIsUpdatingLocation(false);
    }
  };

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

  const runDispersion = async () => {
      setIsSimulating(true);
      setErrorMsg("");
      try {
          const res = await axiosInstance.get(`/projects/${projectId}/simulations/dispersion/`, {
              params: dispersionParams
          });
          if (res.data.error) {
              setErrorMsg(res.data.error);
          } else {
              setDispersionData(res.data);
              setLayers(prev => ({...prev, dispersion: true}));
          }
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
          if (res.data.error) {
              setErrorMsg(res.data.error);
          } else {
              setFloodData(res.data);
              setLayers(prev => ({...prev, flood: true}));
          }
      } catch (e) {
          setErrorMsg("Failed to generate hydrological flood networks.");
      }
      setIsSimulating(false);
  };

  return (
    <div className="h-screen w-full relative flex overflow-hidden">
        {/* Map Canvas */}
        <div className="flex-1 h-full w-full absolute inset-0 z-0">
          {!isLoadingProject && (
              <BaseMap center={mapCenter} zoom={14} onMove={(c) => setMapCenter(c)}>
                  <LayerControl layers={layers} setLayers={setLayers} />
                  <ProjectCenterMarker center={[projectData?.coordinates?.lng, projectData?.coordinates?.lat]} />
                  <BufferRingsLayer center={[projectData?.coordinates?.lng, projectData?.coordinates?.lat]} />

                  <ProjectBoundaryLayer boundaryGeoJSON={boundaryGeoJSON} isVisible={layers.boundary} />
                  <NDVILayer ndvi_score={baseline?.satellite_data?.ndvi} ndvi_tile_url={baseline?.satellite_data?.ndvi_tile_url} center={mapCenter} isVisible={layers.ndvi} />
                  <HydrologyLayer hydrology_data={baseline?.hydrology_data} isVisible={layers.hydrology} />
                  <BiodiversityLayer biodiversity_data={baseline?.biodiversity_data} center={mapCenter} isVisible={layers.biodiversity} />
                  <AirQualityLayer air_quality_baseline={baseline?.air_quality_baseline} center={mapCenter} isVisible={layers.air_quality} />
                  <ProtectedAreaLayer protected_areas={baseline?.satellite_data?.protected_area_status?.areas} isVisible={layers.protected_areas} />
                  <WaterTowerLayer proximity_data={baseline?.satellite_data?.water_tower_proximity} isVisible={layers.water_towers} />
                  <SettlementLayer settlement_data={baseline?.satellite_data?.settlement_geometries} isVisible={layers.settlements} />

                  <DispersionLayer geoJSON={dispersionData} isVisible={layers.dispersion} />
                  <FloodLayer geoJSON={floodData} isVisible={layers.flood} />
              </BaseMap>
          )}
          {isLoadingProject && (
              <div className="h-full w-full bg-slate-900 flex items-center justify-center">
                  <div className="text-white font-black animate-pulse">Initializing Geospatial Engine...</div>
              </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="absolute top-4 left-4 z-10 w-[380px] mt-12 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col pointer-events-auto max-h-[90vh]">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
               <div>
                 <h2 className="text-xl font-black text-gray-900 tracking-tight">GIS Simulations</h2>
                 <p className="text-sm text-gray-500 mt-1">Real-time geospatial projections.</p>
               </div>
               <div className="flex gap-2">
                 <button onClick={handleLocateMe} title="Find my location" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                   📍
                 </button>
                 <button onClick={snapToProject} title="Snap to Project Site" className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors">
                   🎯
                 </button>
                 <button 
                  onClick={() => setMapCenter([36.9741, -1.4678])} 
                  title="Teleport to Athi River (Recovery)" 
                  className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                 >
                   🇰🇪
                 </button>
                 <button 
                  onClick={handleUpdateProjectLocation} 
                  disabled={isUpdatingLocation}
                  title="Update Project Center to current view" 
                  className={`p-2 rounded-lg transition-colors ${isUpdatingLocation ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                 >
                   📍+
                 </button>
               </div>
          </div>

          <div className="flex border-b border-gray-100">
               <button onClick={() => setActiveTab('dispersion')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dispersion' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-400 hover:text-gray-600'}`}>
                   Air Dispersion
               </button>
               <button onClick={() => setActiveTab('flood')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'flood' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-400 hover:text-gray-600'}`}>
                   Flood Risk
               </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar">
              {activeTab === 'dispersion' && (
                  <div className="space-y-6">
                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Emission Rate</label>
                              <span className="text-sm font-black text-blue-600">{dispersionParams.emission_rate} kg/h</span>
                          </div>
                          <input type="range" min="1" max="500" value={dispersionParams.emission_rate} onChange={(e) => setDispersionParams({...dispersionParams, emission_rate: parseInt(e.target.value)})} className="w-full accent-blue-600 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer" />
                      </div>

                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Wind Speed</label>
                              <span className="text-sm font-black text-blue-600">{dispersionParams.wind_speed} m/s</span>
                          </div>
                          <input type="range" min="0.5" max="25" step="0.5" value={dispersionParams.wind_speed} onChange={(e) => setDispersionParams({...dispersionParams, wind_speed: parseFloat(e.target.value)})} className="w-full accent-blue-600 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer" />
                      </div>

                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Wind Direction</label>
                              <span className="text-sm font-black text-blue-600">{dispersionParams.wind_direction}°</span>
                          </div>
                          <input type="range" min="0" max="360" value={dispersionParams.wind_direction} onChange={(e) => setDispersionParams({...dispersionParams, wind_direction: parseInt(e.target.value)})} className="w-full accent-blue-600 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer" />
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pasquill Stability Class</label>
                          <select value={dispersionParams.stability_class} onChange={(e) => setDispersionParams({...dispersionParams, stability_class: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                              <option value="A">A - Very Unstable</option>
                              <option value="B">B - Unstable</option>
                              <option value="C">C - Slightly Unstable</option>
                              <option value="D">D - Neutral</option>
                              <option value="E">E - Slightly Stable</option>
                              <option value="F">F - Stable</option>
                          </select>
                      </div>

                      <button onClick={runDispersion} disabled={isSimulating} className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                          {isSimulating ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Simulating...</>
                          ) : "Run Dispersion Simulation"}
                      </button>
                  </div>
              )}

              {activeTab === 'flood' && (
                  <div className="space-y-6">
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                          <p className="text-xs text-blue-700 font-medium leading-relaxed">
                              This simulation uses high-resolution SRTM digital elevation models to predict flood inundation pathways based on the project's local topography.
                          </p>
                      </div>
                      <button onClick={runFloodRisk} disabled={isSimulating} className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                           {isSimulating ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                          ) : "Analyze Flood Pathways"}
                      </button>
                  </div>
              )}

              {errorMsg && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                      <p className="text-xs text-red-600 font-bold tracking-tight">⚠️ {errorMsg}</p>
                  </div>
              )}
          </div>
          
          <div className="p-4 mt-auto border-t border-gray-100 bg-slate-900 rounded-b-xl">
               <Link to={`/dashboard/projects/${projectId}`} className="flex items-center justify-between group">
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Next Stage</p>
                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Public Feedback</p>
                    </div>
                    <span className="text-white group-hover:translate-x-1 transition-transform">→</span>
               </Link>
          </div>
        </div>
    </div>
  );
}
