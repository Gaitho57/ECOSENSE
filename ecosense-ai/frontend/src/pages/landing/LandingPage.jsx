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
                 <Link to="/login" className="text-gray-300 hover:text-white transition-colors">Log In</Link>
                 <Link to="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full transition-transform active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                     Architect Firm →
                 </Link>
             </div>
        </nav>

        {/* Hero Section */}
        <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 md:px-12 flex flex-col items-center text-center">
             
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

             <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black tracking-widest uppercase mb-8 backdrop-blur-md relative z-10">
                 The Next Generation of Environmental Impact Assessment
             </div>
             
             <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 relative z-10 leading-tight">
                 Modernizing Environmental <br className="hidden md:block" />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-green-400 to-emerald-500">Impact Assessments</span>
             </h1>
             
             <p className="text-lg md:text-xl text-gray-400 max-w-3xl mb-12 relative z-10 leading-relaxed font-medium">
                 We transform static, paper-based NEMA reports into dynamic compliance systems. Automate your geospatial baselines, digitize stakeholder engagement, and track your Environmental Management Plans (EMP) in real time.
             </p>
             
             <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                 <Link to="/register" className="bg-white text-gray-900 font-black px-8 py-4 rounded-xl hover:bg-gray-100 transition-transform active:scale-95 flex items-center justify-center gap-2">
                     Get Started <span className="text-xl">🚀</span>
                 </Link>
             </div>

             {/* TODO: Replace this placeholder div with an actual <img> tag of your dashboard screenshot */}
             <div className="w-full max-w-5xl mt-20 relative z-10 perspective-1000">
                  <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden text-left transform rotateX-12 h-96 flex items-center justify-center">
                       <p className="text-gray-500 text-xl font-bold">[ Your Dashboard Screenshot Goes Here ]</p>
                  </div>
             </div>

        </div>

        {/* Features */}
        <div id="features" className="py-24 bg-gray-900 border-t border-gray-800 px-6 md:px-12 relative overflow-hidden">
             <div className="max-w-6xl mx-auto space-y-16">
                  <div className="text-center max-w-2xl mx-auto">
                       <h2 className="text-3xl md:text-5xl font-black mb-4">A complete SaaS lifecycle for Consulting Entities.</h2>
                       <p className="text-gray-400 font-medium">From initial site visits to final regulator approval, EcoSense AI digitizes the entire compliance journey.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="bg-[#0f172a] p-8 rounded-2xl border border-gray-800">
                           <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex justify-center items-center text-2xl mb-6 shadow-inner border border-blue-500/20">📡</div>
                           <h3 className="text-xl font-bold mb-3">Automated GIS Baselining</h3>
                           <p className="text-gray-400 text-sm leading-relaxed">Stop manually hunting for shapefiles. EcoSense AI instantly aggregates high-resolution satellite imagery, terrain data, and local ecological metrics to generate comprehensive environmental baselines for any project site in seconds.</p>
                       </div>
                       
                       <div className="bg-[#0f172a] p-8 rounded-2xl border border-gray-800 relative overflow-hidden">
                           <div className="w-12 h-12 bg-green-500/10 rounded-xl flex justify-center items-center text-2xl mb-6 shadow-inner border border-green-500/20">📄</div>
                           <h3 className="text-xl font-bold mb-3">Instant NEMA-Compliant Reports</h3>
                           <p className="text-gray-400 text-sm leading-relaxed">Streamline your workflow from field data collection to final submission. Our engine automatically compiles your GIS baselines, community feedback, and predicted impacts into perfectly formatted, regulator-ready PDF and DOCX reports.</p>
                       </div>

                       <div className="bg-[#0f172a] p-8 rounded-2xl border border-gray-800">
                           <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex justify-center items-center text-2xl mb-6 shadow-inner border border-purple-500/20">💬</div>
                           <h3 className="text-xl font-bold mb-3">Digitized Community & EMP Tracking</h3>
                           <p className="text-gray-400 text-sm leading-relaxed">Replace paper sign-in sheets with automated SMS and WhatsApp stakeholder portals. Post-approval, seamlessly track your Environmental Management Plan (EMP) commitments with live dashboards and immutable audit logs.</p>
                       </div>
                  </div>
             </div>
        </div>

    </div>
  );
}
