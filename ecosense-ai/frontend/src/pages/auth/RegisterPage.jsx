import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export default function RegisterPage() {
    const navigate = useNavigate();
    const setAuth = useAuthStore(state => state.setAuth);

    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', password: '', tenant_name: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post(`${baseURL}/auth/register/`, formData);

            // The backend limits natively map JWT extraction automatically post-registration mapping 1 API bound
            const { user, access, refresh } = response.data.data;
            setAuth(user, access, refresh);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Tenant registration collision securely dropped.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-gray-800">
            <div className="w-full max-w-xl bg-white rounded-3xl p-10 shadow-2xl relative">
                <div className="mb-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Register Firm</h1>
                        <p className="text-sm font-bold text-gray-400 mt-1">Tenant Infrastructure Setup</p>
                    </div>
                    <div className="text-5xl opacity-20">🏢</div>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                    {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">First Name</label>
                            <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">Last Name</label>
                            <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">Work Email</label>
                        <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" />
                    </div>

                    <div>
                        <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">Secure Password</label>
                        <input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" />
                    </div>

                    <div className="border-t border-gray-100 pt-5 mt-5">
                        <label className="block text-[11px] font-black uppercase text-blue-600 mb-1 tracking-widest">Firm Name (Tenant Organization)</label>
                        <input type="text" required value={formData.tenant_name} onChange={e => setFormData({ ...formData, tenant_name: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 bg-blue-50/50" placeholder="e.g. Green Earth Consultancies Ltd" />
                    </div>

                    <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl p-4 transition-transform active:scale-95 shadow-md mt-6 disabled:bg-gray-400">
                        {loading ? 'Allocating Database Limits...' : 'Architect Tenant Profile 🚀'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm font-medium text-gray-500">
                    Already mapped boundaries? <Link to="/login" className="text-gray-900 font-bold hover:underline">Access Portal</Link>
                </div>
            </div>
        </div>
    );
}
