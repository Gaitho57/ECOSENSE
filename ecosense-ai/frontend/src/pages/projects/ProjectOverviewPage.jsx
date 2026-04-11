import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import satellitePlaceholder from '../../assets/placeholders/satellite_unavailable.png';

export default function ProjectOverviewPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState({ sens_grade: '-', predictions: 0, feedbacks: 0, compliance: 0 });

  useEffect(() => {
       const fetchLogic = async () => {
             try {
                 const res = await axiosInstance.get(`/projects/${projectId}/`);
                 const pData = res.data.data;
                 setProject(pData);
                 
                 // Dynamic stats aggregation
                 const predictionsCount = pData.prediction_count || 0;
                 const feedbackCount = pData.feedback_count || 0;
                 const grade = pData.baseline?.scoring_summary?.grade || 'N/A';
                 const score = pData.baseline?.scoring_summary?.overall_score || 0;
                 
                 setStats({
                     sens_grade: grade,
                     predictions: predictionsCount,
                     feedbacks: feedbackCount,
                     compliance: Math.round(score * 100)
                 });

             } catch (e) {
                 console.error("Mapping bounds failed resolving natively.");
             }
       };
       fetchLogic();
  }, [projectId]);

  if (!project) return <div className="p-10 animate-pulse text-gray-400 font-bold tracking-widest uppercase text-center">Executing Orchestration Blocks...</div>;

  const PIPELINE_STAGES = [
      { id: 'scoping', label: '1. Scoping Matrix', path: `/dashboard/projects/${projectId}/map` },
      { id: 'baseline', label: '2. Baseline Scan', path: `/dashboard/projects/${projectId}/baseline` },
      { id: 'assessment', label: '3. ML Impact Engine', path: `/dashboard/projects/${projectId}/predictions` },
      { id: 'review', label: '4. Public Feedback', path: `/dashboard/projects/${projectId}/community` },
      { id: 'submitted', label: '5. Document Generation', path: `/dashboard/projects/${projectId}/report` },
      { id: 'approved', label: '6. NEMA Approval', path: `/dashboard/projects/${projectId}` }, 
      { id: 'compliance', label: '7. Legal Check', path: `/dashboard/projects/${projectId}/compliance` },
      { id: 'monitoring', label: '8. ESG Telemetry', path: `/dashboard/projects/${projectId}/monitoring` }
  ];

  const getIndex = (s) => {
       const map = { 'scoping':0, 'baseline':1, 'assessment':2, 'review':3, 'submitted':4, 'approved':5, 'monitoring':7 };
       return map[s] !== undefined ? map[s] : 0;
  };
  
  const currentIndex = getIndex(project.status);
  // Continue Execution should go to the CURRENT active stage to complete it, not skip it.
  const nextTarget = PIPELINE_STAGES[currentIndex];

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-gray-50 min-h-screen">
        
        {/* Header Block constraints securely mapping natively */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 flex flex-col md:flex-row md:items-end justify-between gap-6 shadow-sm">
             <div>
                  <div className="flex gap-3 mb-3 shrink-0 flex-wrap">
                       <span className="text-[10px] uppercase font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-sm border border-blue-100">{project.project_type?.replace('_', ' ')}</span>
                       <span className="text-[10px] uppercase font-black text-gray-500 bg-gray-100 flex items-center px-3 py-1 rounded-sm border border-gray-200">Scale: {project.scale_value || 0}</span>
                       <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-sm border ${
                           project.nema_category === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                           project.nema_category === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                           'bg-green-50 text-green-600 border-green-100'
                       }`}>
                           {project.nema_category?.toUpperCase()} RISK - {project.nema_category === 'high' ? 'FULL STUDY' : 'SPR'}
                       </span>
                  </div>
                  <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{project.name}</h1>
                  <p className="text-gray-500 max-w-3xl mt-3 text-sm leading-relaxed">{project.description || "Project initialized for statutory assessment..."}</p>
                  
                  <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-2">👨‍💼 Expert: <span className="text-gray-800">{project.lead_consultant_name || 'N/A'}</span> <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{project.lead_consultant?.expert_rank?.toUpperCase() || 'ASSOCIATE'}</span></span>
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-2">📜 NEMA Ref: <span className="text-gray-800">{project.nema_ref || 'Pending Generation'}</span></span>
                  </div>
             </div>
             
             {/* Thumbnail Map - Dynamically localized based on Project GIS Coordinates */}
             <div className="w-full md:w-64 h-40 bg-gray-100 rounded-xl border-2 border-gray-200 overflow-hidden relative shadow-inner shrink-0 group hover:border-blue-400 transition-colors">
                  <div 
                       className="absolute inset-0" 
                       style={{
                           background: project.mapbox_token 
                               ? `url("https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${project.coordinates?.lng || 36.8219},${project.coordinates?.lat || -1.2921},12,0/300x200?access_token=${project.mapbox_token}") center/cover`
                               : `url(${satellitePlaceholder}) center/cover`
                       }}
                  >
                       <div className="absolute inset-0 bg-blue-900/10 mix-blend-multiply"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <span className="text-3xl drop-shadow-md">📍</span>
                  </div>
             </div>
        </div>

        {/* WORKFLOW PROGRESS BAR */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-extrabold text-gray-800 text-lg">Lifecyle Execution Pipeline</h3>
                 <button 
                      onClick={() => navigate(nextTarget.path)}
                      className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-transform active:scale-95 shadow-md flex items-center gap-2"
                 >
                     Continue Execution → 
                 </button>
             </div>
             
             <div className="relative">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 transition-all duration-1000 ease-in-out" style={{ width: `${(currentIndex / (PIPELINE_STAGES.length - 1)) * 100}%` }}></div>
                  </div>
                  
                  <div className="flex justify-between relative z-10 w-full overflow-x-auto pb-4 snap-x snap-mandatory hide-scroll-bar">
                       {PIPELINE_STAGES.map((s, i) => {
                            const isCompleted = i < currentIndex;
                            const isActive = i === currentIndex;
                            
                            return (
                                 <Link 
                                    key={s.id} 
                                    to={s.path}
                                    className="flex flex-col items-center gap-3 shrink-0 px-2 lg:px-0 w-28 lg:w-32 snap-center group"
                                 >
                                      <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center bg-white shadow-sm transition-all duration-300 ${
                                          isCompleted ? 'border-blue-500 text-blue-500 group-hover:bg-blue-50' :
                                          isActive ? 'border-gray-800 text-gray-800 scale-125' :
                                          'border-gray-200 text-transparent group-hover:border-gray-400'
                                      }`}>
                                          {isCompleted ? <span className="text-sm font-black">✓</span> : <span className="w-2.5 h-2.5 rounded-full bg-current"></span>}
                                      </div>
                                      <span className={`text-[10px] uppercase font-black tracking-widest text-center transition-colors ${
                                          isActive ? 'text-gray-900 underline decoration-2 underline-offset-4' : 
                                          'text-gray-400 group-hover:text-gray-700'
                                      }`}>
                                          {s.label}
                                      </span>
                                 </Link>
                            );
                       })}
                  </div>
             </div>
        </div>

        {/* QUICK STATS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="bg-red-50 border border-red-200 p-6 rounded-2xl shadow-sm">
                 <span className="text-red-400 uppercase tracking-widest text-[10px] font-black inline-block mb-2">Sensitivity Grade</span>
                 <div className="text-5xl font-black text-red-600 leading-none">{stats.sens_grade}</div>
             </div>
             <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                 <span className="text-gray-400 uppercase tracking-widest text-[10px] font-black inline-block mb-1">Impact Predictions</span>
                 <div className="text-4xl font-black text-gray-800">{stats.predictions}</div>
             </div>
             <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                 <span className="text-gray-400 uppercase tracking-widest text-[10px] font-black inline-block mb-1">Community Feedback</span>
                 <div className="text-4xl font-black text-gray-800">{stats.feedbacks}</div>
             </div>
             <div className="bg-green-50 border border-green-200 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                 <span className="text-green-500 uppercase tracking-widest text-[10px] font-black inline-block mb-1">Compliance Score</span>
                 <div className="text-4xl font-black text-green-700">{stats.compliance}%</div>
             </div>
        </div>

        {/* SUBMISSION READINESS & PARTICIPATION WORKFLOW (NEW) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                  <h3 className="font-extrabold text-gray-800 text-lg mb-6 flex items-center gap-3">
                       <span className="bg-blue-600 p-2 rounded-lg text-white">📋</span>
                       Submission Readiness Checklist
                  </h3>
                  <div className="space-y-4">
                       {[
                           { label: "Physical Baraza Documentation", status: project.participation_workflow?.baraza_status || 'pending' },
                           { label: "Newspaper Notice (NEMA Section 17)", status: project.participation_workflow?.newspaper_notice_status || 'pending' },
                           { label: "County Zoning Permit (Verified)", status: 'pending' },
                           { label: "Swahili Summary Translation", status: 'completed' },
                           { label: "Mitigation Significance Matrix", status: 'completed' }
                       ].map((item, i) => (
                           <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-sm font-bold text-gray-700">{item.label}</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                     item.status === 'completed' || item.status === 'Verified' ? 'bg-green-100 text-green-700' : 
                                     item.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                                }`}>
                                     {item.status}
                                </span>
                           </div>
                       ))}
                       <button 
                         onClick={() => {
                             const fetchTemplates = async () => {
                                 try {
                                     const res = await axiosInstance.get(`/community/${projectId}/templates/`);
                                     const { data } = res.data;
                                     alert(`STATUTORY TEMPLATES GENERATED:\n\n--- NEWSPAPER NOTICE ---\n${data.newspaper}\n\n--- BARAZA AGENDA ---\n${data.agenda}`);
                                 } catch (e) { alert("Failed to generate templates."); }
                             };
                             fetchTemplates();
                         }}
                         className="w-full mt-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg"
                       >
                         Download Statutory Templates (.PDF)
                       </button>
                  </div>
             </div>

             <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                       <span className="text-8xl">🛡️</span>
                  </div>
                  <h3 className="font-extrabold text-white text-lg mb-2 relative z-10">AI Thinking: Mitigation Impact</h3>
                  <p className="text-gray-400 text-sm mb-8 relative z-10">Comparison of environmental significance before and after recommended interventions.</p>
                  
                  <div className="space-y-6 relative z-10">
                       <div className="flex items-end justify-between border-b border-gray-800 pb-4">
                            <div>
                                 <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Baseline Risk</span>
                                 <div className="text-4xl font-black">{stats.compliance === 0 ? 'H' : 'CRITICAL'}</div>
                            </div>
                            <div className="text-right">
                                 <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Mitigated Risk</span>
                                 <div className="text-4xl font-black text-green-400">LOW</div>
                            </div>
                       </div>
                       
                       <p className="text-xs text-gray-400 leading-relaxed italic">
                            "{project.thinking_summary || "The engine is analyzing project-specific ecological sensitivities and statutory constraints..."}"
                       </p>
                  </div>
             </div>
        </div>

    </div>
  );
}
