import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import NewProjectModal from '../../components/projects/NewProjectModal';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const fetchProjects = async () => {
      try {
          const res = await axiosInstance.get('/projects/');
          setProjects(res.data.data);
      } catch (e) {
          console.error("Extraction loops failed gracefully.");
      }
  };

  useEffect(() => {
      fetchProjects();
  }, []);

  const filtered = (projects || []).filter(p => p?.name?.toLowerCase().includes(search.toLowerCase()));

  // Map progress % based on status exactly mapping 8 constraints
  const stages = ['scoping','baseline','assessment','review','submitted','approved','monitoring'];
  const getProgress = (status) => {
       const idx = stages.indexOf(status);
       if (idx === -1) return 0;
       return Math.round(((idx + 1) / stages.length) * 100);
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-gray-50 min-h-[calc(100vh-80px)]">
       
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
               <h1 className="text-3xl font-black text-gray-900 tracking-tight">Project Pipelines</h1>
               <p className="text-gray-500 text-sm mt-1">Manage infrastructure, boundaries, and active ESG compliance blocks natively.</p>
           </div>
           
           <button 
               onClick={() => setModalOpen(true)}
               className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors whitespace-nowrap"
           >
               + Create Project
           </button>
       </div>

       {/* FILTER BAR securely bounding mappings intuitively  */}
       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
            <input 
                 type="text" 
                 placeholder="Search project names..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full sm:w-96 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
            
            <div className="flex gap-2 w-full overflow-x-auto text-sm">
                 {['All', 'Scoping', 'Baseline', 'Assessment', 'Submitted'].map(f => (
                     <button key={f} className={`px-4 py-1.5 rounded-full font-bold whitespace-nowrap ${f==='All' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                         {f}
                     </button>
                 ))}
            </div>
       </div>

       {/* PROJECT CARDS Matrix executing dynamically rendering visually */}
       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-2xl">
                    No active structures match this query footprint exactly cleanly naturally.
                </div>
            ) : filtered.map(p => {
                const prog = getProgress(p.status);
                return (
                     <Link to={`/dashboard/projects/${p.id}`} key={p.id} className="block group">
                          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-lg hover:border-blue-300 transition-all">
                               
                               <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-sm">{p.project_type.replace('_',' ')}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{p.status}</span>
                               </div>
                               
                               <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-1">{p.name}</h3>
                               
                               <div className="flex items-center gap-2 mb-6">
                                    <div className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 flex justify-center items-center font-bold text-[10px]">L</div>
                                    <span className="text-xs font-bold text-gray-500 truncate">{p.lead_consultant_name || 'Unassigned Limits'}</span>
                               </div>

                               <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                         <span className="text-gray-400">Total Progress Matrix</span>
                                         <span className="text-gray-700">{prog}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                         <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${prog}%` }}></div>
                                    </div>
                               </div>
                               
                               <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between text-xs font-medium text-gray-400">
                                    <span>Scale: {p.scale_ha || 0} ha</span>
                                    <span>Sens: <span className="font-bold text-red-500">A</span></span>
                               </div>
                          </div>
                     </Link>
                )
            })}
       </div>

       {isModalOpen && <NewProjectModal onClose={() => setModalOpen(false)} onCreated={fetchProjects} />}
    </div>
  );
}
