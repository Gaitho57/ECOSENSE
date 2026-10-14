import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import CountdownBadge from '../../components/radar/CountdownBadge';

export default function NEMARadarPage() {
  const [notices, setNotices] = useState([]);
  const [stats, setStats] = useState({ total: 0, matched: 0, urgent: 0 });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Filters & search
  const [search, setSearch] = useState('');
  const [countyFilter, setCountyFilter] = useState('');
  const [matchedOnly, setMatchedOnly] = useState(false);

  // Manual ingest modal
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [rawGazetteText, setRawGazetteText] = useState('');
  const [gazetteIssue, setGazetteIssue] = useState('Kenya Gazette Vol. CXXVI - No. 120');

  // Selected notice for detail inspection modal
  const [selectedNotice, setSelectedNotice] = useState(null);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (countyFilter) params.county = countyFilter;
      if (matchedOnly) params.matched = true;

      const res = await axiosInstance.get('/reports/radar/', { params });
      const data = res.data.data;
      const list = data.notices || [];
      setNotices(list);

      // Compute stats
      const urgentCount = list.filter(n => n.days_remaining !== null && n.days_remaining > 0 && n.days_remaining < 10).length;
      setStats({
        total: data.total_notices || list.length,
        matched: data.matched_notices || list.filter(n => n.matched_project).length,
        urgent: urgentCount
      });
    } catch (err) {
      console.error('Failed to fetch NEMA Radar notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [search, countyFilter, matchedOnly]);

  const handleTriggerScan = async (scanType = 'demo') => {
    try {
      setScanning(true);
      const payload = { scan_type: scanType };
      if (scanType === 'custom') {
        payload.raw_text = rawGazetteText;
        payload.gazette_issue = gazetteIssue;
      }

      const res = await axiosInstance.post('/reports/radar/scan/', payload);
      alert(`✅ Scan Completed!\n${res.data.data.message}`);
      setShowIngestModal(false);
      setRawGazetteText('');
      await fetchNotices();
    } catch (err) {
      console.error('Scan error:', err);
      alert('Failed to trigger scan: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-6 lg:p-10 font-sans text-gray-800 space-y-8">
      
      {/* Page Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📡</span>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Weekly Kenya Gazette Feed Watcher
            </span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">NEMA Radar Watcher</h1>
          <p className="text-gray-500 text-sm mt-1 max-w-3xl">
            Continuously ingests weekly Kenya Gazette Environmental Impact Assessment notices.
            Correlates public notices against your firm's pipeline via cadastral plot numbers and proponent names
            to track statutory 30-day public comment windows.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowIngestModal(true)}
            className="border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <span>📋 Ingest Gazette Text</span>
          </button>

          <button
            onClick={() => handleTriggerScan('demo')}
            disabled={scanning}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs py-2.5 px-5 rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <span>{scanning ? '⏳ Scanning Gazette Feed...' : '📡 Scan Live Gazette Feed'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Ingested Notices</span>
          <div className="text-2xl font-black text-gray-900">{stats.total}</div>
          <p className="text-[11px] text-gray-500">Weekly Kenya Gazette EIA issues</p>
        </div>

        <div className="bg-white border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Firm Project Matches</span>
          <div className="text-2xl font-black text-emerald-600">{stats.matched}</div>
          <p className="text-[11px] text-emerald-700/80">Matched by plot no. or proponent</p>
        </div>

        <div className="bg-white border border-red-200 bg-gradient-to-br from-white to-red-50/30 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-600">Urgent Windows (&lt; 10 Days)</span>
          <div className="text-2xl font-black text-red-600">{stats.urgent}</div>
          <p className="text-[11px] text-red-700/80">Statutory public comment deadline closing</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Statutory Comment Window</span>
          <div className="text-2xl font-black text-gray-900">30 Days</div>
          <p className="text-[11px] text-gray-500">EMCA Cap 387 Second Schedule</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full md:w-auto flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project title, proponent, county, or plot number..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <select
            value={countyFilter}
            onChange={(e) => setCountyFilter(e.target.value)}
            className="border border-gray-300 rounded-xl text-xs py-2 px-3 bg-gray-50/50 focus:bg-white text-gray-700 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Counties</option>
            <option value="Kajiado">Kajiado</option>
            <option value="Machakos">Machakos</option>
            <option value="Kiambu">Kiambu</option>
            <option value="Nairobi">Nairobi</option>
            <option value="Nakuru">Nakuru</option>
            <option value="Kilifi">Kilifi</option>
          </select>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
            <input
              type="checkbox"
              checked={matchedOnly}
              onChange={(e) => setMatchedOnly(e.target.checked)}
              className="form-checkbox text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <span>Show Matched Projects Only ({stats.matched})</span>
          </label>
        </div>
      </div>

      {/* Notices Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
            Gazetted EIA Notices ({notices.length})
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">
            Published weekly by the Government Printer under EMCA Cap 387
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs uppercase font-bold tracking-widest">Loading Gazette Feed...</p>
          </div>
        ) : notices.length === 0 ? (
          <div className="py-20 text-center text-gray-400 space-y-2">
            <span className="text-4xl block">📡</span>
            <h4 className="text-sm font-bold text-gray-600">No Gazette Notices Found</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Click "Scan Live Gazette Feed" above to simulate ingestion of the latest weekly gazette notices.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-white border-b border-gray-100 uppercase tracking-wider text-[10px] font-black text-gray-400">
                <tr>
                  <th className="px-5 py-4">Notice No. & Issue</th>
                  <th className="px-5 py-4">Project & Proponent</th>
                  <th className="px-5 py-4">County / Plot</th>
                  <th className="px-5 py-4">Match Status</th>
                  <th className="px-5 py-4 text-center">30-Day Window</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {notices.map((n) => {
                  const isMatched = !!n.matched_project;
                  return (
                    <tr
                      key={n.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isMatched ? 'bg-emerald-50/30 font-medium' : ''
                      }`}
                    >
                      {/* Notice & Issue */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-extrabold text-gray-900">{n.notice_number}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{n.gazette_issue}</div>
                        <div className="text-[10px] text-gray-400">{n.publication_date}</div>
                      </td>

                      {/* Project Title & Proponent */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="font-bold text-gray-900 line-clamp-1">{n.project_title}</div>
                        <div className="text-[11px] text-gray-500 line-clamp-1">Proponent: {n.proponent_name}</div>
                      </td>

                      {/* County / Plot */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-800">{n.county}</div>
                        <div className="text-[10px] font-mono text-gray-400">Plot: {n.plot_number || 'N/A'}</div>
                      </td>

                      {/* Match Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isMatched ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              🎯 Matched ({(n.match_confidence * 100).toFixed(0)}%)
                            </span>
                            <div className="text-[10px] text-emerald-700 font-medium line-clamp-1">
                              {n.matched_project_name}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                            Public Industry Notice
                          </span>
                        )}
                      </td>

                      {/* 30-Day Window */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <CountdownBadge daysRemaining={n.days_remaining} />
                        <div className="text-[9px] text-gray-400 mt-1 font-mono">
                          Due: {n.public_comments_deadline || '—'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedNotice(n)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-white text-gray-700 text-[11px] font-bold transition-all shadow-sm"
                        >
                          Details 👁️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Ingest Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-xl w-full space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Ingest Kenya Gazette Raw Text</h3>
                <p className="text-xs text-gray-500">Paste text snippet from weekly Kenya Gazette PDF for regex extraction</p>
              </div>
              <button
                onClick={() => setShowIngestModal(false)}
                className="text-gray-400 hover:text-red-500 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Gazette Issue / Title</label>
                <input
                  type="text"
                  value={gazetteIssue}
                  onChange={(e) => setGazetteIssue(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Gazette Notice Snippet (Text)</label>
                <textarea
                  rows={8}
                  value={rawGazetteText}
                  onChange={(e) => setRawGazetteText(e.target.value)}
                  placeholder="Paste gazetted EIA notice paragraph here (e.g. 'GAZETTE NOTICE NO. 1142... THE ENVIRONMENTAL MANAGEMENT AND CO-ORDINATION ACT...')"
                  className="w-full text-xs font-mono border border-gray-300 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowIngestModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTriggerScan('custom')}
                disabled={scanning || !rawGazetteText.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs transition-colors shadow-md"
              >
                {scanning ? '⏳ Parsing & Correlating...' : '🚀 Parse & Match Notices'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice Details Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full space-y-6">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedNotice.notice_number}
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-2 leading-snug">
                  {selectedNotice.project_title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Proponent: <strong className="text-gray-800">{selectedNotice.proponent_name}</strong> • County: <strong className="text-gray-800">{selectedNotice.county}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedNotice(null)}
                className="text-gray-400 hover:text-red-500 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Cadastral Plot</span>
                  <p className="font-mono font-bold text-gray-800">{selectedNotice.plot_number || 'Not Specified'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Statutory Deadline</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-gray-800">{selectedNotice.public_comments_deadline}</span>
                    <CountdownBadge daysRemaining={selectedNotice.days_remaining} />
                  </div>
                </div>
              </div>

              {selectedNotice.matched_project && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <span>🎯 Active Firm Project Match</span>
                    <span className="text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded font-mono">
                      {(selectedNotice.match_confidence * 100).toFixed(0)}% Match
                    </span>
                  </div>
                  <p className="text-emerald-700">
                    Matched to: <strong>{selectedNotice.matched_project_name}</strong>
                  </p>
                  <p className="text-[11px] text-emerald-600">
                    Reason: {selectedNotice.match_reason}
                  </p>
                </div>
              )}

              <div>
                <h5 className="font-bold text-gray-700 uppercase tracking-wide text-[10px] mb-1">
                  Anticipated Environmental & Social Impacts
                </h5>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
                  {selectedNotice.anticipated_impacts || 'None specified in notice extract.'}
                </p>
              </div>

              <div>
                <h5 className="font-bold text-gray-700 uppercase tracking-wide text-[10px] mb-1">
                  Proposed Mitigation Measures (ESMP)
                </h5>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
                  {selectedNotice.proposed_mitigations || 'Standard ESMP mitigations committed by proponent.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setSelectedNotice(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
