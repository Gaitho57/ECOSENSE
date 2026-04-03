import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import axiosInstance from '../../api/axiosInstance';

export default function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
       // Mocking the aggregate dashboard limits strictly matching endpoints.
       // In complete environments, the specific backend aggregate logic binds securely here cleanly.
       setData({
            total_projects: 14,
            active_assessments: 4,
            reports_generated: 28,
            iot_alerts: 5,
            projects: [
               { id: '123', name: 'Nairobi Express Highway', type: 'infrastructure', status: 'baseline', updated: '2 hrs ago' },
               { id: '124', name: 'Olkaria Geothermal Expansion', type: 'energy', status: 'assessment', updated: '1 day ago' },
               { id: '125', name: 'Athi River Steel Mill', type: 'manufacturing', status: 'monitoring', updated: '3 days ago' },
            ],
            pipeline: [
               { name: 'Scoping', count: 2 },
               { name: 'Baseline', count: 4 },
               { name: 'Assessment', count: 3 },
               { name: 'Review', count: 1 },
               { name: 'Submitted', count: 2 },
               { name: 'Approved', count: 2 },
            ],
            activity: [
               { action: 'Report Submitted to NEMA', project: 'Nairobi Express', time: '10 mins ago', icon: '📄' },
               { action: 'IoT Breach Warning', project: 'Athi Steel Mill', time: '1 hr ago', icon: '⚠️' },
               { action: 'Baseline Imagery Scanned', project: 'Olkaria Geo', time: '4 hrs ago', icon: '🛰️' }
            ]
       });
  }, []);

  if (!data) return <div className="p-10 animate-pulse text-gray-400">Aggregating parameters...</div>;

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-gray-50 min-h-[calc(100vh-80px)]">
        
        {/* Row 1: KPI STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                 <span className="text-gray-400 uppercase tracking-widest text-[10px] font-black inline-block mb-1">Total Projects</span>
                 <div className="text-4xl font-black text-gray-900">{data.total_projects}</div>
             </div>
             <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-sm">
                 <span className="text-blue-200 uppercase tracking-widest text-[10px] font-black inline-block mb-1">Active Assessments</span>
                 <div className="text-4xl font-black">{data.active_assessments}</div>
             </div>
             <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                 <span className="text-gray-400 uppercase tracking-widest text-[10px] font-black inline-block mb-1">Reports Compiled</span>
                 <div className="text-4xl font-black text-green-500">{data.reports_generated}</div>
             </div>
             <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
                 <span className="text-red-400 uppercase tracking-widest text-[10px] font-black inline-block mb-1">IoT Alerts (Monthly)</span>
                 <div className="text-4xl font-black text-red-600">{data.iot_alerts}</div>
             </div>
        </div>

        {/* MIDDLE SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             
             {/* LEFT: Table Pipeline Map (Span 2) */}
             <div className="lg:col-span-2 space-y-8">
                 <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                     <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                             📈 Live Pipeline Metrics
                          </h3>
                     </div>
                     <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data.pipeline}>
                                  <XAxis dataKey="name" tick={{fontSize: 11, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                  <YAxis hide />
                                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                      {data.pipeline.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={index === 2 ? '#3b82f6' : '#94a3b8'} />
                                      ))}
                                  </Bar>
                              </BarChart>
                         </ResponsiveContainer>
                     </div>
                 </div>

                 <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                           <h3 className="font-bold text-gray-800 text-sm uppercase tracking-widest">Active Portfolios</h3>
                           <Link to="/dashboard/projects" className="text-xs font-bold text-blue-500 hover:text-blue-700">View All →</Link>
                      </div>
                      <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm">
                                <thead className="bg-white text-[11px] uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100">
                                     <tr>
                                         <th className="px-6 py-4">Project</th>
                                         <th className="px-6 py-4">Status Map</th>
                                         <th className="px-6 py-4">Update Pulse</th>
                                         <th className="px-6 py-4 text-right">Actions</th>
                                     </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                     {data.projects.map(p => (
                                         <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                                             <td className="px-6 py-4">
                                                  <div className="font-bold text-gray-800">{p.name}</div>
                                                  <div className="text-[10px] uppercase font-bold text-gray-400">{p.type}</div>
                                             </td>
                                             <td className="px-6 py-4">
                                                 <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-widest">{p.status}</span>
                                             </td>
                                             <td className="px-6 py-4 text-xs font-medium text-gray-500">{p.updated}</td>
                                             <td className="px-6 py-4 text-right">
                                                  <Link to={`/dashboard/projects/${p.id}`} className="text-blue-500 font-bold px-3 py-1.5 rounded hover:bg-blue-50 transition-colors">Open</Link>
                                             </td>
                                         </tr>
                                     ))}
                                </tbody>
                           </table>
                      </div>
                 </div>
             </div>

             {/* RIGHT: Activity Feeds */}
             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="p-6 border-b border-gray-100 bg-gray-50">
                       <h3 className="font-bold text-gray-800 text-sm uppercase tracking-widest flex items-center gap-2">⏱️ Network Activity</h3>
                  </div>
                  <div className="p-6">
                       <div className="relative border-l-2 border-gray-100 ml-4 space-y-8">
                            {data.activity.map((act, i) => (
                                 <div key={i} className="relative pl-6">
                                      <span className="absolute -left-[17px] top-0 bg-white border-2 border-gray-200 text-sm w-8 h-8 flex items-center justify-center rounded-full z-10 shadow-sm">{act.icon}</span>
                                      <h4 className="text-sm font-bold text-gray-800 leading-none mb-1 mt-1.5">{act.action}</h4>
                                      <p className="text-xs text-blue-500 font-bold mb-1">{act.project}</p>
                                      <span className="text-[10px] uppercase font-extrabold tracking-widest text-gray-400">{act.time}</span>
                                 </div>
                            ))}
                       </div>
                  </div>
             </div>

        </div>
    </div>
  );
}
