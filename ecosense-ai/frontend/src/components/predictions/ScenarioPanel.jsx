import React, { useState } from 'react';
import axiosInstance from '../../api/axiosInstance';

const AVAILABLE_MITIGATIONS = [
  { id: 'dust_suppression', label: 'Dust Suppression Protocols', desc: 'Water tankers and structural covers lowering particulate limits natively.' },
  { id: 'silt_traps', label: 'Silt Traps & Drainage', desc: 'Filtration bounding construction runoff protecting local water proximity flows.' },
  { id: 'noise_barriers', label: 'Acoustic Sound Barriers', desc: 'Temporary boundary walls deflecting high decibel outputs from operations.' },
  { id: 'revegetation', label: 'Native Revegetation Offsets', desc: 'Strategic replanting restoring biodiversity thresholds enforcing carbon offsets.' },
  { id: 'community_consultation', label: 'Community Consultations', desc: 'Engagement dialogues resolving localized social displacement frictions.' }
];

const SEV_RANKS = {"low": 1, "medium": 2, "high": 3, "critical": 4};

export default function ScenarioPanel({ projectId, basePredictions, onRunScenario, isRunning }) {
  const [selectedMitigations, setSelectedMitigations] = useState([]);
  const [dynamicMitigations, setDynamicMitigations] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mitigatePredictions, setMitigatePredictions] = useState(null); // Local state if we want to show immediately, but we rely on API 

  const handleToggle = (id) => {
      setSelectedMitigations(prev => 
          prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
      );
  };

  const handleRun = () => {
       if (onRunScenario) {
            onRunScenario(selectedMitigations);
       }
  };

  const handleSuggestAI = async () => {
       setIsGenerating(true);
       try {
           const res = await axiosInstance.get(`/projects/${projectId}/ai-mitigations/`);
           setDynamicMitigations(res.data.data);
       } catch (e) {
           console.error("AI Suggestion failed", e);
       }
       setIsGenerating(false);
  };

  const allMitigations = [...AVAILABLE_MITIGATIONS, ...dynamicMitigations];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[400px]">
       <div className="flex justify-between items-start mb-4">
           <div>
               <h3 className="text-xl font-bold text-gray-800">Scenario Builder</h3>
               <p className="text-sm text-gray-500 mt-1">Select structural mitigations simulating impact reductions interactively.</p>
           </div>
           <button 
                onClick={handleRun}
                disabled={isRunning || selectedMitigations.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm"
           >
               {isRunning ? 'Calculating...' : 'Run Scenario'}
           </button>
       </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 mb-4">
           {allMitigations.map(mit => (
                <div 
                    key={mit.id} 
                    onClick={() => handleToggle(mit.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors flex gap-3
                        ${selectedMitigations.includes(mit.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300 bg-gray-50'}
                        ${mit.is_ai_generated ? 'border-dashed' : ''}
                    `}
                >
                    <div className="relative">
                        <input 
                            type="checkbox" 
                            readOnly
                            checked={selectedMitigations.includes(mit.id)}
                            className="form-checkbox mt-1 h-4 w-4 text-blue-600 rounded" 
                        />
                        {mit.is_ai_generated && (
                            <span className="absolute -top-3 -left-3 text-[10px] bg-purple-600 text-white px-1 rounded-sm font-bold shadow-sm">AI</span>
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800">{mit.label}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{mit.desc}</p>
                    </div>
                </div>
           ))}
        </div>

        <button 
            onClick={handleSuggestAI}
            disabled={isGenerating || isRunning}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-[0.98]"
        >
            {isGenerating ? (
                <>
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-b-transparent rounded-full"></div>
                    Generating AI Strategy...
                </>
            ) : (
                <>
                    <span className="text-lg">💡</span>
                    Generate AI Mitigation Strategy
                </>
            )}
        </button>
    </div>
  );
}
