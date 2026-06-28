'use client';

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
  overall_sentiment: string;
  attributes: AttributeScore[];
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

// NEW: Force consistent casing and spelling for products
const normalizeProduct = (product: string): string => {
  if (!product) return 'Unknown Product';
  let cleaned = product.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  cleaned = cleaned.replace(/Colour/g, 'Color');
  return cleaned.trim();
};

function TrendsDashboardContent() {
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

  const { shareOfVoice, hierarchicalMatrix } = useMemo(() => {
    const brandCounts: Record<string, number> = {};
    const matrix: Record<string, { 
      totalStats: Record<string, { total: number; count: number }>;
      products: Record<string, Record<string, { total: number; count: number }>>;
    }> = {};
    
    normalizedData.filter(d => d.product_category === selectedCategory || selectedCategory === 'All').forEach(insight => {
      brandCounts[insight.brand_name] = (brandCounts[insight.brand_name] || 0) + 1;
      
      if (!matrix[insight.brand_name]) {
        matrix[insight.brand_name] = { totalStats: {}, products: {} };
      }
      if (!matrix[insight.brand_name].products[insight.product_name]) {
        matrix[insight.brand_name].products[insight.product_name] = {};
      }
      
      insight.attributes?.forEach(attr => {
        if (!matrix[insight.brand_name].totalStats[attr.attribute]) {
          matrix[insight.brand_name].totalStats[attr.attribute] = { total: 0, count: 0 };
        }
        matrix[insight.brand_name].totalStats[attr.attribute].total += attr.sentiment_score;
        matrix[insight.brand_name].totalStats[attr.attribute].count += 1;

        if (!matrix[insight.brand_name].products[insight.product_name][attr.attribute]) {
          matrix[insight.brand_name].products[insight.product_name][attr.attribute] = { total: 0, count: 0 };
        }
        matrix[insight.brand_name].products[insight.product_name][attr.attribute].total += attr.sentiment_score;
        matrix[insight.brand_name].products[insight.product_name][attr.attribute].count += 1;
      });
    });

    const sov = Object.keys(brandCounts).map(name => ({
      name, value: brandCounts[name]
    })).sort((a, b) => b.value - a.value).slice(0, 5);

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
        <td key={attr} className="p-2 text-center">
          <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${bgColor}`}>
            {avg > 0 ? '+' : ''}{avg.toFixed(1)}
          </span>
        </td>
      );
    });
  };

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 w-full">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Granular Market Trends</h1>
          <p className="text-slate-400">Drill down from corporate brand portfolios to individual product lines.</p>
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
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl xl:col-span-1">
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

        <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl xl:col-span-2">
          <h3 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">Brand Portfolio Breakdown</h3>
          
          {/* MOBILE FIX: Allow horizontal scrolling for the table */}
          <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="p-2 text-xs text-gray-500 font-semibold">BRAND / PRODUCT ENTITY</th>
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
                        <td className="p-3 text-sm font-bold text-white flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={16} className="text-sky-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                          {brand}
                        </td>
                        {renderCells(dataNode.totalStats)}
                      </tr>
                      {isExpanded && Object.entries(dataNode.products)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([prodName, prodScores]) => (
                        <tr key={prodName} className="border-b border-slate-800/30 bg-slate-950/40 hover:bg-slate-950/80 transition-colors">
                          <td className="p-3 pl-10 text-xs font-medium text-slate-400 italic">
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
