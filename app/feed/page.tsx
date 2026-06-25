'use client';

import { useState, useMemo } from 'react';
import { Mic, Type, Eye } from 'lucide-react';
import entityData from '../../data/extracted_entities.json';

interface AttributeScore {
  attribute: "Application_Ease" | "Color_Accuracy" | "Longevity" | "Texture" | "Value" | "Packaging";
  sentiment_score: number;
  context_quote: string;
}

interface CompetitorMention {
  competitor_brand: string;
  competitor_product: string;
  comparison_nature: "inferior" | "superior" | "similar";
}

interface Insight {
  brand_name: string;
  product_name: string;
  product_category: string;
  sub_category: string;
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
  upload_date?: string;
  creator_location?: string;
}

// Canonical Brand Normalization Map
const BRAND_MAPPING: Record<string, string> = {
  "loreal": "L'Oréal",
  "l'oreal": "L'Oréal",
  "l'oréal": "L'Oréal",
  "l'oreal paris": "L'Oréal",
  "l'oréal paris": "L'Oréal",
  "maybelline": "Maybelline",
  "maybelline new york": "Maybelline",
  "elf": "e.l.f. Cosmetics",
  "e.l.f.": "e.l.f. Cosmetics",
  "elfcosmetics": "e.l.f. Cosmetics",
  "charlotte tilbury": "Charlotte Tilbury",
  "fenty": "Fenty Beauty",
  "fenty beauty": "Fenty Beauty",
  "rare beauty": "Rare Beauty",
  "la prairie": "La Prairie",
  "kylie": "Kylie Cosmetics",
  "kylie cosmetics": "Kylie Cosmetics",
  "rem beauty": "r.e.m. beauty",
  "r.e.m. beauty": "r.e.m. beauty"
};

const normalizeBrand = (brand: string): string => {
  if (!brand) return 'Unknown Brand';
  const lookup = brand.trim().toLowerCase();
  if (BRAND_MAPPING[lookup]) return BRAND_MAPPING[lookup];
  
  for (const [key, canonical] of Object.entries(BRAND_MAPPING)) {
    if (lookup.includes(key) || key.includes(lookup)) {
      return canonical;
    }
  }
  return brand;
};

export default function FeedStream() {
  const rawData = entityData as Insight[];
  
  const normalizedData = useMemo(() => {
    return rawData.map(item => ({
      ...item,
      brand_name: normalizeBrand(item.brand_name)
    }));
  }, [rawData]);

  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<number>(0);
  
  const [filterBrand, setFilterBrand] = useState<string>('All');
  const [filterSentiment, setFilterSentiment] = useState<string>('All');
  const [filterInfluencer, setFilterInfluencer] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const uniqueBrands = useMemo(() => Array.from(new Set(normalizedData.map(d => d.brand_name))), [normalizedData]);
  const uniqueInfluencers = useMemo(() => Array.from(new Set(normalizedData.map(d => d.influencer).filter(Boolean))), [normalizedData]);
  const uniqueCategories = useMemo(() => Array.from(new Set(normalizedData.map(d => d.product_category))), [normalizedData]);

  const filteredInsights = useMemo(() => {
    return normalizedData.filter(item => {
      if (filterBrand !== 'All' && item.brand_name !== filterBrand) return false;
      if (filterSentiment !== 'All' && item.overall_sentiment !== filterSentiment) return false;
      if (filterInfluencer !== 'All' && item.influencer !== filterInfluencer) return false;
      if (filterCategory !== 'All' && item.product_category !== filterCategory) return false;
      return true;
    });
  }, [normalizedData, filterBrand, filterSentiment, filterInfluencer, filterCategory]);

  const handleJumpToTimestamp = (seconds: number | null) => {
    if (seconds !== null) {
      setActiveTimestamp(seconds);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Brand</label>
          <select 
            value={filterBrand} 
            onChange={(e) => setFilterBrand(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="All">All Brands</option>
            {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="All">All Categories</option>
            {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sentiment</label>
          <select 
            value={filterSentiment} 
            onChange={(e) => setFilterSentiment(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="All">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="mixed">Mixed</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Influencer</label>
          <select 
            value={filterInfluencer} 
            onChange={(e) => setFilterInfluencer(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="All">All Creators</option>
            {uniqueInfluencers.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Stream */}
        <div className="lg:col-span-7 space-y-4">
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
                  className={`p-5 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected 
                      ? 'bg-slate-900 border-sky-500/50 shadow-lg shadow-sky-500/5' 
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
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
                  
                  <h4 className="font-bold text-slate-100 text-base mb-1">{insight.product_name}</h4>
                  <p className="text-xs text-slate-400 mb-3 font-medium">{insight.sub_category} · By {insight.influencer || 'Unknown'}</p>
                  
                  <blockquote className="border-l-2 border-slate-700 pl-3 italic text-sm text-slate-300 line-clamp-2">
                    "{insight.primary_claim}"
                  </blockquote>

                  <div className="flex gap-2 mt-3">
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

        {/* Right Inspection Panel */}
        <div className="lg:col-span-5 sticky top-24 self-start max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
          {activeInsight ? (
            <div>
              <div className="aspect-[9/16] max-h-[420px] bg-black relative w-full flex items-center justify-center border-b border-slate-800">
                {/* Audio Sync Fix: Removed &mute=1 so the stream perfectly syncs audio/video payload upon interaction */}
                <iframe
                  className="w-full h-full absolute inset-0"
                  src={`https://www.youtube.com/embed/${activeInsight.video_id}?start=${activeTimestamp}&autoplay=1`}
                  title="Video Player Context"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-extrabold text-lg text-slate-100 mb-1">{activeInsight.product_name}</h3>
                  <p className="text-xs font-bold text-sky-400 tracking-wider uppercase">{activeInsight.brand_name}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Primary Finding</span>
                    <p className="text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800/60 font-medium">
                      {activeInsight.primary_claim}
                    </p>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Direct Evidence</span>
                    <p className="text-sm text-slate-300 italic bg-slate-950/40 p-3 rounded-lg border border-slate-800/40">
                      "{activeInsight.anchor_quote || 'No textual quote logged.'}"
                    </p>
                  </div>

                  {activeInsight.attributes && activeInsight.attributes.length > 0 && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Granular Attribute Profiling</span>
                      <div className="grid grid-cols-2 gap-2">
                        {activeInsight.attributes.map((attr, aIdx) => (
                          <div key={aIdx} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                            <div className="flex justify-between items-center text-xs font-semibold mb-1">
                              <span className="text-slate-400 text-[11px] truncate">{attr.attribute.replace('_', ' ')}</span>
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

                  {activeInsight.direct_comparisons && activeInsight.direct_comparisons.length > 0 && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Direct Benchmark Clashes</span>
                      <div className="space-y-1.5">
                        {activeInsight.direct_comparisons.map((comp, cIdx) => (
                          <div key={cIdx} className="flex items-center justify-between bg-slate-950 p-2 rounded-lg text-xs border border-slate-800/40">
                            <span className="text-slate-300 font-medium">vs. <b className="text-slate-400">{comp.competitor_brand}</b> {comp.competitor_product}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              comp.comparison_nature === 'superior' ? 'bg-emerald-500/10 text-emerald-400' :
                              comp.comparison_nature === 'inferior' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {comp.comparison_nature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button 
                      disabled={activeInsight.spoken_timestamp_seconds === null}
                      onClick={() => handleJumpToTimestamp(activeInsight.spoken_timestamp_seconds)}
                      className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2.5 px-3 rounded-lg border border-slate-800 transition disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      Jump to Speech ({activeInsight.spoken_timestamp_seconds ?? 0}s)
                    </button>
                    <button 
                      disabled={activeInsight.visual_timestamp_seconds === null}
                      onClick={() => handleJumpToTimestamp(activeInsight.visual_timestamp_seconds)}
                      className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2.5 px-3 rounded-lg border border-slate-800 transition disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      Jump to Visual ({activeInsight.visual_timestamp_seconds ?? 0}s)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 font-medium">
              Select a signal record from the feed to launch video positioning and evaluate granular attribute matrices.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
