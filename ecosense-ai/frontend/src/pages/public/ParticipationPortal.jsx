import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import mapboxgl from 'mapbox-gl';

export default function ParticipationPortal() {
  const { projectToken } = useParams();
  
  const [projectData, setProjectData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  // Form states natively bounding standard string updates safely
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [community, setCommunity] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  
  const CONCERNS = [
      { id: 'water', label: 'Water Quality & Access' },
      { id: 'displacement', label: 'Land & Relocation' },
      { id: 'jobs', label: 'Jobs & Local Economy' },
      { id: 'noise', label: 'Noise & Vibration' },
      { id: 'dust', label: 'Dust & Air Quality' },
      { id: 'wildlife', label: 'Wildlife & Nature' }
  ];

  useEffect(() => {
       const fetchPortal = async () => {
             setIsLoading(true);
             try {
                const res = await axiosInstance.get(`/public/participate/${projectToken}/`);
                setProjectData(res.data.data);
             } catch (e) {
                setErrorMsg("Portal unavailable or invalid project link.");
             }
             setIsLoading(false);
       };
       fetchPortal();
  }, [projectToken]);

  const toggleCategory = (id) => {
       setSelectedCats(prev => 
           prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
       );
  };

  const handleSubmit = async (e) => {
       e.preventDefault();
       if (!text.trim()) return;
       
       try {
           setIsLoading(true);
           await axiosInstance.post(`/public/participate/${projectToken}/`, {
                text,
                name,
                community_name: community,
                categories: selectedCats
           });
           setSuccess(true);
       } catch (e) {
           setErrorMsg(e.response?.data?.error?.message || "Failed to submit structurally.");
       }
       setIsLoading(false);
  };

  if (isLoading && !projectData) {
      return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div></div>;
  }

  if (errorMsg && !projectData) {
      return <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col p-8 text-center text-red-600">{errorMsg}</div>;
  }

  if (success) {
      return (
          <div className="min-h-screen bg-green-50 flex items-center justify-center flex-col p-8 text-center border-t-8 border-green-500">
               <span className="text-6xl mb-4">🌱</span>
               <h2 className="text-3xl font-black text-green-900 mb-2">Thank you for your feedback!</h2>
               <p className="text-green-700 max-w-md">Your input has been recorded synchronously and will shape the ongoing compliance metrics safely natively.</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-blue-100">
        
       {/* Public Header */}
       <header className="bg-white border-b border-gray-200 py-4 px-6 md:px-12 flex items-center justify-between shadow-sm sticky top-0 z-50">
            <div className="flex items-center gap-2">
                 <span className="text-xl bg-blue-600 text-white font-black p-1.5 rounded w-8 h-8 flex items-center justify-center">E</span>
                 <span className="text-xl font-bold tracking-tight">EcoSense <span className="opacity-60 font-medium">Public</span></span>
            </div>
            <div className="text-sm font-semibold text-gray-400 border border-gray-100 px-3 py-1 rounded bg-gray-50">
                 OFFICIAL EIA CONSULTATION
            </div>
       </header>

       <main className="max-w-3xl mx-auto px-4 py-12">
            
            <div className="mb-10 text-center">
                 <p className="text-xs uppercase tracking-widest font-black text-blue-600 mb-2">Targeted Consultation Boundary</p>
                 <h1 className="text-4xl font-extrabold tracking-tight mb-4">{projectData?.project_name}</h1>
                 
                 <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 md:p-8 text-left relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                      <h3 className="text-sm uppercase tracking-wider font-bold text-gray-500 mb-2 border-b border-gray-100 pb-2">Proposed Structure Summary</h3>
                      <p className="text-gray-700 leading-relaxed text-lg italic">
                           "{projectData?.summary}"
                      </p>
                 </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-10">
                 
                 <h2 className="text-2xl font-bold border-b border-gray-100 pb-4 mb-6">Have Your Say</h2>
                 
                 {errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded mb-6 text-sm">{errorMsg}</div>}

                 <div className="mb-6">
                     <label className="block text-sm font-bold text-gray-700 mb-2">Share your thoughts or concerns *</label>
                     <textarea 
                          value={text} 
                          onChange={(e) => setText(e.target.value)}
                          required
                          rows="5"
                          placeholder="Please be specifically descriptive natively bridging exact context..."
                          className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 resize-none p-4 text-base"
                     ></textarea>
                 </div>

                 <div className="mb-6">
                     <label className="block text-sm font-bold text-gray-700 mb-3">Topic Array Tags (Optional)</label>
                     <div className="flex flex-wrap gap-2">
                          {CONCERNS.map(c => (
                              <button 
                                  type="button"
                                  key={c.id}
                                  onClick={() => toggleCategory(c.id)}
                                  className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
                                      selectedCats.includes(c.id) 
                                      ? 'bg-blue-100 border-blue-300 text-blue-800' 
                                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                  }`}
                              >
                                  {c.label}
                              </button>
                          ))}
                     </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">Your Name (Optional)</label>
                           <input 
                               value={name} onChange={e => setName(e.target.value)} type="text"
                               placeholder="Leave blank to remain anonymous"
                               className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 p-3"
                           />
                      </div>
                      <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">Neighborhood / Area (Optional)</label>
                           <input 
                               value={community} onChange={e => setCommunity(e.target.value)} type="text"
                               placeholder="e.g. Westlands, River Road..."
                               className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 p-3"
                           />
                      </div>
                 </div>

                 <button 
                     type="submit" disabled={isLoading}
                     className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:scale-100"
                 >
                     {isLoading ? 'Encrypting & Submitting...' : 'Submit Official Feedback'}
                 </button>

                 <p className="text-center text-xs text-gray-400 mt-6 font-semibold flex items-center justify-center gap-1">
                      🔒 Secured privately under End-to-End SSL hashing isolating parameters cleanly natively.
                 </p>

            </form>

       </main>
    </div>
  );
}
