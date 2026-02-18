'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const LAST_APP_KEY = 'belt_lastApplicationId';

// ---------------------------------------------------------------------------
// Blueprint Conveyor SVG — isometric engineering-drawing hero visual
// ---------------------------------------------------------------------------
function BlueprintConveyor() {
  return (
    <div className="relative w-full h-36 sm:h-44 overflow-hidden select-none" aria-hidden="true">
      <svg
        viewBox="0 0 800 180"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Belt surface pattern */}
          <pattern id="beltTread" x="0" y="0" width="20" height="6" patternUnits="userSpaceOnUse">
            <line x1="0" y1="3" x2="20" y2="3" stroke="#3d4a6a" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Frame / supports */}
        <g opacity="0.15">
          <rect x="145" y="100" width="6" height="60" rx="1" fill="#2E364E" />
          <rect x="649" y="100" width="6" height="60" rx="1" fill="#2E364E" />
          <rect x="350" y="105" width="4" height="55" rx="1" fill="#2E364E" />
          <rect x="500" y="105" width="4" height="55" rx="1" fill="#2E364E" />
        </g>

        {/* Belt — top surface */}
        <line x1="148" y1="88" x2="652" y2="88" stroke="#2E364E" strokeWidth="6" strokeLinecap="round" />
        <rect x="148" y="85" width="504" height="6" fill="url(#beltTread)" />

        {/* Belt — bottom return */}
        <line x1="148" y1="112" x2="652" y2="112" stroke="#2E364E" strokeWidth="3" strokeLinecap="round" opacity="0.2" />

        {/* Drive pulley (right) */}
        <g>
          <circle cx="652" cy="100" r="18" fill="none" stroke="#2E364E" strokeWidth="3" opacity="0.6" />
          <circle cx="652" cy="100" r="12" fill="none" stroke="#2E364E" strokeWidth="1.5" opacity="0.3" />
          <circle cx="652" cy="100" r="3" fill="#2E364E" opacity="0.5" />
          {/* Rotation indicator */}
          <line x1="652" y1="100" x2="652" y2="85" stroke="#F3D273" strokeWidth="1.5" opacity="0.6">
            <animateTransform attributeName="transform" type="rotate" from="0 652 100" to="360 652 100" dur="3s" repeatCount="indefinite" />
          </line>
        </g>

        {/* Tail pulley (left) */}
        <g>
          <circle cx="148" cy="100" r="15" fill="none" stroke="#2E364E" strokeWidth="2.5" opacity="0.5" />
          <circle cx="148" cy="100" r="9" fill="none" stroke="#2E364E" strokeWidth="1" opacity="0.25" />
          <circle cx="148" cy="100" r="2.5" fill="#2E364E" opacity="0.4" />
          <line x1="148" y1="100" x2="148" y2="87" stroke="#F3D273" strokeWidth="1" opacity="0.5">
            <animateTransform attributeName="transform" type="rotate" from="0 148 100" to="360 148 100" dur="3s" repeatCount="indefinite" />
          </line>
        </g>

        {/* Moving parts on belt */}
        <g>
          <rect x="0" y="68" width="40" height="18" rx="3" fill="#2B5D85" opacity="0.5">
            <animate attributeName="x" values="-60;860" dur="6s" repeatCount="indefinite" />
          </rect>
          <rect x="0" y="66" width="28" height="20" rx="2" fill="#2B5D85" opacity="0.35">
            <animate attributeName="x" values="-260;660" dur="6s" repeatCount="indefinite" />
          </rect>
          <rect x="0" y="70" width="34" height="16" rx="3" fill="#2B5D85" opacity="0.45">
            <animate attributeName="x" values="-460;460" dur="6s" repeatCount="indefinite" />
          </rect>
        </g>

        {/* Dimension lines — engineering annotation feel */}
        <g opacity="0.12" stroke="#2B5D85" strokeWidth="0.75">
          {/* Overall length */}
          <line x1="148" y1="140" x2="652" y2="140" />
          <line x1="148" y1="135" x2="148" y2="145" />
          <line x1="652" y1="135" x2="652" y2="145" />
          <text x="400" y="152" textAnchor="middle" fill="#2B5D85" fontSize="9" fontFamily="monospace">504</text>
        </g>

        {/* Gold accent on drive pulley — motor indicator */}
        <circle cx="652" cy="100" r="20" fill="none" stroke="#F3D273" strokeWidth="1" opacity="0.3" strokeDasharray="4 4">
          <animateTransform attributeName="transform" type="rotate" from="0 652 100" to="360 652 100" dur="8s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Badge component
// ---------------------------------------------------------------------------
function StatBadge({ label, value, delay }: { label: string; value: string; delay: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm transition-all duration-500 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
      style={{ transitionDelay: delay }}
    >
      <span className="text-xs font-bold text-mc3-gold/80 font-mono">{value}</span>
      <span className="text-[11px] text-white/30">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Console Home Page
// ---------------------------------------------------------------------------
export default function ConsolePage() {
  const router = useRouter();
  const [lastAppId, setLastAppId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LAST_APP_KEY);
      if (stored) {
        setLastAppId(stored);
      }
    }
  }, []);

  const handleResumeLastApp = () => {
    if (lastAppId) {
      router.push(`/console/belt?app=${encodeURIComponent(lastAppId)}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-10 px-4 sm:px-6">

      {/* ================================================================ */}
      {/* HERO SECTION                                                     */}
      {/* ================================================================ */}
      <div
        className={`relative mb-10 rounded-2xl overflow-hidden bg-gradient-to-br from-mc3-navy via-mc3-ink to-[#1a1f33] transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Faint gold grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(243,210,115,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(243,210,115,0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Content */}
        <div className="relative px-6 sm:px-10 pt-6 sm:pt-8">
          {/* Brand label */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-mc3-gold/40" />
            <span className="text-[10px] font-mono font-semibold text-mc3-gold/70 uppercase tracking-[0.25em]">
              MC3 Manufacturing
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.1]">
            Conveyor
            <br />
            <span className="text-mc3-gold">Console</span>
          </h1>

          <p className="mt-2 text-sm text-white/30 max-w-lg leading-relaxed">
            Design, configure, and deliver conveyor systems with engineering precision.
          </p>

          {/* Stat badges */}
          <div className="flex flex-wrap gap-3 mt-4 mb-1">
            <StatBadge value="2" label="Product Types" delay="400ms" />
            <StatBadge value="Excel" label="Parity Calcs" delay="500ms" />
            <StatBadge value="3-Tier" label="Validation" delay="600ms" />
          </div>
        </div>

        {/* Blueprint conveyor illustration */}
        <BlueprintConveyor />
      </div>

      {/* ================================================================ */}
      {/* ACTION CARDS                                                     */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-6">
        {/* Quotes */}
        <Link
          href="/console/quotes"
          className={`group relative bg-white rounded-xl p-5 sm:p-6 border border-mc3-line/60 transition-all duration-300 hover:shadow-xl hover:shadow-mc3-blue/[0.07] hover:-translate-y-1 hover:border-mc3-blue/30 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: mounted ? '150ms' : '0ms' }}
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-mc3-blue/[0.07] flex items-center justify-center group-hover:bg-mc3-blue/[0.12] transition-colors duration-300">
              <svg className="w-5 h-5 text-mc3-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-mc3-navy group-hover:text-mc3-blue transition-colors">Quotes</h2>
              <p className="mt-1 text-sm text-gray-400 leading-relaxed">View and manage quote applications</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 mt-1 group-hover:text-mc3-blue group-hover:translate-x-0.5 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* Sales Orders */}
        <Link
          href="/console/sales-orders"
          className={`group relative bg-white rounded-xl p-5 sm:p-6 border border-mc3-line/60 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/[0.07] hover:-translate-y-1 hover:border-emerald-400/30 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: mounted ? '250ms' : '0ms' }}
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-500/[0.07] flex items-center justify-center group-hover:bg-emerald-500/[0.12] transition-colors duration-300">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-mc3-navy group-hover:text-emerald-600 transition-colors">Sales Orders</h2>
              <p className="mt-1 text-sm text-gray-400 leading-relaxed">View and manage sales order applications</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 mt-1 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* New Application */}
        <Link
          href="/console/applications/new"
          className={`group relative rounded-xl p-5 sm:p-6 border border-mc3-gold/30 bg-gradient-to-br from-mc3-gold/[0.06] to-mc3-gold/[0.02] transition-all duration-300 hover:shadow-xl hover:shadow-mc3-gold/[0.1] hover:-translate-y-1 hover:border-mc3-gold/50 hover:from-mc3-gold/[0.1] hover:to-mc3-gold/[0.04] ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: mounted ? '350ms' : '0ms' }}
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-mc3-gold/20 flex items-center justify-center group-hover:bg-mc3-gold/30 transition-colors duration-300">
              <svg className="w-5 h-5 text-amber-700 transition-transform duration-500 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-mc3-navy">New Application</h2>
              <p className="mt-1 text-sm text-gray-400 leading-relaxed">Create a new conveyor application</p>
            </div>
            <svg className="w-4 h-4 text-mc3-gold/50 mt-1 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Resume Last Application */}
      {lastAppId && (
        <div
          className={`transition-all duration-500 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{ transitionDelay: mounted ? '450ms' : '0ms' }}
        >
          <button
            onClick={handleResumeLastApp}
            className="group flex items-center gap-4 w-full bg-white/60 backdrop-blur-sm rounded-xl border border-mc3-line/50 p-4 hover:bg-white hover:border-mc3-blue/30 hover:shadow-md transition-all duration-300 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-mc3-navy/[0.06] flex items-center justify-center group-hover:bg-mc3-blue/10 transition-colors">
              <svg className="w-4 h-4 text-mc3-navy/50 group-hover:text-mc3-blue transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-mc3-navy">Resume Last Application</p>
              <p className="text-xs text-gray-400 truncate">Continue where you left off</p>
            </div>
            <span className="text-sm font-semibold text-mc3-blue opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200">
              Resume
            </span>
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* CAPABILITY STRIP                                                 */}
      {/* ================================================================ */}
      <div
        className={`mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-gray-300 transition-all duration-500 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transitionDelay: mounted ? '700ms' : '0ms' }}
      >
        {[
          { label: 'Real-Time Calculations', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          { label: 'Drive Selection', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
          { label: 'PDF Export', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
          { label: 'Multi-Config', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
        ].map(({ label, icon }) => (
          <div key={label} className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
            <span className="text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
