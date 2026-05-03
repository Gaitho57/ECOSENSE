import React, { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import { CreditCard, Smartphone, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const BillingPage = () => {
  const [tenant, setTenant] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(5000); // KES 5,000 per report
  const [credits, setCredits] = useState(1);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const [tenantRes, transRes] = await Promise.all([
        axios.get('/api/v1/auth/me/'), // Assuming this returns tenant info
        axios.get('/api/v1/billing/status/') // This might need a separate 'list' endpoint
      ]);
      setTenant(tenantRes.data.tenant);
      setTransactions(transRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch billing data", err);
      setLoading(false);
    }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    setPurchasing(true);
    try {
      const res = await axios.post('/api/v1/billing/purchase/', {
        phone: phone,
        amount: amount,
        credits: credits
      });
      alert(res.data.message);
      // Poll for status or wait
    } catch (err) {
      alert("Purchase initiation failed");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading Billing...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Credits</h1>
        <p className="text-gray-500">Manage your report allocations and payment history.</p>
      </header>

      {/* Credit Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 font-medium">Available Credits</p>
              <h2 className="text-5xl font-bold mt-2">{tenant?.credits_remaining || 0}</h2>
            </div>
            <div className="bg-white/20 p-3 rounded-full">
              <CreditCard size={24} />
            </div>
          </div>
          <p className="mt-4 text-blue-100 text-sm italic">
            Each credit allows for 1 Full NEMA EIA/EA Report generation.
          </p>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-xl text-green-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Account Status: {tenant?.billing_status?.toUpperCase()}</h3>
              <p className="text-gray-500 text-sm">Your account is currently in {tenant?.billing_status === 'trialing' ? 'Trial Mode' : 'Active Status'}.</p>
            </div>
          </div>
          <div className="mt-6 flex gap-4">
             <button className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-black transition-all">
                Download Invoices
             </button>
             <button className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all">
                Update Profile
             </button>
          </div>
        </div>
      </div>

      {/* Purchase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <Smartphone className="text-green-500" />
            <h3 className="text-xl font-bold">Top Up via M-Pesa</h3>
          </div>
          
          <form onSubmit={handlePurchase} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Phone Number</label>
              <input 
                type="text" 
                placeholder="2547XXXXXXXX" 
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Credits</label>
                <select 
                  className="w-full p-3 rounded-xl border border-gray-200"
                  value={credits}
                  onChange={(e) => {
                    setCredits(e.target.value);
                    setAmount(e.target.value * 5000);
                  }}
                >
                  <option value={1}>1 Report</option>
                  <option value={5}>5 Reports</option>
                  <option value={10}>10 Reports</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (KES)</label>
                <input 
                  type="text" 
                  disabled 
                  value={amount.toLocaleString()} 
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 font-bold"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={purchasing}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50"
            >
              {purchasing ? "Processing STK Push..." : "Pay via M-Pesa"}
            </button>
            <p className="text-xs text-center text-gray-400 mt-4">
              Securely processed via Safaricom Daraja API. 
              Credits will be awarded instantly upon PIN entry.
            </p>
          </form>
        </div>

        {/* Transaction History */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="text-indigo-500" />
            <h3 className="text-xl font-bold">Transaction History</h3>
          </div>
          
          <div className="space-y-4">
            {transactions.length > 0 ? transactions.map(tx => (
              <div key={tx.id} className="flex justify-between items-center p-4 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                <div>
                  <p className="font-bold text-gray-900">{tx.description}</p>
                  <p className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">KES {parseFloat(tx.amount).toLocaleString()}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    tx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No transactions found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
