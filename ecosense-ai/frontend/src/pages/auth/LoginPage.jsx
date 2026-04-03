import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore(state => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
          // Send unauthenticated raw axios POST avoiding interceptor loops 
          const response = await axios.post(`${baseURL}/accounts/login/`, {
              email, password
          });

          const { user, access, refresh } = response.data.data;
          
          // Securely inject constraints scaling natively explicitly securely
          setAuth(user, access, refresh);
          
          navigate(from, { replace: true });
      } catch (err) {
          setError(err.response?.data?.error?.message || 'Authentication mapping securely blocked.');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-gray-800">
        <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl relative overflow-hidden">
             
             {/* Header */}
             <div className="text-center mb-10">
                 <div className="text-4xl mb-4">🌍</div>
                 <h1 className="text-3xl font-black text-gray-900 tracking-tight">EcoSense AI</h1>
                 <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">Consultant Secure Portal</p>
             </div>

             <form onSubmit={handleLogin} className="space-y-6">
                  {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center border border-red-200">{error}</div>}
                  
                  <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 mb-2">Corporate Email</label>
                      <input 
                          type="email" required
                          value={email} onChange={e => setEmail(e.target.value)}
                          className="w-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 rounded-xl p-4 bg-gray-50 focus:bg-white transition-colors text-sm font-medium"
                          placeholder="consultant@ecosense.ai"
                      />
                  </div>

                  <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 mb-2">Cryptographic Password</label>
                      <input 
                          type="password" required
                          value={password} onChange={e => setPassword(e.target.value)}
                          className="w-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 rounded-xl p-4 bg-gray-50 focus:bg-white transition-colors text-sm font-medium"
                          placeholder="••••••••"
                      />
                  </div>

                  <button 
                      disabled={loading}
                      type="submit"
                      className="w-full bg-gray-900 hover:bg-black text-white font-black rounded-xl p-4 transition-transform active:scale-95 shadow-md disabled:bg-gray-400"
                  >
                      {loading ? 'Decrypting Access Limits...' : 'Authenticate 🔒'}
                  </button>
             </form>
             
             <div className="mt-8 text-center text-sm font-medium text-gray-500">
                  Executing entirely new footprint? <Link to="/register" className="text-blue-600 font-bold hover:underline">Register Firm</Link>
             </div>
        </div>
    </div>
  );
}
