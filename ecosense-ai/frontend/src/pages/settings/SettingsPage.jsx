import React, { useState } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  
  const TABS = [
    { id: 'profile', label: 'My Profile' },
    { id: 'organisation', label: 'Organisation' },
    { id: 'team', label: 'Team Execution' },
    { id: 'notifications', label: 'Notifications' },
  ];

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-screen">
         
         <div className="max-w-4xl mx-auto space-y-8">
             
             <div className="border-b border-gray-200 pb-4">
                 <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Configuration</h1>
                 <p className="text-gray-500 text-sm mt-1">Manage infrastructure settings, teams, and execution boundaries perfectly.</p>
             </div>
             
             {/* Dynamic Tabs mapping layouts natively */}
             <div className="flex gap-2 border-b border-gray-200 overflow-x-auto hide-scroll-bar">
                 {TABS.map(t => (
                     <button 
                         key={t.id}
                         onClick={() => setActiveTab(t.id)}
                         className={`px-5 py-3 font-bold text-sm tracking-wide whitespace-nowrap border-b-2 transition-colors ${activeTab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                     >
                         {t.label}
                     </button>
                 ))}
             </div>

             {/* Content Switching  */}
             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 min-h-[500px]">
                 
                 {activeTab === 'profile' && (
                     <div className="max-w-xl space-y-6">
                          <h3 className="text-lg font-black text-gray-800 border-b border-gray-100 pb-4 mb-6">Personal Identification</h3>
                          
                          <div className="flex items-center gap-6 mb-8">
                               <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center font-black text-3xl">JS</div>
                               <button className="px-5 py-2 text-sm font-bold border border-gray-200 rounded hover:bg-gray-50">Upload New Avatar</button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="block text-[11px] font-black uppercase text-gray-400 mb-2">First Name</label><input className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg" defaultValue="John" /></div>
                              <div><label className="block text-[11px] font-black uppercase text-gray-400 mb-2">Last Name</label><input className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg" defaultValue="Smith" /></div>
                          </div>
                          <div><label className="block text-[11px] font-black uppercase text-gray-400 mb-2">Email Identity</label><input className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg" defaultValue="john@ecosense.ai" disabled /></div>
                          <div><label className="block text-[11px] font-black uppercase text-gray-400 mb-2">Phone Matrix</label><input className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg" defaultValue="+254 700 123456" /></div>
                          
                          <button className="bg-gray-900 text-white font-bold px-6 py-3 rounded-lg hover:bg-black mt-4">Save Identity Constraints</button>
                     </div>
                 )}

                 {activeTab === 'organisation' && (
                     <div className="max-w-xl space-y-6">
                          <h3 className="text-lg font-black text-gray-800 border-b border-gray-100 pb-4 mb-6">Execution Entity Limits</h3>
                          
                          <div><label className="block text-[11px] font-black uppercase text-gray-400 mb-2">Organisation Name</label><input className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg" defaultValue="EcoSense Default Tenant" /></div>
                          <div><label className="block text-[11px] font-black uppercase text-gray-400 mb-2">NEMA Firm Registration ID</label><input className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-mono" defaultValue="NEMA/FIRM/9014" /></div>
                          <div><label className="block text-[11px] font-black uppercase text-gray-400 mb-2">Primary Registered Address</label><textarea className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg h-24" defaultValue="Nairobi, Kenya" /></div>
                          
                          <button className="bg-gray-900 text-white font-bold px-6 py-3 rounded-lg hover:bg-black mt-4">Update Architecture</button>
                     </div>
                 )}

                 {activeTab === 'team' && (
                     <div>
                          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                              <h3 className="text-lg font-black text-gray-800">Team Execution Boundaries</h3>
                              <button className="bg-blue-600 text-white font-bold px-4 py-2 rounded text-sm hover:bg-blue-700">Invite Consultant +</button>
                          </div>
                          
                          <div className="space-y-4">
                               {['John Smith (Admin)', 'Sarah Jane (Lead Consultant)', 'Michael O. (GIS Expert)'].map(u => (
                                   <div key={u} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-lg">
                                       <div className="font-bold text-gray-800 text-sm">{u}</div>
                                       <button className="text-xs font-bold text-gray-400 hover:text-red-500">Revoke Access</button>
                                   </div>
                               ))}
                          </div>
                     </div>
                 )}

                 {activeTab === 'notifications' && (
                     <div className="max-w-xl space-y-6">
                          <h3 className="text-lg font-black text-gray-800 border-b border-gray-100 pb-4 mb-6">Hardware & SMS Alert Nodes</h3>
                          
                          <label className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                               <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded bg-gray-100 border-gray-300" />
                               <div>
                                   <div className="font-bold text-sm text-gray-800">Critical EMP Breach Alerts (SMS)</div>
                                   <div className="text-xs text-gray-500">Sends immediate texts upon active IoT threshold collapses explicitly natively.</div>
                               </div>
                          </label>

                          <label className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                               <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded bg-gray-100 border-gray-300" />
                               <div>
                                   <div className="font-bold text-sm text-gray-800">Weekly ESG Index Summaries</div>
                                   <div className="text-xs text-gray-500">Emails overall Blockchain Auditing traces effectively managing compliance tracking cleanly.</div>
                               </div>
                          </label>
                          <button className="bg-gray-900 text-white font-bold px-6 py-3 rounded-lg hover:bg-black mt-4">Save Matrix Variables</button>
                     </div>
                 )}
             </div>

         </div>

    </div>
  );
}
