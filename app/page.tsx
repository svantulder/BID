'use client';

import { useState, useMemo } from 'react';
import entityData from '../data/extracted_entities.json';

interface Insight {
  brand_name: string;
  product_name: string;
  sentiment: string;
  trigger_category: string;
  primary_claim: string;
  anchor_quote: string;
  spoken_timestamp_seconds: number;
  visual_timestamp_seconds: number | null;
  video_id: string;
  influencer?: string;
}

export default function Dashboard() {
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<number>(0);
  
  // Filter States
  const [filterBrand, setFilterBrand] = useState<string>('All');
  const [filterSentiment, setFilterSentiment] = useState<string>('All');
  const [filterInfluencer, setFilterInfluencer] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // --- DATA AGGREGATION & FILTERING ---
  const filteredData = useMemo(() => {
    return entityData.filter((item: any) => {
      const matchBrand = filterBrand === 'All' || item.brand_name === filterBrand;
      const matchSentiment = filterSentiment === 'All' || item.sentiment.toLowerCase() === filterSentiment.toLowerCase();
      const matchInfluencer = filterInfluencer === 'All' || (item.influencer && item.influencer === filterInfluencer);
      const matchCategory = filterCategory === 'All' || item.trigger_category === filterCategory;
      return matchBrand && matchSentiment && matchInfluencer && matchCategory;
    }) as Insight[];
  }, [filterBrand, filterSentiment, filterInfluencer, filterCategory]);

  const uniqueCategories = Array.from(new Set(entityData.map((d: any) => d.trigger_category).filter(Boolean)));

  const dashboardStats = useMemo(() => {
    const total = filteredData.length;
    const positiveCount = filteredData.filter(d => d.sentiment.toLowerCase() === 'positive').length;
    const positivePercentage = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

    const brandCounts = filteredData.reduce((acc: Record<string, number>, curr) => {
      acc[curr.brand_name] = (acc[curr.brand_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topBrand = Object.keys(brandCounts).length > 0 ? Object.keys(brandCounts).reduce((a, b) => brandCounts[a] > brandCounts[b] ? a : b) : "N/A";

    return { total, positivePercentage, topBrand };
  }, [filteredData]);

  // Extract unique values for dropdowns
  const uniqueBrands = Array.from(new Set(entityData.map((d: any) => d.brand_name)));
  const uniqueInfluencers = Array.from(new Set(entityData.map((d: any) => d.influencer).filter(Boolean)));

  return (
    <>
      <div className="ambient-background"></div>
      <div className="blob b-1"></div><div className="blob b-2"></div><div className="blob b-3"></div>

      <nav className="top-nav">
        <div className="nav-content">
          <div className="logo-container">
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>Insight<span style={{ color: 'var(--c-netting)' }}>Engine</span></span>
          </div>
          <div className="nav-controls flex gap-4">
            {/* FILTER BAR */}
            <select className="bg-[rgba(15,23,42,0.8)] text-sm border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1 text-white outline-none" value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
              <option value="All">All Brands</option>
              {uniqueBrands.map((b: any) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="bg-[rgba(15,23,42,0.8)] text-sm border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1 text-white outline-none" value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value)}>
              <option value="All">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
            </select>
            <select className="bg-[rgba(15,23,42,0.8)] text-sm border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1 text-white outline-none" value={filterInfluencer} onChange={(e) => setFilterInfluencer(e.target.value)}>
              <option value="All">All Creators</option>
              {uniqueInfluencers.map((inf: any) => <option key={inf} value={inf}>{inf}</option>)}
            </select>
            <select className="bg-[rgba(15,23,42,0.8)] text-sm border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1 text-white outline-none" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="All">All Categories</option>
              {uniqueCategories.map((cat: any) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            
            <button className="g-cta-btn ml-4">Upgrade to Pro</button>
          </div>
        </div>
      </nav>

      <main className="w-full max-w-7xl mx-auto pt-32 px-4 pb-12 z-10 relative">
        
        {/* Aggregation Highlights */}
        <div className="flex gap-6 mb-8">
          <div className="smart-card p-6 flex-1 text-center">
            <p className="text-sm text-gray-400 font-semibold tracking-wider uppercase mb-1">Filtered Mentions</p>
            <h2 className="text-4xl font-bold text-white">{dashboardStats.total}</h2>
          </div>
          <div className="smart-card p-6 flex-1 text-center">
            <p className="text-sm text-gray-400 font-semibold tracking-wider uppercase mb-1">Positive Sentiment</p>
            <h2 className="text-4xl font-bold" style={{ color: 'var(--c-success)' }}>{dashboardStats.positivePercentage}%</h2>
          </div>
          <div className="smart-card p-6 flex-1 text-center">
            <p className="text-sm text-gray-400 font-semibold tracking-wider uppercase mb-1">Trending in View</p>
            <h2 className="text-4xl font-bold" style={{ color: 'var(--c-shield)' }}>{dashboardStats.topBrand}</h2>
          </div>
        </div>

        {/* Split View */}
        <div className="flex gap-6 h-[600px]">
          
          {/* Left: Scrollable Feed */}
          <div className="smart-card w-1/2 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-[rgba(255,255,255,0.1)] pb-2">
                <h3 className="text-xl font-bold">Spoken Reality Feed</h3>
                <span className="text-xs text-gray-400 font-mono">Showing {filteredData.length} clips</span>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-3">
              {filteredData.map((insight: Insight, index: number) => (
                <div 
                  key={index} 
                  style={{
                    background: activeInsight === insight ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: activeInsight === insight ? 'var(--c-netting)' : 'var(--border)'
                  }}
                  className="p-4 rounded-xl border hover:bg-[rgba(255,255,255,0.08)] transition-all flex flex-col"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-bold text-lg text-white">{insight.brand_name}</h4>
                        <p className="text-xs text-gray-400">{insight.product_name} • {insight.influencer && <span className="text-[var(--c-netting)]">@{insight.influencer}</span>}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span style={{ 
                        backgroundColor: insight.sentiment.toLowerCase() === 'positive' ? 'rgba(16, 185, 129, 0.2)' : insight.sentiment.toLowerCase() === 'negative' ? 'rgba(255, 71, 71, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        color: insight.sentiment.toLowerCase() === 'positive' ? 'var(--c-success)' : insight.sentiment.toLowerCase() === 'negative' ? 'var(--c-legacy)' : '#ccc'
                      }} className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                        {insight.sentiment}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-gray-300">
                        {insight.trigger_category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="my-3 bg-[rgba(0,0,0,0.2)] p-3 rounded border border-[rgba(255,255,255,0.03)]">
                    <p className="text-white font-medium text-sm mb-1 tracking-wide">&quot;{insight.primary_claim}&quot;</p>
                    <p className="text-gray-500 text-xs italic border-l-2 border-[var(--c-netting)] pl-2">
                      {insight.anchor_quote}
                    </p>
                  </div>
                  
                  {/* Dual Proof Buttons */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setActiveInsight(insight); setActiveTimestamp(insight.spoken_timestamp_seconds); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(56,189,248,0.2)] text-xs py-2 rounded transition-colors text-white border border-[rgba(255,255,255,0.1)]"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                      Play Spoken ({insight.spoken_timestamp_seconds}s)
                    </button>
                    {insight.visual_timestamp_seconds !== null && (
                      <button 
                        onClick={() => { setActiveInsight(insight); setActiveTimestamp(insight.visual_timestamp_seconds as number); }}
                        className="flex-1 flex items-center justify-center gap-2 bg-[rgba(168,85,247,0.1)] hover:bg-[rgba(168,85,247,0.3)] text-xs py-2 rounded transition-colors text-white border border-[rgba(168,85,247,0.3)]"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        View Visual ({insight.visual_timestamp_seconds}s)
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredData.length === 0 && (
                  <div className="text-center py-10 text-gray-500">No clips match your current filters.</div>
              )}
            </div>
          </div>

          {/* Right: Clip Proof Player */}
          <div className="smart-card w-1/2 p-6 flex flex-col justify-center items-center relative">
              {activeInsight ? (
                <div className="w-full">
                  <h3 className="font-bold mb-4 flex items-center text-lg">
                    <span className="bg-red-500 w-2 h-2 rounded-full mr-2 animate-pulse"></span>
                    Live Playback: {activeInsight.product_name}
                  </h3>
                  <div className="relative pt-[56.25%] w-full rounded-xl overflow-hidden bg-black shadow-2xl border border-[rgba(255,255,255,0.1)]">
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${activeInsight.video_id}?start=${activeTimestamp}&autoplay=1`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              ) : (
              <div className="text-center text-gray-500">
                <svg className="mx-auto h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg">Select a data point to load the exact moment it was spoken.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
