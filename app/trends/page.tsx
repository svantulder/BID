'use client';

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronRight, AlertOctagon, TrendingDown, TrendingUp } from 'lucide-react';
import entityData from '../../data/extracted_entities.json';

// Interfaces...
interface AttributeScore { attribute: string; sentiment_score: number; context_quote: string; }
interface Insight { brand_name: string; product_name: string; product_category: string; overall_sentiment: string; specific_variant?: string; attributes: AttributeScore[]; }

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
  for (const [key, canonical] of Object.entries(BRAND_MAPPING)) { if (lookup.includes(key) || key.includes(lookup)) return canonical; }
  return brand;
};

const normalizeProduct = (product: string): string => {
  if (!product) return 'Unknown Product';
  let cleaned = product.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  cleaned = cleaned.replace(/Colour/g, 'Color');
  return cleaned.trim();
};

function AnomalyDetectionPanel({ data, minimumSampleVolume = 3, onNavigate }: { data: any[], minimumSampleVolume?: number, onNavigate: (b: string, p: string, v: string, sentiment: string) => void }) {
  const anomalies = useMemo(() => {
    const productStats: Record<string, { brand: string, product: string, globalScores: number[]; variants: Record<string, number[]> }> = {};

    data.forEach(insight => {
      if (!insight.specific_variant || insight.specific_variant === "Unknown") return;
      const prodKey = `${insight.brand_name}::${insight.product_name}`;
      const variant = insight.specific_variant;
      
      if (!productStats[prodKey]) {
        productStats[prodKey] = { brand: insight.brand_name, product: insight.product_name, globalScores: [], variants: {} };
      }
      if (!productStats[prodKey].variants[variant]) {
        productStats[prodKey].variants[variant] = [];
      }

      const avgScore = insight.attributes?.reduce((sum: number, attr: any) => sum + attr.sentiment_score, 0) / (insight.attributes?.length || 1);
      if (!isNaN(avgScore)) {
        productStats[prodKey].globalScores.push(avgScore);
        productStats[prodKey].variants[variant].push(avgScore);
      }
    });

    const flagged: any[] = [];
    Object.entries(productStats).forEach(([prodKey, stats]) => {
      if (stats.globalScores.length < minimumSampleVolume * 2) return;
      const globalMean = stats.globalScores.reduce((a, b) => a + b, 0) / stats.globalScores.length;
      const stdDev = Math.sqrt(stats.globalScores.map(v => Math.pow(v - globalMean, 2)).reduce((a, b) => a + b, 0) / stats.globalScores.length);

      Object.entries(stats.variants).forEach(([variant, scores]) => {
        if (scores.length < minimumSampleVolume) return;
        const variantMean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const diff = variantMean - globalMean;
        if (Math.abs(diff) > (stdDev * 1.5)) {
          flagged.push({ brand: stats.brand, product: stats.product, variant, globalMean, variantMean, deviation: diff, sampleSize: scores.length });
        }
      });
    });

    return flagged.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
  }, [data, minimumSampleVolume]);

  if (anomalies.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 mt-8 w-full">
      <div className="flex items-center gap-2 mb-4 md:mb-6">
        <AlertOctagon className="text-rose-500" size={20} />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Statistically Significant Anomalies</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {anomalies.map((anomaly, idx) => {
          const isNegative = anomaly.deviation < 0;
          return (
            <div 
              key={idx} 
              onClick={() => onNavigate(anomaly.brand, anomaly.product, anomaly.variant, isNegative ? 'negative' : 'positive')}
              className="bg-slate-950 border border-slate-800 hover:border-sky-500/50 p-4 rounded-lg cursor-pointer transition-colors"
            >
              <p className="text-xs text-slate-400 font-bold mb-1">{anomaly.brand} · {anomaly.product}</p>
              <p className="text-lg font-extrabold text-white mb-3">Variant: {anomaly.variant}</p>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Prod Mean</p>
                  <p className="font-mono text-slate-300">{anomaly.globalMean.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Var Mean</p>
                  <p className={`font-mono font-bold ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {anomaly.variantMean.toFixed(2)}
                  </p>
                </div>
                <div className={`flex items-center gap-1 ${isNegative ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'} px-2 py-1 rounded`}>
                  {isNegative ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  <span className="font-bold text-xs">{Math.abs(anomaly.deviation).toFixed(2)}Δ</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendsDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlBrand = searchParams.get('brand');

  const rawData = entityData as Insight[];
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const initialExpanded = urlBrand ? { [normalizeBrand(urlBrand)]: true } : {};
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>(initialExpanded);

  const normalizedData = useMemo(() => {
    return rawData.map(item => ({ 
      ...item, 
      brand_name: normalizeBrand(item.brand_name),
      product_name: normalizeProduct(item.product_name)
    }));
  }, [rawData]);

  const toggleBrand = (brand: string) => {
    setExpandedBrands(prev => ({ ...prev, [brand]: !prev[brand] }));
  };

  const handleDeepLink = (brand: string, product: string, variant?: string, sentiment?: string) => {
    const params = new URLSearchParams();
    params.set('brand', brand);
    params.set('product', product);
    if (variant) params.set('variant', variant);
    if (sentiment) params.set('sentiment', sentiment);
    router.push(`/feed?${params.toString()}`);
  };

  const { shareOfVoice, hierarchicalMatrix } = useMemo(() => {
    const brandCounts: Record<string, number> = {};
    const matrix: Record<string, { totalStats: Record<string, { total: number; count: number }>; products: Record<string, Record<string, { total: number; count: number }>>; }> = {};
    
    normalizedData.filter(d => d.product_category === selectedCategory || selectedCategory === 'All').forEach(insight => {
      brandCounts[insight.brand_name] = (brandCounts[insight.brand_name] || 0) + 1;
      if (!matrix[insight.brand_name]) matrix[insight.brand_name] = { totalStats: {}, products: {} };
      if (!matrix[insight.brand_name].products[insight.product_name]) matrix[insight.brand_name].products[insight.product_name] = {};
      
      insight.attributes?.forEach(attr => {
        if (!matrix[insight.brand_name].totalStats[attr.attribute]) matrix[insight.brand_name].totalStats[attr.attribute] = { total: 0, count: 0 };
        matrix[insight.brand_name].totalStats[attr.attribute].total += attr.sentiment_score;
        matrix[insight.brand_name].totalStats[attr.attribute].count += 1;

        if (!matrix[insight.brand_name].products[insight.product_name][attr.attribute]) matrix[insight.brand_name].products[insight.product_name][attr.attribute] = { total: 0, count: 0 };
        matrix[insight.brand_name].products[insight.product_name][attr.attribute].total += attr.sentiment_score;
        matrix[insight.brand_name].products[insight.product_name][attr.attribute].count += 1;
      });
    });

    const sov = Object.keys(brandCounts).map(name => ({ name, value: brandCounts[name] })).sort((a, b) => b.value - a.value).slice(0, 5);
    return { shareOfVoice: sov, hierarchicalMatrix: matrix };
  }, [normalizedData, selectedCategory]);

  const attributesList = ["Application_Ease", "Color_Accuracy", "Longevity", "Texture", "Value", "Packaging"];

  const renderCells = (scores: Record<string, { total: number; count: number }>) => {
    return attributesList.map(attr => {
      const stat = scores[attr];
      if (!stat || stat.count === 0) return <td key={attr} className="p-3 text-gray-600 text-sm text-center">-</td>;
      const avg = stat.total / stat.count;
      const bgColor = avg > 3 ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50' : 
                      avg < -3 ? 'bg-rose-900/40 text-rose-400 border-rose-800/50' : 'bg-slate-800 text-slate-300 border-slate-700';
      return (
        <td key={attr} className="p-2 text-center min-w-[100px]">
          <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${bgColor}`}>
            {avg > 0 ? '+' : ''}{avg.toFixed(1)}
          </span>
        </td>
      );
    });
  };

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 w-full">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">Granular Market Trends</h1>
          <p className="text-sm md:text-base text-slate-400">Drill down from corporate brand portfolios to individual product lines.</p>
        </div>
        <select 
          className="w-full sm:w-auto bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-sky-500"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          <option value="Makeup">Makeup</option>
          <option value="Skincare">Skincare</option>
        </select>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl xl:col-span-1">
          <h3 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">Share of Voice (Top 5)</h3>
          <div className="h-[200px] md:h-64 w-full">
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

        <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl xl:col-span-2">
          <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Brand Portfolio Breakdown</h3>
          <div className="w-full overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="p-2 text-xs text-gray-500 font-semibold sticky left-0 bg-slate-900 z-10 w-1/3">BRAND / PRODUCT ENTITY</th>
                  {attributesList.map(attr => (
                    <th key={attr} className="p-2 text-xs text-gray-500 font-semibold text-center">
                      {attr.replace('_', ' ').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(hierarchicalMatrix).map(([brand, dataNode]) => {
                  const isExpanded = !!expandedBrands[brand];
                  return (
                    <tr key={brand} className="contents">
                      <tr className="border-b border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => toggleBrand(brand)}>
                        <td className="p-3 text-sm font-bold text-white flex items-center gap-2 sticky left-0 bg-slate-900/90 backdrop-blur-md z-10 w-full">
                          {isExpanded ? <ChevronDown size={16} className="text-sky-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                          {brand}
                        </td>
                        {renderCells(dataNode.totalStats)}
                      </tr>
                      {isExpanded && Object.entries(dataNode.products)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([prodName, prodScores]) => (
                        <tr 
                          key={prodName} 
                          onClick={() => handleDeepLink(brand, prodName)}
                          className="border-b border-slate-800/30 bg-slate-950/40 hover:bg-slate-800 cursor-pointer transition-colors"
                          title={`Click to view feed for ${prodName}`}
                        >
                          <td className="p-3 pl-10 text-xs font-medium text-slate-400 italic sticky left-0 bg-slate-950/90 backdrop-blur-md z-10 w-full">
                            ↳ {prodName}
                          </td>
                          {renderCells(prodScores)}
                        </tr>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnomalyDetectionPanel data={normalizedData} onNavigate={handleDeepLink} />
    </main>
  );
}

export default function TrendsDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Macro Trends...</div>}>
      <TrendsDashboardContent />
    </Suspense>
  );
}
