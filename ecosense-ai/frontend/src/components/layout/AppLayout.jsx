import React, { useState } from 'react';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';

export default function AppLayout() {
  const { pathname } = useLocation();
  const { projectId } = useParams();
  
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Core navigation
  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Projects', path: '/dashboard/projects', icon: '🌍' },
    { name: 'Analytics', path: '/dashboard/analytics', icon: '📈' },
    { name: 'Billing', path: '/dashboard/billing', icon: '💳' },
    { name: 'Settings', path: '/dashboard/settings', icon: '⚙️' },
  ];

  // Specific project navigation (appears when inside a project boundary)
  const projectNavLinks = [
    { name: 'Overview', path: `/dashboard/projects/${projectId}` },
    { name: 'Baseline Data', path: `/dashboard/projects/${projectId}/baseline` },
    { name: 'AI Predictions', path: `/dashboard/projects/${projectId}/predictions` },
    { name: 'GIS Mapping', path: `/dashboard/projects/${projectId}/map` },
    { name: 'Community', path: `/dashboard/projects/${projectId}/community` },
    { name: 'Report Generator', path: `/dashboard/projects/${projectId}/report` },
    { name: 'Report Editor', path: `/dashboard/projects/${projectId}/report-editor` },
    { name: 'Legal Compliance', path: `/dashboard/projects/${projectId}/compliance` },
    { name: 'Live IoT Monitor', path: `/dashboard/projects/${projectId}/monitoring` },
    { name: 'ESG & Blockchain', path: `/dashboard/projects/${projectId}/esg` },
  ];


  const inProjectContext = pathname.includes(`/dashboard/projects/`) && projectId;

  return (
    <div className="flex bg-gray-50 min-h-screen text-slate-800 font-sans">
      
      {/* LEFT SIDEBAR (Collapsible natively matching layout bounds cleanly) */}
      <div className={`flex flex-col bg-[#0f172a] shadow-xl text-white transition-all duration-300 z-50 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        
        {/* LOGO */}
        <div className="h-20 flex items-center justify-center border-b border-gray-800">
             {isSidebarOpen ? (
                 <span className="text-xl font-black text-green-500 tracking-tight flex items-center gap-2">
                      <span className="text-3xl">🌍</span> EcoSenseEIA
                 </span>
             ) : (
                 <span className="text-3xl">🌍</span>
             )}
        </div>

        {/* Global Navigation */}
        <div className="flex-1 overflow-y-auto py-6 space-y-1 px-3">
             {isSidebarOpen && <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 ml-2 mb-2 block">Global</span>}
             
             {navLinks.map(link => {
                   const isActive = pathname === link.path || (link.path !== '/dashboard' && pathname.startsWith(link.path) && !inProjectContext);
                   return (
                        <Link 
                            key={link.path} 
                            to={link.path}
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors font-medium ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                        >
                            <span className="text-lg">{link.icon}</span>
                            {isSidebarOpen && <span className="truncate">{link.name}</span>}
                        </Link>
                   )
             })}

             {/* Dynamic Project Routing */}
             {inProjectContext && isSidebarOpen && (
                  <div className="mt-8 pt-6 border-t border-gray-800">
                       <span className="text-[10px] uppercase font-bold tracking-widest text-green-500 ml-2 mb-2 block">Active Assessment</span>
                       {projectNavLinks.map(link => {
                           const isActive = pathname === link.path;
                           return (
                               <Link 
                                   key={link.path} 
                                   to={link.path}
                                   className={`flex items-center gap-3 px-3 py-2 mt-1 rounded-md transition-colors text-sm ${isActive ? 'text-green-400 bg-gray-800/50 font-bold' : 'text-gray-400 hover:text-white'}`}
                               >
                                   <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400' : 'bg-transparent'}`}></div>
                                   <span className="truncate">{link.name}</span>
                               </Link>
                           );
                       })}
                  </div>
             )}
        </div>

        {/* FOOTER USER BLOCK */}
        <div className="p-4 border-t border-gray-800">
             <div className="flex justify-between items-center bg-gray-900 p-2 rounded-xl">
                 {isSidebarOpen && (
                     <div className="flex items-center gap-3 overflow-hidden ml-1">
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold flex-shrink-0">JS</div>
                          <div className="truncate">
                               <p className="text-xs font-bold text-white truncate">John Smith</p>
                               <p className="text-[10px] text-gray-500 truncate">Consultant</p>
                          </div>
                     </div>
                 )}
                 <button className="text-gray-400 hover:text-white transition-colors" title="Logout">
                     🚪
                 </button>
             </div>
        </div>
      </div>

      {/* RIGHT MAIN REGION */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* TOP BAR / BREADCRUMBS */}
          <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-10 z-10 sticky top-0 shrink-0">
               <div className="flex items-center gap-4">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-gray-800 text-xl hidden lg:block">
                         {isSidebarOpen ? '◀' : '▶'}
                    </button>
                    <div className="text-sm text-gray-500 flex items-center gap-2 font-medium">
                         <Link to="/dashboard" className="hover:text-blue-600">Home</Link> 
                         <span>/</span>
                         <span className="text-gray-900 truncate max-w-[200px] md:max-w-md font-bold capitalize">
                              {pathname.split('/').filter(Boolean).pop()?.replace('-', ' ') || 'Dashboard'}
                         </span>
                    </div>
               </div>
               
               {/* Optional actions injected via Context/Zustand optionally, or simple quick actions  */}
               <div className="hidden sm:flex items-center gap-4">
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                        🔔 Alerts
                    </button>
               </div>
          </header>

          {/* DYNAMIC SCROLLING INJECTION */}
          <main className="flex-1 overflow-y-auto">
              <Outlet />
          </main>
      </div>
      
    </div>
  );
}
