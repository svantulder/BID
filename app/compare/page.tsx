'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Scale, AlertCircle } from 'lucide-react';
import entityData from '../../data/extracted_entities.json';

export default function CompareDashboard() {
  const data = entityData as any[];
  
  const uniqueBrands = Array.from(new Set(data.map(d => d.brand_name).filter(Boolean))).sort();
  
  // Default to the first two brands if available
  const [brandA, setBrandA] = useState<string>(uniqueBrands[0] as string || '');
  const [brandB, setBrandB] = useState<string>(uniqueBrands[1] as string || '');

  const comparisonStats = useMemo(() => {
    const subsetA = data.filter(d => d.brand_name === brandA);
    const subsetB = data.filter(d => d.brand_name === brandB);

    const calcMetrics = (subset: any[]) => {
      const total = subset.length;
      if (total === 0) return { total: 0, positive: 0, negative: 0, avgConfidence: 0, visualProof: 0 };
      
      const positive = subset.filter(d => d.sentiment === 'positive').length;
      const negative = subset.filter(d => d.sentiment === 'negative').length;
      const sumConfidence = subset.reduce((acc, curr) => acc + (curr.confidence_score || 0), 0);
      const visualProof = subset.filter(d => d.shown_visually).length;

      return {
        total,
        positivePct: Math.round((positive / total) * 100),
        negativePct: Math.round((negative / total) * 100),
        avgConfidence: Math.round(sumConfidence / total),
        visualProofPct: Math.round((visualProof / total) * 100)
      };
    };

    const statsA = calcMetrics(subsetA);
    const statsB = calcMetrics(subsetB);

    // Radar Chart Data (Capability footprint)
    const radarData = [
      { subject: 'Positivity', A: statsA.positivePct || 0, B: statsB.positivePct || 0, fullMark: 100 },
      { subject: 'Visual Proof', A: statsA.visualProofPct || 0, B: statsB.visualProofPct || 0, fullMark: 100 },
      { subject: 'AI Confidence', A: statsA.avgConfidence || 0, B: statsB.avgConfidence || 0, fullMark: 100 },
      { subject: 'Volume Share', A: (statsA.total / (statsA.total + statsB.total || 1)) * 100, B: (statsB.total / (statsA.total + statsB.total || 1)) * 100, fullMark: 100 },
    ];

    // Trigger Category Comparison
    const getTriggers = (subset: any[]) => subset.reduce((acc, curr) => {
      if(curr.trigger_category) acc[curr.trigger_category] = (acc[curr.trigger_category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const triggersA = getTriggers(subsetA);
    const triggersB = getTriggers(subsetB);
    const allTriggers = Array.from(new Set([...Object.keys(triggersA), ...Object.keys(triggersB)]));

    const triggerData = allTriggers.map(t => ({
      name: t,
      [brandA]: triggersA[t] || 0,
      [brandB]: triggersB[t] || 0,
    }));

    return { statsA, statsB, radarData, triggerData, lowDataWarning: statsA.total < 10 || statsB.total < 10 };
  }, [data, brandA, brandB]);

  return (
    <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Scale className="text-sky-400" size={28} /> Head-to-Head Analysis
          </h1>
          <p className="text-slate-400 mt-1">Direct competitor benchmarking and sentiment variance.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-900 p-2 rounded-xl border border-slate-800">
          <select value={brandA} onChange={e => setBrandA(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-sky-400 font-bold outline-none">
            {uniqueBrands.map(b => <option key={`A-${b}`} value={b as string}>{b}</option>)}
          </select>
          <span className="text-slate-500 font-bold uppercase text-xs">VS</span>
          <select value={brandB} onChange={e => setBrandB(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-purple-400 font-bold outline-none">
            {uniqueBrands.map(b => <option key={`B-${b}`} value={b as string}>{b}</option>)}
          </select>
        </div>
      </header>

      {/* Statistical Significance Warning */}
      {comparisonStats.lowDataWarning && (
        <div className="bg-rose-950/30 border border-rose-900 text-rose-400 p-4 rounded-xl flex items-start gap-3 mb-6">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Low Statistical Confidence</h4>
            <p className="text-xs mt-1">One or both selected brands have fewer than 10 recorded mentions (n={comparisonStats.statsA.total} vs n={comparisonStats.statsB.total}). Comparative percentages are highly volatile and should not be used for absolute market sizing.</p>
          </div>
        </div>
      )}

      {/* Core Metrics Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Brand A Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
          <h2 className="text-2xl font-bold text-white mb-6">{brandA}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase mb-1">Total Mentions (n)</div>
              <div className="text-2xl font-mono text-sky-400">{comparisonStats.statsA.total}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase mb-1">Positive Sentiment</div>
              <div className="text-2xl font-mono text-white">{comparisonStats.statsA.positivePct}%</div>
            </div>
          </div>
        </div>

        {/* Brand B Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          <h2 className="text-2xl font-bold text-white mb-6">{brandB}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase mb-1">Total Mentions (n)</div>
              <div className="text-2xl font-mono text-purple-400">{comparisonStats.statsB.total}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase mb-1">Positive Sentiment</div>
              <div className="text-2xl font-mono text-white">{comparisonStats.statsB.positivePct}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">Performance Footprint</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={comparisonStats.radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name={brandA} dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} />
                <Radar name={brandB} dataKey="B" stroke="#c084fc" fill="#c084fc" fillOpacity={0.4} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">Discussion Triggers (Absolute Volume)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={comparisonStats.triggerData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey={brandA} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey={brandB} fill="#c084fc" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}
