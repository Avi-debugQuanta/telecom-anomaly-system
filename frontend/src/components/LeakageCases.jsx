import React, { useEffect, useState } from "react";
import axios from "axios";

export default function LeakageCases({ setActiveTab, setInitialMessage }) {
  const [cases, setCases] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("all"); // 'all', 'anomalies'

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const kpiResp = await axios.get("/api/kpis");
        setKpis(kpiResp.data);
        
        let url = `/api/customers?limit=100&offset=${page * 100}`;
        if (filter === "anomalies") url += "&anomaly=1";
        
        const custResp = await axios.get(url);
        
        // Calculate leakage for each case
        const enriched = custResp.data.map(c => {
          let leakage = 0;
          if (c.synthetic_anomaly === 1) {
             const expectedRev = (c.tenure / 5) * kpiResp.data.avg_monthly_charge;
             const actualRev = c.tenure * c.MonthlyCharges;
             leakage = Math.round(expectedRev - actualRev);
          }
          return { ...c, leakageAmount: leakage };
        });
        
        setCases(enriched);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    loadData();
  }, [page, filter]);

  if (loading && !cases.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium animate-pulse">Loading Cases...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Leakage Cases & Churn</h2>
          <p className="text-gray-400 text-sm">Review individual customer records, churn status, and estimated revenue leakage.</p>
        </div>
        <div className="flex gap-4">
          <select 
            className="bg-black/40 text-white border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-accent/50"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(0); }}
          >
            <option value="all">All Customers</option>
            <option value="anomalies">Anomalies Only</option>
          </select>
        </div>
      </div>
      
      <div className="glass-panel overflow-hidden border border-white/10 rounded-xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-white/5 text-gray-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Customer ID</th>
                <th className="px-6 py-4 font-semibold">Tenure (mo)</th>
                <th className="px-6 py-4 font-semibold">Monthly Charge</th>
                <th className="px-6 py-4 font-semibold">Churn Status</th>
                <th className="px-6 py-4 font-semibold">Anomaly Flag</th>
                <th className="px-6 py-4 font-semibold">Est. Leakage</th>
                <th className="px-6 py-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No cases found for the selected filter.
                  </td>
                </tr>
              ) : cases.map(c => (
                <tr key={c.customerID} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-medium text-white">{c.customerID}</td>
                  <td className="px-6 py-4">{c.tenure}</td>
                  <td className="px-6 py-4">${c.MonthlyCharges}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${c.Churn_Yes === 1 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                      {c.Churn_Yes === 1 ? 'Churned' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${c.synthetic_anomaly === 1 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                      {c.synthetic_anomaly === 1 ? 'Anomaly' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {c.synthetic_anomaly === 1 ? (
                      <span className="text-red-400 font-bold group-hover:text-red-300 transition-colors">${c.leakageAmount.toLocaleString()}</span>
                    ) : (
                      <span className="text-gray-500">$0</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        if (setInitialMessage) {
                          setInitialMessage(`Please investigate the anomaly for customer ${c.customerID} and create a ticket.`);
                        }
                        if (setActiveTab) {
                          setActiveTab("console");
                        }
                      }}
                      className="px-3 py-1.5 bg-accent/20 hover:bg-accent/40 text-accent font-medium text-xs rounded-md border border-accent/30 transition-colors"
                    >
                      Investigate (AI)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-white/5 flex items-center justify-between bg-black/20">
          <button 
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed border border-white/5 transition-all"
          >
            Previous
          </button>
          <span className="text-gray-400 text-sm font-medium">Page {page + 1}</span>
          <button 
            disabled={cases.length < 100}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed border border-white/5 transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
