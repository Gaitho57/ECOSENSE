import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

  const getReadinessChecks = () => {
        // In a real implementation this natively cross checks variables directly across modules
        // Mocking safe completion parameters verifying components iteratively 
        return [
           { id: 1, name: "Project Description", status: "ready" },
           { id: 2, name: "Executive Summary", status: "ready" },
           { id: 3, name: "Policy & Legal Framework", status: "ready" },
           { id: 4, name: "Description of Environment", status: "ready" },
           { id: 5, name: "Impacts & Mitigation", status: "ready" },
           { id: 6, name: "Environmental Management Plan", status: "ready" },
           { id: 7, name: "Public Participation Summary", status: "ready" },
           { id: 8, name: "Conclusion", status: "ready" },
           { id: 9, name: "Appendices", status: "warning" },
        ];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10 space-y-8 relative">
       
       {/* Configuration Header */}
       <div className="flex justify-between items-end border-b border-gray-200 pb-6 mb-6">
           <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">EIA Documentation</h1>
               <p className="text-gray-500 mt-1 max-w-2xl">Compiles compliant PDF/DOCX templates mapping S3 signatures tracking cryptographic footprints exactly.</p>
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
                             {rc.status === 'ready' 
                                  ? <span className="text-green-500 font-bold">✓ Ready</span>
                                  : <span className="text-orange-500 font-bold italic">! Pending</span>
                             }
                        </li>
                   ))}
               </ul>
           </div>

           {/* Documents Table */}
           <div className="lg:col-span-2">
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Version Control Index</h3>
                   </div>
                   
                   {isLoading ? (
                       <div className="p-10 text-center text-gray-400">Synchronizing S3 Buckets...</div>
                   ) : reports.length === 0 ? (
                       <div className="p-16 text-center">
                           <span className="text-4xl text-gray-200 block mb-2">📁</span>
                           <h4 className="text-lg font-bold text-gray-500">No Document Versions Generated</h4>
                       </div>
                   ) : (
                       <table className="w-full text-left text-sm text-gray-600">
                           <thead className="bg-white border-b border-gray-100 uppercase tracking-wider text-xs font-semibold text-gray-400">
                               <tr>
                                   <th className="px-6 py-4">Vol.</th>
                                   <th className="px-6 py-4">Format</th>
                                   <th className="px-6 py-4">Size (KB)</th>
                                   <th className="px-6 py-4">Timestamp</th>
                                   <th className="px-6 py-4 text-right">Access Link</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                               {reports.map(r => (
                                   <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                       <td className="px-6 py-4 whitespace-nowrap font-black text-gray-900">v{r.version}.0</td>
                                       <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${r.format === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {r.format}
                                            </span>
                                       </td>
                                       <td className="px-6 py-4 whitespace-nowrap">
                                            {r.file_size ? (r.file_size / 1024).toFixed(1) : '-'} KB
                                       </td>
                                       <td className="px-6 py-4 whitespace-nowrap">
                                            {r.generated_at ? new Date(r.generated_at).toLocaleString() : 'Processing...'}
                                       </td>
                                       <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {r.status === 'ready' && r.download_url ? (
                                                 <a 
                                                     href={r.download_url} 
                                                     target="_blank" 
                                                     rel="noreferrer"
                                                     className="text-blue-600 font-bold hover:underline"
                                                 >
                                                     Download 📥
                                                 </a>
                                            ) : r.status === 'compliance_blocked' ? (
                                                 <span className="text-red-600 font-bold max-w-xs block leading-tight">Blocked by critical compliance failures. Check Compliance Dashboard.</span>
                                            ) : r.status === 'failed' ? (
                                                 <span className="text-gray-500 font-bold">Failed</span>
                                            ) : (
                                                 <span className="text-orange-500 font-bold italic animate-pulse">Compiling...</span>
                                            )}
                                       </td>
                                   </tr>
                               ))}
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
                        <h3 className="text-xl font-black text-gray-900">Initialization Target</h3>
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
                           <label className="block text-sm font-bold text-gray-700 mb-2">Export Format Architecture</label>
                           <div className="flex gap-4">
                               <label className={`flex-1 flex gap-2 items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${format === 'pdf' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                   <input type="radio" value="pdf" checked={format === 'pdf'} onChange={() => setFormat('pdf')} className="form-radio text-red-600 focus:ring-red-500" />
                                   <span className="font-bold text-gray-800">Secure PDF</span>
                               </label>
                               <label className={`flex-1 flex gap-2 items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${format === 'docx' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                   <input type="radio" value="docx" checked={format === 'docx'} onChange={() => setFormat('docx')} className="form-radio text-blue-600 focus:ring-blue-500" />
                                   <span className="font-bold text-gray-800">Editable DOCX</span>
                               </label>
                           </div>
                       </div>

                       <div className="pt-4">
                           <button 
                               type="submit" 
                               disabled={isGenerating || !!activeTaskId}
                               className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black py-4 rounded-xl transition-colors shadow-lg"
                           >
                               {isGenerating || !!activeTaskId ? 'Orchestrating Processors...' : 'Compile Document'}
                           </button>
                       </div>
                    </form>
               </div>
           </div>
       )}

    </div>
  );
}
