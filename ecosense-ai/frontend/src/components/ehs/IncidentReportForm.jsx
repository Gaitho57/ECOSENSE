import React, { useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useParams } from 'react-router-dom';

const STEPS = ['Basic Details', 'Victim Details', 'DOSH Fields', 'Review & Submit'];

export default function IncidentReportForm({ onSuccess, onCancel }) {
  const { projectId } = useParams();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    incident_date: '',
    location: '',
    victim_name: '',
    victim_role: '',
    is_osha_recordable: false,
    dosh_kmpdb_no: '',
    medical_costs: '',
    transport_costs: '',
    photo_evidence: null
  });

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const validateStep = () => {
    if (step === 1) {
      return formData.title && formData.incident_date && formData.location;
    }
    if (step === 2) {
      return formData.victim_name && formData.victim_role;
    }
    if (step === 3) {
      if (formData.is_osha_recordable) {
        return formData.dosh_kmpdb_no && formData.medical_costs && formData.transport_costs;
      }
      return true;
    }
    return true;
  };

  const isNextDisabled = !validateStep();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    
    setSubmitting(true);
    setError('');

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('incident_date', formData.incident_date);
    payload.append('location', formData.location);
    payload.append('victim_name', formData.victim_name);
    payload.append('victim_role', formData.victim_role);
    payload.append('is_osha_recordable', formData.is_osha_recordable);
    
    if (formData.is_osha_recordable) {
      payload.append('dosh_kmpdb_no', formData.dosh_kmpdb_no);
      payload.append('medical_costs', formData.medical_costs);
      payload.append('transport_costs', formData.transport_costs);
    }
    
    if (formData.photo_evidence) {
      payload.append('photo_evidence', formData.photo_evidence);
    }

    try {
      await axiosInstance.post(`/ehs/${projectId}/incidents/`, payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-2xl mx-auto">
      <div className="bg-blue-900 p-6 text-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider">Report EHS Incident</h2>
          <p className="text-blue-200 text-sm mt-1">Please provide accurate details for compliance.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Step {step} of 4</p>
          <p className="text-sm font-semibold">{STEPS[step - 1]}</p>
        </div>
      </div>
      
      <div className="h-2 bg-gray-100">
        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }}></div>
      </div>

      <div className="p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Incident Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange}
                  placeholder="e.g. Slip and fall at site A"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Incident Date & Time *</label>
                <input type="datetime-local" name="incident_date" value={formData.incident_date} onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Location *</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange}
                  placeholder="e.g. Main Entrance, Sector 4"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Victim Name *</label>
                <input type="text" name="victim_name" value={formData.victim_name} onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Victim Role *</label>
                <input type="text" name="victim_role" value={formData.victim_role} onChange={handleChange}
                  placeholder="e.g. Construction Worker, Supervisor"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <input type="checkbox" id="is_osha_recordable" name="is_osha_recordable" checked={formData.is_osha_recordable} onChange={handleChange}
                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" />
                <label htmlFor="is_osha_recordable" className="text-sm font-bold text-gray-800">
                  Is this an OSHA Recordable incident?
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              {formData.is_osha_recordable ? (
                <>
                  <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-amber-800 text-sm font-semibold flex gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p>Compliance Warning</p>
                      <p className="text-amber-700 font-normal mt-1">This incident is marked as OSHA Recordable. DOSH fields are strictly required by law for reporting.</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">DOSH KMP&DB No. *</label>
                    <input type="text" name="dosh_kmpdb_no" value={formData.dosh_kmpdb_no} onChange={handleChange}
                      placeholder="Enter registration number"
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Medical Costs *</label>
                      <input type="number" name="medical_costs" value={formData.medical_costs} onChange={handleChange}
                        placeholder="e.g. 5000" min="0" step="0.01"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Transport Costs *</label>
                      <input type="number" name="transport_costs" value={formData.transport_costs} onChange={handleChange}
                        placeholder="e.g. 1500" min="0" step="0.01"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500" required />
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center">
                  <span className="text-4xl">✅</span>
                  <p className="mt-4 font-bold text-gray-700">Not OSHA Recordable</p>
                  <p className="text-sm text-gray-500 mt-2">DOSH fields are not required. You can proceed to the next step.</p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Photo Evidence (Optional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-1">
                        <span>Upload a file</span>
                        <input type="file" name="photo_evidence" onChange={handleChange} className="sr-only" accept="image/*" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    {formData.photo_evidence && (
                      <p className="text-sm font-bold text-green-600 mt-2">✓ {formData.photo_evidence.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mt-6">
                <h3 className="font-bold text-gray-800 mb-3 uppercase tracking-wider text-sm">Review Information</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500 text-xs">Title</dt>
                    <dd className="font-semibold text-gray-900">{formData.title}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs">Date</dt>
                    <dd className="font-semibold text-gray-900">{new Date(formData.incident_date).toLocaleString()}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-gray-500 text-xs">Location</dt>
                    <dd className="font-semibold text-gray-900">{formData.location}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs">Victim</dt>
                    <dd className="font-semibold text-gray-900">{formData.victim_name} ({formData.victim_role})</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs">OSHA Recordable</dt>
                    <dd className="font-semibold text-gray-900">{formData.is_osha_recordable ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          <div className="pt-6 flex justify-between items-center border-t border-gray-100">
            {step === 1 ? (
              <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                Cancel
              </button>
            ) : (
              <button type="button" onClick={prevStep} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-sm transition-colors">
                ← Back
              </button>
            )}
            
            {step < 4 ? (
              <button type="button" onClick={nextStep} disabled={isNextDisabled} className="px-6 py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-colors shadow-md">
                Next Step →
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black rounded-lg text-sm transition-colors shadow-lg flex items-center gap-2">
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit Emergency Report'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
