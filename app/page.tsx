'use client';

import { useState, useMemo } from 'react';
import entityData from '../data/extracted_entities.json';

interface Insight {
  brand_name: string;
  product_name: string;
  product_category: string;
  sub_category: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'comparison';
  trigger_category: string;
  primary_claim: string;
  anchor_quote: string;
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

export default function Dashboard() {
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<number>(0);
  
  // Filter States
  const [filterBrand, setFilterBrand] = useState<string>('All');
  const [filterSentiment, setFilterSentiment] = useState<string>('All');
  const [filterInfluencer, setFilterInfluencer] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterSubCategory, setFilterSubCategory] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All');

  const data: Insight[] = entityData as Insight[];

  // --- DYNAMIC FILTER OPTIONS GENERATION ---
  const filterOptions = useMemo(() => {
    const brands = new Set<string>();
    const sentiments = new Set<string>();
    const influencers = new Set<string>();
    const categories = new Set<string>();
    const subCategories = new Set<string>();
    const locations = new Set<string>();

    data.forEach((item) => {
      if (item.brand_name) brands.add(item.brand_name);
      if (item.sentiment) sentiments.add(item.sentiment);
      if (item.influencer) influencers.add(item.influencer);
      if (item.product_category) categories.add(item.product_category);
      if (item.sub_category) subCategories.add(item.sub_category);
      if (item.creator_location) locations.add(item.creator_location);
    });

    return {
      brands: ['All', ...Array.from(brands)],
      sentiments: ['All', ...Array.from(sentiments)],
      influencers: ['All', ...Array.from(influencers)],
      categories: ['All', ...Array.from(categories)],
      subCategories: ['All', ...Array.from(subCategories)],
      locations: ['All', ...Array.from(locations)],
    };
  }, [data]);

  // --- MEMOIZED FILTER LOGIC ---
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchBrand = filterBrand === 'All' || item.brand_name === filterBrand;
      const matchSentiment = filterSentiment === 'All' || item.sentiment.toLowerCase() === filterSentiment.toLowerCase();
      const matchInfluencer = filterInfluencer === 'All' || item.influencer === filterInfluencer;
      const matchCategory = filterCategory === 'All' || item.product_category === filterCategory;
      const matchSubCategory = filterSubCategory === 'All' || item.sub_category === filterSubCategory;
      const matchLocation = filterLocation === 'All' || item.creator_location === filterLocation;

      return matchBrand && matchSentiment && matchInfluencer && matchCategory && matchSubCategory && matchLocation;
    });
  }, [data, filterBrand, filterSentiment, filterInfluencer, filterCategory, filterSubCategory, filterLocation]);

  // --- MACRO ANALYTICS METRICS ---
  const stats = useMemo(() => {
    if (filteredData.length === 0) return { avgConfidence: 0, totalMentions: 0, positiveRatio: 0 };
    const total = filteredData.length;
    const sumConfidence = filteredData.reduce((acc, curr) => acc + (curr.confidence_score || 0), 0);
    const positiveCount = filteredData.filter(item => item.sentiment === 'positive').length;
    
    return {
      avgConfidence: Math.round(sumConfidence / total),
      totalMentions: total,
      positiveRatio: Math.round((positiveCount / total) * 100)
    };
  }, [filteredData]);

  const handleTimelineClick = (insight: Insight, seconds: number | null) => {
    if (seconds === null) return;
    setActiveInsight(insight);
    setActiveTimestamp(seconds);
  };

  return (
    <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[rgba(255,255,255,0.1)] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Spoken Reality Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Cross-channel intelligence pipeline tracking voice, copy, and visual discrepancies.</p>
        </div>
        
        {/* Macro Stat Badges */}
        <div className="flex gap-4">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center">
            <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider">Volume</span>
            <span className="text-xl font-mono font-bold text-sky-400">{stats.totalMentions}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center">
            <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider">Avg Confidence</span>
            <span className="text-xl font-mono font-bold text-purple-400">{stats.avgConfidence}%</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center">
            <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider">Positivity Rate</span>
            <span className="text-xl font-mono font-bold text-emerald-400">{stats.positiveRatio}%</span>
          </div>
        </div>
      </div>

      {/* Advanced Control / Filter Panel */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl grid grid-cols-2 md:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs text-gray-400 font-semibold mb-1">Brand</label>
          <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white">
            {filterOptions.brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 font-semibold mb-1">Category</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white">
            {filterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 font-semibold mb-1">Sub-Category</label>
          <select value={filterSubCategory} onChange={(e) => setFilterSubCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white">
            {filterOptions.subCategories.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 font-semibold mb-1">Sentiment</label>
          <select value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white">
            {filterOptions.sentiments.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 font-semibold mb-1">Creator</label>
          <select value={filterInfluencer} onChange={(e) => setFilterInfluencer(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white">
            {filterOptions.influencers.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 font-semibold mb-1">Market Location</label>
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white">
            {filterOptions.locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Main Panel Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left & Middle Column: Deep Insights Stream */}
        <div className="lg:col-span-2 space-y-4">
          {filteredData.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-gray-400">
              No contextual insights match your applied active filters.
            </div>
          ) : (
            filteredData.map((insight, index) => (
              <div 
                key={index} 
                className={`p-5 bg-slate-900 border rounded-xl transition-all cursor-pointer ${
                  activeInsight?.video_id === insight.video_id ? 'border-sky-500 shadow-lg' : 'border-slate-800 hover:border-slate-700'
                }`}
                onClick={() => handleTimelineClick(insight, insight.spoken_timestamp_seconds || insight.visual_timestamp_seconds || 0)}
              >
                <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                  <div>
                    <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-xs font-mono text-gray-400 mr-2">
                      {insight.brand_name}
                    </span>
                    <span className="font-bold text-white text-base">{insight.product_name}</span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {insight.product_category} &raquo; {insight.sub_category}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono">{insight.creator_location}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                      insight.sentiment === 'positive' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900' :
                      insight.sentiment === 'negative' ? 'bg-rose-950/50 text-rose-400 border border-rose-900' :
                      insight.sentiment === 'comparison' ? 'bg-purple-950/50 text-purple-400 border border-purple-900' :
                      'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}>
                      {insight.sentiment}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-slate-300 font-medium mb-3 italic">
                  &ldquo;{insight.primary_claim}&rdquo;
                </div>

                <blockquote className="bg-slate-950 border-l-2 border-slate-700 p-3 rounded-r-lg text-xs text-gray-400 font-mono mb-4">
                  &ldquo;{insight.anchor_quote}&rdquo;
                </blockquote>

                {/* Cross-Channel Validation Framework */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center text-xs font-semibold">
                  <div className={`p-2 rounded-lg ${insight.mentioned_in_audio ? 'bg-sky-950/30 text-sky-400 border border-sky-900' : 'bg-slate-950 text-gray-600'}`}>
                    🎙️ Audio Track {insight.spoken_timestamp_seconds ? `(${insight.spoken_timestamp_seconds}s)` : ''}
                  </div>
                  <div className={`p-2 rounded-lg ${insight.mentioned_in_caption ? 'bg-indigo-950/30 text-indigo-400 border border-indigo-900' : 'bg-slate-950 text-gray-600'}`}>
                    📝 Written Copy
                  </div>
                  <div className={`p-2 rounded-lg ${insight.shown_visually ? 'bg-purple-950/30 text-purple-400 border border-purple-900' : 'bg-slate-950 text-gray-600'}`}>
                    🖼️ Visual Frame {insight.visual_timestamp_seconds ? `(${insight.visual_timestamp_seconds}s)` : ''}
                  </div>
                </div>

                <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                  <div>Creator: <span className="text-gray-400 font-medium">{insight.influencer}</span></div>
                  <div>Confidence: <span className="text-purple-400 font-bold">{insight.confidence_score}%</span></div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Synchronized Multi-Modal Workspace Player */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2 flex justify-between items-center">
              <span>Media Workspace</span>
              {activeInsight && (
                <span className="text-xs bg-slate-950 text-sky-400 px-2 py-0.5 rounded font-mono">
                  Timestamp: {activeTimestamp}s
                </span>
              )}
            </h3>
            
            {activeInsight ? (
              <div className="space-y-4">
                <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-black shadow-2xl border border-slate-800">
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${activeInsight.video_id}?start=${activeTimestamp}&autoplay=1`}
                    title="Contextual Video Verification Engine"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Active Verification Focus</div>
                  <div className="text-white font-bold">{activeInsight.product_name}</div>
                  <div className="text-gray-400 text-slate-400 font-mono mt-2">Trigger context: {activeInsight.trigger_category}</div>
                </div>

                <div className="flex gap-2">
                  <button 
                    disabled={activeInsight.spoken_timestamp_seconds === null}
                    onClick={() => setActiveTimestamp(activeInsight.spoken_timestamp_seconds || 0)}
                    className="flex-1 bg-slate-950 hover:bg-slate-800 text-gray-300 font-semibold text-xs py-2 px-3 rounded-lg border border-slate-800 transition disabled:opacity-30"
                  >
                    Jump to Speech
                  </button>
                  <button 
                    disabled={activeInsight.visual_timestamp_seconds === null}
                    onClick={() => setActiveTimestamp(activeInsight.visual_timestamp_seconds || 0)}
                    className="flex-1 bg-slate-950 hover:bg-slate-800 text-gray-300 font-semibold text-xs py-2 px-3 rounded-lg border border-slate-800 transition disabled:opacity-30"
                  >
                    Jump to Visual
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12 px-4">
                <svg className="mx-auto h-12 w-12 mb-3 opacity-30 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Select any product insight card from the pipeline stream to initialize synchronized timeline playback.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
