import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
    Save, 
    Sparkles, 
    ChevronLeft, 
    ChevronRight, 
    Monitor, 
    Smartphone, 
    CheckCircle, 
    AlertCircle,
    Loader2,
    Camera,
    Image as ImageIcon,
    Trash2,
    MapPin,
    FileText,
    ShieldCheck,
    Download,
    AlertTriangle,
    Plus
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

// ─── Helper: normalise the DRF response shape ───────────────────────────────
// ViewSets can return arrays directly or wrapped in { data: [] }
const extractList = (res) => res?.data?.data ?? res?.data ?? [];

const NEMA_SECTIONS = [
    { id: 'summary', title: '1. Non-Technical Summary', icon: '📝' },
    { id: 'exec_summary', title: '2. Executive Summary', icon: '📊' },
    { id: 'intro', title: '3. Introduction', icon: '🚀' },
    { id: 'methodology', title: '4. Study Methodology', icon: '🔬' },
    { id: 'project_desc', title: '5. Project Description', icon: '🏗️' },
    { id: 'baseline', title: '6. Baseline Information', icon: '🌍' },
    { id: 'legal', title: '7. Policy & Legal Framework', icon: '⚖️' },
    { id: 'participation', title: '8. Public Participation', icon: '👥' },
    { id: 'impacts', title: '9. Impact Assessment', icon: '📉' },
    { id: 'alternatives', title: '10. Analysis of Alternatives', icon: '🔄' },
    { id: 'mitigation', title: '11. Mitigation Measures', icon: '🛡️' },
    { id: 'esmp', title: '12. ESMP Matrix', icon: '📅' },
    { id: 'hazard', title: '13. Hazard Management', icon: '⚠️' },
    { id: 'decommissioning', title: '14. Decommissioning', icon: '♻️' },
    { id: 'conclusion', title: '15. Conclusion', icon: '🏁' },
    { id: 'documents', title: 'Statutory Annex Vault', icon: '📁', isSpecial: true },
];

const ReportEditorPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    
    const [activeSection, setActiveSection] = useState(NEMA_SECTIONS[0]);
    const [content, setContent] = useState('');
    const [sectionsData, setSectionsData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [fieldMode, setFieldMode] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [media, setMedia] = useState([]);
    const [docs, setDocs] = useState([]);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    // ─── Load all saved sections from the backend and build a keyed map ─────
    const loadSections = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/reports/${projectId}/sections/`);
            const list = extractList(res);
            const map = {};
            list.forEach(s => { map[s.section_id] = s; });
            setSectionsData(map);
            // Pre-populate the editor with the first section's content
            setContent(map[NEMA_SECTIONS[0].id]?.content || '');
        } catch (err) {
            console.error('Failed to load report sections', err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // ─── Load field media and statutory documents ─────────────────────────────
    const loadData = useCallback(async () => {
        try {
            const [mediaRes, docsRes] = await Promise.all([
                 axiosInstance.get(`/projects/${projectId}/media/`),
                 axiosInstance.get(`/projects/${projectId}/documents/`)
            ]);
            setMedia(extractList(mediaRes));
            setDocs(extractList(docsRes));
        } catch (err) {
            console.error('Failed to load project files', err);
        }
    }, [projectId]);

    // ─── POST field photo (shared helper for both GPS and non-GPS paths) ──────
    const postMedia = useCallback(async (formData) => {
        try {
            await axiosInstance.post(
                `/projects/${projectId}/media/`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            await loadData();
        } catch (err) {
            alert('Photo upload failed. Please try again.');
        } finally {
            setUploadingMedia(false);
        }
    }, [projectId, loadData]);

    // ─── Delete a field photo ─────────────────────────────────────────────────
    const deleteMedia = useCallback(async (mediaId) => {
        if (!window.confirm('Remove this photo from the report?')) return;
        try {
            await axiosInstance.delete(`/projects/${projectId}/media/${mediaId}/`);
            setMedia(prev => prev.filter(m => m.id !== mediaId));
        } catch (err) {
            alert('Could not delete photo.');
        }
    }, [projectId]);

    // ─── Delete a statutory document ─────────────────────────────────────────
    const deleteDoc = useCallback(async (docId) => {
        if (!window.confirm('Remove this document from the vault?')) return;
        try {
            await axiosInstance.delete(`/projects/${projectId}/documents/${docId}/`);
            setDocs(prev => prev.filter(d => d.id !== docId));
        } catch (err) {
            alert('Could not delete document.');
        }
    }, [projectId]);

    const handleMediaUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingMedia(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('section_id', activeSection.id);
        formData.append('caption', `Evidence for ${activeSection.title}`);

        // Extract GPS if available (browser location)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                formData.append('latitude', pos.coords.latitude);
                formData.append('longitude', pos.coords.longitude);
                await postMedia(formData);
            }, async () => {
                await postMedia(formData);
            });
        } else {
            await postMedia(formData);
        }
    };

    useEffect(() => {
        loadSections();
        loadData();
    }, [projectId, loadSections, loadData]);

    const handleDocUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingDoc(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('doc_type', 'other'); // Default, user can change later or we can add a selector
        formData.append('reference_no', 'Pending');

        try {
            await axiosInstance.post(`/projects/${projectId}/documents/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await loadData();
        } catch (err) {
            alert("Document upload failed.");
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleSectionChange = (section) => {
        // Save current if changed (auto-save logic could go here)
        setActiveSection(section);
        setContent(sectionsData[section.id]?.content || '');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const section = sectionsData[activeSection.id];
            if (section) {
                const res = await axiosInstance.patch(`/reports/${projectId}/sections/${section.id}/`, {
                    content: content
                });
                setSectionsData({ ...sectionsData, [activeSection.id]: res.data.data });
            } else {
                const res = await axiosInstance.post(`/reports/${projectId}/sections/`, {
                    section_id: activeSection.id,
                    title: activeSection.title,
                    content: content
                });
                setSectionsData({ ...sectionsData, [activeSection.id]: res.data.data });
            }
            setLastSaved(new Date());
        } catch (err) {
            alert("Save failed. Connection issue?");
        } finally {
            setSaving(false);
        }
    };

    const handleAIGenerate = async () => {
        setGenerating(true);
        try {
            // First ensure section exists
            let section = sectionsData[activeSection.id];
            if (!section) {
                const init = await axiosInstance.post(`/reports/${projectId}/sections/`, {
                    section_id: activeSection.id,
                    title: activeSection.title,
                    content: ''
                });
                section = init.data.data;
            }

            const res = await axiosInstance.post(`/reports/${projectId}/sections/${section.id}/generate/`);
            setContent(res.data.data.content);
            setSectionsData({ ...sectionsData, [activeSection.id]: { ...section, content: res.data.data.content, status: res.data.data.status } });
        } catch (err) {
            alert("AI generation failed.");
        } finally {
            setGenerating(false);
        }
    };

    const handleBulkAIGenerate = async () => {
        if (!window.confirm("This will pre-populate all empty or AI-generated chapters based on current mapping. Your manual expert edits will be preserved. Proceed?")) return;
        
        setGenerating(true);
        try {
            await axiosInstance.post(`/reports/${projectId}/sections/bulk_generate/`);
            await loadSections(); // Refresh all
            alert("Study roadmap drafted. You can now refine each section onsite.");
        } catch (err) {
            alert("Bulk drafting failed.");
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return (
        <div className="flex h-full items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-green-600 w-12 h-12" />
        </div>
    );

    return (
        <div className={`flex flex-col h-full bg-[#f8fafc] ${fieldMode ? 'field-mode' : ''}`}>
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                             Report Builder <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded">V2.0 EXPERT</span>
                        </h1>
                        <p className="text-xs text-slate-400 font-bold">{activeSection.title}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!fieldMode && (
                        <button 
                            onClick={handleBulkAIGenerate}
                            disabled={generating}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 text-[10px] font-black uppercase flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {generating ? 'Drafting...' : 'Auto-Draft Full Study'}
                        </button>
                    )}

                    <button 
                        onClick={() => setFieldMode(!fieldMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-black transition-all ${
                            fieldMode ? 'bg-orange-500 border-orange-600 text-white shadow-lg scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {fieldMode ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                        {fieldMode ? 'FIELD FOCUS ON' : 'DESKTOP MODE'}
                    </button>

                    <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>

                    {lastSaved && (
                        <span className="text-[10px] text-slate-400 font-bold hidden md:inline">
                            Synced {lastSaved.toLocaleTimeString()}
                        </span>
                    )}

                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-black text-xs uppercase flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Navigation */}
                {!fieldMode && (
                    <aside className="w-72 bg-white border-r border-slate-200 overflow-y-auto hidden md:block">
                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                             <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">NEMA Study Roadmap</h2>
                        </div>
                        <nav className="p-2">
                            {NEMA_SECTIONS.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSectionChange(s)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all mb-1 ${
                                        activeSection.id === s.id 
                                        ? 'bg-green-50 text-green-700 border-l-4 border-green-600' 
                                        : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'
                                    }`}
                                >
                                    <span className="text-xl">{s.icon}</span>
                                    <span className={`text-xs font-bold leading-tight ${activeSection.id === s.id ? 'font-black' : ''}`}>
                                        {s.title}
                                    </span>
                                    {sectionsData[s.id]?.status === 'expert_manual' && (
                                        <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />
                                    )}
                                </button>
                            ))}
                        </nav>
                    </aside>
                )}

                {/* Main Editor Area */}
                <main className="flex-1 overflow-y-auto p-6 md:p-10 relative">
                    <div className={`max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden min-h-[80vh] flex flex-col ${fieldMode ? 'max-w-full' : ''}`}>
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 transition-all">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">
                                     {activeSection.icon}
                                 </div>
                                 <div>
                                     <h2 className="text-xl font-black text-slate-800">{activeSection.title}</h2>
                                     <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase">
                                         {sectionsData[activeSection.id]?.status.replace('_', ' ') || 'New Draft'}
                                         {sectionsData[activeSection.id]?.status === 'ai_suggested' && <Sparkles className="w-3 h-3 text-blue-400" />}
                                     </p>
                                 </div>
                             </div>

                             <button 
                                onClick={handleAIGenerate}
                                disabled={generating}
                                className="group bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all border border-blue-100"
                             >
                                 {generating ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4 group-hover:animate-pulse" />}
                                 AI Content Assist
                             </button>
                        </div>

                        <div className="flex-1 p-8 editor-container overflow-y-auto">
                             {activeSection.id === 'documents' ? (
                                 <div className="space-y-8">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         {/* Upload Card */}
                                         <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer relative group">
                                             <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                 {uploadingDoc ? <Loader2 className="animate-spin w-8 h-8 text-green-600" /> : <Plus className="w-8 h-8 text-slate-400" />}
                                             </div>
                                             <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Upload New Annex</h3>
                                             <p className="text-xs text-slate-400 font-bold mt-1">PDF or Signed Certificates only</p>
                                             <input type="file" accept=".pdf,.doc,.docx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleDocUpload} disabled={uploadingDoc} />
                                         </div>

                                         {/* Guidelines Card */}
                                         <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                                             <div className="relative z-10">
                                                 <AlertTriangle className="w-8 h-8 text-orange-400 mb-4" />
                                                 <h3 className="text-lg font-black uppercase tracking-tight">NEMA Checklist</h3>
                                                 <ul className="mt-4 space-y-2">
                                                     <li className="text-xs font-bold text-indigo-100 flex items-center gap-2">
                                                         <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div> Mandatory Title Deed (LR No.)
                                                     </li>
                                                     <li className="text-xs font-bold text-indigo-100 flex items-center gap-2">
                                                         <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div> Lead Expert Practicing License
                                                     </li>
                                                     <li className="text-xs font-bold text-indigo-100 flex items-center gap-2">
                                                         <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div> Lab Results (if applicable)
                                                     </li>
                                                 </ul>
                                             </div>
                                             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                                         </div>
                                     </div>

                                     <div className="space-y-4">
                                         <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Uploaded Statutory Vault</h3>
                                         <div className="grid grid-cols-1 gap-3">
                                             {docs.length === 0 ? (
                                                 <div className="py-12 text-center">
                                                     <p className="text-slate-300 font-black uppercase text-sm italic">Vault is currently empty</p>
                                                 </div>
                                             ) : (
                                                 docs.map(doc => (
                                                     <div key={doc.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between hover:shadow-lg transition-all">
                                                         <div className="flex items-center gap-5">
                                                             <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                                                                 <FileText className="w-6 h-6" />
                                                             </div>
                                                             <div>
                                                                 <h4 className="font-black text-slate-800 text-sm tracking-tight">{doc.doc_type.replace('_', ' ').toUpperCase()}</h4>
                                                                 <div className="flex items-center gap-3 mt-1">
                                                                     <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black">REF: {doc.reference_no}</span>
                                                                     {doc.is_verified ? (
                                                                         <span className="text-[10px] text-green-600 font-black flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> VERIFIED</span>
                                                                     ) : (
                                                                         <span className="text-[10px] text-orange-500 font-black flex items-center gap-1"><AlertCircle className="w-3 h-3" /> PENDING REVIEW</span>
                                                                     )}
                                                                 </div>
                                                             </div>
                                                         </div>
                                                         <div className="flex items-center gap-2">
                                                             <a href={doc.file} target="_blank" rel="noreferrer" className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-green-600">
                                                                  <Download className="w-5 h-5" />
                                                             </a>
                                                             <button
                                                                  onClick={() => deleteDoc(doc.id)}
                                                                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-red-500"
                                                                  title="Remove from vault"
                                                              >
                                                                  <Trash2 className="w-5 h-5" />
                                                             </button>
                                                         </div>
                                                     </div>
                                                 ))
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             ) : (
                                 <ReactQuill 
                                    theme="snow" 
                                    value={content} 
                                    onChange={setContent}
                                    className="h-full min-h-[60vh] border-none"
                                    placeholder={`Commence field observations for ${activeSection.title}...`}
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, 3, false] }],
                                            ['bold', 'italic', 'underline', 'strike'],
                                            [{'list': 'ordered'}, {'list': 'bullet'}],
                                            ['blockquote', 'code-block'],
                                            ['clean']
                                        ],
                                    }}
                                 />
                             )}
                        </div>
                    </div>
                    
                    {/* Navigation Pills */}
                    <div className="max-w-4xl mx-auto flex justify-between mt-6 px-4">
                         <button 
                            disabled={NEMA_SECTIONS.indexOf(activeSection) === 0}
                            onClick={() => handleSectionChange(NEMA_SECTIONS[NEMA_SECTIONS.indexOf(activeSection) - 1])}
                            className="flex items-center gap-2 text-slate-400 font-bold hover:text-green-600 transition-colors disabled:opacity-10"
                         >
                            <ChevronLeft className="w-5 h-5" /> Previous Section
                         </button>
                         <button 
                            disabled={NEMA_SECTIONS.indexOf(activeSection) === NEMA_SECTIONS.length - 1}
                            onClick={() => handleSectionChange(NEMA_SECTIONS[NEMA_SECTIONS.indexOf(activeSection) + 1])}
                            className="flex items-center gap-2 text-slate-400 font-bold hover:text-green-600 transition-colors disabled:opacity-10"
                         >
                            Next Section <ChevronRight className="w-5 h-5" />
                         </button>
                    </div>
                </main>

                {/* Right Sidebar - Field Evidence Management */}
                <aside className={`w-80 bg-slate-50 border-l border-slate-200 overflow-y-auto flex flex-col ${fieldMode ? 'hidden xl:flex' : 'hidden lg:flex'}`}>
                    <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                         <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                             <Camera className="w-3.5 h-3.5" /> Field Evidence
                         </h2>
                         <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg shadow-md transition-all">
                             <Camera className="w-4 h-4" />
                             <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleMediaUpload} disabled={uploadingMedia} />
                         </label>
                    </div>

                    <div className="p-4 flex-1">
                        <div className="mb-6">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-3">Photos for this section</p>
                            {uploadingMedia && (
                                <div className="animate-pulse bg-white border border-slate-200 rounded-xl p-4 mb-3 flex items-center gap-3">
                                    <Loader2 className="animate-spin w-4 h-4 text-green-600" />
                                    <span className="text-xs font-bold text-slate-500">Processing evidence...</span>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 gap-3">
                                {media.filter(m => m.section_id === activeSection.id).length === 0 ? (
                                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                                         <ImageIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                         <p className="text-[10px] font-bold text-slate-400 uppercase">No photos yet</p>
                                    </div>
                                ) : (
                                    media.filter(m => m.section_id === activeSection.id).map(m => (
                                        <div key={m.id} className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                            <div className="aspect-video relative">
                                                <img src={m.file} alt={m.caption} className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => deleteMedia(m.id)}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="absolute bottom-2 left-2 flex gap-1">
                                                    <span className="bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                                                        <MapPin className="w-2 h-2" /> GPS SECURED
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-2">
                                                <p className="text-[10px] font-bold text-slate-700 leading-tight">{m.caption}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-top border-slate-200">
                             <p className="text-[10px] text-slate-400 font-bold uppercase mb-3">All Project Gallery</p>
                             <div className="grid grid-cols-3 gap-2">
                                {media.map(m => (
                                    <div key={m.id} className="aspect-square rounded-lg overflow-hidden border border-slate-100 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                                        <img src={m.file} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </aside>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .quill {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                .ql-container {
                    flex: 1;
                    font-family: 'Inter', sans-serif !important;
                    font-size: 15px !important;
                    line-height: 1.8 !important;
                    color: #334155 !important;
                    border: none !important;
                }
                .ql-toolbar {
                    border: none !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                    padding: 8px 32px !important;
                    background: #fbfcfd;
                }
                .ql-editor {
                    padding: 32px !important;
                }
                .ql-editor.ql-blank::before {
                    left: 32px !important;
                    font-style: italic;
                    color: #cbd5e1;
                }
                .field-mode header {
                    background: #0f172a;
                    border-color: #1e293b;
                }
                .field-mode header h1 { color: white; }
                .field-mode .editor-container {
                    padding: 0 !important;
                }
                .field-mode main {
                    padding: 0 !important;
                    background: #0f172a;
                }
                .field-mode .max-w-4xl {
                    border-radius: 0 !important;
                    box-shadow: none !important;
                }
            `}} />
        </div>
    );
};

export default ReportEditorPage;
