'use client';

import { useState, useMemo } from 'react';
import { Mic, Type, ImageIcon, Play, MapPin, CheckCircle2 } from 'lucide-react';
import entityData from '../../data/extracted_entities.json';

export default function FeedDashboard() {
  const [activeInsight, setActiveInsight] = useState<any | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<number>(0);
  
  const [filterBrand, setFilterBrand] = useState<string>('All');
  const data = entityData as any[];

  const uniqueBrands = ['All', ...Array.from(new Set(data.map(d => d.brand_name).filter(Boolean)))];

  const filteredData = useMemo(() => {
    return data.filter(item => filterBrand === 'All' || item.brand_name === filterBrand);
  }, [data, filterBrand]);

  return (
    <main className="flex-1 p-6 max-w-7xl mx-auto w-full h-[calc(100vh-80px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Live Listening Stream</h1>
          <p className="text-slate-400 mt-1">Granular cross-channel anomaly detection.</p>
        </div>
        <select 
          value={filterBrand} 
          onChange={(e) => setFilterBrand(e.target.value)} 
          className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none"
        >
          {uniqueBrands.map(b => <option key={b as string} value={b as string}>{b}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
        {/* Left: Feed */}
        <div className="lg:col-span-3 overflow-y-auto pr-4 space-y-4 custom-scrollbar">
          {filteredData.map((insight, index) => (
            <div 
              key={index} 
              onClick={() => { setActiveInsight(insight); setActiveTimestamp(insight.spoken_timestamp_seconds || insight.visual_timestamp_seconds || 0); }}
              className={`p-5 bg-slate-900 border rounded-xl transition-all cursor-pointer group ${
                activeInsight?.video_id === insight.video_id ? 'border-sky-500 ring-1 ring-sky-500' : 'border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{insight.brand_name}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12}/> {insight.creator_location || 'Global'}</span>
                  </div>
                  <h3 className="font-bold text-lg text-white group-hover:text-sky-300 transition-colors">{insight.product_name}</h3>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  insight.sentiment === 'positive' ? 'bg-emerald-950 text-emerald-400 border-emerald-900' :
                  insight.sentiment === 'negative' ? 'bg-rose-950 text-rose-400 border-rose-900' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {insight.sentiment}
                </span>
              </div>

              <blockquote className="border-l-2 border-slate-700 pl-3 text-sm text-slate-400 italic mb-4">
                "{insight.anchor_quote}"
              </blockquote>

              <div className="flex gap-2">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${insight.mentioned_in_audio ? 'bg-sky-950/30 text-sky-400 border-sky-900' : 'bg-slate-950 text-slate-600 border-slate-800'}`}>
                  <Mic size={14} /> Spoken
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${insight.mentioned_in_caption ? 'bg-purple-950/30 text-purple-400 border-purple-900' : 'bg-slate-950 text-slate-600 border-slate-800'}`}>
                  <Type size={14} /> Written
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${insight.shown_visually ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' : 'bg-slate-950 text-slate-600 border-slate-800'}`}>
                  <ImageIcon size={14} /> Visual
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Player */}
        <div className="lg:col-span-2 h-full">
          <div className="sticky top-0 bg-slate-900 border border-slate-800 rounded-xl p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Play size={16} className="text-sky-400"/> Playback Verification
            </h3>
            
            {activeInsight ? (
              <div className="flex-1 flex flex-col">
                <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-black border border-slate-800 mb-4 flex-shrink-0">
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${activeInsight.video_id}?start=${activeTimestamp}&autoplay=1`}
                    title="Verification Player"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 flex-1">
                  <div className="text-xs text-slate-500 mb-1">Extracted Claim:</div>
                  <div className="text-sm text-slate-200 font-medium">{activeInsight.primary_claim}</div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                    <CheckCircle2 size={14} className="text-emerald-500"/> Confidence: {activeInsight.confidence_score}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                Select a stream event to verify playback.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
