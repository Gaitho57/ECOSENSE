import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import IncidentReportForm from '../../components/ehs/IncidentReportForm';

export default function EHSIncidentsPage() {
  const { projectId } = useParams();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/ehs/${projectId}/incidents/`);
      setIncidents(res.data?.data || res.data || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load incidents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [projectId]);

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchIncidents();
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to={`/dashboard/projects/${projectId}`} className="text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
              ← Back to Project
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">EHS Incidents Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Monitor and report Environment, Health, and Safety incidents.</p>
        </div>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-sm font-black transition-transform active:scale-95 shadow-md flex items-center gap-2"
          >
            <span className="text-lg">⚠️</span> Report Incident
          </button>
        )}
      </div>

      {showForm ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <IncidentReportForm 
            onSuccess={handleFormSuccess} 
            onCancel={() => setShowForm(false)} 
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-extrabold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-blue-500">📋</span> Incident Log
          </h2>

          {loading ? (
            <div className="py-20 text-center animate-pulse">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400 font-bold tracking-widest uppercase text-sm">Loading Incidents...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center font-semibold">
              {error}
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-16 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <span className="text-5xl opacity-50 mb-4 block">🛡️</span>
              <p className="text-gray-500 font-bold">No incidents reported yet.</p>
              <p className="text-sm text-gray-400 mt-1">Keep up the good safety record!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-4 px-4 text-xs font-black text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="py-4 px-4 text-xs font-black text-gray-500 uppercase tracking-wider">Title / Location</th>
                    <th className="py-4 px-4 text-xs font-black text-gray-500 uppercase tracking-wider">Victim</th>
                    <th className="py-4 px-4 text-xs font-black text-gray-500 uppercase tracking-wider">OSHA</th>
                    <th className="py-4 px-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {incidents.map((inc) => (
                    <tr key={inc.id || inc.title} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="text-sm font-bold text-gray-900">
                          {new Date(inc.incident_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(inc.incident_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-bold text-gray-800">{inc.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">📍 {inc.location}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-800">{inc.victim_name}</div>
                        <div className="text-xs text-gray-500">{inc.victim_role}</div>
                      </td>
                      <td className="py-4 px-4">
                        {inc.is_osha_recordable ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                            Recordable
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                            No
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-xs font-bold text-gray-500">Under Review</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
