import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/90 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-white font-medium mb-1">{label}</p>
        {payload.map((p, idx) => (
          <p key={idx} className="text-sm" style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [leakageByType, setLeakageByType] = useState([]);
  const [churnDistribution, setChurnDistribution] = useState([]);
  const [outliers, setOutliers] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [kpiResp, leakResp] = await Promise.all([
          axios.get("/api/kpis"),
          axios.get("/api/customers?limit=500&anomaly=1"),
        ]);
        setKpis(kpiResp.data);

        // Leakage breakdown – simple grouping by tenure bucket
        const leakageMap = {};
        leakResp.data.forEach((c) => {
          if (c.synthetic_anomaly) {
            const bucket = Math.floor(c.tenure / 12) + "‑yr";
            const expectedRev = (c.tenure / 5) * kpiResp.data.avg_monthly_charge;
            const actualRev = c.tenure * c.MonthlyCharges;
            leakageMap[bucket] = (leakageMap[bucket] || 0) + (expectedRev - actualRev);
          }
        });
        setLeakageByType(
          Object.entries(leakageMap).map(([name, value]) => ({ name, value: Math.round(value) }))
        );

        // Churn pie - derived from KPIs
        const churnCount = Math.round(kpiResp.data.total_customers * kpiResp.data.churn_rate);
        const noChurnCount = kpiResp.data.total_customers - churnCount;
        setChurnDistribution([
          { label: "Yes", value: churnCount },
          { label: "No", value: noChurnCount }
        ]);

        // Outliers – top 5 highest leakage cases
        const anomalies = leakResp.data.map(c => {
           const expectedRev = (c.tenure / 5) * kpiResp.data.avg_monthly_charge;
           const actualRev = c.tenure * c.MonthlyCharges;
           return { ...c, leakageAmount: Math.round(expectedRev - actualRev) };
        });
        const sorted = anomalies.sort((a, b) => b.leakageAmount - a.leakageAmount).slice(0, 5);
        setOutliers(sorted);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    }
    load();
  }, []);

  if (!kpis) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium animate-pulse">Loading Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Total Customers</h3>
          <p className="text-3xl font-bold text-white">{kpis.total_customers.toLocaleString()}</p>
        </div>
        
        <div className="glass-panel p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Anomaly Rate</h3>
          <p className="text-3xl font-bold text-red-400">{(kpis.anomaly_rate * 100).toFixed(2)}%</p>
        </div>
        
        <div className="glass-panel p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-12 h-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Churn Rate</h3>
          <p className="text-3xl font-bold text-yellow-400">{(kpis.churn_rate * 100).toFixed(2)}%</p>
        </div>
        
        <div className="glass-panel p-6 relative overflow-hidden group border-l-4 border-l-green-500">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Estimated Leakage</h3>
          <p className="text-3xl font-bold text-green-400">${kpis.total_leakage_usd.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Leakage by Tenure Bucket</h3>
            <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-gray-400 border border-white/10">USD ($)</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leakageByType} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{fill: '#9ca3af'}} axisLine={{stroke: 'rgba(255,255,255,0.2)'}} />
                <YAxis stroke="#9ca3af" tick={{fill: '#9ca3af'}} axisLine={{stroke: 'rgba(255,255,255,0.2)'}} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Leakage" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Churn Distribution</h3>
            <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-gray-400 border border-white/10">Active vs Churned</span>
          </div>
          <div className="h-[300px] w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={churnDistribution} 
                  dataKey="value" 
                  nameKey="label" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={80} 
                  outerRadius={120}
                  paddingAngle={5}
                >
                  {churnDistribution.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Top 5 Revenue Leakage Cases</h3>
            <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium border border-red-500/20">High Risk</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outliers} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#9ca3af" tick={{fill: '#9ca3af'}} axisLine={{stroke: 'rgba(255,255,255,0.2)'}} tickFormatter={(val) => `$${val}`} />
                <YAxis dataKey="customerID" type="category" stroke="#9ca3af" tick={{fill: '#9ca3af'}} axisLine={{stroke: 'rgba(255,255,255,0.2)'}} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="leakageAmount" name="Leakage Amount" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
