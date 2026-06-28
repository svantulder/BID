'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, Radio, Scale, AlertCircle, TrendingDown, Flame } from 'lucide-react';
import entityData from '../data/extracted_entities.json';

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

export default function SearchHub() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const rawData = entityData as any[];

  // 1. Data Processing for Autocomplete
  const uniqueBrands = useMemo(() => {
    const rawBrands = rawData.map(d => normalizeBrand(d.brand_name));
    return Array.from(new Set(rawBrands)).sort();
  }, [rawData]);

  const filteredBrands = useMemo(() => {
    if (!searchQuery) return [];
    return uniqueBrands.filter(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, uniqueBrands]);

  // 2. Compute Dynamic Global Insights
  const globalPulse = useMemo(() => {
    const attrStats: Record<string, { total: number; count: number }> = {};
    const brandCounts: Record<string, number> = {};

    rawData.forEach(item => {
      // Track Brand Volume
      const normalized = normalizeBrand(item.brand_name);
      brandCounts[normalized] = (brandCounts[normalized] || 0) + 1;

      // Track Attribute Sentiment
      item.attributes?.forEach((attr: any) => {
        if (!attrStats[attr.attribute]) attrStats[attr.attribute] = { total: 0, count: 0 };
        attrStats[attr.attribute].total += attr.sentiment_score;
        attrStats[attr.attribute].count += 1;
      });
    });

    // Calculate Averages and Sort
    const averages = Object.entries(attrStats).map(([name, stats]) => ({
      name: name.replace('_', ' '),
      avg: stats.total / stats.count
    })).filter(a => !isNaN(a.avg));

    averages.sort((a, b) => b.avg - a.avg);

    // Get Top Brand
    const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      topAttribute: averages[0],
      worstAttribute: averages[averages.length - 1],
      mostDiscussed: { name: topBrand?.[0] || 'N/A', count: topBrand?.[1] || 0 }
    };
  }, [rawData]);

  // 3. Action Handlers
  const handleSelectBrand = (brand: string) => {
    setSelectedBrand(brand);
    setSearchQuery(brand);
  };

  const handleNavigation = (path: string, paramKey: string) => {
    if (!selectedBrand) return;
    const params = new URLSearchParams();
    params.set(paramKey, selectedBrand);
    router.push(`/${path}?${params.toString()}`);
  };

  return (
    <main className="min-h-[85vh] flex flex-col items-center justify-center p-8 max-w-5xl mx-auto w-full">
      
      {/* Header */}
      <div className="text-center mb-10 w-full">
        <h1 className="text-5xl font-extrabold tracking-tight text-white mb-4">
          Insight<span className="text-sky-400">Engine</span>
        </h1>
        <p className="text-slate-400 text-lg">Central Intelligence & Market Routing Hub</p>
      </div>

      {/* Global Market Pulse Cards */}
      {!selectedBrand && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-12 animate-in fade-in duration-500">
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Top Market Driver</p>
              <p className="text-sm text-slate-200">
                <span className="font-bold text-white">{globalPulse.topAttribute?.name || 'N/A'}</span> scores highest market-wide
                <span className="ml-2 text-emerald-400 font-mono text-xs bg-emerald-950 px-1.5 py-0.5 rounded">
                  +{globalPulse.topAttribute?.avg.toFixed(1)}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 rounded-lg">
              <TrendingDown className="text-rose-400" size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Major Friction Point</p>
              <p className="text-sm text-slate-200">
                <span className="font-bold text-white">{globalPulse.worstAttribute?.name || 'N/A'}</span> requires immediate attention
                <span className="ml-2 text-rose-400 font-mono text-xs bg-rose-950 px-1.5 py-0.5 rounded">
                  {globalPulse.worstAttribute?.avg.toFixed(1)}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-sky-500/10 rounded-lg">
              <Flame className="text-sky-400" size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Highest Velocity Brand</p>
              <p className="text-sm text-slate-200">
                <span className="font-bold text-white">{globalPulse.mostDiscussed.name}</span> leads conversation volume
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Search Component */}
      <div className="w-full max-w-2xl relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
          <input
            type="text"
            placeholder="Search for a brand entity (e.g., L'Oréal, e.l.f.)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedBrand(null);
            }}
            className="w-full bg-slate-900 border-2 border-slate-800 text-white rounded-2xl pl-14 pr-6 py-5 text-lg focus:outline-none focus:border-sky-500 transition-colors shadow-2xl"
          />
        </div>

        {/* Autocomplete Dropdown */}
        {searchQuery && !selectedBrand && (
          <div className="absolute w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
            {filteredBrands.length > 0 ? (
              <ul className="max-h-64 overflow-y-auto custom-scrollbar">
                {filteredBrands.map(brand => (
                  <li 
                    key={brand}
                    onClick={() => handleSelectBrand(brand)}
                    className="px-6 py-4 hover:bg-slate-800 cursor-pointer text-slate-200 font-medium transition-colors border-b border-slate-800/50 last:border-0"
                  >
                    {brand}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-6 text-center flex flex-col items-center justify-center text-slate-400">
                <AlertCircle className="mb-2 text-rose-400" size={24} />
                <p className="font-medium text-slate-300">Entity not found in current dataset.</p>
                <p className="text-sm mt-1">Try querying known assets like <b>Maybelline</b>, <b>Fenty Beauty</b>, or <b>La Prairie</b>.</p>
              </div>
            )}
          </div>
        )}

        {/* Routing Actions (Appears after selection) */}
        {selectedBrand && (
          <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
              Select Analysis Vector for <span className="text-sky-400">{selectedBrand}</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button 
                onClick={() => handleNavigation('trends', 'brand')}
                className="flex flex-col items-center justify-center gap-3 bg-slate-900 border border-slate-800 hover:border-sky-500 hover:bg-slate-800/50 p-6 rounded-xl transition-all group"
              >
                <TrendingUp size={32} className="text-sky-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-slate-200">Macro Trends</span>
              </button>

              <button 
                onClick={() => handleNavigation('compare', 'brandA')}
                className="flex flex-col items-center justify-center gap-3 bg-slate-900 border border-slate-800 hover:border-purple-500 hover:bg-slate-800/50 p-6 rounded-xl transition-all group"
              >
                <Scale size={32} className="text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-slate-200">Head-to-Head</span>
              </button>

              <button 
                onClick={() => handleNavigation('feed', 'brand')}
                className="flex flex-col items-center justify-center gap-3 bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-800/50 p-6 rounded-xl transition-all group"
              >
                <Radio size={32} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-slate-200">Signal Feed</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
