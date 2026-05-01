import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import ImpactMatrix from '../../components/predictions/ImpactMatrix';
import ImpactRadarChart from '../../components/charts/ImpactRadarChart';
import ScenarioPanel from '../../components/predictions/ScenarioPanel';
import AssessmentGuide from '../../components/predictions/AssessmentGuide';

export default function PredictionsPage() {
  const { projectId = 'placeholder-id' } = useParams();
  
  const [basePredictions, setBasePredictions] = useState(null);
  const [scenarioPredictions, setScenarioPredictions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [lastScenarioName, setLastScenarioName] = useState(null);
  const [feedback, setFeedback] = useState("");

  // Loading predictions cleanly without complex react-query hooks specifically for this standalone map
  const loadPredictions = async (scenario = "baseline") => {
      try {
          const res = await axiosInstance.get(`/projects/${projectId}/predictions/?scenario=${scenario}`);
          if (res.data.data.length > 0) {
              if (scenario === "baseline") setBasePredictions(res.data.data);
              else setScenarioPredictions(res.data.data);
          }
      } catch (e) {
          console.error("Error loading predictions", e);
      }
      setIsLoading(false);
  };

  useEffect(() => {
      loadPredictions();
  }, [projectId]);

  // Polling logic for Tasks directly running locally mapped execution blocks
  useEffect(() => {
      let interval;
      if (activeTaskId) {
          interval = setInterval(async () => {
              try {
                  const res = await axiosInstance.get(`/tasks/${activeTaskId}/`);
                  if (res.data.data.status === 'complete' || res.data.data.status === 'SUCCESS') {
                      setActiveTaskId(null);
                      setFeedback("");
                      // Reload baseline and latest scenario structurally
                      loadPredictions("baseline");
                      // If it was a scenario run, load scenario output. 
                      if (lastScenarioName) {
                          loadPredictions(lastScenarioName);
                      }
                  } else if (res.data.data.status === 'failed' || res.data.data.status === 'FAILURE') {
                      setActiveTaskId(null);
                      setFeedback("Execution Failed. Check server logs.");
                  }
              } catch (e) {
                  clearInterval(interval);
              }
          }, 3000);
      }
      return () => clearInterval(interval);
  }, [activeTaskId, lastScenarioName]);

  const handleRunPrediction = async () => {
      setIsLoading(true);
      setFeedback("Initializing AI Impact Arrays...");
      try {
          const res = await axiosInstance.post(`/projects/${projectId}/run-prediction/`);
          setActiveTaskId(res.data.data.task_id);
      } catch (e) {
          setFeedback(e.response?.data?.error?.message || "Failed to trigger prediction parameters.");
          setIsLoading(false);
      }
  };

  const handleRunScenario = async (mitigations) => {
      setFeedback("Executing Parameter Reductions...");
      try {
          const sName = "mitigated_" + new Date().getTime();
          setLastScenarioName(sName);
          const res = await axiosInstance.post(`/projects/${projectId}/scenarios/`, {
              mitigations: mitigations,
              scenario_name: sName
          });
          setActiveTaskId(res.data.data.task_id);
          
      } catch (e) {
          setFeedback("Scenario initialization failed.");
      }
  };

  // Intermediate states natively checking
  if (isLoading && !activeTaskId) {
      if (!basePredictions) {
          loadPredictions(); // Force reload if empty triggering
      }
      return <div className="p-8 text-gray-500">Connecting to orchestration interfaces...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      
      {/* Header section */}
      <div className="flex justify-between items-center mb-8">
           <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight text-center lg:text-left">AI Impact Assessment</h1>
               <p className="text-gray-500 mt-1 max-w-2xl text-center lg:text-left">Multivariate execution paths converting structured mapping logic securely into probability matrices mapping exact mitigations thresholds.</p>
           </div>
           
           <div className="flex gap-4">
               <button 
                  disabled
                  className="bg-white border border-gray-300 text-gray-500 font-bold py-2 px-6 rounded-lg opacity-50 cursor-not-allowed"
               >
                   Export to Report
               </button>
               
               <button 
                  onClick={handleRunPrediction}
                  disabled={!!activeTaskId}
                  className="bg-gray-900 hover:bg-black text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md disabled:bg-gray-400"
               >
                   Run Baseline Predictions
               </button>
           </div>
      </div>

      {/* NEW: AI Assessment Guide */}
      <AssessmentGuide />

      {activeTaskId && (
          <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center justify-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-lg font-bold text-blue-800">{feedback || "AI Processing Output Execution Arrays..."}</p>
          </div>
      )}

      {feedback && !activeTaskId && !feedback.includes("Failed") && (
          <div className="mb-4 p-4 rounded bg-green-50 text-green-700 border border-green-200">
             Process Synchronised Safely.
          </div>
      )}

      {!basePredictions && !activeTaskId ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
               <div className="text-6xl mb-4 text-gray-300">📈</div>
               <h2 className="text-2xl font-bold text-gray-800">No Assessment Recorded</h2>
               <p className="text-gray-500 mt-2">Trigger the prediction orchestration mapping to evaluate ML layers internally.</p>
          </div>
      ) : basePredictions && (
          <div className="space-y-6">
              {/* Matrix Layout Width Maximized */}
              <div className="w-full">
                  <ImpactMatrix predictions={basePredictions} />
              </div>
              
              {/* Lower split configuration mapping Radar dynamically to Panel explicitly */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full pb-10">
                  <ImpactRadarChart 
                       basePredictions={basePredictions} 
                       mitigatePredictions={scenarioPredictions} 
                  />
                  <ScenarioPanel 
                       projectId={projectId}
                       basePredictions={basePredictions}
                       onRunScenario={handleRunScenario}
                       isRunning={!!activeTaskId}
                  />
              </div>

              {/* NEXT STAGE ACTION */}
              <div className="pt-6 pb-20 border-t border-gray-200">
                  <Link 
                      to={`/dashboard/projects/${projectId}/map`}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-8 rounded-2xl flex items-center justify-between group transition-all shadow-xl hover:shadow-2xl active:scale-[0.98]"
                  >
                      <div className="text-left">
                          <p className="text-[10px] uppercase tracking-widest opacity-60">Next Stage</p>
                          <p className="text-xl">Interactive GIS Mapping</p>
                      </div>
                      <div className="flex items-center gap-4">
                           <span className="text-sm opacity-60 font-medium hidden sm:block">Proceed to project spatial analysis</span>
                           <span className="text-3xl group-hover:translate-x-2 transition-transform">→</span>
                      </div>
                  </Link>
              </div>
          </div>
      )}

    </div>
  );
}
