import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBaseline, useGenerateBaseline, useTaskStatus } from '../../hooks/useBaseline';

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

export default function BaselinePage() {
  const { projectId = 'placeholder-id' } = useParams(); // Should come from router typically

  // Data fetching
  const { data: baseline, isLoading: isLoadingBaseline, refetch } = useBaseline(projectId);
  const generateMutation = useGenerateBaseline(projectId);
  
  // Local state
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [mapCenter, setMapCenter] = useState([36.8219, -1.2921]); // Nairobi default
  
  // Layer visibility state
  const [layers, setLayers] = useState({
    satellite: true, // Base map style actually, but keeping in logical object
    ndvi: true,
    hydrology: true,
    biodiversity: false,
    air_quality: false,
    boundary: true
  });

  // Task execution polling
  const { data: taskStatus } = useTaskStatus(activeTaskId);

  useEffect(() => {
    // If the task completes via checking Celery, clear standard polling and refetch actual record
    if (taskStatus && (taskStatus.status === 'complete' || taskStatus.status === 'SUCCESS')) {
      setActiveTaskId(null);
      refetch();
    }
  }, [taskStatus, refetch]);

  const handleGenerate = () => {
    generateMutation.mutate(undefined, {
      onSuccess: (res) => {
        if (res.task_id) setActiveTaskId(res.task_id);
      }
    });
  };

  const isGenerating = !!activeTaskId || generateMutation.isPending;

  // Render logic components

  if (isLoadingBaseline && !isGenerating && !baseline) {
    return <div className="p-8 text-center text-gray-500">Loading project data...</div>;
  }

  // State: Baseline hasn't started natively
  if (!baseline && !isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50 min-h-screen">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-lg border border-gray-100">
          <div className="text-4xl mb-4">🌍</div>
          <h2 className="text-xl font-bold text-gray-800">No Baseline Generated</h2>
          <p className="text-gray-500 mt-2 mb-6">Aggregate planetary data, satellite health metrics, and soil compositions remotely to establish impact bounds.</p>
          <button 
            onClick={handleGenerate}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Generate Baseline Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      
      {/* Header element */}
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Nairobi Expressway Expansion</h1>
          <p className="text-sm text-gray-500">Project Baseline Dashboard</p>
        </div>
        
        {baseline && !isGenerating && (
          <button 
            onClick={handleGenerate}
            className="text-sm font-medium text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors"
          >
            Regenerate API Data
          </button>
        )}
      </div>

      {isGenerating && (
         <div className="bg-blue-50 border-b border-blue-100 p-3 text-center shrink-0 shadow-inner">
            <span className="inline-flex items-center space-x-2 text-sm text-blue-800 font-medium tracking-wide">
              <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{taskStatus?.status === 'running' ? 'Analysing geospatial bounds... Please wait.' : 'Fetching automated satellite data...'}</span>
            </span>
         </div>
      )}

      {/* Main Content Area (60/40 Split natively mapping stacked grids for mobile) */}
      <div className={`flex flex-col lg:flex-row flex-1 overflow-hidden transition-opacity duration-500 ${isGenerating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Left Side: Map Container (60%) */}
        <div className="lg:w-3/5 h-1/2 lg:h-full relative border-r border-gray-200">
          <MapProvider>
            <BaseMap center={mapCenter} zoom={13}>
              
              <LayerControl layers={layers} setLayers={setLayers} />
              
              {baseline && (
                <>
                  <ProjectBoundaryLayer boundaryGeoJSON={null} isVisible={layers.boundary} />
                  
                  <NDVILayer 
                    ndvi_score={baseline.satellite_data?.ndvi} 
                    center={mapCenter}
                    isVisible={layers.ndvi} 
                  />
                  
                  <HydrologyLayer 
                    hydrology_data={baseline.hydrology_data} 
                    isVisible={layers.hydrology} 
                  />
                  
                  <BiodiversityLayer 
                    biodiversity_data={baseline.biodiversity_data} 
                    center={mapCenter}
                    isVisible={layers.biodiversity} 
                  />
                  
                  <AirQualityLayer 
                    air_quality_baseline={baseline.air_quality_baseline} 
                    center={mapCenter}
                    isVisible={layers.air_quality} 
                  />
                </>
              )}

            </BaseMap>
          </MapProvider>
        </div>

        {/* Right Side: Data Panel (40%) */}
        <div className="lg:w-2/5 h-1/2 lg:h-full overflow-y-auto bg-gray-50 flex flex-col items-center">
            <div className="w-full h-full max-w-2xl pt-2">
                <BaselineSummaryCards baseline={baseline} isLoading={isGenerating || isLoadingBaseline} />
            </div>
        </div>

      </div>
    </div>
  );
}
