'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import entityData from '../../data/extracted_entities.json';

interface AttributeScore {
  attribute: string;
  sentiment_score: number;
  context_quote: string;
}

interface Insight {
  brand_name: string;
  product_name: string;
  product_category: string;
  overall_sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  active_ingredients?: string[];
  attributes?: AttributeScore[];
}

const BRAND_MAPPING: Record<string, string> = {
  "loreal": "L'Oréal", "l'oreal": "L'Oréal", "l'oréal": "L'Oréal", "l'oreal paris": "L'Oréal", "l'oréal paris": "L'Oréal",
  "maybelline": "Maybelline", "maybelline new york": "Maybelline",
  "elf": "e.l.f. Cosmetics", "e.l.f.": "e.l.f. Cosmetics", "elfcosmetics": "e.l.f. Cosmetics",
  "charlotte tilbury": "Charlotte Tilbury", "fenty": "Fenty Beauty", "fenty beauty": "Fenty Beauty",
  "rare beauty": "Rare Beauty", "la prairie": "La Prairie", "kylie": "Kylie Cosmetics",
  "kylie cosmetics": "Kylie Cosmetics", "rem beauty": "r.e.m. beauty", "r.e.m. beauty": "r.e.m. beauty"
};

const normalizeBrand = (brand: string): string => {
  if (!brand) return 'Unknown Brand';
  const lookup = brand.trim().toLowerCase();
  if (BRAND_MAPPING[lookup]) return BRAND_MAPPING[lookup];
  for (const [key, canonical] of Object.entries(BRAND_MAPPING)) {
    if (lookup.includes(key) || key.includes(lookup)) return canonical;
  }
  return brand;
};

function CompareDashboardContent() {
  const searchParams = useSearchParams();
  const urlBrandA = searchParams.get('brandA');

  const rawData = entityData as Insight[];
  const normalizedData = useMemo(() => {
    return rawData.map(item => ({ ...item, brand_name: normalizeBrand(item.brand_name) }));
  }, [rawData]);

  const uniqueBrands = useMemo(() => 
    Array.from(new Set(normalizedData.map(d => d.brand_name))).sort(), 
  [normalizedData]);

  const defaultBrandA = urlBrandA ? normalizeBrand(urlBrandA) : (uniqueBrands[0] || '');
  const [brandA, setBrandA] = useState<string>(defaultBrandA);
  const [productA, setProductA] = useState<string>('All');
  
  const [brandB, setBrandB] = useState<string>(uniqueBrands[1] || '');
  const [productB, setProductB] = useState<string>('All');

  const productsForA = useMemo(() => {
    const list = normalizedData.filter(d => d.brand_name === brandA).map(d => d.product_name);
    return ['All', ...Array.from(new Set(list))];
  }, [brandA, normalizedData]);

  const productsForB = useMemo(() => {
    const list = normalizedData.filter(d => d.brand_name === brandB).map(d => d.product_name);
    return ['All', ...Array.from(new Set(list))];
  }, [brandB, normalizedData]);

  const attributesList = ["Application_Ease", "Color_Accuracy", "Longevity", "Texture", "Value", "Packaging"];

  const computeMetrics = (targetBrand: string, targetProduct: string) => {
    const subset = normalizedData.filter(d => 
      d.brand_name === targetBrand && (targetProduct === 'All' || d.product_name === targetProduct)
    );
    if (!subset.length) return null;

    const stats: Record<string, { total: number; count: number }> = {};
    const ingredientStats: Record<string, { sentimentSum: number; count: number }> = {};

    subset.forEach(insight => {
      insight.attributes?.forEach(attr => {
        if (!stats[attr.attribute]) stats[attr.attribute] = { total: 0, count: 0 };
        stats[attr.attribute].total += attr.sentiment_score;
        stats[attr.attribute].count += 1;
      });

      const baseSentiment = insight.overall_sentiment === 'positive' ? 1 : insight.overall_sentiment === 'negative' ? -1 : 0;
      insight.active_ingredients?.forEach(ing => {
        if (!ingredientStats[ing]) ingredientStats[ing] = { sentimentSum: 0, count: 0 };
        ingredientStats[ing].sentimentSum += baseSentiment;
        ingredientStats[ing].count += 1;
      });
    });

    const averages: Record<string, number> = {};
    Object.keys(stats).forEach(attr => {
      averages[attr] = stats[attr].total / stats[attr].count;
    });

    const tags = Object.keys(ingredientStats).map(ing => ({
      name: ing,
      score: ingredientStats[ing].sentimentSum / ingredientStats[ing].count
    }));

    return { volume: subset.length, averages, tags };
  };

  const metricsA = useMemo(() => computeMetrics(brandA, productA), [brandA, productA, normalizedData]);
  const metricsB = useMemo(() => computeMetrics(brandB, productB), [brandB, productB, normalizedData]);

  const radarData = useMemo(() => {
    return attributesList.map(attr => ({
      attribute: attr.replace('_', ' '),
      CompetitorA: metricsA?.averages[attr] || 0,
      CompetitorB: metricsB?.averages[attr] || 0,
    }));
  }, [metricsA, metricsB]);

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Granular Product Comparison</h1>
        <p className="text-slate-400">Head-to-head multi-axis benchmarking and formulation sentiment.</p>
      </header>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full h-[400px] flex items-center justify-center">
        {metricsA || metricsB ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="attribute" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[-10, 10]} tick={{ fill: '#64748b' }} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Radar name={productA === 'All' ? brandA : productA} dataKey="CompetitorA" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} />
              <Radar name={productB === 'All' ? brandB : productB} dataKey="CompetitorB" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-slate-500 font-medium">Insufficient data for radar visualization.</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Parent Brand A</label>
            <select 
              value={brandA} 
              onChange={(e) => { setBrandA(e.target.value); setProductA('All'); }}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-500"
            >
              {uniqueBrands.map(b => <option key={`A-brand-${b}`} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Focus Entity</label>
            <select 
              value={productA} 
              onChange={(e) => setProductA(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-500"
            >
              {productsForA.map(p => <option key={`A-prod-${p}`} value={p}>{p === 'All' ? 'Aggregate All Products' : p}</option>)}
            </select>
          </div>
          
          {metricsA && (
            <div className="pt-4 space-y-5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Signal Footprint Count: <span className="text-white font-mono">{metricsA.volume}</span></div>
              
              {metricsA.tags.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Detected Formulations</h4>
                  <div className="flex flex-wrap gap-2">
                    {metricsA.tags.map(tag => {
                      const colorClass = tag.score > 0.2 ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50' : 
                                         tag.score < -0.2 ? 'bg-rose-950 text-rose-400 border-rose-800/50' : 
                                         'bg-slate-800 text-slate-300 border-slate-700';
                      return (
                        <span key={tag.name} className={`px-2 py-1 rounded text-xs font-medium border ${colorClass}`}>
                          {tag.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                {attributesList.map(attr => {
                  const val = metricsA.averages[attr];
                  return (
                    <div key={attr} className="flex justify-between items-center border-b border-slate-800/40 pb-2">
                      <span className="text-xs text-slate-400">{attr.replace('_', ' ')}</span>
                      <span className={`font-bold text-sm ${val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                        {val !== undefined && !isNaN(val) ? (val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)) : 'N/A'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Parent Brand B</label>
            <select 
              value={brandB} 
              onChange={(e) => { setBrandB(e.target.value); setProductB('All'); }}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-purple-500"
            >
              {uniqueBrands.map(b => <option key={`B-brand-${b}`} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Focus Entity</label>
            <select 
              value={productB} 
              onChange={(e) => setProductB(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-purple-500"
            >
              {productsForB.map(p => <option key={`B-prod-${p}`} value={p}>{p === 'All' ? 'Aggregate All Products' : p}</option>)}
            </select>
          </div>

          {metricsB && (
            <div className="pt-4 space-y-5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Signal Footprint Count: <span className="text-white font-mono">{metricsB.volume}</span></div>
              
              {metricsB.tags.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Detected Formulations</h4>
                  <div className="flex flex-wrap gap-2">
                    {metricsB.tags.map(tag => {
                      const colorClass = tag.score > 0.2 ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50' : 
                                         tag.score < -0.2 ? 'bg-rose-950 text-rose-400 border-rose-800/50' : 
                                         'bg-slate-800 text-slate-300 border-slate-700';
                      return (
                        <span key={tag.name} className={`px-2 py-1 rounded text-xs font-medium border ${colorClass}`}>
                          {tag.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                {attributesList.map(attr => {
                  const val = metricsB.averages[attr];
                  return (
                    <div key={attr} className="flex justify-between items-center border-b border-slate-800/40 pb-2">
                      <span className="text-xs text-slate-400">{attr.replace('_', ' ')}</span>
                      <span className={`font-bold text-sm ${val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                        {val !== undefined && !isNaN(val) ? (val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)) : 'N/A'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CompareDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Benchmarks...</div>}>
      <CompareDashboardContent />
    </Suspense>
  );
}
