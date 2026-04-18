import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';

/**
 * Sprint 4C — Tenant Analytics Dashboard.
 * Shows firm-level compliance trends, project status breakdown, and most common NEMA failures.
 */

function StatCard({ label, value, sub, color = 'bg-white' }) {
  return (
    <div className={`${color} rounded-2xl border border-gray-100 p-6 shadow-sm`}>
      <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-black text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function HorizontalBar({ label, value, max, color = 'bg-blue-500' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-36 shrink-0 truncate" title={label}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}

const GRADE_COLORS = { A: 'bg-green-500', B: 'bg-emerald-400', C: 'bg-amber-400', D: 'bg-orange-500', F: 'bg-red-500' };
const STATUS_ICONS = {
  scoping: '🗺️', baseline: '🌍', assessment: '🤖', review: '👥',
  submitted: '📬', approved: '✅', compliance: '⚖️', monitoring: '📡',
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/reports/analytics/')
      .then(r => setData(r.data.data))
      .catch(e => console.error('Analytics load failed:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-spin">📊</div>
        <p className="text-gray-500 font-medium">Aggregating analytics…</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">No analytics data available.</p>
    </div>
  );

  const maxFailure = Math.max(...(data.top_compliance_failures?.map(f => f.count) || [1]), 1);
  const statusTotal = Object.values(data.status_distribution || {}).reduce((a, b) => a + b, 0);
  const maxScore = Math.max(...(data.compliance_by_project_type?.map(t => t.avg_compliance_score || 0) || [100]), 100);

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10 space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Firm-wide EIA compliance and project performance insights</p>
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white border border-gray-200 px-3 py-1.5 rounded-lg">
          {data.total_projects} Projects
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Projects" value={data.total_projects} color="bg-white" />
        <StatCard label="Community Feedback" value={data.total_feedback}
          sub="Across all projects" color="bg-blue-50" />
        <StatCard
          label="Avg Compliance"
          value={data.compliance_by_project_type?.length > 0
            ? Math.round(data.compliance_by_project_type.reduce((s, t) => s + (t.avg_compliance_score || 0), 0) / data.compliance_by_project_type.length) + '%'
            : 'N/A'}
          color="bg-green-50"
        />
        <StatCard
          label="Submitted"
          value={data.status_distribution?.submitted || 0}
          sub="Reports submitted to NEMA"
          color="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Compliance by project type */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
          <h2 className="font-extrabold text-gray-800 text-base mb-5 flex items-center gap-2">
            <span>⚖️</span> Avg Compliance Score by Project Type
          </h2>
          {data.compliance_by_project_type?.length > 0 ? (
            <div className="space-y-4">
              {data.compliance_by_project_type
                .sort((a, b) => (b.avg_compliance_score || 0) - (a.avg_compliance_score || 0))
                .map(t => (
                  <div key={t.type} className="flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-700 w-36 shrink-0 capitalize">
                      {t.type?.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          (t.avg_compliance_score || 0) >= 80 ? 'bg-green-500' :
                          (t.avg_compliance_score || 0) >= 60 ? 'bg-amber-400' : 'bg-red-500'
                        }`}
                        style={{ width: `${t.avg_compliance_score || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-black text-gray-800 w-12 text-right">
                      {t.avg_compliance_score != null ? `${t.avg_compliance_score}%` : 'N/A'}
                    </span>
                    <span className="text-[10px] text-gray-400 w-16">{t.project_count} project{t.project_count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-6 text-center">No compliance data yet — generate reports to see scores.</p>
          )}
        </div>

        {/* Project status distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-extrabold text-gray-800 text-base mb-5 flex items-center gap-2">
            <span>📊</span> Project Status
          </h2>
          {Object.keys(data.status_distribution || {}).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(data.status_distribution).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-600 flex items-center gap-2">
                    <span>{STATUS_ICONS[status] || '•'}</span>
                    <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / statusTotal) * 100}%` }} />
                    </div>
                    <span className="text-sm font-black text-gray-800">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4 text-center">No projects yet.</p>
          )}
        </div>
      </div>

      {/* Top compliance failures */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-extrabold text-gray-800 text-base mb-5 flex items-center gap-2">
          <span>🚨</span> Most Common Compliance Failures
          <span className="text-[10px] text-gray-400 font-normal ml-2">Across all projects</span>
        </h2>
        {data.top_compliance_failures?.length > 0 ? (
          <div className="space-y-3">
            {data.top_compliance_failures.map((f, i) => (
              <div key={f.regulation_id} className="flex items-center gap-4">
                <span className="text-[10px] font-black text-gray-400 w-5">{i + 1}</span>
                <span className="text-xs font-bold text-gray-800 bg-red-50 border border-red-100 px-2 py-0.5 rounded w-28 text-center shrink-0">
                  {f.regulation_id}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full transition-all duration-700"
                    style={{ width: `${(f.count / maxFailure) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-black text-gray-700 w-8 text-right">{f.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="text-4xl">✅</span>
            <p className="text-gray-400 mt-2 text-sm">No compliance failures recorded — great work!</p>
          </div>
        )}
      </div>

    </div>
  );
}
