'use client';

import { useState, useMemo } from 'react';
import entityData from '../data/extracted_entities.json';

interface Insight {
  brand_name: string;
  product_name: string;
  sentiment: string;
  spoken_timestamp_seconds: number;
  visual_timestamp_seconds: number | null;
  video_id: string;
}

export default function Dashboard() {
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);
  // MOVED INSIDE THE COMPONENT:
  const [activeTimestamp, setActiveTimestamp] = useState<number>(0);

  // --- DATA AGGREGATION LOGIC ---
  const dashboardStats = useMemo(() => {
    const total = entityData.length;
    const positiveCount = entityData.filter(d => d.sentiment.toLowerCase() === 'positive').length;
    const positivePercentage = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

    // Calculate most mentioned brand
    const brandCounts = entityData.reduce((acc: Record<string, number>, curr) => {
      acc[curr.brand_name] = (acc[curr.brand_name] || 0) + 1;
      return acc;
    }, {});
    const topBrand = Object.keys(brandCounts).reduce((a, b) => brandCounts[a] > brandCounts[b] ? a : b, "N/A");

    return { total, positivePercentage, topBrand };
  }, []);

  return (
    <>
      {/* Ambient Background Elements */}
      <div className="ambient-background"></div>
      <div className="blob b-1"></div>
      <div className="blob b-2"></div>
      <div className="blob b-3"></div>

      {/* Top Navigation */}
      <nav className="top-nav">
        <div className="nav-content">
          <div className="logo-container">
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>Insight<span style={{ color: 'var(--c-netting)' }}>Engine</span></span>
          </div>
          <div className="nav-controls">
            <a href="#" className="nav-cta-btn">Export CSV</a>
            <button className="g-cta-btn">Upgrade to Pro</button>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Layout */}
      <main className="w-full max-w-7xl mx-auto pt-32 px-4 pb-12 z-10 relative">
        
        {/* Aggregation Highlights */}
        <div className="flex gap-6 mb-8">
          <div className="smart-card p-6 flex-1 text-center">
            <p className="text-sm text-gray-400 font-semibold tracking-wider uppercase mb-1">Total Mentions</p>
            <h2 className="text-4xl font-bold text-white">{dashboardStats.total}</h2>
          </div>
          <div className="smart-card p-6 flex-1 text-center">
            <p className="text-sm text-gray-400 font-semibold tracking-wider uppercase mb-1">Positive Sentiment</p>
            <h2 className="text-4xl font-bold" style={{ color: 'var(--c-success)' }}>{dashboardStats.positivePercentage}%</h2>
          </div>
          <div className="smart-card p-6 flex-1 text-center">
            <p className="text-sm text-gray-400 font-semibold tracking-wider uppercase mb-1">Top Trending Brand</p>
            <h2 className="text-4xl font-bold" style={{ color: 'var(--c-shield)' }}>{dashboardStats.topBrand}</h2>
          </div>
        </div>

        {/* Split View: Data Feed & Player */}
        <div className="flex gap-6 h-[600px]">
          
          {/* Left: Scrollable Insights List */}
          <div className="smart-card w-1/2 p-6 overflow-hidden flex flex-col">
            <h3 className="text-xl font-bold mb-4 border-b border-[rgba(255,255,255,0.1)] pb-2">Spoken Reality Feed</h3>
            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-3">
              {entityData.map((insight: Insight, index: number) => (
                <div 
                  key={index} 
                  style={{
                    background: activeInsight === insight ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: activeInsight === insight ? 'var(--c-netting)' : 'var(--border)'
                  }}
                  className="p-4 rounded-xl border hover:bg-[rgba(255,255,255,0.08)] transition-all flex flex-col"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-lg text-white">{insight.brand_name}</h4>
                    <span style={{ 
                      backgroundColor: insight.sentiment.toLowerCase() === 'positive' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: insight.sentiment.toLowerCase() === 'positive' ? 'var(--c-success)' : '#ccc'
                    }} className="px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">
                      {insight.sentiment}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">{insight.product_name}</p>
                  
                  {/* Dual Proof Buttons */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setActiveInsight(insight); setActiveTimestamp(insight.spoken_timestamp_seconds); }}
                      className="flex-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(56,189,248,0.2)] text-xs py-2 rounded transition-colors text-white border border-[rgba(255,255,255,0.1)]"
                    >
                      ▶ Play Spoken ({insight.spoken_timestamp_seconds}s)
                    </button>
                    {insight.visual_timestamp_seconds !== null && (
                      <button 
                        onClick={() => { setActiveInsight(insight); setActiveTimestamp(insight.visual_timestamp_seconds as number); }}
                        className="flex-1 bg-[rgba(168,85,247,0.1)] hover:bg-[rgba(168,85,247,0.3)] text-xs py-2 rounded transition-colors text-white border border-[rgba(168,85,247,0.3)]"
                      >
                        👁️ View Visual ({insight.visual_timestamp_seconds}s)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Clip Proof Player */}
            <div className="smart-card w-1/2 p-6 flex flex-col justify-center items-center">
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