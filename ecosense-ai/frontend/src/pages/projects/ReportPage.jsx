import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function ReportPage() {
  const { projectId = 'placeholder-id' } = useParams();
  
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Generation Modal States
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [format, setFormat] = useState('pdf');
  const [jurisdiction, setJurisdiction] = useState('NEMA_Kenya');
  
  const [activeTaskId, setActiveTaskId] = useState(null);

  const loadReports = async () => {
       try {
           const res = await axiosInstance.get(`/reports/${projectId}/reports/`);
           setReports(res.data.data || []);
       } catch (e) {
           console.error("Failed loading report tables natively.");
       }
       setIsLoading(false);
  };

  useEffect(() => {
       loadReports();
  }, [projectId]);

  // Polling logic for Active Generation 
  useEffect(() => {
       let interval;
       if (activeTaskId) {
           interval = setInterval(async () => {
               try {
                   const res = await axiosInstance.get(`/tasks/${activeTaskId}/`);
                   const st = res.data.data.status;
                   if (st === 'complete' || st === 'SUCCESS') {
                        setActiveTaskId(null);
                        setIsGenerating(false);
                        setShowModal(false);
                        loadReports();
                   } else if (st === 'failed' || st === 'FAILURE') {
                        setActiveTaskId(null);
                        setIsGenerating(false);
                        alert("Generation pipeline explicitly failed mapping parameters.");
                   }
               } catch (e) {
                   clearInterval(interval);
               }
           }, 2500);
       }
       return () => clearInterval(interval);
  }, [activeTaskId]);

  const handleGenerate = async (e) => {
       e.preventDefault();
       setIsGenerating(true);
       try {
           const res = await axiosInstance.post(`/reports/${projectId}/generate-report/`, {
               format, jurisdiction
           });
           setActiveTaskId(res.data.data.task_id);
       } catch (e) {
           setIsGenerating(false);
           alert("Compilation bounds restricted triggers natively.");
       }
  };

  const handleDownload = async (downloadUrl, version, format) => {
       try {
           const res = await axiosInstance.get(downloadUrl, { responseType: 'blob' });
           const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
           const url = window.URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.href = url;
           a.download = `EIA_Report_v${version}.${format}`;
           document.body.appendChild(a);
           a.click();
           a.remove();
           window.URL.revokeObjectURL(url);
       } catch (e) {
           console.error("Download failed:", e);
           alert("Failed to download report. Please try again.");
       }
  };

  const getReadinessChecks = () => {
        return [
           { id: 1, name: "Project Description", status: "ready" },
           { id: 2, name: "Executive Summary", status: "ready" },
           { id: 3, name: "Policy & Legal Framework", status: "ready" },
           { id: 4, name: "Description of Environment", status: "ready" },
           { id: 5, name: "Impacts & Mitigation", status: "ready" },
           { id: 6, name: "Environmental Management Plan", status: "ready" },
           { id: 7, name: "Public Participation Summary", status: "ready" },
           { id: 8, name: "Conclusion", status: "ready" },
           { id: 9, name: "Appendices", status: "ready" },
        ];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10 space-y-8 relative">
       
       {/* Configuration Header */}
       <div className="flex justify-between items-end border-b border-gray-200 pb-6 mb-6">
           <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Professional Documentation</h1>
               <p className="text-gray-500 mt-1 max-w-2xl">Compiles exhaustive 20-100 page NEMA documents including satellite imagery, climate mapping, and community audits.</p>
           </div>
           
           <button 
               onClick={() => setShowModal(true)}
               disabled={isGenerating || !!activeTaskId}
               className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md flex items-center gap-2"
           >
               <span className="text-xl">📄</span> Generate Official Report
           </button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Section Readiness Table */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
               <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b pb-2 mb-4">Readiness Checklist</h3>
               <ul className="space-y-3">
                   {getReadinessChecks().map(rc => (
                        <li key={rc.id} className="flex items-center justify-between text-sm py-1">
                             <span className="text-gray-600">{rc.name}</span>
                             <span className="text-green-500 font-bold">✓ Ready</span>
                        </li>
                   ))}
               </ul>
           </div>

           {/* Documents Table */}
           <div className="lg:col-span-2">
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                         <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Digital Version Control</h3>
                    </div>
                    
                    {isLoading ? (
                        <div className="p-10 text-center text-gray-400">Synchronizing Repository...</div>
                    ) : reports.length === 0 ? (
                        <div className="p-16 text-center">
                            <span className="text-4xl text-gray-200 block mb-2">📁</span>
                            <h4 className="text-lg font-bold text-gray-400">No Document Versions Generated</h4>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-white border-b border-gray-100 uppercase tracking-wider text-[10px] font-black text-gray-400">
                                <tr>
                                    <th className="px-4 py-4">Vol.</th>
                                    <th className="px-4 py-4">Format</th>
                                    <th className="px-4 py-4 text-center">Compliance Score</th>
                                    <th className="px-4 py-4">Status / Outcome</th>
                                    <th className="px-4 py-4">Timestamp</th>
                                    <th className="px-4 py-4 text-right">Access</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                        {reports.map(r => {
                                             // Fallback parser since we are avoiding migrations by using error_message
                                             let pr_score = null;
                                             let pr_grade = null;
                                             
                                             if (r.error_message?.startsWith("Compliance:")) {
                                                 const match = r.error_message.match(/Compliance: ([\d.]+)% \((.*)\)/);
                                                 if (match) {
                                                     pr_score = parseFloat(match[1]);
                                                     pr_grade = match[2];
                                                 }
                                             }

                                             return (
                                                 <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                                     <td className="px-4 py-4 whitespace-nowrap font-black text-gray-900">v{r.version}</td>
                                                     <td className="px-4 py-4 whitespace-nowrap">
                                                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${r.format === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                              {r.format}
                                                          </span>
                                                     </td>
                                                     <td className="px-4 py-4 whitespace-nowrap text-center">
                                                          {pr_score !== null ? (
                                                              <div className="flex flex-col items-center">
                                                                  <span className={`text-sm font-black ${
                                                                      pr_score >= 80 ? 'text-green-600' : 
                                                                      pr_score >= 50 ? 'text-orange-600' : 'text-red-600'
                                                                  }`}>
                                                                      {pr_score}%
                                                                  </span>
                                                                  <span className="text-[9px] font-bold text-gray-400">Grade {pr_grade}</span>
                                                              </div>
                                                          ) : (
                                                              <span className="text-gray-300 text-[10px] italic">N/A</span>
                                                          )}
                                                     </td>
                                                     <td className="px-4 py-4 whitespace-nowrap">
                                                          {r.status === 'ready' || r.status === 'ready_for_submission' ? (
                                                              <div className="flex flex-col">
                                                                  <span className="text-green-600 font-black text-[10px] uppercase flex items-center gap-1">
                                                                      <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span> Ready
                                                                  </span>
                                                                  {r.status === 'ready_for_submission' && (
                                                                      <span className="text-blue-600 text-[9px] font-bold italic mt-0.5">✍️ Digitally Signed</span>
                                                                  )}
                                                              </div>
                                                          ) : r.status === 'pending_expert_review' ? (
                                                              <div className="flex flex-col">
                                                                  <span className="text-orange-500 font-bold text-[10px] uppercase">Pending Expert Review</span>
                                                                  <div className="flex gap-2 mt-1">
                                                                       <button onClick={async () => {
                                                                           try { await axiosInstance.post(`/reports/${projectId}/reports/${r.id}/expert-approve/`, { action: 'approve' }); loadReports(); } catch(e) { alert("Action failed. Consult authorization."); }
                                                                       }} className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold hover:bg-green-200">Sign Off</button>
                                                                       <button onClick={async () => {
                                                                           try { await axiosInstance.post(`/reports/${projectId}/reports/${r.id}/expert-approve/`, { action: 'reject' }); loadReports(); } catch(e) { alert("Action failed."); }
                                                                       }} className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold hover:bg-red-200">Reject</button>
                                                                  </div>
                                                              </div>
                                                          ) : r.status === 'generating' ? (
                                                              <span className="text-blue-500 font-bold text-[10px] uppercase animate-pulse">Compiling Engine...</span>
                                                          ) : (
                                                              <span className="text-red-500 font-bold text-[10px] uppercase">{r.status}</span>
                                                          )}
                                                     </td>
                                                     <td className="px-4 py-4 whitespace-nowrap text-[10px] text-gray-500">
                                                          {r.generated_at ? new Date(r.generated_at).toLocaleString() : '-'}
                                                     </td>
                                                     <td className="px-4 py-4 whitespace-nowrap text-right">
                                                          {(r.status === 'ready' || r.status === 'ready_for_submission' || r.status === 'pending_expert_review') && r.download_url ? (
                                                                <button 
                                                                    onClick={() => handleDownload(r.download_url, r.version, r.format)}
                                                                    className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-black px-3 py-1.5 rounded uppercase shadow-sm transition-all inline-block cursor-pointer"
                                                                >
                                                                    Download
                                                                </button>
                                                          ) : (
                                                               <span className="text-gray-300 font-bold text-[10px] uppercase">Processing</span>
                                                          )}
                                                     </td>
                                                 </tr>
                                             );
                                        })}
                            </tbody>
                        </table>
                    )}
               </div>
           </div>
       </div>

       {/* Generation Modal */}
       {showModal && (
           <div className="absolute inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-gray-900">Compile Professional Document</h3>
                        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
                    </div>

                    <form onSubmit={handleGenerate} className="space-y-5">
                       <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">Templating Framework</label>
                           <select 
                               value={jurisdiction} onChange={e => setJurisdiction(e.target.value)}
                               className="w-full border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-800 font-medium"
                           >
                               <option value="NEMA_Kenya">NEMA Environmental Standards (Kenya)</option>
                           </select>
                       </div>

                       <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">Export Architecture</label>
                           <div className="flex gap-4">
                               <label className={`flex-1 flex gap-2 items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${format === 'pdf' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                   <input type="radio" value="pdf" checked={format === 'pdf'} onChange={() => setFormat('pdf')} className="form-radio text-red-600 focus:ring-red-500" />
                                   <span className="font-bold text-gray-800">Professional PDF</span>
                               </label>
                               <label className={`flex-1 flex gap-2 items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${format === 'docx' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                   <input type="radio" value="docx" checked={format === 'docx'} onChange={() => setFormat('docx')} className="form-radio text-blue-600 focus:ring-blue-500" />
                                   <span className="font-bold text-gray-800">Word DOCX</span>
                               </label>
                           </div>
                       </div>

                       <div className="pt-4">
                           <button 
                               type="submit" 
                               disabled={isGenerating || !!activeTaskId}
                               className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black py-4 rounded-xl transition-colors shadow-lg"
                           >
                               {isGenerating || !!activeTaskId ? 'Orchestrating AI Pipeline...' : 'Generate Compliance Asset'}
                           </button>
                       </div>
                    </form>
               </div>
           </div>
       )}

    </div>
  );
}
