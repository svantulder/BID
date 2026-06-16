'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, Zap, Target } from 'lucide-react';
import entityData from '../data/extracted_entities.json';

export default function TrendsDashboard() {
  const data = entityData as any[];

  // Compute Aggregates
  const aggregates = useMemo(() => {
    const total = data.length;
    const positive = data.filter(d => d.sentiment === 'positive').length;
    const negative = data.filter(d => d.sentiment === 'negative').length;
    
    // Brand Share of Voice
    const brandCounts = data.reduce((acc, curr) => {
      acc[curr.brand_name] = (acc[curr.brand_name] || 0) + 1;
      return acc;
    }, {});
    const shareOfVoice = Object.keys(brandCounts).map(name => ({
      name, value: brandCounts[name]
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // Trigger Categories (Why people are talking)
    const triggerCounts = data.reduce((acc, curr) => {
      if(curr.trigger_category) acc[curr.trigger_category] = (acc[curr.trigger_category] || 0) + 1;
      return acc;
    }, {});
    const triggerDrivers = Object.keys(triggerCounts).map(name => ({
      name, value: triggerCounts[name]
    })).sort((a, b) => b.value - a.value);

    return { total, positive, negative, shareOfVoice, triggerDrivers };
  }, [data]);

  const COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185'];

  return (
    <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">Market Trends & Statistics</h1>
        <p className="text-slate-400 mt-1">Aggregated intelligence across all captured media.</p>
      </header>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Captured Mentions</span>
            <Target size={16} className="text-sky-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2">{aggregates.total}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Positive Sentiment</span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">
            {Math.round((aggregates.positive / aggregates.total) * 100) || 0}%
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Negative Friction</span>
            <AlertTriangle size={16} className="text-rose-400" />
          </div>
          <div className="text-3xl font-bold text-rose-400 mt-2">
            {Math.round((aggregates.negative / aggregates.total) * 100) || 0}%
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Top Driver</span>
            <Zap size={16} className="text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-400 mt-2 capitalize truncate">
            {aggregates.triggerDrivers[0]?.name || 'N/A'}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">Share of Voice (Top Brands)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={aggregates.shareOfVoice} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">Discussion Drivers (Why)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={aggregates.triggerDrivers} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {aggregates.triggerDrivers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}
