import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function ImpactRadarChart({ basePredictions, mitigatePredictions }) {
  // Format Data for Recharts
  const categories = ["air", "water", "noise", "biodiversity", "social", "soil", "climate"];
  
  const mapData = categories.map(cat => {
      const basePred = basePredictions ? basePredictions.find(p => p.category === cat) : null;
      const mitPred = mitigatePredictions ? mitigatePredictions.find(p => p.category === cat) : null;
      
      return {
          subject: cat.charAt(0).toUpperCase() + cat.slice(1),
          Baseline: basePred ? Math.round(basePred.probability * 100) : 0,
          Mitigated: mitPred ? Math.round(mitPred.probability * 100) : null
      };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full h-[400px]">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Multivariate Probability Radar</h3>
      <p className="text-sm text-gray-500 mb-6">Compare impact scopes cumulatively spanning probabilities bounds mapping zero relative impact cleanly.</p>
      
      <div className="w-full relative min-h-[300px]" style={{ flex: '1 1 auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={mapData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 500 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              
              {/* Baseline Polygon (Red/Orange hue) */}
              <Radar 
                  name="Baseline Probability (%)" 
                  dataKey="Baseline" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.4} 
              />
              
              {/* Mitigated Polygon (Green hue) */}
              {mitigatePredictions && mitigatePredictions.length > 0 && (
                  <Radar 
                      name="Mitigated Scenario (%)" 
                      dataKey="Mitigated" 
                      stroke="#22c55e" 
                      fill="#22c55e" 
                      fillOpacity={0.6} 
                  />
              )}
              
              <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
            </RadarChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
}
