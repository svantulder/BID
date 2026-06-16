import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { BarChart3, Radio } from "lucide-react";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InsightEngine | Intelligence",
  description: "Track competitor mentions and sentiment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-50">
        <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="font-extrabold text-xl tracking-tight">
              Insight<span className="text-sky-400">Engine</span>
            </div>
            <div className="flex gap-4">
              <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                <BarChart3 size={16} className="text-sky-400" /> Market Trends
              </Link>
              <Link href="/feed" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                <Radio size={16} className="text-purple-400" /> Live Listening
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
