import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import satellitePlaceholder from '../../assets/placeholders/satellite_unavailable.png';

// ─── Traffic light helper ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  complete:     { color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', label: 'Complete',     icon: '✅' },
  in_progress:  { color: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', label: 'In Progress',  icon: '🔄' },
  not_started:  { color: 'bg-gray-300',   text: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',  label: 'Not Started',  icon: '○' },
  running:      { color: 'bg-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  label: 'Running',      icon: '⏳' },
  failed:       { color: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   label: 'Failed',       icon: '❌' },
  pending_expert_review: { color: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Expert Review', icon: '📝' },
  ready_for_submission:  { color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  label: 'Ready to Submit', icon: '🚀' },
  submitted:    { color: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  label: 'Submitted',    icon: '📬' },
};

function trafficLight(s) {
  return STATUS_CONFIG[s] || STATUS_CONFIG.not_started;
}

function ModuleCard({ icon, title, subtitle, status, to, detail }) {
  const cfg = trafficLight(status);
  return (
    <Link to={to} className={`block rounded-2xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`}></span>
          <span className={`text-[10px] font-black uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
        </div>
      </div>
      <h3 className="font-extrabold text-gray-900 text-sm">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      {detail && <p className={`text-xs font-bold mt-2 ${cfg.text}`}>{detail}</p>}
    </Link>
  );
}

function CountdownClock({ daysRemaining, submittedAt, ref_no }) {
  const pct = Math.max(0, Math.min(100, ((30 - daysRemaining) / 30) * 100));
  const isUrgent = daysRemaining <= 7;

  return (
    <div className={`rounded-2xl border p-6 ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
            {isUrgent ? '⚠️ NEMA Review Deadline Approaching' : '📬 NEMA Review Period'}
          </p>
          <p className="text-xs text-gray-500">Ref: <span className="font-bold text-gray-800">{ref_no}</span></p>
        </div>
        <div className={`text-right ${isUrgent ? 'text-red-700' : 'text-blue-700'}`}>
          <div className="text-4xl font-black">{daysRemaining}</div>
          <div className="text-[10px] font-bold uppercase">days left</div>
        </div>
      </div>
      <div className="h-2 bg-white rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5">Submitted {new Date(submittedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
  );
}

export default function ProjectOverviewPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject]   = useState(null);
  const [dashStats, setDashStats] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, statsRes] = await Promise.all([
          axiosInstance.get(`/projects/${projectId}/`),
          axiosInstance.get(`/reports/${projectId}/dashboard-stats/`),
        ]);
        setProject(projRes.data.data);
        setDashStats(statsRes.data.data);
      } catch (e) {
        console.error("Dashboard load failed:", e);
      }
    };
    load();
  }, [projectId]);

  const handleSubmitToNEMA = async () => {
    if (!window.confirm('Submit this report to NEMA? This will start the official 30-day review clock.')) return;
    setSubmitting(true);
    try {
      const res = await axiosInstance.post(`/reports/${projectId}/submit/`);
      const data = res.data.data;
      alert(`✅ Submitted!\nRef: ${data.submission_ref}\nDeadline: ${new Date(data.review_deadline).toLocaleDateString()}`);
      // Refresh stats
      const statsRes = await axiosInstance.get(`/reports/${projectId}/dashboard-stats/`);
      setDashStats(statsRes.data.data);
    } catch (e) {
      alert('Submission failed: ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (!project) return (
    <div className="p-10 animate-pulse text-gray-400 font-bold tracking-widest uppercase text-center">
      Loading Intelligence Dashboard…
    </div>
  );

  const mods = dashStats?.modules || {};
  const blockers = dashStats?.blockers || [];
  const clock = dashStats?.submission_clock;

  const PIPELINE_STAGES = [
    { id: 'scoping',    label: '1. Scoping',     path: `/dashboard/projects/${projectId}/map` },
    { id: 'baseline',   label: '2. Baseline',    path: `/dashboard/projects/${projectId}/baseline` },
    { id: 'assessment', label: '3. ML Engine',   path: `/dashboard/projects/${projectId}/predictions` },
    { id: 'review',     label: '4. Community',   path: `/dashboard/projects/${projectId}/community` },
    { id: 'submitted',  label: '5. Report',      path: `/dashboard/projects/${projectId}/report` },
    { id: 'approved',   label: '6. NEMA Submit', path: `/dashboard/projects/${projectId}` },
    { id: 'compliance', label: '7. Compliance',  path: `/dashboard/projects/${projectId}/compliance` },
    { id: 'monitoring', label: '8. ESG Monitor', path: `/dashboard/projects/${projectId}/monitoring` },
  ];
  const statusIndexMap = { scoping: 0, baseline: 1, assessment: 2, review: 3, submitted: 4, approved: 5, compliance: 6, monitoring: 7 };
  const currentIndex = statusIndexMap[project.status] ?? 0;
  const nextTarget = PIPELINE_STAGES[currentIndex];

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-gray-50 min-h-screen">

      {/* ── Project Header ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 flex flex-col md:flex-row md:items-end justify-between gap-6 shadow-sm">
        <div className="flex-1">
          <div className="flex gap-3 mb-3 flex-wrap">
            <span className="text-[10px] uppercase font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-sm border border-blue-100">
              {project.project_type?.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] uppercase font-black text-gray-500 bg-gray-100 px-3 py-1 rounded-sm border border-gray-200">
              Scale: {project.scale_value || 0}
            </span>
            <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-sm border ${
              project.nema_category === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
              project.nema_category === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
              'bg-green-50 text-green-600 border-green-100'
            }`}>
              {project.nema_category?.toUpperCase()} — {project.nema_category === 'high' ? 'Full Study' : 'SPR'}
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{project.name}</h1>
          <p className="text-gray-500 max-w-3xl mt-3 text-sm leading-relaxed">{project.description || 'Project initialized for statutory EIA assessment.'}</p>
          <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-2">
              👨‍💼 Expert: <span className="text-gray-800">{project.lead_consultant_name || 'N/A'}</span>
            </span>
            <span className="text-xs font-bold text-gray-500 flex items-center gap-2">
              📜 NEMA Ref: <span className="text-gray-800">{project.nema_ref || 'Pending'}</span>
            </span>
          </div>
        </div>
        <div className="w-full md:w-64 h-40 bg-gray-100 rounded-xl border-2 border-gray-200 overflow-hidden relative shadow-inner shrink-0 hover:border-blue-400 transition-colors">
          <div className="absolute inset-0" style={{
            background: project.mapbox_token
              ? `url("https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${project.coordinates?.lng || 36.8219},${project.coordinates?.lat || -1.2921},12,0/300x200?access_token=${project.mapbox_token}") center/cover`
              : `url(${satellitePlaceholder}) center/cover`
          }}>
            <div className="absolute inset-0 bg-blue-900/10 mix-blend-multiply" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl drop-shadow-md">📍</span></div>
        </div>
      </div>

      {/* ── Pipeline Progress Bar ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-extrabold text-gray-800 text-lg">EIA Lifecycle Pipeline</h2>
          <button onClick={() => navigate(nextTarget.path)}
            className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-transform active:scale-95 shadow-md">
            Continue → {nextTarget.label}
          </button>
        </div>
        <div className="relative">
          <div className="absolute top-4 left-0 right-0 h-1 bg-gray-100 rounded-full overflow-hidden -translate-y-1/2 z-0">
            <div className="h-full bg-blue-500 transition-all duration-1000 ease-in-out" style={{ width: `${(currentIndex / (PIPELINE_STAGES.length - 1)) * 100}%` }} />
          </div>
          <div className="flex justify-between relative z-10 w-full overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((s, i) => {
              const isCompleted = i < currentIndex;
              const isActive = i === currentIndex;
              return (
                <Link key={s.id} to={s.path} className="flex flex-col items-center gap-3 shrink-0 px-2 w-28 group">
                  <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center bg-white shadow-sm transition-all ${
                    isCompleted ? 'border-blue-500 text-blue-500' :
                    isActive ? 'border-gray-800 text-gray-800 scale-125' : 'border-gray-200'
                  }`}>
                    {isCompleted ? <span className="text-sm font-black">✓</span> : <span className="w-2.5 h-2.5 rounded-full bg-current" />}
                  </div>
                  <span className={`text-[9px] uppercase font-black tracking-widest text-center ${
                    isActive ? 'text-gray-900 underline decoration-2 underline-offset-4' : 'text-gray-400 group-hover:text-gray-700'
                  }`}>{s.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Module Traffic Lights ─────────────────────────────────────────── */}
      <div>
        <h2 className="font-extrabold text-gray-700 text-sm uppercase tracking-widest mb-4">Live Module Status</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ModuleCard icon="🌍" title="Environmental Baseline"
            subtitle={`Sensitivity: ${mods.baseline?.sensitivity_grade || '—'}`}
            status={mods.baseline?.status || 'not_started'}
            to={`/dashboard/projects/${projectId}/baseline`}
          />
          <ModuleCard icon="🤖" title="ML Impact Predictions"
            subtitle={`${mods.predictions?.count || 0} impacts modelled`}
            status={mods.predictions?.status || 'not_started'}
            to={`/dashboard/projects/${projectId}/predictions`}
          />
          <ModuleCard icon="👥" title="Public Participation"
            subtitle={`${mods.community?.feedback_count || 0} / 10 min. feedback`}
            status={mods.community?.status || 'not_started'}
            to={`/dashboard/projects/${projectId}/community`}
          />
          <ModuleCard icon="📄" title="EIA Report"
            subtitle={mods.report?.compliance_score != null ? `Compliance: ${mods.report.compliance_score}% (${mods.report.compliance_grade})` : 'Not generated'}
            status={mods.report?.status || 'not_started'}
            to={`/dashboard/projects/${projectId}/report`}
          />
        </div>
      </div>

      {/* ── Blockers + Submission ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Blockers panel */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h3 className="font-extrabold text-gray-800 text-lg mb-5 flex items-center gap-2">
            <span className="bg-red-600 p-2 rounded-lg text-white text-sm">🚧</span>
            Submission Blockers
          </h3>
          {blockers.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="text-4xl mb-3">🎉</span>
              <p className="font-bold text-green-700">All checks passed!</p>
              <p className="text-sm text-gray-500 mt-1">This project is ready to submit to NEMA.</p>
              {dashStats?.ready_to_submit && (
                <button
                  onClick={handleSubmitToNEMA}
                  disabled={submitting}
                  className="mt-5 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-black py-3 px-6 rounded-xl text-sm shadow-lg transition-all"
                >
                  {submitting ? '⏳ Submitting…' : '🚀 Submit to NEMA'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {blockers.map((b, i) => (
                <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                  <span className="text-red-500 mt-0.5 shrink-0">⚠️</span>
                  <div>
                    <p className="text-xs font-black text-red-700 uppercase tracking-wide">{b.module}</p>
                    <p className="text-xs text-red-600 mt-0.5">{b.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NEMA clock or AI thinking panel */}
        <div>
          {clock ? (
            <CountdownClock
              daysRemaining={clock.days_remaining}
              submittedAt={clock.submitted_at}
              ref_no={clock.submission_ref}
            />
          ) : (
            <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl">🛡️</div>
              <h3 className="font-extrabold text-white text-lg mb-2 relative z-10">AI Thinking: Mitigation Impact</h3>
              <p className="text-gray-400 text-sm mb-6 relative z-10">Pre/post mitigation significance comparison from the prediction engine.</p>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between bg-gray-800 rounded-xl p-4">
                  <div>
                    <span className="text-[10px] font-black text-red-400 uppercase">Baseline Risk</span>
                    <div className="text-3xl font-black">CRITICAL</div>
                  </div>
                  <span className="text-gray-600 text-2xl">→</span>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-green-400 uppercase">Mitigated Risk</span>
                    <div className="text-3xl font-black text-green-400">LOW</div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed italic">
                  {project.thinking_summary || "The engine is analysing project-specific ecological sensitivities and statutory constraints…"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
