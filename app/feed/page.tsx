'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mic, Type, Eye, User, Beaker, X, Filter } from 'lucide-react';
import entityData from '../../data/extracted_entities.json';

interface AttributeScore {
  attribute: string;
  sentiment_score: number;
  context_quote: string;
}

interface CompetitorMention {
  competitor_brand: string;
  competitor_product: string;
  comparison_nature: "inferior" | "superior" | "similar";
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
  sub_category: string;
  active_ingredients?: string[];
  creator_demographics?: CreatorDemographics;
  overall_sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  primary_claim: string;
  anchor_quote: string;
  attributes?: AttributeScore[];
  direct_comparisons?: CompetitorMention[];
  mentioned_in_audio: boolean;
  mentioned_in_caption: boolean;
  shown_visually: boolean;
  spoken_timestamp_seconds: number | null;
  visual_timestamp_seconds: number | null;
  confidence_score: number;
  video_id: string;
  influencer?: string;
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

const DemoBadge = ({ label, value }: { label: string, value?: string }) => {
  const isUnknown = !value || value === "Unknown";
  return (
    <div className={`flex flex-col p-2 rounded-lg border ${isUnknown ? 'bg-slate-900/30 border-slate-800/50' : 'bg-slate-900 border-slate-700'}`}>
      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">{label}</span>
      <span className={`text-xs font-semibold ${isUnknown ? 'text-slate-600' : 'text-slate-300'}`}>
        {isUnknown ? 'Unverified' : value}
      </span>
    </div>
  );
};

function FeedStreamContent() {
  const searchParams = useSearchParams();
  const urlBrand = searchParams.get('brand');
  const urlProduct = searchParams.get('product');
  const urlSentiment = searchParams.get('sentiment');

  const rawData = entityData as Insight[];
  const normalizedData = useMemo(() => {
    return rawData.map(item => ({ 
      ...item, 
      brand_name: normalizeBrand(item.brand_name),
      product_name: normalizeProduct(item.product_name)
    }));
  }, [rawData]);

  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<number>(0);
  
  // Initialize from deep links
  const [filterBrand, setFilterBrand] = useState<string>(urlBrand ? normalizeBrand(urlBrand) : 'All');
  const [filterProduct, setFilterProduct] = useState<string>(urlProduct ? normalizeProduct(urlProduct) : 'All');
  const [filterSentiment, setFilterSentiment] = useState<string>(urlSentiment || 'All');
  const [filterInfluencer, setFilterInfluencer] = useState<string>('All');
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Derive dynamic dropdown options
  const uniqueBrands = useMemo(() => Array.from(new Set(normalizedData.map(d => d.brand_name))).sort(), [normalizedData]);
  const uniqueProducts = useMemo(() => {
    const list = normalizedData.filter(d => filterBrand === 'All' || d.brand_name === filterBrand).map(d => d.product_name);
    return Array.from(new Set(list)).sort();
  }, [normalizedData, filterBrand]);
  const uniqueInfluencers = useMemo(() => Array.from(new Set(normalizedData.map(d => d.influencer).filter(Boolean))).sort(), [normalizedData]);

  // Reset product if brand changes manually
  useEffect(() => {
    if (filterBrand !== 'All' && !uniqueProducts.includes(filterProduct) && filterProduct !== 'All') {
      setFilterProduct('All');
    }
  }, [filterBrand, uniqueProducts, filterProduct]);

  const filteredInsights = useMemo(() => {
    return normalizedData.filter(item => {
      if (filterBrand !== 'All' && item.brand_name !== filterBrand) return false;
      if (filterProduct !== 'All' && item.product_name !== filterProduct) return false;
      if (filterSentiment !== 'All' && item.overall_sentiment !== filterSentiment) return false;
      if (filterInfluencer !== 'All' && item.influencer !== filterInfluencer) return false;
      return true;
    });
  }, [normalizedData, filterBrand, filterProduct, filterSentiment, filterInfluencer]);

  const handleJumpToTimestamp = (seconds: number | null) => {
    if (seconds !== null) setActiveTimestamp(seconds);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      
      {/* Collapsible Filter Bar */}
      <div className="mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="flex justify-between items-center sm:hidden mb-2">
          <span className="text-sm font-bold text-slate-300 flex items-center gap-2"><Filter size={16}/> Data Filters</span>
          <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="text-sky-400 text-sm font-bold bg-slate-800 px-3 py-1.5 rounded-lg">
            {showMobileFilters ? 'Hide' : 'Configure'}
          </button>
        </div>
        
        <div className={`${showMobileFilters ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-4 gap-4`}>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Brand</label>
            <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500">
              <option value="All">All Brands</option>
              {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Product</label>
            <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500">
              <option value="All">All Products</option>
              {uniqueProducts.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sentiment</label>
            <select value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500">
              <option value="All">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="mixed">Mixed</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Influencer</label>
            <select value={filterInfluencer} onChange={(e) => setFilterInfluencer(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500">
              <option value="All">All Creators</option>
              {uniqueInfluencers.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        
        {/* Left Stream */}
        <div className="lg:col-span-7 space-y-4 pb-[60vh] lg:pb-0">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Signal Feed ({filteredInsights.length} records matched)
          </h2>
          
          {filteredInsights.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              No product entities found matching the active filters.
            </div>
          ) : (
            filteredInsights.map((insight, idx) => {
              const isSelected = activeInsight?.video_id === insight.video_id && activeInsight?.product_name === insight.product_name;
              return (
                <div 
                  key={`${insight.video_id}-${idx}`}
                  onClick={() => {
                    setActiveInsight(insight);
                    setActiveTimestamp(insight.spoken_timestamp_seconds || insight.visual_timestamp_seconds || 0);
                  }}
                  className={`p-4 md:p-5 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected ? 'bg-slate-900 border-sky-500/50 shadow-lg shadow-sky-500/5' : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{insight.brand_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                      insight.overall_sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
                      insight.overall_sentiment === 'negative' ? 'bg-rose-500/10 text-rose-400' :
                      insight.overall_sentiment === 'mixed' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {insight.overall_sentiment}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-slate-100 text-base md:text-lg mb-1">{insight.product_name}</h4>
                  <p className="text-xs text-slate-400 mb-3 font-medium">{insight.sub_category} · By {insight.influencer || 'Unknown'}</p>
                  
                  <blockquote className="border-l-2 border-slate-700 pl-3 italic text-sm text-slate-300 line-clamp-2">
                    "{insight.primary_claim}"
                  </blockquote>

                  {insight.active_ingredients && insight.active_ingredients.length > 0 && (
                     <div className="flex flex-wrap gap-1 mt-3">
                       {insight.active_ingredients.map(ing => (
                         <span key={ing} className="px-2 py-0.5 rounded-md bg-slate-800/50 border border-slate-700 text-[10px] text-slate-400 flex items-center gap-1">
                           <Beaker size={10} /> {ing}
                         </span>
                       ))}
                     </div>
                  )}

                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800/50 flex-wrap">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border ${insight.mentioned_in_audio ? 'border-sky-500/30 text-sky-400 bg-sky-500/10' : 'border-slate-800 text-slate-600'}`}>
                      <Mic size={12} /> Spoken
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border ${insight.mentioned_in_caption ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : 'border-slate-800 text-slate-600'}`}>
                      <Type size={12} /> Written
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border ${insight.shown_visually ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-slate-800 text-slate-600'}`}>
                      <Eye size={12} /> Visual
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Inspection Panel (Mobile Bottom Sheet / Desktop Sticky) */}
        <div className={`
          ${activeInsight ? 'fixed bottom-0 left-0 w-full h-[75vh] z-50 bg-slate-900 border-t border-slate-700 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-y-auto custom-scrollbar' : 'hidden'}
          lg:block lg:relative lg:h-auto lg:w-auto lg:bg-slate-900 lg:border lg:border-slate-800 lg:shadow-2xl lg:col-span-5 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:rounded-xl
        `}>
          {activeInsight ? (
            <div>
              {/* Mobile Close Button */}
              <div className="lg:hidden sticky top-0 z-10 flex justify-between items-center p-3 bg-slate-950 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase">Video Inspector</span>
                <button onClick={() => setActiveInsight(null)} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <div className="aspect-[9/16] max-h-[350px] md:max-h-[420px] bg-black relative w-full flex items-center justify-center border-b border-slate-800">
                <iframe
                  className="w-full h-full absolute inset-0"
                  src={`https://www.youtube.com/embed/${activeInsight.video_id}?start=${activeTimestamp}&autoplay=1`}
                  title="Video Player Context"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="p-5 md:p-6 pb-20 lg:pb-6">
                <div className="mb-6">
                  <h3 className="font-extrabold text-lg text-slate-100 mb-1">{activeInsight.product_name}</h3>
                  <p className="text-xs font-bold text-sky-400 tracking-wider uppercase">{activeInsight.brand_name}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <User size={14} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Creator Demographics</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <DemoBadge label="Age Bracket" value={activeInsight.creator_demographics?.estimated_age_bracket} />
                      <DemoBadge label="Skin Tone" value={activeInsight.creator_demographics?.skin_tone_fitzpatrick} />
                      <DemoBadge label="Skin Type" value={activeInsight.creator_demographics?.skin_type_indication} />
                    </div>
                  </div>

                  {activeInsight.active_ingredients && activeInsight.active_ingredients.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Beaker size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detected Formulations</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeInsight.active_ingredients.map(ing => (
                          <span key={ing} className="px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800/50 rounded-md text-xs font-medium">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <hr className="border-slate-800" />

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Primary Finding</span>
                    <p className="text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800/60 font-medium">
                      {activeInsight.primary_claim}
                    </p>
                  </div>

                  {activeInsight.attributes && activeInsight.attributes.length > 0 && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Granular Attribute Profiling</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeInsight.attributes.map((attr, aIdx) => (
                          <div key={aIdx} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                            <div className="flex justify-between items-center text-xs font-semibold mb-1">
                              <span className="text-slate-400 text-[11px] truncate mr-2">{attr.attribute.replace('_', ' ')}</span>
                              <span className={attr.sentiment_score >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {attr.sentiment_score > 0 ? `+${attr.sentiment_score}` : attr.sentiment_score}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 italic truncate" title={attr.context_quote}>
                              "{attr.context_quote}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button 
                      disabled={activeInsight.spoken_timestamp_seconds === null}
                      onClick={() => handleJumpToTimestamp(activeInsight.spoken_timestamp_seconds)}
                      className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs py-3 sm:py-2.5 px-3 rounded-lg border border-slate-800 transition disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      Jump to Speech ({activeInsight.spoken_timestamp_seconds ?? 0}s)
                    </button>
                    <button 
                      disabled={activeInsight.visual_timestamp_seconds === null}
                      onClick={() => handleJumpToTimestamp(activeInsight.visual_timestamp_seconds)}
                      className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs py-3 sm:py-2.5 px-3 rounded-lg border border-slate-800 transition disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      Jump to Visual ({activeInsight.visual_timestamp_seconds ?? 0}s)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 font-medium hidden lg:block">
              Select a signal record from the feed to launch video positioning and evaluate granular attribute matrices.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function FeedStream() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Intelligence Feed...</div>}>
      <FeedStreamContent />
    </Suspense>
  );
}
