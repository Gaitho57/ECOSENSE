import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function CompliancePage() {
  const { projectId = 'placeholder-id' } = useParams();
  
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
       loadHistory();
  }, [projectId]);

  const loadHistory = async () => {
       try {
           setIsLoading(true);
           const res = await axiosInstance.get(`/compliance/${projectId}/history/`);
           setHistory(res.data.data || []);
       } catch (e) {
           console.error("Failed history traces iteratively.");
       }
       setIsLoading(false);
  };

  const runComplianceCheck = async () => {
       setIsChecking(true);
       try {
           const res = await axiosInstance.get(`/compliance/${projectId}/`);
           setReport(res.data.data);
           await loadHistory();
       } catch (e) {
           alert("Compliance matrix failed explicitly bridging limits.");
       }
       setIsChecking(false);
  };

  const getStatusIcon = (status) => {
       switch(status) {
           case 'passed': return <span className="text-xl">✅</span>;
           case 'warning': return <span className="text-xl">⚠️</span>;
           case 'failed': return <span className="text-xl">❌</span>;
           default: return <span className="text-xl">⏸️</span>;
       }
  };

  const filteredItems = (report ? (report.passed.concat(report.failed).concat(report.warnings).concat(report.inapplicable)) : [])
                        .sort((a,b) => b.regulation_id.localeCompare(a.regulation_id));

  // Determine colour based on Grade
  const getGradeColor = (grade) => {
       if(['A', 'B'].includes(grade)) return 'text-green-600 bg-green-50';
       if(['C', 'D'].includes(grade)) return 'text-orange-600 bg-orange-50';
       return 'text-red-600 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10 space-y-8">
       
       <div className="flex justify-between items-end border-b border-gray-200 pb-6 mb-6">
           <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Compliance Tracking Engine</h1>
               <p className="text-gray-500 mt-1 max-w-2xl">Automated Evaluation mapping EMCA structures securely generating valid arrays implicitly mapping rulesets natively.</p>
           </div>
           
           <button 
               onClick={runComplianceCheck}
               disabled={isChecking}
               className="bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md flex items-center gap-2"
           >
               {isChecking ? 'Evaluating Bounds...' : 'Run Total Compliance Audit'}
           </button>
       </div>

       {report && (
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
               <div className={`p-8 rounded-2xl border flex flex-col items-center justify-center text-center shadow-sm ${getGradeColor(report.grade)} border-[currentColor]`}>
                   <span className="text-xs uppercase font-extrabold tracking-widest opacity-70 mb-1">Overall Grade</span>
                   <span className="text-7xl font-black">{report.grade}</span>
                   <span className="text-lg font-bold mt-2 opacity-90">{report.score}% Compliance</span>
               </div>
               
               <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Passed Constraints</span>
                    <span className="text-4xl font-black text-gray-800">{report.passed?.length || 0}</span>
               </div>

               <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Failed Critically</span>
                    <span className="text-4xl font-black text-gray-800">{report.failed?.length || 0}</span>
               </div>

               <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Active Warnings</span>
                    <span className="text-4xl font-black text-gray-800">{report.warnings?.length || 0}</span>
               </div>
           </div>
       )}

       <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             
           <div className="px-6 py-5 bg-gray-50 border-b border-gray-100">
               <h3 className="font-bold text-gray-800 uppercase tracking-widest text-sm">Regulatory Requirements Block</h3>
           </div>
           
           <div className="divide-y divide-gray-100">
                {!report && history.length === 0 ? (
                    <div className="p-16 text-center text-gray-400 italic">No formal verification processes completed yet mapping scopes natively. Run Total Compliance Audit.</div>
                ) : filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                         <details key={item.regulation_id} className="group p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                              <summary className="font-bold text-gray-800 flex items-center justify-between outline-none list-none">
                                   <div className="flex items-center gap-4">
                                        {getStatusIcon(item.status)}
                                        <span className="text-sm uppercase tracking-wide opacity-50 w-24 block">{item.regulation_id}</span>
                                        <span className="text-base flex-1">{item.requirement}</span>
                                   </div>
                                   <span className="group-open:rotate-180 transform transition-transform text-gray-400">▼</span>
                              </summary>
                              
                              <div className="mt-4 ml-14 pl-4 border-l-2 border-gray-100 space-y-4">
                                   <div>
                                       <span className="text-xs uppercase font-bold tracking-widest text-gray-400 block mb-1">Extracted Evidence Logic</span>
                                       <p className="text-sm text-gray-700 italic bg-white p-3 rounded border border-gray-100">"{item.evidence}"</p>
                                   </div>
                                   
                                   {item.remedy && item.status !== 'passed' && (
                                       <div>
                                            <span className="text-xs uppercase font-bold tracking-widest text-blue-400 block mb-1">Recommended Execution Remedy</span>
                                            <p className="text-sm font-semibold text-blue-800 bg-blue-50 p-3 rounded border border-blue-100">{item.remedy}</p>
                                       </div>
                                   )}
                              </div>
                         </details>
                    ))
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                         {history.slice(0, 10).map(h => (
                              <div key={h.id} className="border border-gray-100 rounded-lg p-4 flex flex-col gap-2 shadow-sm bg-white">
                                  <div className="flex gap-2 items-center text-sm font-bold opacity-60">
                                      {getStatusIcon(h.status)} {h.regulation_id}
                                  </div>
                                  <div className="text-sm text-gray-600 line-clamp-2">{h.evidence}</div>
                                  <div className="text-xs font-mono text-gray-400 mt-2">{new Date(h.checked_at).toLocaleString()}</div>
                              </div>
                         ))}
                    </div>
                )}
           </div>
       </div>

    </div>
  );
}
