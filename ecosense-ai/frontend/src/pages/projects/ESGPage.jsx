import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { RadialBarChart, RadialBar, Tooltip, Legend, ResponsiveContainer, PolarAngleAxis } from 'recharts';

export default function ESGPage() {
  const { projectId = 'placeholder-id' } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
       const loadData = async () => {
            setIsLoading(true);
            try {
                const res = await axiosInstance.get(`/esg/${projectId}/dashboard/`);
                setData(res.data.data);
            } catch (e) {
                console.error("ESG Array logic missing bound dynamically fetching EVM blocks.");
            }
            setIsLoading(false);
       };
       loadData();
  }, [projectId]);

  if (isLoading) return <div className="p-10 text-center animate-pulse text-gray-500 font-bold uppercase tracking-widest">Compiling Polygon Arrays...</div>;
  if (!data) return <div className="p-10 text-center text-red-500">Failed gathering ESG Execution nodes securely natively.</div>;

  const { score, audits } = data;

  const getGradeColor = (grade) => {
       if (grade === 'A') return 'text-green-700 bg-green-100 border-green-300';
       if (grade === 'B') return 'text-green-500 bg-green-50 border-green-200';
       if (grade === 'C') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
       if (grade === 'D') return 'text-orange-600 bg-orange-50 border-orange-200';
       return 'text-red-700 bg-red-100 border-red-300';
  };

  const getGaugeColor = (val) => {
       if (val >= 80) return '#22c55e';
       if (val >= 60) return '#eab308';
       return '#ef4444';
  };

  const gaugeData = [
       { name: 'Governance', value: score.governance, fill: getGaugeColor(score.governance) },
       { name: 'Social', value: score.social, fill: getGaugeColor(score.social) },
       { name: 'Environmental', value: score.environmental, fill: getGaugeColor(score.environmental) }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10 space-y-8">
       
       <div className="flex justify-between items-end border-b border-gray-200 pb-6 mb-6">
           <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ESG Performance Index</h1>
               <p className="text-gray-500 mt-1 max-w-3xl">Decentralized mapping structuring environmental footprints against Web3 public legers generating cryptographic verification bounds cleanly.</p>
           </div>
           
           <button 
               disabled={score.overall < 70}
               className="bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md"
           >
               {score.overall < 70 ? 'Certificate Locked (requires C+)' : 'Download ESG Certificate'}
           </button>
       </div>

       {/* Top Grade Display */}
       <div className="flex justify-center mb-10">
            <div className={`p-10 rounded-[3rem] border-4 shadow-sm flex flex-col items-center justify-center min-w-[280px] ${getGradeColor(score.grade)}`}>
                 <span className="text-sm uppercase font-black tracking-widest mb-2 opacity-80">Overall ESG Grade</span>
                 <span className="text-8xl font-black leading-none">{score.grade}</span>
                 <span className="text-2xl font-bold mt-4 opacity-90">{score.overall}% Rating</span>
            </div>
       </div>

       {/* Row 1: Extracted Radial Gauges natively rendering explicit structures seamlessly */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Environmental', 'Social', 'Governance'].map(cat => {
                 const val = score[cat.toLowerCase()];
                 return (
                     <div key={cat} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                          <h3 className="text-sm font-bold text-gray-400 tracking-widest uppercase mb-4">{cat} Pillar</h3>
                          <div className="w-48 h-48 relative">
                               <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart 
                                         cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" 
                                         barSize={16} data={[{name: cat, value: val, fill: getGaugeColor(val)}]}
                                         startAngle={180} endAngle={0}
                                    >
                                         <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                         <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={10} />
                                    </RadialBarChart>
                               </ResponsiveContainer>
                               <div className="absolute inset-0 flex items-center justify-center flex-col pt-12">
                                   <span className="text-3xl font-black text-gray-800">{val}%</span>
                               </div>
                          </div>
                     </div>
                 );
            })}
       </div>

       {/* Row 2: Secondary Attributes tracing blockchain mappings exactly  */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl flex items-center justify-between shadow-sm">
                 <div>
                      <h4 className="text-emerald-800 font-extrabold uppercase tracking-widest text-xs mb-1">Estimated Carbon Footprint</h4>
                      <div className="text-4xl font-black text-emerald-900">{score.carbon_estimate_tonnes} <span className="text-xl">Tonnes CO₂eq</span></div>
                 </div>
                 <div className="text-6xl opacity-80">🌳</div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-8 rounded-2xl flex items-center justify-between shadow-sm">
                 <div>
                      <h4 className="text-blue-800 font-extrabold uppercase tracking-widest text-xs mb-1">Cryptographic Audit Nodes</h4>
                      <div className="text-4xl font-black text-blue-900">{score.confirmed_audits} <span className="text-xl">Confirmed Tx</span></div>
                 </div>
                 <div className="text-6xl opacity-80">⛓️</div>
            </div>
       </div>

       {/* Row 3: Audit Table */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
            <div className="px-6 py-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800 uppercase tracking-widest text-sm">Immutable Web3 Execution Leger (Polygon Mumbai)</h3>
            </div>
            
            <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-white border-b border-gray-100 uppercase tracking-wider text-[11px] font-black text-gray-400">
                           <tr>
                               <th className="px-6 py-4">Event Trigger</th>
                               <th className="px-6 py-4">SHA-256 Data Integrity (Trun)</th>
                               <th className="px-6 py-4">Polygon TX Hash</th>
                               <th className="px-6 py-4">Timestamp Matrix</th>
                               <th className="px-6 py-4">Status</th>
                           </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                           {audits.length === 0 ? (
                               <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">No blockchain configurations extracted cleanly yet natively via execution loops.</td></tr>
                           ) : audits.map((a, i) => (
                               <tr key={i} className="hover:bg-gray-50 transition-colors">
                                   <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800">{a.event_type}</td>
                                   <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500 bg-gray-50 rounded">
                                        {a.data_hash.substring(0, 16)}...
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap">
                                        {a.tx_hash ? (
                                             <a href={`https://mumbai.polygonscan.com/tx/${a.tx_hash}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-mono text-xs font-bold">
                                                  {a.tx_hash.substring(0, 16)}...
                                             </a>
                                        ) : <span className="text-gray-400 italic font-mono text-xs">Awaiting Execution</span>}
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500">
                                        {new Date(a.timestamp).toLocaleString()}
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                             a.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                             a.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700 animate-pulse'
                                        }`}>
                                            {a.status}
                                        </span>
                                   </td>
                               </tr>
                           ))}
                      </tbody>
                 </table>
            </div>
       </div>

    </div>
  );
}
