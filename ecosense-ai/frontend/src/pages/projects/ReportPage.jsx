import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import SmartReviewer from '../../components/reports/SmartReviewer';

export default function ReportPage() {
  const { projectId = 'placeholder-id' } = useParams();

  const [reports, setReports]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [format, setFormat]           = useState('pdf');
  const [jurisdiction, setJurisdiction] = useState('NEMA_Kenya');
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [showReviewer, setShowReviewer] = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  const loadReports = async () => {
    try {
      const res = await axiosInstance.get(`/reports/${projectId}/reports/`);
      setReports(res.data.data || []);
    } catch (e) {
      console.error('Failed loading reports:', e);
    }
    setIsLoading(false);
  };

  useEffect(() => { loadReports(); }, [projectId]);

  // Poll for task completion
  useEffect(() => {
    let interval;
    if (activeTaskId) {
      interval = setInterval(async () => {
        try {
          const res = await axiosInstance.get(`/tasks/${activeTaskId}/`);
          const st = res.data.data.status;
          if (st === 'complete' || st === 'SUCCESS') {
            setActiveTaskId(null); setIsGenerating(false); setShowModal(false); loadReports();
          } else if (st === 'failed' || st === 'FAILURE') {
            setActiveTaskId(null); setIsGenerating(false);
            alert('Report generation failed. Check backend logs.');
          }
        } catch { clearInterval(interval); }
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [activeTaskId]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await axiosInstance.post(`/reports/${projectId}/generate-report/`, { format, jurisdiction });
      setActiveTaskId(res.data.data.task_id);
    } catch (e) {
      setIsGenerating(false);
      alert('Generation failed: ' + (e.response?.data?.error?.message || e.message));
    }
  };

  const handleDownload = async (downloadUrl, version, fmt) => {
    try {
      const res = await axiosInstance.get(downloadUrl, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `EIA_Report_v${version}.${fmt}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { alert('Download failed. Please try again.'); }
  };

  const handlePreview = async () => {
    // Open in a new tab — the backend serves HTML directly
    const token = axiosInstance.defaults.headers.common['Authorization']?.replace('Bearer ', '');
    window.open(`/api/v1/reports/${projectId}/preview/?token=${token}`, '_blank');
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit to NEMA? This starts the official 30-day review clock.')) return;
    setSubmitting(true);
    try {
      const res = await axiosInstance.post(`/reports/${projectId}/submit/`);
      const d = res.data.data;
      alert(`✅ Submitted!\nRef: ${d.submission_ref}\nDeadline: ${new Date(d.review_deadline).toLocaleDateString()}`);
      loadReports();
    } catch (e) {
      alert('Submission failed: ' + (e.response?.data?.error?.message || e.message));
    } finally { setSubmitting(false); }
  };

  // Latest ready report for Preview/Submit
  const latestReady = reports.find(r =>
    ['ready', 'ready_for_submission', 'pending_expert_review'].includes(r.status)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-1 overflow-hidden">

        {/* Main content */}
        <div className={`flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto ${showReviewer ? 'lg:pr-4' : ''}`}>

          {/* Header */}
          <div className="flex justify-between items-end border-b border-gray-200 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Professional Documentation</h1>
              <p className="text-gray-500 mt-1 max-w-2xl">Compile NEMA-compliant EIA study reports with full statutory annexes, compliance audit, and bilingual summaries.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {latestReady && (
                <>
                  <button
                    onClick={handlePreview}
                    className="border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-1.5"
                  >
                    👁️ Preview HTML
                  </button>
                  {latestReady.status === 'ready_for_submission' && (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 disabled:bg-gray-100 font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-1.5"
                    >
                      {submitting ? '⏳…' : '🚀 Submit to NEMA'}
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => setShowReviewer(v => !v)}
                className={`py-2 px-4 rounded-lg font-bold text-sm transition-colors ${showReviewer ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              >
                🤖 AI Reviewer
              </button>
              <button
                onClick={() => setShowModal(true)}
                disabled={isGenerating || !!activeTaskId}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md flex items-center gap-2"
              >
                📄 Generate Report
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Readiness checklist */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b pb-2 mb-4">Readiness Checklist</h3>
              <ul className="space-y-3">
                {[
                  'Project Description', 'Executive Summary', 'Policy & Legal Framework',
                  'Description of Environment', 'Impacts & Mitigation',
                  'Environmental Management Plan', 'Public Participation Summary',
                  'Conclusion', 'Appendices',
                ].map((name, i) => (
                  <li key={i} className="flex items-center justify-between text-sm py-1">
                    <span className="text-gray-600">{name}</span>
                    <span className="text-green-500 font-bold">✓ Ready</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reports table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Version Control</h3>
                  {isGenerating && <span className="text-blue-500 text-xs font-bold animate-pulse">⏳ Generating…</span>}
                </div>
                {isLoading ? (
                  <div className="p-10 text-center text-gray-400">Loading…</div>
                ) : reports.length === 0 ? (
                  <div className="p-16 text-center">
                    <span className="text-4xl text-gray-200 block mb-2">📁</span>
                    <h4 className="text-lg font-bold text-gray-400">No Reports Generated Yet</h4>
                    <p className="text-sm text-gray-400 mt-1">Click "Generate Report" above to create your first EIA document.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-white border-b border-gray-100 uppercase tracking-wider text-[10px] font-black text-gray-400">
                      <tr>
                        <th className="px-4 py-4">Vol.</th>
                        <th className="px-4 py-4">Format</th>
                        <th className="px-4 py-4 text-center">Compliance</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">Generated</th>
                        <th className="px-4 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reports.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap font-black text-gray-900">v{r.version}</td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${r.format === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {r.format}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {r.compliance_score != null ? (
                              <div className="flex flex-col items-center">
                                <span className={`text-sm font-black ${r.compliance_score >= 80 ? 'text-green-600' : r.compliance_score >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                                  {r.compliance_score}%
                                </span>
                                <span className="text-[9px] font-bold text-gray-400">Grade {r.compliance_grade}</span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-[10px] italic">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {r.status === 'submitted' ? (
                              <div>
                                <span className="text-blue-600 font-black text-[10px] uppercase flex items-center gap-1">📬 Submitted</span>
                                {r.submission_ref && <span className="text-[9px] text-gray-400">{r.submission_ref}</span>}
                              </div>
                            ) : r.status === 'ready_for_submission' ? (
                              <span className="text-green-600 font-black text-[10px] uppercase flex items-center gap-1">✅ Expert Signed</span>
                            ) : r.status === 'pending_expert_review' ? (
                              <div>
                                <span className="text-orange-500 font-bold text-[10px] uppercase">Expert Review</span>
                                <div className="flex gap-1 mt-1">
                                  <button onClick={async () => {
                                    try { await axiosInstance.post(`/reports/${projectId}/reports/${r.id}/expert-approve/`, { action: 'approve' }); loadReports(); }
                                    catch { alert('Action failed.'); }
                                  }} className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold hover:bg-green-200">Sign Off</button>
                                  <button onClick={async () => {
                                    try { await axiosInstance.post(`/reports/${projectId}/reports/${r.id}/expert-approve/`, { action: 'reject' }); loadReports(); }
                                    catch { alert('Action failed.'); }
                                  }} className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold hover:bg-red-200">Reject</button>
                                </div>
                              </div>
                            ) : r.status === 'generating' ? (
                              <span className="text-blue-500 font-bold text-[10px] uppercase animate-pulse">Compiling…</span>
                            ) : r.status === 'failed' ? (
                              <span className="text-red-500 font-bold text-[10px] uppercase">Failed</span>
                            ) : (
                              <span className="text-gray-500 font-bold text-[10px] uppercase">{r.status}</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-[10px] text-gray-500">
                            {r.generated_at ? new Date(r.generated_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="flex gap-1.5 justify-end">
                              {r.download_url && ['ready', 'ready_for_submission', 'pending_expert_review', 'submitted'].includes(r.status) && (
                                <button
                                  onClick={() => handleDownload(r.download_url, r.version, r.format)}
                                  className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-black px-3 py-1.5 rounded uppercase shadow-sm transition-all"
                                >
                                  ⬇ PDF
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Smart Reviewer sidebar */}
        {showReviewer && (
          <div className="w-80 border-l border-gray-200 shrink-0 flex flex-col">
            <SmartReviewer projectId={projectId} activeSectionId="report" />
          </div>
        )}
      </div>

      {/* Generation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900">Compile Professional Document</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
            </div>
            <form onSubmit={handleGenerate} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Templating Framework</label>
                <select value={jurisdiction} onChange={e => setJurisdiction(e.target.value)}
                  className="w-full border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-800 font-medium">
                  <option value="NEMA_Kenya">NEMA Environmental Standards (Kenya)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Export Format</label>
                <div className="flex gap-4">
                  {['pdf', 'docx'].map(f => (
                    <label key={f} className={`flex-1 flex gap-2 items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${format === f ? (f === 'pdf' ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50') : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" value={f} checked={format === f} onChange={() => setFormat(f)} className="form-radio" />
                      <span className="font-bold text-gray-800">{f === 'pdf' ? 'Professional PDF' : 'Word DOCX'}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={isGenerating || !!activeTaskId}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black py-4 rounded-xl transition-colors shadow-lg">
                {isGenerating || !!activeTaskId ? '⏳ Orchestrating AI Pipeline…' : 'Generate Compliance Report'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
