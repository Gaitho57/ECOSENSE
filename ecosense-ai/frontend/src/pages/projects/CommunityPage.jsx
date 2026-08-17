import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axiosInstance from '../../api/axiosInstance';
import ModuleHeader from '../../components/layout/ModuleHeader';

// ─── Collapsible Panel Wrapper ───────────────────────────────────────────────
function CollapsiblePanel({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none"
      >
        <span className="font-bold text-gray-800 text-sm tracking-wide">{title}</span>
        <span className={`text-gray-400 text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>&#9662;</span>
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  const { projectId = 'placeholder-id' } = useParams();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Filtering states
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);

  // ── Panel 1: Baraza ──────────────────────────────────────────────────────
  const [barazaForm, setBarazaForm] = useState({ datetime: '', location: '', chief_name: '', expected_attendance: 50 });
  const [barazaLoading, setBarazaLoading] = useState(false);
  const [barazaMsg, setBarazaMsg] = useState(null);
  const [lastBarazaId, setLastBarazaId] = useState(null);

  // ── Panel 2: Log Consultation ────────────────────────────────────────────
  const emptyEntry = () => ({ name: '', role: '', community: '', sentiment: 'neutral', comment: '' });
  const [consultEntries, setConsultEntries] = useState([{ name: '', role: '', community: '', sentiment: 'neutral', comment: '' }]);
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultMsg, setConsultMsg] = useState(null);

  // ── Panel 3: Upload Evidence ─────────────────────────────────────────────
  const [uploadFiles, setUploadFiles] = useState({ attendance: null, photos: [], clipping: null });
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadMsg, setUploadMsg] = useState(null);

  // ── Panel 4: SMS ─────────────────────────────────────────────────────────
  const [smsPhones, setSmsPhones] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsMsg, setSmsMsg] = useState(null);

  useEffect(() => {
     loadData();
  }, [projectId]);

  const loadData = async () => {
       setIsLoading(true);
       try {
           const res = await axiosInstance.get(`/community/${projectId}/dashboard/`);
           setFeedbacks(res.data.data || []);
       } catch (e) {
           console.error("Failed loading community tracking endpoints.");
       }
       setIsLoading(false);
  };

  const handleCompletePhase = async () => {
       setIsCompleting(true);
       try {
           // Move to Step 5: Document Generation
           await axiosInstance.patch(`/projects/${projectId}/`, { status: 'submitted' });
           navigate(`/dashboard/projects/${projectId}/report`);
       } catch (e) {
           console.error("Failed to advance project lifecycle stage.");
           alert("Phase advancement failed. Please try again.");
       }
       setIsCompleting(false);
  };

  const handleExport = () => {
       // Placeholder - M7 handles reporting exports
       alert('Export CSV will aggregate directly resolving down API structures natively.');
  };

  // ── Panel 1: Baraza submit ────────────────────────────────────────────────
  const handleBarazaSubmit = async () => {
    setBarazaLoading(true); setBarazaMsg(null);
    try {
      const res = await axiosInstance.post(`/community/${projectId}/baraza/`, {
        scheduled_datetime: barazaForm.datetime,
        location: barazaForm.location,
        chief_name: barazaForm.chief_name,
        expected_attendance: Number(barazaForm.expected_attendance),
      });
      setLastBarazaId(res.data?.id || res.data?.baraza_id || null);
      setBarazaMsg({ type: 'success', text: '✅ Baraza event scheduled successfully.' });
      setBarazaForm({ datetime: '', location: '', chief_name: '', expected_attendance: 50 });
    } catch (e) {
      setBarazaMsg({ type: 'error', text: '❌ Failed to schedule baraza.' });
    }
    setBarazaLoading(false);
  };

  // ── Panel 2: Consultation submit ──────────────────────────────────────────
  const updateEntry = (idx, field, val) =>
    setConsultEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));

  const handleConsultSubmit = async () => {
    setConsultLoading(true); setConsultMsg(null);
    try {
      await axiosInstance.post(`/community/${projectId}/log-consultation/`, {
        entries: consultEntries,
        ...(lastBarazaId ? { baraza_event_id: lastBarazaId } : {}),
      });
      setConsultMsg({ type: 'success', text: `✅ ${consultEntries.length} consultation entries logged.` });
      setConsultEntries([{ name: '', role: '', community: '', sentiment: 'neutral', comment: '' }]);
      await loadData();
    } catch (e) {
      setConsultMsg({ type: 'error', text: '❌ Failed to log consultation entries.' });
    }
    setConsultLoading(false);
  };

  // ── Panel 3: Upload evidence ──────────────────────────────────────────────
  const handleUploadEvidence = async () => {
    setUploadProgress(0); setUploadMsg(null);
    try {
      const fd = new FormData();
      if (uploadFiles.attendance) fd.append('attendance_register', uploadFiles.attendance);
      uploadFiles.photos.forEach((f, i) => fd.append(`baraza_photo_${i}`, f));
      if (uploadFiles.clipping) fd.append('newspaper_clipping', uploadFiles.clipping);
      await axiosInstance.post(`/community/${projectId}/upload-evidence/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
      });
      setUploadMsg({ type: 'success', text: '✅ Evidence uploaded successfully.' });
      setUploadFiles({ attendance: null, photos: [], clipping: null });
      setUploadProgress(null);
    } catch (e) {
      setUploadMsg({ type: 'error', text: '❌ Upload failed. Please try again.' });
      setUploadProgress(null);
    }
  };

  // ── Panel 4: SMS submit ────────────────────────────────────────────────────
  const handleSmsSubmit = async () => {
    setSmsLoading(true); setSmsMsg(null);
    const phones = smsPhones.split('\n').map(p => p.trim()).filter(Boolean);
    try {
      const res = await axiosInstance.post(`/community/${projectId}/sms-campaign/`, { phone_numbers: phones, message: smsBody });
      const count = res.data?.count || res.data?.messages_logged || phones.length;
      setSmsMsg({ type: 'success', text: `✅ Campaign logged: ${count} simulated messages recorded.` });
      setSmsPhones(''); setSmsBody('');
    } catch (e) {
      setSmsMsg({ type: 'error', text: '❌ SMS campaign failed to log.' });
    }
    setSmsLoading(false);
  };

  // ── Panel 5: Gazette download ─────────────────────────────────────────────
  const downloadGazette = async (fmt) => {
    try {
      const res = await axiosInstance.get(`/community/${projectId}/gazette/${fmt}/`, { responseType: 'blob' });
      const mime = fmt === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      if (fmt === 'pdf') { window.open(url, '_blank'); }
      else { const a = document.createElement('a'); a.href = url; a.download = `gazette_notice_${projectId}.docx`; a.click(); }
      URL.revokeObjectURL(url);
    } catch (e) { alert('Failed to download gazette notice.'); }
  };

  // ── Shared style helpers ──────────────────────────────────────────────────
  const inputCls = 'w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent';
  const labelCls = 'block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1';
  const MsgBox = ({ msg }) => msg ? (
    <div className={`mt-3 text-sm rounded-lg px-4 py-2 font-semibold ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
      {msg.text}
    </div>
  ) : null;

  // ── DropZone helper (defined inside component so it can use local state) ───
  const DropZone = ({ label, accept, multiple, fileVal, onChange }) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);
    const handleDrop = e => {
      e.preventDefault(); setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      onChange(multiple ? files : files[0]);
    };
    return (
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current && inputRef.current.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden"
          onChange={e => onChange(multiple ? Array.from(e.target.files) : e.target.files[0])} />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        {fileVal ? (
          <p className="text-xs text-green-600 font-semibold">
            {Array.isArray(fileVal) ? `${fileVal.length} file(s) selected` : fileVal.name}
          </p>
        ) : (
          <p className="text-xs text-gray-400">Drag & drop or click to select</p>
        )}
      </div>
    );
  };

  // derived metrics structurally
  const smsCount = feedbacks.filter(f => f.channel === 'sms').length;
  const webCount = feedbacks.filter(f => f.channel === 'web').length;
  const whatsappCount = feedbacks.filter(f => f.channel === 'whatsapp').length;
  const posCount = feedbacks.filter(f => f.sentiment === 'positive').length;
  const negCount = feedbacks.filter(f => f.sentiment === 'negative').length;
  const neuCount = feedbacks.filter(f => f.sentiment === 'neutral').length;

  const sentimentData = [
      { name: 'Positive', value: posCount, color: '#22c55e' },
      { name: 'Neutral', value: neuCount, color: '#9ca3af' },
      { name: 'Negative', value: negCount, color: '#ef4444' }
  ];

  // Map category distributions
  const catMap = {};
  feedbacks.forEach(f => {
       f.categories.forEach(c => {
           catMap[c] = (catMap[c] || 0) + 1;
       })
  });
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

  const filteredFeedbacks = feedbacks.filter(f => {
       if (filterChannel !== 'all' && f.channel !== filterChannel) return false;
       if (filterSentiment !== 'all' && f.sentiment !== filterSentiment) return false;
       return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10 space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
          <ModuleHeader 
            icon="👥"
            title="Community Engagement"
            description="NLP Aggregation mapping public participation via SMS payloads and direct portal metrics cleanly."
          />
          <div className="flex gap-4">
              <Link to={`/participate/${projectId}`} target="_blank" className="bg-blue-50 text-blue-700 font-bold py-2 px-6 rounded-lg opacity-90 hover:opacity-100 transition-opacity flex items-center">
                  View Public Portal
              </Link>
              <button 
                  onClick={handleCompletePhase} 
                  disabled={isCompleting}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md disabled:opacity-50"
              >
                  {isCompleting ? 'Processing...' : 'Complete Phase'}
              </button>
              <button onClick={handleExport} className="bg-gray-900 hover:bg-black text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md">
                  Export CSV
              </button>
          </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
              <span className="text-xs uppercase font-bold tracking-wider text-gray-400">Total Insights</span>
              <span className="text-3xl font-black text-gray-800 mt-1">{feedbacks.length}</span>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
              <span className="text-xs uppercase font-bold tracking-wider text-gray-400">SMS Direct</span>
              <span className="text-3xl font-black text-blue-600 mt-1">{smsCount}</span>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
              <span className="text-xs uppercase font-bold tracking-wider text-gray-400">WhatsApp</span>
              <span className="text-3xl font-black text-green-500 mt-1">{whatsappCount}</span>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
              <span className="text-xs uppercase font-bold tracking-wider text-gray-400">Web Portal</span>
              <span className="text-3xl font-black text-orange-500 mt-1">{webCount}</span>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
              <span className="text-xs uppercase font-bold tracking-wider text-gray-400">Positive Index</span>
              <span className="text-3xl font-black text-green-600 mt-1">
                  {feedbacks.length ? Math.round((posCount / feedbacks.length)*100) : 0}%
              </span>
          </div>
      </div>

      {/* Row 1: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col">
               <h3 className="text-sm uppercase tracking-wider font-bold text-gray-500 mb-4 border-b border-gray-100 pb-2">Sentiment Distribution</h3>
               <div className="flex-1 w-full">
                   {feedbacks.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie data={sentimentData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                             {sentimentData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                           </Pie>
                           <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                         </PieChart>
                       </ResponsiveContainer>
                   ) : (
                       <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data established yet.</div>
                   )}
               </div>
           </div>

           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col">
               <h3 className="text-sm uppercase tracking-wider font-bold text-gray-500 mb-4 border-b border-gray-100 pb-2">Top Topic Concentrations</h3>
               <div className="flex-1 w-full">
                   {catData.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={catData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 500}} />
                           <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                           <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
                         </BarChart>
                       </ResponsiveContainer>
                   ) : (
                       <div className="h-full flex items-center justify-center text-gray-400 text-sm">No categorical triggers isolated.</div>
                   )}
               </div>
           </div>
      </div>

      {/* ═══ NEW PANELS — below charts, above feedback table ═══ */}

      {/* Panel 1: Schedule Baraza */}
      <CollapsiblePanel title="📅 Schedule Baraza Event">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date &amp; Time</label>
            <input type="datetime-local" className={inputCls}
              value={barazaForm.datetime}
              onChange={e => setBarazaForm(f => ({ ...f, datetime: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Location / Venue</label>
            <input type="text" className={inputCls} placeholder="e.g. Kajiado Town Hall"
              value={barazaForm.location}
              onChange={e => setBarazaForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Chief's Name</label>
            <input type="text" className={inputCls} placeholder="e.g. Chief John Mwangi"
              value={barazaForm.chief_name}
              onChange={e => setBarazaForm(f => ({ ...f, chief_name: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Expected Attendance</label>
            <input type="number" min={1} className={inputCls}
              value={barazaForm.expected_attendance}
              onChange={e => setBarazaForm(f => ({ ...f, expected_attendance: e.target.value }))} />
          </div>
        </div>
        <button
          onClick={handleBarazaSubmit}
          disabled={barazaLoading}
          className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          {barazaLoading ? 'Scheduling...' : 'Schedule Baraza'}
        </button>
        <MsgBox msg={barazaMsg} />
      </CollapsiblePanel>

      {/* Panel 2: Log Consultation Feedback */}
      <CollapsiblePanel title="📝 Log Consultation Feedback">
        {lastBarazaId && (
          <p className="text-xs text-blue-600 font-semibold mb-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            📎 Linked to Baraza ID: <span className="font-mono">{lastBarazaId}</span>
          </p>
        )}
        <div className="space-y-4">
          {consultEntries.map((entry, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Entry {idx + 1}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Submitter Name</label>
                  <input type="text" className={inputCls} placeholder="Full Name"
                    value={entry.name} onChange={e => updateEntry(idx, 'name', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Role / Title</label>
                  <input type="text" className={inputCls} placeholder="e.g. Area Resident, Nyumba Kumi Elder"
                    value={entry.role} onChange={e => updateEntry(idx, 'role', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Community / Village</label>
                  <input type="text" className={inputCls} placeholder="e.g. Ngong Ward"
                    value={entry.community} onChange={e => updateEntry(idx, 'community', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>Sentiment</label>
                  <select className={inputCls} value={entry.sentiment} onChange={e => updateEntry(idx, 'sentiment', e.target.value)}>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className={labelCls}>Comment</label>
                  <textarea rows={2} className={inputCls} placeholder="Record the participant's comment..."
                    value={entry.comment} onChange={e => updateEntry(idx, 'comment', e.target.value)} />
                </div>
              </div>
              {consultEntries.length > 1 && (
                <button onClick={() => setConsultEntries(prev => prev.filter((_, i) => i !== idx))}
                  className="text-xs text-red-500 hover:underline font-semibold">− Remove Entry</button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setConsultEntries(prev => [...prev, { name: '', role: '', community: '', sentiment: 'neutral', comment: '' }])}
            className="border border-blue-300 text-blue-600 hover:bg-blue-50 font-bold py-2 px-5 rounded-lg text-sm transition-colors"
          >
            + Add Another Entry
          </button>
          <button
            onClick={handleConsultSubmit}
            disabled={consultLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {consultLoading ? 'Submitting...' : 'Submit Consultation Log'}
          </button>
        </div>
        <MsgBox msg={consultMsg} />
      </CollapsiblePanel>

      {/* Panel 3: Upload Evidence */}
      <CollapsiblePanel title="📎 Upload Evidence">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DropZone
            label="📑 Attendance Register (PDF / Image)"
            accept="application/pdf,image/*"
            multiple={false}
            fileVal={uploadFiles.attendance}
            onChange={f => setUploadFiles(prev => ({ ...prev, attendance: f }))}
          />
          <DropZone
            label="📸 Baraza Photos (Images)"
            accept="image/*"
            multiple={true}
            fileVal={uploadFiles.photos.length ? uploadFiles.photos : null}
            onChange={f => setUploadFiles(prev => ({ ...prev, photos: f }))}
          />
          <DropZone
            label="📰 Newspaper Clipping (PDF / Image)"
            accept="application/pdf,image/*"
            multiple={false}
            fileVal={uploadFiles.clipping}
            onChange={f => setUploadFiles(prev => ({ ...prev, clipping: f }))}
          />
        </div>
        {uploadProgress !== null && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
              <span>Uploading...</span><span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
        <button
          onClick={handleUploadEvidence}
          disabled={uploadProgress !== null}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          {uploadProgress !== null ? `Uploading ${uploadProgress}%...` : 'Upload Evidence'}
        </button>
        <MsgBox msg={uploadMsg} />
      </CollapsiblePanel>

      {/* Panel 4: SMS Outreach */}
      <CollapsiblePanel title="📨 SMS Outreach (Dev Mode)">
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-xl">📱</span>
          <p className="text-sm font-semibold text-amber-800">
            <span className="font-black">Simulation Mode:</span> Messages are logged to the database but <span className="underline">NOT sent</span> via Africa's Talking. Real SMS delivery will be enabled in production.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Phone Numbers (one per line)</label>
            <textarea
              rows={5} className={inputCls}
              placeholder="+254700000001&#10;+254700000002"
              value={smsPhones}
              onChange={e => setSmsPhones(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Message Body
              <span className="ml-2 normal-case font-normal text-gray-400">({smsBody.length}/160 chars)</span>
            </label>
            <textarea
              rows={5}
              className={`${inputCls} ${smsBody.length > 160 ? 'border-red-400 ring-2 ring-red-300' : ''}`}
              placeholder="Type your outreach message here..."
              maxLength={160}
              value={smsBody}
              onChange={e => setSmsBody(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1 italic">Reply STOP to opt out. <span className="font-semibold text-gray-500">(auto-appended)</span></p>
          </div>
        </div>
        <button
          onClick={handleSmsSubmit}
          disabled={smsLoading || !smsPhones.trim() || !smsBody.trim()}
          className="mt-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          {smsLoading ? 'Logging Campaign...' : 'Simulate SMS Campaign'}
        </button>
        <MsgBox msg={smsMsg} />
      </CollapsiblePanel>

      {/* Panel 5: Gazette Notice — always visible */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <p className="font-bold text-gray-800 text-sm">📰 Gazette Notice</p>
          <p className="text-xs text-gray-500 mt-0.5">Generate the bilingual (EN/SW) public participation notice ready for newspaper submission.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => downloadGazette('pdf')}
            className="bg-gray-900 hover:bg-black text-white font-bold py-2 px-5 rounded-lg text-sm transition-colors"
          >
            📥 Download Gazette Notice (PDF)
          </button>
          <button
            onClick={() => downloadGazette('docx')}
            className="border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold py-2 px-5 rounded-lg text-sm transition-colors"
          >
            📥 Download (DOCX)
          </button>
        </div>
      </div>

       {/* Row 2: Insights Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
           <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4 bg-gray-50">
                <select 
                     value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
                     className="text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                >
                    <option value="all">All Channels</option>
                    <option value="sms">SMS Only</option>
                    <option value="web">Web Portal</option>
                </select>
                <select 
                     value={filterSentiment} onChange={e => setFilterSentiment(e.target.value)}
                     className="text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                >
                    <option value="all">All Sentiments</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                </select>
           </div>
           
           <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-gray-600">
                   <thead className="bg-white border-b border-gray-100 uppercase tracking-widest text-xs font-semibold text-gray-400">
                       <tr>
                           <th className="px-6 py-4">Submission Date</th>
                           <th className="px-6 py-4">Channel</th>
                           <th className="px-6 py-4">Sentiment</th>
                           <th className="px-6 py-4">NLP Classifications</th>
                           <th className="px-6 py-4">Text Insight Output</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                       {filteredFeedbacks.length === 0 ? (
                           <tr><td colSpan="5" className="text-center py-10 italic text-gray-400">No NLP insights align identically mapping currently.</td></tr>
                       ) : filteredFeedbacks.map(fb => (
                           <React.Fragment key={fb.id}>
                               <tr onClick={() => setExpandedRow(expandedRow === fb.id ? null : fb.id)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                   <td className="px-6 py-4 whitespace-nowrap">{new Date(fb.submitted_at).toLocaleDateString()}</td>
                                   <td className="px-6 py-4 whitespace-nowrap">
                                       <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase
                                           ${fb.channel === 'sms' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                           {fb.channel}
                                       </span>
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap">
                                       <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                           ${fb.sentiment === 'positive' ? 'bg-green-100 text-green-800' : fb.sentiment === 'negative' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                                           {fb.sentiment}
                                       </span>
                                   </td>
                                   <td className="px-6 py-4 w-1/4">
                                       <div className="flex gap-1 flex-wrap">
                                            {fb.categories.slice(0,3).map((c, i) => (
                                                <span key={i} className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-xs capitalize tracking-wide">{c}</span>
                                            ))}
                                            {fb.categories.length > 3 && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs">+{fb.categories.length-3}</span>}
                                       </div>
                                   </td>
                                   <td className="px-6 py-4 truncate max-w-xs">{fb.raw_text}</td>
                               </tr>
                               {expandedRow === fb.id && (
                                   <tr className="bg-[#f8fafc]">
                                       <td colSpan="5" className="px-6 py-6 border-b border-gray-200">
                                            <div className="flex justify-between items-start">
                                                 <div className="max-w-2xl">
                                                      <h4 className="text-xs uppercase font-extrabold text-blue-500 tracking-wider mb-2 border-b border-blue-100 pb-1">Raw NLP Text Array Payload</h4>
                                                      <p className="text-gray-800 text-base leading-relaxed italic">"{fb.raw_text}"</p>
                                                 </div>
                                                 <div className="text-right whitespace-nowrap hidden lg:block">
                                                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Geographic Meta</p>
                                                      <p className="text-sm font-semibold text-gray-700">{fb.community_name || 'Anonymous Region'}</p>
                                                 </div>
                                            </div>
                                       </td>
                                   </tr>
                               )}
                           </React.Fragment>
                       ))}
                   </tbody>
               </table>
           </div>
      </div>

      {/* NEXT STAGE ACTION */}
      <div className="pt-6 pb-20 border-t border-gray-200">
          <Link 
              to={`/dashboard/projects/${projectId}/report`}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-8 rounded-2xl flex items-center justify-between group transition-all shadow-xl hover:shadow-2xl active:scale-[0.98]"
          >
              <div className="text-left">
                  <p className="text-[10px] uppercase tracking-widest opacity-60">Next Stage</p>
                  <p className="text-xl">Automated Report Generator</p>
              </div>
              <div className="flex items-center gap-4">
                   <span className="text-sm opacity-60 font-medium hidden sm:block">Proceed to final document assembly</span>
                   <span className="text-3xl group-hover:translate-x-2 transition-transform">→</span>
              </div>
          </Link>
      </div>

    </div>
  );
}
