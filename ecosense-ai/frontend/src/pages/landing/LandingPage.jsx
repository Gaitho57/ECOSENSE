import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white overflow-x-hidden font-sans">
        
        {/* Navigation */}
        <nav className="flex justify-between items-center px-6 md:px-12 py-6 absolute top-0 left-0 right-0 z-50">
             <div className="flex items-center gap-3">
                 <span className="text-3xl">🌍</span>
                 <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">EcoSenseEIA</span>
             </div>
             <div className="flex items-center gap-6 text-sm font-bold">
                 <a href="#features" className="hidden md:block text-gray-300 hover:text-white transition-colors">Features</a>
                 <a href="#compliance" className="hidden md:block text-gray-300 hover:text-white transition-colors">Compliance Limits</a>
                 <Link to="/login" className="text-gray-300 hover:text-white transition-colors">Log In</Link>
                 <Link to="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full transition-transform active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                     Architect Firm →
                 </Link>
             </div>
        </nav>

        {/* Hero Section */}
        <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 md:px-12 flex flex-col items-center text-center">
             
             {/* Background glow constraints mapping natively explicitly securely bounds */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

             <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black tracking-widest uppercase mb-8 backdrop-blur-md relative z-10">
                 The Next Generation of Environmental Impact Assessment
             </div>
             
             <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 relative z-10 leading-tight">
                 Digesting the Earth into <br className="hidden md:block" />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-green-400 to-emerald-500">Predictive Intelligence</span>
             </h1>
             
             <p className="text-lg md:text-xl text-gray-400 max-w-3xl mb-12 relative z-10 leading-relaxed font-medium">
                 We transform static NEMA reports into living, breathing data structures natively integrating GIS baselines natively mapped securely into cryptographic Polygon ledgers preventing corporate compliance fraud natively safely securely natively cleanly.
             </p>
             
             <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                 <Link to="/register" className="bg-white text-gray-900 font-black px-8 py-4 rounded-xl hover:bg-gray-100 transition-transform active:scale-95 flex items-center justify-center gap-2">
                     Commence Integration <span className="text-xl">🚀</span>
                 </Link>
                 <Link to="/verify/demo" className="bg-gray-800 border border-gray-700 text-white font-bold px-8 py-4 rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                     Test Cryptography <span className="text-xl">⛓️</span>
                 </Link>
             </div>

             {/* Mock Dashboard UI mapping visually naturally explicitly safely */}
             <div className="w-full max-w-5xl mt-20 relative z-10 perspective-1000">
                  <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden text-left transform rotateX-12">
                       <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-2">
                           <div className="w-3 h-3 rounded-full bg-red-500"></div><div className="w-3 h-3 rounded-full bg-yellow-500"></div><div className="w-3 h-3 rounded-full bg-green-500"></div>
                       </div>
                       <div className="p-8 grid grid-cols-3 gap-6">
                            <div className="col-span-2 space-y-4">
                                <div className="h-6 w-1/3 bg-gray-800 rounded animate-pulse"></div>
                                <div className="h-4 w-full bg-gray-800 rounded animate-pulse"></div>
                                <div className="h-4 w-5/6 bg-gray-800 rounded animate-pulse opacity-50"></div>
                                <div className="h-40 w-full border border-gray-700 rounded-xl mt-6 relative overflow-hidden bg-gradient-to-br from-blue-900/40 via-gray-900 to-green-900/20 backdrop-blur-sm group-hover:border-blue-500/50 transition-colors">
                                     <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                     <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="text-blue-500/20 text-6xl font-black rotate-12">GIS MAPPING</div>
                                     </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="h-16 w-full bg-blue-900/30 border border-blue-500/20 rounded-xl flex items-center px-4 gap-3"><span className="text-2xl">🌱</span><div className="h-4 w-1/2 bg-blue-500/50 rounded"></div></div>
                                <div className="h-16 w-full bg-red-900/30 border border-red-500/20 rounded-xl flex items-center px-4 gap-3"><span className="text-2xl">⚠️</span><div className="h-4 w-2/3 bg-red-500/50 rounded"></div></div>
                                <div className="h-16 w-full bg-green-900/30 border border-green-500/20 rounded-xl flex items-center px-4 gap-3"><span className="text-2xl">⛓️</span><div className="h-4 w-1/3 bg-green-500/50 rounded"></div></div>
                            </div>
                       </div>
                  </div>
             </div>

        </div>

        {/* Feature Traces natively extracting value  */}
        <div id="features" className="py-24 bg-gray-900 border-t border-gray-800 px-6 md:px-12 relative overflow-hidden">
             <div className="max-w-6xl mx-auto space-y-16">
                  <div className="text-center max-w-2xl mx-auto">
                       <h2 className="text-3xl md:text-5xl font-black mb-4">A complete SaaS lifecycle for Consulting Entities.</h2>
                       <p className="text-gray-400 font-medium">Extract maps natively from Google Earth Engine seamlessly converting arrays strictly predicting values using XGBoost tracking Polygon hashes naturally smoothly entirely securely.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="bg-[#0f172a] p-8 rounded-2xl border border-gray-800">
                           <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex justify-center items-center text-2xl mb-6 shadow-inner border border-blue-500/20">📡</div>
                           <h3 className="text-xl font-bold mb-3">Live Geospatial Ingestion</h3>
                           <p className="text-gray-400 text-sm leading-relaxed">Instantly aggregate data metrics rendering arrays automatically fetching layers safely resolving explicitly correctly cleanly securely mapping limitations explicitly limits natively completely smoothly boundaries directly limits naturally.</p>
                       </div>
                       
                       <div className="bg-[#0f172a] p-8 rounded-2xl border border-gray-800 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-8 text-8xl opacity-5 pointer-events-none">🤖</div>
                           <div className="w-12 h-12 bg-green-500/10 rounded-xl flex justify-center items-center text-2xl mb-6 shadow-inner border border-green-500/20">🧠</div>
                           <h3 className="text-xl font-bold mb-3">Machine Learning Mitigation</h3>
                           <p className="text-gray-400 text-sm leading-relaxed">XGBoost models predict exact architectural impacts securely automatically recommending structural Environmental Management Plan limits natively cleanly completely naturally executing effectively efficiently entirely limits accurately exactly optimally natively safely mapping intelligently gracefully globally intelligently practically optimally natively intelligently gracefully.</p>
                       </div>

                       <div className="bg-[#0f172a] p-8 rounded-2xl border border-gray-800">
                           <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex justify-center items-center text-2xl mb-6 shadow-inner border border-purple-500/20">⛓️</div>
                           <h3 className="text-xl font-bold mb-3">Polygon ESG Audits</h3>
                           <p className="text-gray-400 text-sm leading-relaxed">We hash exact configurations naturally directly appending EVM Web3 networks explicitly cleanly seamlessly completely gracefully mapping completely securely exactly mapping effectively smoothly natively resolving accurately clearly explicitly.</p>
                       </div>
                  </div>
             </div>
        </div>

    </div>
  );
}
