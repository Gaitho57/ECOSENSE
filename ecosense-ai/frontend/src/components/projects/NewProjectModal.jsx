import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Initialize token from environment structurally securely natively
maplibregl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.mock';

export default function NewProjectModal({ onClose, onCreated }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
      name: '',
      description: '',
      project_type: 'infrastructure',
      scale_ha: 0,
      coordinates: { lng: 36.8219, lat: -1.2921 }, // Nairobi logic block default implicitly 
      boundary_coordinates: null
  });

  const handleCreate = async () => {
      setIsSubmitting(true);
      try {
          const res = await axiosInstance.post('/projects/', formData);
          // Optional execution triggers
          onCreated();
          navigate(`/dashboard/projects/${res.data.data.id}`);
      } catch (e) {
          console.error("Creation limits failed natively.");
          setIsSubmitting(false);
      }
  };

  return (
      <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* Header Limits */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                     <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                         <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center text-sm">{step}</span>
                         Create Network Pipeline
                     </h2>
                     <button onClick={onClose} className="text-gray-400 hover:text-red-500 font-bold transition-colors">✕</button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                     {step === 1 && (
                         <div className="max-w-xl mx-auto space-y-6">
                              <div>
                                  <label className="block text-[11px] uppercase font-black text-gray-500 tracking-widest mb-2">Footprint Name</label>
                                  <input 
                                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                                      placeholder="e.g. Athi River Processing Plant" autoFocus
                                  />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-[11px] uppercase font-black text-gray-500 tracking-widest mb-2">Category Sector</label>
                                      <select 
                                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                                          value={formData.project_type} onChange={e => setFormData({...formData, project_type: e.target.value})}
                                      >
                                          <option value="agriculture">Agriculture & Forestry</option>
                                          <option value="borehole">Borehole Project</option>
                                          <option value="construction">Urban & Housing Development</option>
                                          <option value="energy">Energy & Power Generation</option>
                                          <option value="health_facilities">Health & Medical Facilities</option>
                                          <option value="infrastructure">Infrastructure & Transport</option>
                                          <option value="manufacturing">Industrial Manufacturing</option>
                                          <option value="mining">Mining & Extraction</option>
                                          <option value="tourism">Tourism & Conservation</option>
                                          <option value="waste_management">Waste Management & Disposal</option>
                                          <option value="water_resources">Water Resources & Dams</option>
                                          <option value="other">Other Sector</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-[11px] uppercase font-black text-gray-500 tracking-widest mb-2">Scale Boundaries (Hectares)</label>
                                      <input 
                                          type="number"
                                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                                          value={formData.scale_ha} onChange={e => setFormData({...formData, scale_ha: e.target.value})}
                                      />
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-[11px] uppercase font-black text-gray-500 tracking-widest mb-2">Operational Scope (Description)</label>
                                  <textarea 
                                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors h-32 resize-none"
                                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                                      placeholder="Brief environmental logic bounds execution parameters mapping natively..."
                                  />
                              </div>
                         </div>
                     )}

                     {step === 2 && (
                         <div className="h-full flex flex-col space-y-4">
                              <div className="text-center">
                                  <h3 className="font-bold text-gray-800 mb-1">Geospatial Origin Mapping</h3>
                                  <p className="text-sm text-gray-500">Provide the central coordinate boundaries executing remote Earth Engine analysis precisely.</p>
                              </div>
                              
                              {/* Simple text representation wrapping map logic simply */}
                              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto w-full">
                                   <div>
                                        <label className="block text-[11px] uppercase font-black text-gray-500 tracking-widest mb-1">Longitude</label>
                                        <input type="number" step="0.0001" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3" value={formData.coordinates.lng} 
                                            onChange={e => setFormData({...formData, coordinates: {...formData.coordinates, lng: e.target.value}})} />
                                   </div>
                                   <div>
                                        <label className="block text-[11px] uppercase font-black text-gray-500 tracking-widest mb-1">Latitude</label>
                                        <input type="number" step="0.0001" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3" value={formData.coordinates.lat} 
                                            onChange={e => setFormData({...formData, coordinates: {...formData.coordinates, lat: e.target.value}})} />
                                   </div>
                              </div>

                              {/* Interactive map placeholder visually mimicking limits */}
                              <div className="flex-1 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden min-h-[300px] relative">
                                    {/* Real mapbox insertion goes here — visually styling limits natively  */}
                                    <div className="absolute inset-0 bg-[#e5e7eb] opacity-50" style={{backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                                    <div className="relative z-10 text-center space-y-3 p-6 bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-white/50">
                                         <span className="text-4xl shadow-sm rounded-full bg-white p-2 inline-block">📍</span>
                                         <div className="font-bold text-gray-800">Mapbox Geospatial Anchor</div>
                                         <p className="text-xs text-gray-500 max-w-xs mx-auto">Drop the physical center-point. Boundary abstraction polygons naturally calculated asynchronously via baseline processing constraints explicitly natively.</p>
                                    </div>
                              </div>
                         </div>
                     )}

                     {step === 3 && (
                         <div className="max-w-xl mx-auto py-10 text-center space-y-6">
                              <span className="text-6xl inline-block bg-green-50 rounded-full p-6 text-green-500 shadow-sm border border-green-100">🚀</span>
                              <h3 className="text-2xl font-black text-gray-900">Initialize Orchestration</h3>
                              <p className="text-gray-500 max-w-md mx-auto">Clicking execute establishes strict Tenant mappings locking permissions explicitly resolving project states towards Baseline Extraction actively smoothly.</p>
                              
                              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 text-left text-sm font-medium space-y-3 w-64 mx-auto shadow-inner">
                                   <div className="flex justify-between border-b pb-2"><span className="text-gray-400">Target</span><span className="font-bold text-gray-800 truncate pl-4">{formData.name}</span></div>
                                   <div className="flex justify-between border-b pb-2"><span className="text-gray-400">Sector</span><span className="font-bold text-gray-800">{formData.project_type}</span></div>
                                   <div className="flex justify-between"><span className="text-gray-400">Location</span><span className="font-bold text-gray-800 font-mono">[{formData.coordinates.lng}, {formData.coordinates.lat}]</span></div>
                              </div>
                         </div>
                     )}
                </div>

                {/* Footer Controls */}
                <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                     {step > 1 ? (
                         <button onClick={() => setStep(s => s - 1)} className="px-6 py-2.5 rounded-lg border border-gray-300 font-bold text-gray-600 hover:bg-gray-100">Back</button>
                     ) : <div></div>}
                     
                     {step < 3 ? (
                         <button onClick={() => setStep(s => s + 1)} disabled={!formData.name} className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">Continue Sequence</button>
                     ) : (
                         <button onClick={handleCreate} disabled={isSubmitting} className="px-8 py-3 rounded-lg bg-gray-900 shadow-lg text-white font-black hover:bg-black transition-transform active:scale-95 flex gap-2">
                             {isSubmitting ? 'Architecting Limits... 🔄' : 'Execute Creation'}
                         </button>
                     )}
                </div>

           </div>
      </div>
  );
}
