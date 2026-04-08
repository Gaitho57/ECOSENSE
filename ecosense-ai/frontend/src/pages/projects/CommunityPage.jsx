import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axiosInstance from '../../api/axiosInstance';

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
      <div className="flex justify-between items-end">
          <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Community Engagement</h1>
              <p className="text-gray-500 mt-1 max-w-2xl">NLP Aggregation mapping public participation via SMS payloads and direct portal metrics cleanly.</p>
          </div>
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
