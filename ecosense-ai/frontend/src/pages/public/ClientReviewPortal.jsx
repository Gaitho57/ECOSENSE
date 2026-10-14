import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function ClientReviewPortal() {
  const { projectToken } = useParams();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(null);

  // M-Pesa STK Push states
  const [phoneNumber, setPhoneNumber] = useState('0712345678');
  const [stkPending, setStkPending] = useState(false);
  const [stkSuccessMsg, setStkSuccessMsg] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/reports/portal/${projectToken}/`);
      setData(res.data.data);
    } catch (err) {
      console.error('Portal load failed:', err);
      setErrorMsg('Unable to locate project review session. The link may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectToken) {
      fetchPortalData();
    }
  }, [projectToken]);

  const handleDownload = async (type) => {
    try {
      setDownloading(true);
      const endpoint = type === 'final'
        ? `/reports/portal/${projectToken}/download-final/`
        : `/reports/portal/${projectToken}/download-draft/`;

      const response = await axiosInstance.get(endpoint, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'final'
        ? `Official_NEMA_Submission_Package_${data?.project?.name?.replace(/\s+/g, '_') || 'Project'}.docx`
        : `DRAFT_Review_ESIA_Report_${data?.project?.name?.replace(/\s+/g, '_') || 'Project'}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      if (err.response?.status === 402) {
        alert('Payment Required: Milestone escrow balance must be cleared to release the unwatermarked final package.');
      } else {
        alert('Download failed. Please try again or refresh.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleInitiateStkPush = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      alert('Please enter a valid mobile number.');
      return;
    }

    try {
      setStkPending(true);
      setStkSuccessMsg('');
      const res = await axiosInstance.post(`/reports/portal/${projectToken}/stk-push/`, {
        phone: phoneNumber
      });
      const resData = res.data.data;
      setTransactionId(resData.transaction_id);
      setStkSuccessMsg(resData.message || 'STK Push sent to your mobile device. Enter your PIN.');
    } catch (err) {
      console.error('STK Push error:', err);
      alert('STK Push initiation failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setStkPending(false);
    }
  };

  const handleVerifyUnlock = async (simulate = true) => {
    try {
      setUnlocking(true);
      const res = await axiosInstance.post(`/reports/portal/${projectToken}/verify-unlock/`, {
        transaction_id: transactionId || null,
        simulate: simulate
      });
      const resData = res.data.data;
      if (resData.is_unlocked) {
        alert(`✅ Payment Cleared!\nReceipt: ${resData.receipt_number}\nStatutory NEMA Submission Package is now unlocked.`);
        await fetchPortalData();
      }
    } catch (err) {
      console.error('Verification error:', err);
      alert('Payment confirmation failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1329] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest font-black text-gray-400">Loading Client Review Portal...</p>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-[#0b1329] flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 rounded-2xl flex items-center justify-center text-3xl mb-4">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-red-400 mb-2">Review Session Not Found</h2>
        <p className="text-sm text-gray-400 max-w-md">{errorMsg || 'Invalid access token.'}</p>
      </div>
    );
  }

  const { project, report, escrow } = data;
  const isUnlocked = report?.is_unlocked || escrow?.is_cleared;

  return (
    <div className="min-h-screen bg-[#0b1329] text-gray-200 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-gray-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              🌿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">EcoSense AI</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Escrow Escrow Gateway
                </span>
              </div>
              <p className="text-xs text-gray-400">Statutory NEMA Kenya ESIA Milestone Delivery Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:inline">Track:</span>
            <span className={`text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
              project.statutory_track === 'SPR'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            }`}>
              {project.statutory_track} — {project.statutory_track === 'SPR' ? 'Summary Project Report' : 'Comprehensive Project Report'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Project Header Banner */}
        <div className="bg-[#131e38] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <span>📁 Statutory ESIA Study</span>
                <span>•</span>
                <span>Version {report.version}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                {project.name}
              </h1>
              <p className="text-sm text-gray-300 max-w-3xl">
                Proponent: <span className="text-white font-semibold">{project.proponent_name}</span> (KRA PIN: {project.proponent_pin})
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
              <div className="text-xs text-gray-400">Lead EIA Expert:</div>
              <div className="text-sm font-bold text-emerald-400">{project.lead_consultant}</div>
              <div className="text-xs font-mono text-gray-400 bg-gray-900/60 px-2 py-0.5 rounded border border-gray-800">
                Reg: {project.consultant_reg}
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Escrow Status & Action Card */}
        <div className={`rounded-2xl border p-6 md:p-8 transition-all shadow-2xl relative ${
          isUnlocked
            ? 'bg-gradient-to-br from-[#0c2e24] to-[#0f1f3d] border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.15)]'
            : 'bg-gradient-to-br from-[#27151a] to-[#0f172a] border-red-500/40 shadow-[0_0_35px_rgba(239,68,68,0.15)]'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3">
                <span className={`text-2xl ${isUnlocked ? 'animate-bounce' : ''}`}>
                  {isUnlocked ? '🔓' : '🔒'}
                </span>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    {isUnlocked
                      ? 'Milestone Escrow Cleared — Statutory Package Unlocked'
                      : 'Milestone Escrow Active — Watermarked Review Draft'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isUnlocked
                      ? `Settlement confirmed. Full statutory package unlocked at ${new Date(report.unlocked_at || Date.now()).toLocaleDateString()}.`
                      : 'Draft watermarked diagonally. Form 1/1B blue-ink signatures and NEMA Lead Expert practicing seal are withheld.'}
                  </p>
                </div>
              </div>

              {!isUnlocked && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-xs space-y-2 text-red-200">
                  <div className="flex items-center gap-2 font-bold text-red-400 uppercase tracking-wide text-[11px]">
                    <span>⚠️ Regulatory Delivery Safeguard</span>
                  </div>
                  <p>
                    You are reviewing a watermarked pre-clearance draft. Pursuant to the consultant escrow agreement,
                    final milestone clearance of <span className="font-extrabold text-white">KES {escrow.milestone_amount_kes.toLocaleString()}</span> releases
                    the pristine, unwatermarked Word & PDF package with official Lead Expert blue-ink signature attestation and rubber seal.
                  </p>
                </div>
              )}

              {isUnlocked && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-xs text-emerald-200 flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <div className="font-bold text-emerald-300">Ready for NEMA Portal Submission</div>
                    <p className="text-[11px] text-emerald-400/80">
                      Clean statutory document generated with embedded cadastral satellite maps, statutory 30m riparian buffers, and unmasked Form 1 & Form 1B declaration sheets.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons / Checkout Panel */}
            <div className="shrink-0 w-full lg:w-96 bg-[#0f172a]/80 border border-gray-800 rounded-xl p-5 space-y-4">
              
              {!isUnlocked ? (
                <>
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase">Milestone Balance</span>
                    <span className="text-xl font-black text-emerald-400">
                      KES {escrow.milestone_amount_kes.toLocaleString()}
                    </span>
                  </div>

                  {/* Watermarked Draft Download */}
                  <button
                    onClick={() => handleDownload('draft')}
                    disabled={downloading}
                    className="w-full py-2.5 px-4 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-700 text-xs font-extrabold text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>{downloading ? '⏳ Preparing...' : '📥 Download Watermarked Draft (.docx)'}</span>
                  </button>

                  {/* Safaricom M-Pesa STK Push Form */}
                  <form onSubmit={handleInitiateStkPush} className="space-y-3 pt-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Safaricom M-Pesa Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="07XXXXXXXX"
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={stkPending}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-colors shadow-md flex items-center gap-1.5"
                      >
                        {stkPending ? '⏳ Sending...' : '📱 STK Push'}
                      </button>
                    </div>

                    {stkSuccessMsg && (
                      <p className="text-[11px] text-emerald-400 font-medium animate-pulse">
                        {stkSuccessMsg}
                      </p>
                    )}
                  </form>

                  {/* Instant Verification Sandbox Trigger */}
                  <div className="pt-2 border-t border-gray-800/80">
                    <button
                      onClick={() => handleVerifyUnlock(true)}
                      disabled={unlocking}
                      className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                    >
                      <span>{unlocking ? '⚡ Confirming Escrow...' : '⚡ Settle Milestone & Unlock Package'}</span>
                    </button>
                    <p className="text-[10px] text-gray-500 text-center mt-1">
                      Simulates Daraja STK Push verification callback and generates final unwatermarked bundle.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center space-y-1 pb-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                      Status: Milestone Settled
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono block">
                      Daraja Ref: MPESA-MIL-VERIFIED
                    </span>
                  </div>

                  <button
                    onClick={() => handleDownload('final')}
                    disabled={downloading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xs transition-all shadow-xl shadow-emerald-900/50 flex items-center justify-center gap-2"
                  >
                    <span>{downloading ? '⏳ Packaging...' : '🚀 Download Final NEMA Package (.docx)'}</span>
                  </button>

                  <button
                    onClick={() => handleDownload('draft')}
                    disabled={downloading}
                    className="w-full py-2 px-3 rounded-lg border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 text-[11px] transition-colors"
                  >
                    Download Previous Draft Version
                  </button>
                </>
              )}

            </div>
          </div>
        </div>

        {/* Informational Tabs & Preview Matrices */}
        <div className="bg-[#131e38] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="border-b border-gray-800 px-6 flex gap-6 text-xs font-bold uppercase tracking-wider overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              1. Spatial & Cadastral Verification
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`py-4 border-b-2 transition-colors ${
                activeTab === 'photos'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              2. Ground Reconnaissance (Annex A)
            </button>
            <button
              onClick={() => setActiveTab('declarations')}
              className={`py-4 border-b-2 transition-colors ${
                activeTab === 'declarations'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              3. NEMA Form 1 & Form 1B Attestation
            </button>
          </div>

          <div className="p-6 md:p-8">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">GPS Centroid</span>
                    <p className="text-sm font-mono font-bold text-white">
                      {project.coordinates?.lat?.toFixed(5) || '-1.47770'}, {project.coordinates?.lng?.toFixed(5) || '36.96020'}
                    </p>
                  </div>
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Statutory Water Buffer</span>
                    <p className="text-sm font-bold text-emerald-400">
                      Water Act 2016 (30m Exclusion / 60m Cautionary)
                    </p>
                  </div>
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Statutory Review Window</span>
                    <p className="text-sm font-bold text-white">
                      {project.statutory_track === 'SPR' ? '7 Calendar Days' : '30–60 Calendar Days'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5 space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Automated High-Resolution Figures Included in Report
                  </h4>
                  <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-gray-200">Figure 1.2:</strong> Aerial Satellite Imagery with Cadastral Boundary Overlay, Centroid GPS Pin & Scale Bar.</li>
                    <li><strong className="text-gray-200">Figure 1.3:</strong> Ecological Sensitivity & Statutory 30-Meter Riparian Buffer Exclusion Zone.</li>
                    <li><strong className="text-gray-200">Anti-Hallucination Safeguards:</strong> Fully verified data points with deterministic missing tokens [MISSING: parameter] and [CONTRADICTION: details].</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400">
                  Pursuant to NEMA Technical Advisory Committee (TAC) guidelines, the photographic matrix below documents baseline ground terrain, vegetative cover, and setbacks:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { plate: 'Plate 1: Looking North', desc: 'Shows current baseline terrain, ground vegetation cover, and absence of sensitive surface wetlands.' },
                    { plate: 'Plate 2: Looking South', desc: 'Shows existing primary access road, public utility wayleave, and storm drainage alignment.' },
                    { plate: 'Plate 3: Cadastral Boundary East', desc: 'Shows boundary fence line, physical setbacks relative to neighboring plots, and existing trees.' },
                    { plate: 'Plate 4: Looking West (Receptors)', desc: 'Documents spatial separation distance to closest commercial/residential structures within 500m.' },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-gray-900/70 border border-gray-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{item.plate}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Geotagged</span>
                      </div>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'declarations' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Form 1 */}
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Form 1: Proponent Declaration</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isUnlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isUnlocked ? 'Signature Unlocked' : 'Signature Withheld'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Solemn submission oath committing to ESMP execution under EMCA Cap 387 Regulation 14.
                    </p>
                    <div className="text-xs font-mono p-3 bg-black/40 rounded border border-gray-800 text-gray-300">
                      {isUnlocked
                        ? '✓ Original Blue-Ink Signature Line: Active & Ready for Manual Signing'
                        : '🔒 [ STATUTORY SIGNATURE WITHHELD PENDING MILESTONE ESCROW CLEARANCE ]'}
                    </div>
                  </div>

                  {/* Form 1B */}
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Form 1B: Lead Expert Attestation</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isUnlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isUnlocked ? 'Seal & Stamp Unlocked' : 'Seal & Stamp Withheld'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      NEMA Lead Expert practicing certification and independent objective evaluation oath.
                    </p>
                    <div className="text-xs font-mono p-3 bg-black/40 rounded border border-gray-800 text-gray-300">
                      {isUnlocked
                        ? '✓ Official Practicing Rubber Stamp & Embossed Seal Box: Active & Cleared'
                        : '🔒 [ OFFICIAL NEMA PRACTICING RUBBER STAMP & EMBOSSED SEAL WITHHELD ]'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
