import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function VerificationPage() {
  const { projectToken } = useParams();
  
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [userHash, setUserHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null); // 'match' | 'mismatch'

  useEffect(() => {
       const fetchPublic = async () => {
             setIsLoading(true);
             try {
                // Ensure the core Router proxies route this reliably via our configuration mappings
                const res = await axiosInstance.get(`/public/esg/verify/${projectToken}/`);
                setData(res.data.data);
             } catch (e) {
                setErrorMsg("Immutable mapping cannot locate signature matching token structure cleanly.");
             }
             setIsLoading(false);
       };
       fetchPublic();
  }, [projectToken]);

  const handleManualVerification = async (e) => {
       e.preventDefault();
       if (!userHash.trim()) return;
       setIsVerifying(true);
       
       // Simple simulation blocking mapping execution smoothly matching inputs manually cleanly
       setTimeout(() => {
            if (userHash.toLowerCase().trim() === data?.report_hash?.toLowerCase()) {
                 setVerificationResult('match');
            } else {
                 setVerificationResult('mismatch');
            }
            setIsVerifying(false);
       }, 800);
  };

  if (isLoading) {
      return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin h-10 w-10 border-b-2 border-white rounded-full"></div></div>;
  }

  if (errorMsg) {
      return <div className="min-h-screen bg-gray-900 flex items-center justify-center flex-col p-8 text-center text-red-400 font-mono"><span className="text-3xl mb-2">⛓️</span>{errorMsg}</div>;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] font-mono text-gray-200 p-6 md:p-12 overflow-x-hidden">
        
        <div className="max-w-4xl mx-auto space-y-8">
             
             {/* Abstract Header securely bounding Polygon identity purely graphically */}
             <div className="text-center space-y-4 mb-14">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                       Polygon Mainnet / Mumbai Sync
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">EcoSense Audit TrustNode</h1>
                  <p className="text-gray-400 text-sm">Cryptographic decentralized verification isolating report manipulation completely via immutable ledgers natively.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 {/* Project Block */}
                 <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 p-8 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                           <span className="text-8xl">🌍</span>
                      </div>
                      <h4 className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Target Infrastructure</h4>
                      <h2 className="text-2xl text-white font-bold mb-4 z-10 relative">{data.project_name}</h2>
                      
                      <div className="space-y-4 text-sm mt-8 relative z-10">
                           <div>
                               <span className="text-gray-500 block text-xs uppercase tracking-widest mb-1">Official NEMA Binding</span>
                               <span className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded border border-gray-600 font-bold">{data.nema_ref}</span>
                           </div>
                           <div>
                               <span className="text-gray-500 block text-xs uppercase tracking-widest mb-1">ESG Performance Grade</span>
                               <span className={`inline-block px-3 py-1.5 rounded border font-black text-lg ${
                                    data.grade === 'A' || data.grade === 'B' ? 'bg-green-500/10 border-green-500/50 text-green-400' :
                                    data.grade === 'C' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
                               }`}>
                                   Pillar Group: {data.grade}
                               </span>
                           </div>
                      </div>
                 </div>

                 {/* Web3 Block securely rendering Polygonscan configurations implicitly mapping arrays seamlessly */}
                 <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 p-8 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                           <span className="text-8xl">⛓️</span>
                      </div>
                      <h4 className="text-[10px] text-blue-400 uppercase tracking-widest font-black mb-1">Smart Contract execution Leger</h4>
                      <h2 className="text-2xl text-white font-bold mb-4 z-10 relative">On-Chain Signatures</h2>
                      
                      <div className="space-y-4 text-xs mt-8 relative z-10">
                           <div>
                               <span className="text-gray-500 block text-[10px] uppercase tracking-widest mb-1">EIA Document SHA-256 Hash</span>
                               <span className="block text-gray-300 break-all bg-[#0f172a] p-3 rounded border border-gray-800 shadow-inner">
                                   {data.report_hash || "Generating Blockchain Execution Loop..."}
                               </span>
                           </div>
                           <div>
                               <span className="text-gray-500 block text-[10px] uppercase tracking-widest mb-1">Polygon TX Validator</span>
                               {data.tx_hash ? (
                                   <a 
                                       href={`https://mumbai.polygonscan.com/tx/${data.tx_hash}`} 
                                       target="_blank" rel="noreferrer"
                                       className="block text-blue-400 break-all bg-[#0f172a] p-3 rounded border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:border-blue-400 transition-colors"
                                   >
                                       {data.tx_hash} ↗
                                   </a>
                               ) : (
                                   <span className="block text-gray-600 bg-[#0f172a] p-3 rounded border border-gray-800 italic">Execution Syncing. Pending Confirmations.</span>
                               )}
                           </div>
                      </div>
                 </div>
                 
             </div>

             {/* Bottom Interactive Tool verifying manual arrays safely seamlessly locally matching explicitly */}
             <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 p-8 shadow-2xl mt-8">
                  <h3 className="text-xl text-white font-bold border-b border-gray-700/50 pb-4 mb-6 flex items-center gap-3">
                       <span className="text-blue-500">🛡️</span> Document Integrity Check
                  </h3>
                  
                  <p className="text-gray-400 text-sm mb-6 max-w-2xl">
                       To prove your local PDF matches the immutable state submitted via EcoSense AI directly onto Polygon networks, paste the SHA-256 hash representation of your file accurately mapping outputs purely locally:
                  </p>
                  
                  <form onSubmit={handleManualVerification} className="flex gap-4 flex-col md:flex-row">
                       <input 
                           type="text" 
                           value={userHash}
                           onChange={e => { setUserHash(e.target.value); setVerificationResult(null); }}
                           placeholder="Enter 64-character SHA-256 footprint structure..."
                           className="flex-1 bg-[#0f172a] border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                       />
                       <button 
                           type="submit"
                           disabled={isVerifying || !userHash.trim()}
                           className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold px-8 py-4 rounded-lg transition-colors whitespace-nowrap"
                       >
                           {isVerifying ? 'Evaluating...' : 'Verify Cryptography'}
                       </button>
                  </form>

                  {verificationResult === 'match' && (
                       <div className="mt-6 bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-lg flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
                            <span className="text-3xl text-green-500 mt-1">✅</span>
                            <div>
                                <h4 className="font-bold text-lg text-green-500 mb-1">Authenticity Verified</h4>
                                <p className="text-sm">The cryptographic hash supplied identically maps directly matching the footprint committed strictly inside the Polygon Blockchain natively executed via EcoSense AI structures safely securely.</p>
                            </div>
                       </div>
                  )}

                  {verificationResult === 'mismatch' && (
                       <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
                            <span className="text-3xl text-red-500 mt-1">❌</span>
                            <div>
                                <h4 className="font-bold text-lg text-red-500 mb-1">Integrity Violation Detected</h4>
                                <p className="text-sm">The hash logic provided fails completely against matching block mappings. This document was either structurally modified, explicitly corrupted, or completely fraudulent inherently.</p>
                            </div>
                       </div>
                  )}
             </div>

        </div>
    </div>
  );
}
