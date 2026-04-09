import React, { useState } from 'react';

export default function ImpactMatrix({ predictions }) {
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  // Setup grid data
  const categories = [
    { id: 'air', label: 'Air Quality', icon: '💨' },
    { id: 'water', label: 'Water/Hydrology', icon: '💧' },
    { id: 'noise', label: 'Noise Pollution', icon: '🔊' },
    { id: 'biodiversity', label: 'Biodiversity', icon: '🦜' },
    { id: 'social', label: 'Social/Community', icon: '👥' },
    { id: 'soil', label: 'Soil/Erosion', icon: '🌍' },
    { id: 'climate', label: 'Climate Emissions', icon: '🌡️' }
  ];

  const levels = [
    { id: 'low', label: 'LOW', bg: 'bg-green-100', bgActive: 'bg-green-500 text-white', border: 'border-green-200' },
    { id: 'medium', label: 'MEDIUM', bg: 'bg-yellow-100', bgActive: 'bg-yellow-500 text-white', border: 'border-yellow-200' },
    { id: 'high', label: 'HIGH', bg: 'bg-orange-100', bgActive: 'bg-orange-500 text-white', border: 'border-orange-200' },
    { id: 'critical', label: 'CRITICAL', bg: 'bg-red-100', bgActive: 'bg-red-600 text-white', border: 'border-red-200' }
  ];

  // Helper func
  const getPrediction = (catId) => {
    return predictions.find(p => p.category === catId);
  };

  return (
    <div className="flex relative">
      <div className={`flex-1 transition-all duration-300 ${selectedPrediction ? 'mr-[350px]' : ''}`}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-4 px-6 font-semibold text-gray-600 uppercase tracking-wider">Impact Vector</th>
                {levels.map(level => (
                  <th key={level.id} className="py-4 px-4 font-bold text-center text-gray-600 uppercase tracking-wider">{level.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => {
                const pred = getPrediction(cat.id);
                const activeLevel = pred ? pred.severity : null;
                const probability = pred ? (pred.probability * 100).toFixed(1) : 0;

                return (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-800 flex items-center space-x-3">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </td>
                    
                    {levels.map(level => {
                        const isActive = activeLevel === level.id;
                        return (
                          <td 
                            key={level.id} 
                            onClick={() => isActive && setSelectedPrediction(pred)}
                            className={`py-3 px-2 text-center cursor-pointer`}
                          >
                            <div className={`
                                py-3 px-2 rounded-lg border flex flex-col justify-center transition-colors
                                ${isActive ? level.bgActive + ' shadow-md scale-105' : 'bg-gray-50 border-gray-100 text-gray-400'}
                            `}>
                               {isActive ? (
                                   <>
                                      <span className="text-lg font-black">{probability}%</span>
                                      <span className="text-[10px] uppercase opacity-90 tracking-wide mt-1">Predicted</span>
                                   </>
                               ) : (
                                   <span className="text-gray-300 font-medium">-</span>
                               )}
                            </div>
                          </td>
                        );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Drawer */}
      <div className={`absolute top-0 right-0 w-[330px] h-full bg-white border-l border-gray-200 shadow-xl transition-transform duration-300 transform ${selectedPrediction ? 'translate-x-0' : 'translate-x-full border-none shadow-none'} overflow-y-auto`}>
         {selectedPrediction && (
             <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                   <h3 className="text-lg font-bold text-gray-900 capitalize flex items-center gap-2">
                       {categories.find(c => c.id === selectedPrediction.category)?.icon}
                       {selectedPrediction.category} Impact
                   </h3>
                   <button onClick={() => setSelectedPrediction(null)} className="text-gray-400 hover:text-gray-700 font-bold p-1">✕</button>
                </div>
                
                <div className="mb-6">
                   <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Severity Level</p>
                   <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${levels.find(l => l.id === selectedPrediction.severity)?.bg} text-gray-800 border ${levels.find(l => l.id === selectedPrediction.severity)?.border}`}>
                       {selectedPrediction.severity}
                   </span>
                </div>

                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm text-gray-700 leading-relaxed italic">
                   "{selectedPrediction.description}"
                </div>

                 <div className="mb-6 space-y-4">
                    <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-gray-500 uppercase">Pre-Mitigation Score</span>
                            <span className="text-red-600 font-black">{selectedPrediction.significance_score}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min((selectedPrediction.significance_score / 20) * 100, 100)}%` }}></div>
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-gray-500 uppercase">Post-Mitigation Score</span>
                            <span className="text-green-600 font-black">{selectedPrediction.mitigated_score || (selectedPrediction.significance_score * 0.4).toFixed(1)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(((selectedPrediction.mitigated_score || selectedPrediction.significance_score * 0.4) / 20) * 100, 100)}%` }}></div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                         <span className="text-[10px] font-black text-blue-600 uppercase">Impact Reduction</span>
                         <span className="text-sm font-black text-blue-700">-{selectedPrediction.impact_reduction || (selectedPrediction.significance_score * 0.6).toFixed(1)} pts</span>
                    </div>
                 </div>

                <div>
                   <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Mitigation Suggestions</p>
                   <ul className="space-y-3">
                       {(selectedPrediction.mitigation_suggestions || []).map((mitigation, idx) => (
                           <li key={idx} className="flex items-start text-sm text-gray-700 border-l-2 border-green-500 pl-3 py-1 bg-green-50 rounded-r-md">
                               {mitigation}
                           </li>
                       ))}
                   </ul>
                </div>
             </div>
         )}
      </div>
    </div>
  );
}
