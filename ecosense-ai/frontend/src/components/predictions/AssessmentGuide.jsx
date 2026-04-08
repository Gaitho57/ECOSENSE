import React, { useState } from 'react';

export default function AssessmentGuide() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div className="mb-8">
        <button 
          onClick={() => setIsOpen(true)}
          className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          💡 How does the AI Impact Assessment work?
        </button>
      </div>
    );
  }

  return (
    <div className="mb-10 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-blue-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
      
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500 rounded-2xl text-2xl shadow-inner">🧠</div>
          <h2 className="text-2xl font-black tracking-tight">AI Impact Orchestration Guide</h2>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold border border-blue-500/30">1</span>
            <p className="text-sm font-black text-blue-400 uppercase tracking-widest">Data Context</p>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            The engine ingests your <span className="text-white">Site Baseline Data</span> and combines it with your project specific <span className="text-white">Project Variables</span>.
          </p>
        </div>

        <div className="space-y-3 border-l border-white/10 pl-8">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold border border-emerald-500/30">2</span>
            <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Impact Core</p>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            The <span className="text-white">EcoSense Intelligence Engine</span> predicts the potential for environmental impact across 7 key vectors using NEMA-aligned thresholds.
          </p>
        </div>

        <div className="space-y-3 border-l border-white/10 pl-8">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold border border-purple-500/30">3</span>
            <p className="text-sm font-black text-purple-400 uppercase tracking-widest">Scenario Builder</p>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            Simulate <span className="text-white italic">"What-If"</span> scenarios by applying mitigations. The AI recalculates the risk map in real-time to lower your final EIA project risk.
          </p>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3">
        <p className="text-[10px] uppercase font-bold text-white/40 tracking-[0.2em]">Powered by EcoSense Intelligence Model v1.02-stable</p>
      </div>
    </div>
  );
}
