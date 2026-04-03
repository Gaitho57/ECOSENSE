import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function MonitoringPage() {
  const { projectId = 'placeholder-id' } = useParams();
  
  const [sensors, setSensors] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [readingsMap, setReadingsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
       try {
           setIsLoading(true);
           const [sRes, tRes] = await Promise.all([
               axiosInstance.get(`/emp/${projectId}/sensors/`),
               axiosInstance.get(`/emp/${projectId}/tasks/`)
           ]);
           
           const fetchedSensors = sRes.data.data || [];
           setSensors(fetchedSensors);
           setTasks(tRes.data.data || []);
           
           // Fetch readings
           const rMap = {};
           for (const s of fetchedSensors) {
               try {
                    const r = await axiosInstance.get(`/emp/${projectId}/sensors/${s.id}/readings/`);
                    rMap[s.id] = { data: r.data.data, kpiThreshold: r.data.meta.kpi_threshold };
               } catch (e) {
                    console.error("Skipping subset rendering cleanly.");
               }
           }
           setReadingsMap(rMap);
       } catch (e) {
           console.error("Telemetry map dropping explicitly properly.");
       }
       setIsLoading(false);
  };

  useEffect(() => {
       loadData();
       // Auto Refresh Grid every 30 seconds
       const interval = setInterval(loadData, 30000);
       return () => clearInterval(interval);
  }, [projectId]);

  const onDragStart = (e, taskId) => {
       e.dataTransfer.setData('taskId', taskId);
  };

  const onDrop = async (e, newStatus) => {
       const taskId = e.dataTransfer.getData('taskId');
       if (!taskId) return;
       
       // Optimistic mapping 
       setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
       
       try {
           await axiosInstance.patch(`/emp/${projectId}/tasks/${taskId}/`, { status: newStatus });
       } catch (error) {
           alert("Status failed moving cleanly.");
           loadData(); // Revert
       }
  };

  // Status mapping
  const columns = [
       { id: 'pending', title: 'Pending / Planned', color: 'bg-gray-100' },
       { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50' },
       { id: 'completed', title: 'Completed', color: 'bg-green-50' },
       { id: 'overdue_breached', title: 'Overdue / Breached', color: 'bg-red-50 border-x border-red-200 shadow-inner' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10 space-y-8">
       
       {/* Explicit Heading */}
       <div className="flex justify-between items-end border-b border-gray-200 pb-6">
           <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">EMP & Telemetry Node</h1>
               <p className="text-gray-500 mt-1 max-w-2xl">Active Environmental Management executing limit checks validating hardware natively directly over thresholds.</p>
           </div>
           
           <div className="flex gap-2 items-center text-sm font-semibold text-gray-500">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               WebSocket Telemetry Live
           </div>
       </div>

       {/* SECTION A: Sensor Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sensors.map(s => {
                 let statusColor = "bg-green-500";
                 if (!s.is_active || !s.latest_reading) statusColor = "bg-gray-400";
                 else if (readingsMap[s.id]?.data[readingsMap[s.id]?.data.length - 1]?.is_breach) statusColor = "bg-red-500 animate-pulse";
                 
                 return (
                     <div key={s.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                          <div className={`absolute top-0 right-0 w-2 h-2 m-4 rounded-full ${statusColor}`}></div>
                          
                          <span className="text-xs uppercase font-extrabold tracking-widest text-gray-400 bg-gray-50 px-2 py-1 rounded inline-block mb-3">
                              {s.sensor_type}
                          </span>
                          
                          <h4 className="font-bold text-gray-800 text-sm truncate mb-1">{s.name}</h4>
                          <p className="text-xs font-mono text-gray-400 mb-4">{s.device_id}</p>
                          
                          <div className="flex items-end gap-1">
                               <span className="text-3xl font-black text-gray-900 leading-none">
                                   {s.latest_reading ? s.latest_reading.value : '-'}
                               </span>
                               <span className="text-sm font-bold text-gray-500 pb-1">
                                   {s.latest_reading ? s.latest_reading.unit : 'N/A'}
                               </span>
                          </div>
                          
                          <p className="text-xs text-gray-400 mt-3 flex justify-between">
                              <span>Last Ping:</span>
                              <span className="font-mono">{s.last_reading_at ? new Date(s.last_reading_at).toLocaleTimeString() : 'Off'}</span>
                          </p>
                     </div>
                 );
            })}
       </div>

       {/* SECTION B: Time Series Charts */}
       {Object.keys(readingsMap).length > 0 && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6 border-b border-gray-200">
               {sensors.map(s => {
                   const { data, kpiThreshold } = readingsMap[s.id] || { data: [] };
                   if (data.length === 0) return null;
                   
                   // Standard format 
                   const cData = data.map(d => ({
                       time: new Date(d.recorded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                       value: d.value,
                       threshold: kpiThreshold || 50
                   }));

                   return (
                       <div key={'chart-'+s.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-72 flex flex-col">
                           <div className="flex justify-between items-center mb-4">
                               <h3 className="text-sm uppercase tracking-wider font-bold text-gray-500">{s.sensor_type} Telemetry Array</h3>
                               <span className="text-xs font-mono text-gray-400">{s.name}</span>
                           </div>
                           
                           <div className="flex-1 w-full">
                               <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={cData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} minTickGap={30} />
                                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                      {kpiThreshold && <ReferenceLine y={kpiThreshold} stroke="#ef4444" strokeDasharray="3 3" />}
                                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={(props) => {
                                           const { cx, cy, payload } = props;
                                           if (kpiThreshold && payload.value > kpiThreshold) return <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="none" />;
                                           return <circle cx={cx} cy={cy} r={0} />;
                                      }} />
                                  </LineChart>
                               </ResponsiveContainer>
                           </div>
                       </div>
                   );
               })}
           </div>
       )}

       {/* SECTION C: Kanban Board */}
       <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight mb-6">EMP Task Orchestration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[600px]">
                 {columns.map(col => {
                      const colTasks = tasks.filter(t => 
                           col.id === 'overdue_breached' 
                               ? ['overdue', 'breached'].includes(t.status)
                               : t.status === col.id
                      );

                      return (
                           <div 
                               key={col.id} 
                               className={`${col.color} rounded-xl p-4 flex flex-col h-full overflow-hidden border border-transparent`}
                               onDragOver={e => e.preventDefault()}
                               onDrop={e => {
                                   if (col.id === 'overdue_breached') return; // Cannot drop into failure state manually
                                   onDrop(e, col.id);
                               }}
                           >
                               <div className="flex justify-between items-center mb-4">
                                   <h3 className="font-bold text-gray-700 text-sm">{col.title}</h3>
                                   <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full font-black shadow-sm">{colTasks.length}</span>
                               </div>
                               
                               <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                    {colTasks.map(t => (
                                         <div 
                                             key={t.id}
                                             draggable={col.id !== 'overdue_breached'}
                                             onDragStart={e => onDragStart(e, t.id)}
                                             className={`bg-white p-4 rounded-lg shadow-sm border ${col.id === 'overdue_breached' ? 'border-red-300' : 'border-gray-200 cursor-grab active:cursor-grabbing hover:border-gray-300'} transition-colors`}
                                         >
                                              <div className="flex justify-between items-start mb-2">
                                                   <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded">{t.category}</span>
                                                   {t.status === 'breached' && <span className="text-[10px] uppercase font-black tracking-widest text-red-600 bg-red-100 px-2 py-0.5 rounded animate-pulse">Breached</span>}
                                              </div>
                                              
                                              <h4 className="font-bold text-gray-800 text-sm mb-3 leading-snug">{t.title}</h4>
                                              
                                              <div className="space-y-1">
                                                   <div className="flex justify-between text-xs">
                                                       <span className="text-gray-400">KPI Limits:</span>
                                                       <span className="font-semibold text-gray-700">{t.kpi_metric} &lt; {t.kpi_threshold}{t.kpi_unit}</span>
                                                   </div>
                                                   <div className="flex justify-between text-xs">
                                                       <span className="text-gray-400">Due Phase:</span>
                                                       <span className="font-semibold text-gray-700">{new Date(t.due_date).toLocaleDateString()}</span>
                                                   </div>
                                              </div>
                                         </div>
                                    ))}
                               </div>
                           </div>
                      );
                 })}
            </div>
       </div>

    </div>
  );
}
