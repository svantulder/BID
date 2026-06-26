'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, Radio, Scale, AlertCircle } from 'lucide-react';
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

  const uniqueBrands = useMemo(() => {
    const rawBrands = (entityData as any[]).map(d => normalizeBrand(d.brand_name));
    return Array.from(new Set(rawBrands)).sort();
  }, []);

  const filteredBrands = useMemo(() => {
    if (!searchQuery) return [];
    return uniqueBrands.filter(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, uniqueBrands]);

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
    <main className="min-h-[80vh] flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
      <div className="text-center mb-12 w-full">
        <h1 className="text-5xl font-extrabold tracking-tight text-white mb-4">
          Insight<span className="text-sky-400">Engine</span>
        </h1>
        <p className="text-slate-400 text-lg">Central Intelligence & Market Routing Hub</p>
      </div>

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
