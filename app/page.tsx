'use client';

import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, Zap, Target } from 'lucide-react';
import entityData from '../data/extracted_entities.json';

// Updated types to match the new Python Pydantic schema
interface AttributeScore {
  attribute: string;
  sentiment_score: number;
  context_quote: string;
}

interface Insight {
  brand_name: string;
  product_name: string;
  product_category: string;
  overall_sentiment: string;
  attributes: AttributeScore[];
}

export default function TrendsDashboard() {
  const data = entityData as Insight[];
  const [selectedCategory, setSelectedCategory] = useState<string>('Makeup');

  // Compute Aggregates & Matrix
  const { shareOfVoice, attributeMatrix } = useMemo(() => {
    // 1. Share of Voice calculation
    const brandCounts = data.reduce((acc: Record<string, number>, curr) => {
      acc[curr.brand_name] = (acc[curr.brand_name] || 0) + 1;
      return acc;
    }, {});
    
    const shareOfVoice = Object.keys(brandCounts).map(name => ({
      name, value: brandCounts[name]
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // 2. Attribute Matrix calculation
    const matrixStats: Record<string, Record<string, { total: number; count: number }>> = {};
    
    data.filter(d => d.product_category === selectedCategory || selectedCategory === 'All').forEach(insight => {
      if (!matrixStats[insight.brand_name]) {
        matrixStats[insight.brand_name] = {};
      }
      
      insight.attributes?.forEach(attr => {
        if (!matrixStats[insight.brand_name][attr.attribute]) {
          matrixStats[insight.brand_name][attr.attribute] = { total: 0, count: 0 };
        }
        matrixStats[insight.brand_name][attr.attribute].total += attr.sentiment_score;
        matrixStats[insight.brand_name][attr.attribute].count += 1;
      });
    });

    return { shareOfVoice, attributeMatrix: matrixStats };
  }, [data, selectedCategory]);

  const attributesList = ["Application_Ease", "Color_Accuracy", "Longevity", "Texture", "Value", "Packaging"];

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Market Trends</h1>
          <p className="text-slate-400">Competitive intelligence & attribute sentiment tracking.</p>
        </div>
        <select 
          className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          <option value="Makeup">Makeup</option>
          <option value="Skincare">Skincare</option>
        </select>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Share of Voice */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">Share of Voice (Top 5)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={shareOfVoice} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Competitor Benchmarking Matrix */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl overflow-x-auto">
          <h3 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">Attribute Benchmarking Matrix</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-xs text-gray-500 font-semibold border-b border-slate-800">BRAND</th>
                {attributesList.map(attr => (
                  <th key={attr} className="p-2 text-xs text-gray-500 font-semibold border-b border-slate-800">
                    {attr.replace('_', ' ').toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(attributeMatrix).map(([brand, scores]) => (
                <tr key={brand} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 text-sm font-medium text-white">{brand}</td>
                  {attributesList.map(attr => {
                    const stat = scores[attr];
                    if (!stat) return <td key={attr} className="p-3 text-gray-600 text-sm text-center">-</td>;
                    
                    const avg = stat.total / stat.count;
                    const bgColor = avg > 3 ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50' : 
                                    avg < -3 ? 'bg-rose-900/40 text-rose-400 border-rose-800/50' : 
                                    'bg-slate-800 text-slate-300 border-slate-700';
                                    
                    return (
                      <td key={attr} className="p-2 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${bgColor}`}>
                          {avg > 0 ? '+' : ''}{avg.toFixed(1)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
