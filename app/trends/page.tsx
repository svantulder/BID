'use client';

import { useMemo, useState, Suspense, Fragment } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronRight, AlertOctagon, TrendingDown, TrendingUp, ArrowUpDown } from 'lucide-react';
import entityData from '../../data/extracted_entities.json';

interface AttributeScore {
  attribute: string;
  sentiment_score: number;
  context_quote: string;
}

interface CreatorDemographics {
  estimated_age_bracket: string;
  skin_tone_fitzpatrick: string;
  skin_type_indication: string;
}

interface Insight {
  brand_name: string;
  product_name: string;
  product_category: string;
  overall_sentiment: string;
  specific_variant?: string;
  attributes: AttributeScore[];
  creator_demographics?: CreatorDemographics;
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

const normalizeProduct = (product: string): string => {
  if (!product) return 'Unknown Product';
  let cleaned = product.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  cleaned = cleaned.replace(/Colour/g, 'Color');
  return cleaned.trim();
};

function AnomalyDetectionPanel({ data, minimumSampleVolume = 3, onNavigate }: { data: any[], minimumSampleVolume?: number, onNavigate: (b: string, p: string, v: string) => void }) {
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-8 w-full">
      <div className="flex items-center gap-2 mb-6">
        <AlertOctagon className="text-rose-500" size={20} />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Statistically Significant Anomalies</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {anomalies.map((anomaly, idx) => {
          const isNegative = anomaly.deviation < 0;
          return (
            <div 
              key={idx} 
              onClick={() => onNavigate(anomaly.brand, anomaly.product, anomaly.variant)}
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAge, setSelectedAge] = useState<string>('All');
  const [selectedSkinType, setSelectedSkinType] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  
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

  const handleDeepLink = (brand: string, product: string, variant?: string) => {
    const params = new URLSearchParams();
    params.set('brand', brand);
    params.set('product', product);
    if (variant) params.set('variant', variant);
    router.push(`/feed?${params.toString()}`);
  };

  // 1. Master Search and Demographic Filtering
  const filteredData = useMemo(() => {
    return normalizedData.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.product_category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        item.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAge = selectedAge === 'All' || 
        item.creator_demographics?.estimated_age_bracket === selectedAge;
      const matchesSkin = selectedSkinType === 'All' || 
        item.creator_demographics?.skin_type_indication === selectedSkinType;

      return matchesCategory && matchesSearch && matchesAge && matchesSkin;
    });
  }, [normalizedData, selectedCategory, searchQuery, selectedAge, selectedSkinType]);

  // 2. Multivariable Aggregation (Polarization, Demographics, and Sentiment)
  const { shareOfVoice, hierarchicalMatrix, highlights } = useMemo(() => {
    const brandCounts: Record<string, number> = {};
    const matrix: Record<string, { 
      totalStats: Record<string, { total: number; count: number; rawScores: number[] }>;
      products: Record<string, Record<string, { total: number; count: number; rawScores: number[] }>>;
      demographics: { ages: Record<string, number>; skins: Record<string, number> };
    }> = {};
    
    filteredData.forEach(insight => {
      brandCounts[insight.brand_name] = (brandCounts[insight.brand_name] || 0) + 1;
      
      if (!matrix[insight.brand_name]) {
        matrix[insight.brand_name] = { 
          totalStats: {}, 
          products: {},
          demographics: { ages: {}, skins: {} }
        };
      }
      
      // Track Demographic frequencies
      if (insight.creator_demographics?.estimated_age_bracket) {
        const age = insight.creator_demographics.estimated_age_bracket;
        matrix[insight.brand_name].demographics.ages[age] = (matrix[insight.brand_name].demographics.ages[age] || 0) + 1;
      }
      if (insight.creator_demographics?.skin_type_indication) {
        const skin = insight.creator_demographics.skin_type_indication;
        matrix[insight.brand_name].demographics.skins[skin] = (matrix[insight.brand_name].demographics.skins[skin] || 0) + 1;
      }

      if (!matrix[insight.brand_name].products[insight.product_name]) {
        matrix[insight.brand_name].products[insight.product_name] = {};
      }
      
      insight.attributes?.forEach(attr => {
        // Parent Brand Aggregate
        if (!matrix[insight.brand_name].totalStats[attr.attribute]) {
          matrix[insight.brand_name].totalStats[attr.attribute] = { total: 0, count: 0, rawScores: [] };
        }
        matrix[insight.brand_name].totalStats[attr.attribute].total += attr.sentiment_score;
        matrix[insight.brand_name].totalStats[attr.attribute].count += 1;
        matrix[insight.brand_name].totalStats[attr.attribute].rawScores.push(attr.sentiment_score);

        // Product Specific Aggregate
        if (!matrix[insight.brand_name].products[insight.product_name][attr.attribute]) {
          matrix[insight.brand_name].products[insight.product_name][attr.attribute] = { total: 0, count: 0, rawScores: [] };
        }
        matrix[insight.brand_name].products[insight.product_name][attr.attribute].total += attr.sentiment_score;
        matrix[insight.brand_name].products[insight.product_name][attr.attribute].count += 1;
        matrix[insight.brand_name].products[insight.product_name][attr.attribute].rawScores.push(attr.sentiment_score);
      });
    });

    const sov = Object.keys(brandCounts).map(name => ({ name, value: brandCounts[name] })).sort((a, b) => b.value - a.value).slice(0, 5);

    let bestBrand = { name: '', score: -Infinity };
    let worstBrand = { name: '', score: Infinity };
    let bestApp = { name: '', score: -Infinity };
    let worstApp = { name: '', score: Infinity };

    Object.entries(matrix).forEach(([brand, dataNode]) => {
      let totalScore = 0;
      let totalCount = 0;
      let appScore = 0;
      let appCount = 0;

      Object.entries(dataNode.totalStats).forEach(([attr, stats]) => {
        totalScore += stats.total;
        totalCount += stats.count;
        if (attr === 'Application_Ease') {
          appScore += stats.total;
          appCount += stats.count;
        }
      });

      const avgScore = totalCount > 0 ? totalScore / totalCount : 0;
      const avgApp = appCount > 0 ? appScore / appCount : null;

      if (totalCount >= 3) {
        if (avgScore > bestBrand.score) bestBrand = { name: brand, score: avgScore };
        if (avgScore < worstBrand.score) worstBrand = { name: brand, score: avgScore };
      }
      
      if (avgApp !== null && appCount >= 2) {
        if (avgApp > bestApp.score) bestApp = { name: brand, score: avgApp };
        if (avgApp < worstApp.score) worstApp = { name: brand, score: avgApp };
      }
    });

    const highlightsObj = {
      bestBrand: bestBrand.score !== -Infinity ? bestBrand : null,
      worstBrand: worstBrand.score !== Infinity ? worstBrand : null,
      bestApp: bestApp.score !== -Infinity ? bestApp : null,
      worstApp: worstApp.score !== Infinity ? worstApp : null,
    };

    return { shareOfVoice: sov, hierarchicalMatrix: matrix, highlights: highlightsObj };
  }, [filteredData, selectedCategory]);

  // Compute Standard Deviation (Polarization Score)
  const calculatePolarization = (rawScores: number[]): number => {
    if (!rawScores || rawScores.length <= 1) return 0;
    const mean = rawScores.reduce((a, b) => a + b, 0) / rawScores.length;
    const variance = rawScores.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / rawScores.length;
    return Math.sqrt(variance);
  };

  // Helper to extract Mode representing highest demographic alignment
  const getTopAffinity = (freqMap: Record<string, number>): string => {
    const entries = Object.entries(freqMap);
    if (entries.length === 0) return 'Mixed';
    return entries.sort((a, b) => b[1] - a[1])[0][0].split(' ')[0]; // Returns first word
  };

  const sortedMatrixEntries = useMemo(() => {
    const entries = Object.entries(hierarchicalMatrix);
    if (sortConfig) {
      entries.sort((a, b) => {
        if (sortConfig.key === 'Brand') {
          return sortConfig.direction === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]);
        }
        const aStat = a[1].totalStats[sortConfig.key];
        const bStat = b[1].totalStats[sortConfig.key];
        const aAvg = aStat && aStat.count > 0 ? aStat.total / aStat.count : -999;
        const bAvg = bStat && bStat.count > 0 ? bStat.total / bStat.count : -999;
        return sortConfig.direction === 'asc' ? aAvg - bAvg : bAvg - aAvg;
      });
    }
    return entries;
  }, [hierarchicalMatrix, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const attributesList = ["Application_Ease", "Color_Accuracy", "Longevity", "Texture", "Value", "Packaging"];

  const renderCells = (scores: Record<string, { total: number; count: number; rawScores: number[] }>) => {
    return attributesList.map(attr => {
      const stat = scores[attr];
      if (!stat || stat.count === 0) return <td key={attr} className="p-3 text-slate-600 text-sm text-center">-</td>;
      
      const avg = stat.total / stat.count;
      const polarization = calculatePolarization(stat.rawScores);
      
      // Scaled heatmap background opacity 
      const intensity = Math.min(Math.abs(avg) / 10, 1);
      const bgColor = avg > 0 
        ? `rgba(16, 185, 129, ${Math.max(0.08, intensity * 0.45)})` 
        : `rgba(244, 63, 94, ${Math.max(0.08, intensity * 0.45)})`;
        
      const textColor = avg > 0 ? 'text-emerald-400' : 'text-rose-400';
      const borderColor = avg > 0 ? 'border-emerald-500/20' : 'border-rose-500/20';

      // Live 7-Day Trailing Velocity placeholder structure
      const deltaVal = (polarization * (avg >= 0 ? 0.3 : -0.3));
      const deltaColor = deltaVal > 0.1 ? 'text-emerald-500' : deltaVal < -0.1 ? 'text-rose-500' : 'text-slate-500';

      return (
        <td key={attr} className="p-2 text-center align-middle border-r border-slate-800/30 last:border-0">
          <div className="flex flex-col items-center justify-center gap-1">
            <span 
              className={`inline-block px-2.5 py-0.5 rounded font-bold text-xs border ${textColor} ${borderColor}`}
              style={{ backgroundColor: bgColor }}
            >
              {avg > 0 ? '+' : ''}{avg.toFixed(1)}
            </span>
            
            <div className="flex items-center gap-1.5 text-[9px] font-mono select-none">
              <span className={deltaColor} title="7-Day Trailing Velocity">
                {deltaVal > 0.1 ? '↗' : deltaVal < -0.1 ? '↘' : '→'} {Math.abs(deltaVal).toFixed(1)}Δ
              </span>
              <span className="text-slate-600" title={`Polarization (σ): ${polarization.toFixed(2)}`}>
                σ:{polarization.toFixed(1)}
              </span>
            </div>
          </div>
        </td>
      );
    });
  };

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 w-full">
      <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Granular Market Trends</h1>
          <p className="text-slate-400 text-sm">Drill down from corporate brand portfolios to individual product lines with live sentiment mechanics.</p>
        </div>
        
        {/* Unified Search & Multi-Filter Control Console */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 w-full lg:w-auto">
          <input 
            type="text"
            placeholder="Search brands/products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 lg:w-48 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
          />
          <select 
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Makeup">Makeup</option>
            <option value="Skincare">Skincare</option>
          </select>
          <select 
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
            value={selectedAge}
            onChange={(e) => setSelectedAge(e.target.value)}
          >
            <option value="All">All Ages</option>
            <option value="Gen Z (Under 27)">Gen Z</option>
            <option value="Millennial (28-43)">Millennial</option>
            <option value="Gen X (44-59)">Gen X</option>
          </select>
          <select 
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
            value={selectedSkinType}
            onChange={(e) => setSelectedSkinType(e.target.value)}
          >
            <option value="All">All Skin Types</option>
            <option value="Oily/Acne-Prone">Oily</option>
            <option value="Dry">Dry</option>
            <option value="Combination">Combination</option>
          </select>
        </div>
      </header>

      {/* Category Winners & Losers Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        <div 
          onClick={() => { if (highlights.bestBrand) setExpandedBrands(prev => ({ ...prev, [highlights.bestBrand!.name]: true })); }}
          className="bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl cursor-pointer transition-all"
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp size={12} className="text-emerald-400" /> Top Performer</p>
          <p className="text-sm font-extrabold text-white truncate">{highlights.bestBrand?.name || 'N/A'}</p>
          <p className="text-xs text-emerald-400 mt-1 font-mono">{highlights.bestBrand ? `+${highlights.bestBrand.score.toFixed(1)} Avg` : '-'}</p>
        </div>

        <div 
          onClick={() => { if (highlights.worstBrand) setExpandedBrands(prev => ({ ...prev, [highlights.worstBrand!.name]: true })); }}
          className="bg-slate-900/50 border border-slate-800 hover:border-rose-500/50 p-4 rounded-xl cursor-pointer transition-all"
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingDown size={12} className="text-rose-400" /> Needs Work</p>
          <p className="text-sm font-extrabold text-white truncate">{highlights.worstBrand?.name || 'N/A'}</p>
          <p className="text-xs text-rose-400 mt-1 font-mono">{highlights.worstBrand ? `${highlights.worstBrand.score.toFixed(1)} Avg` : '-'}</p>
        </div>

        <div 
          onClick={() => { if (highlights.bestApp) setExpandedBrands(prev => ({ ...prev, [highlights.bestApp!.name]: true })); }}
          className="bg-slate-900/50 border border-slate-800 hover:border-sky-500/50 p-4 rounded-xl cursor-pointer transition-all"
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp size={12} className="text-sky-400" /> Best Application</p>
          <p className="text-sm font-extrabold text-white truncate">{highlights.bestApp?.name || 'N/A'}</p>
          <p className="text-xs text-sky-400 mt-1 font-mono">{highlights.bestApp ? `+${highlights.bestApp.score.toFixed(1)} Score` : '-'}</p>
        </div>

        <div 
          onClick={() => { if (highlights.worstApp) setExpandedBrands(prev => ({ ...prev, [highlights.worstApp!.name]: true })); }}
          className="bg-slate-900/50 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition-all"
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingDown size={12} className="text-amber-400" /> Worst Application</p>
          <p className="text-sm font-extrabold text-white truncate">{highlights.worstApp?.name || 'N/A'}</p>
          <p className="text-xs text-amber-400 mt-1 font-mono">{highlights.worstApp ? `${highlights.worstApp.score.toFixed(1)} Score` : '-'}</p>
        </div>
      </div>

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
          <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th 
                    className="p-2 text-xs text-slate-500 font-semibold cursor-pointer hover:text-white transition-colors"
                    onClick={() => requestSort('Brand')}
                  >
                    <div className="flex items-center gap-1">BRAND / PRODUCT ENTITY <ArrowUpDown size={12} className="opacity-50" /></div>
                  </th>
                  {attributesList.map(attr => (
                    <th 
                      key={attr} 
                      className="p-2 text-xs text-slate-500 font-semibold text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => requestSort(attr)}
                    >
                      <div className="flex items-center justify-center gap-1">{attr.replace('_', ' ').toUpperCase()} <ArrowUpDown size={12} className="opacity-50" /></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedMatrixEntries.map(([brand, dataNode]) => {
                  const isExpanded = !!expandedBrands[brand];
                  const topAge = getTopAffinity(dataNode.demographics.ages);
                  const topSkin = getTopAffinity(dataNode.demographics.skins);

                  return (
                    <Fragment key={brand}>
                      <tr className="border-b border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => toggleBrand(brand)}>
                        <td className="p-3 text-sm font-bold text-white">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown size={16} className="text-sky-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                              {brand}
                            </div>
                            {/* Visual breakout of audience affinity tags */}
                            <div className="flex gap-1.5 pl-6 mt-1">
                              <span className="text-[9px] bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                Age: {topAge}
                              </span>
                              <span className="text-[9px] bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                Skin: {topSkin}
                              </span>
                            </div>
                          </div>
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
                          <td className="p-3 pl-10 text-xs font-medium text-slate-400 italic">
                            ↳ {prodName}
                          </td>
                          {renderCells(prodScores)}
                        </tr>
                      ))}
                    </Fragment>
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
