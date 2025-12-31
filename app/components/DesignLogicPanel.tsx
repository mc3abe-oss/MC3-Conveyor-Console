'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import clsx from 'clsx';

// Section data structure
interface Section {
  id: string;
  title: string;
  body: string | React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'dl-overview',
    title: 'The big picture',
    body: `Conveyors work because belts are tensioned, not just because motors pull.
This calculator follows a clear physical sequence:
Belt tensioning → Working belt pull → Belt tensions → Pulley load → Shaft and pulley checks.
Each step depends on the one before it. Nothing skips ahead.`,
  },
  {
    id: 'dl-baseline-tension',
    title: '1) Belt tension exists before any work is done',
    body: `Before the conveyor moves, the belt is already tight. Baseline tension is set by take-ups, installation stretch, tracking adjustments, and wrap devices. This is the tension you dial in while the conveyor is stopped.
Why it matters: it keeps the belt seated, allows friction to exist, and stabilizes tracking. If baseline tension is too low, the belt can slip and tracking becomes unstable.`,
  },
  {
    id: 'dl-working-tension',
    title: '2) Conveyor work adds difference in belt tension',
    body: `Moving material requires extra force to overcome friction, lift on inclines, and accelerate during startup. This creates working belt pull. That pull creates a difference between both sides of the belt:
T2 is slack-side tension (mostly set by tensioning).
T1 is tight-side tension (T2 plus the work being done).
Baseline tension sets the floor. Work raises the tight side above it.`,
  },
  {
    id: 'dl-traction',
    title: '3) Traction depends on friction, wrap, and tension',
    body: `The drive pulley can only transmit force if the belt has enough grip. Grip depends on belt–pulley friction, wrap angle, and belt tension. More wrap and more tension increase traction capacity.
Important: this app assumes adequate traction exists. It does not automatically verify slip margin unless explicitly configured.`,
  },
  {
    id: 'dl-pulley-load',
    title: '4) Belt tensions create pulley load',
    body: `The pulley does not feel belt pull directly. It feels the belt pushing sideways on it. That sideways push is the resultant pulley load.
For a belt wrapping about halfway around the pulley (about 180°), the shaft sees roughly the sum of the tight-side and slack-side tensions. This load bends the shaft, stresses the pulley tube, and loads bearings. Both baseline and working tension contribute.`,
  },
  {
    id: 'dl-shaft',
    title: '5) Pulley load sizes the shaft',
    body: `We treat the shaft as a beam supported by bearings and loaded by the pulley. We check bending stress, torsional stress, and deflection. Shafts are sized conservatively to avoid yielding and excessive deflection.
Key principle: stronger steel does not make a shaft stiffer. Larger diameter reduces deflection.`,
  },
  {
    id: 'dl-tube',
    title: '6) The same load also stresses the pulley tube',
    body: `The pulley shell sees the same load in a different way. Tube stress depends on shell diameter, wall thickness, and hub spacing. Allowable stress depends on pulley type. V-groove pulleys allow lower stress due to stress concentration. These checks are additive and highlight weak components.`,
  },
  {
    id: 'dl-tracking',
    title: '7) Tracking is a tension problem, not a mystery',
    body: `Good tracking comes from stable, even belt tension, square pulleys and frames, proper take-up behavior, and appropriate guiding when required. Guides help position, but do not replace proper tension. Low or uneven tension usually makes tracking worse.`,
  },
  {
    id: 'dl-assumptions',
    title: 'Assumptions used in this calculator',
    body: (
      <div>
        <p className="mb-2">To keep results consistent and conservative, this app assumes:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>slider-bed conveyor with typical friction (about 0.35) unless specified</li>
          <li>about 180° wrap on the drive pulley</li>
          <li>safety margins applied to force calculations</li>
        </ul>
        <p className="mt-2">Roller beds, specialty surfaces, contamination, or different wrap angles can change behavior.</p>
      </div>
    ),
  },
  {
    id: 'dl-not-checked',
    title: 'What this calculator does not check',
    body: `This tool sizes components based on force flow and strength limits. It does not automatically verify slip margin, belt stretch limits, take-up hardware capacity, or installation quality and alignment.`,
  },
  {
    id: 'dl-interpret',
    title: 'How to interpret results',
    body: (
      <div>
        <p className="mb-2">If a value looks high, adjust the lever it points to:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>high belt pull: reduce friction or load</li>
          <li>slip risk: increase wrap, friction, or baseline tension</li>
          <li>high pulley load: larger pulley or reduced tension</li>
          <li>high shaft stress: increase shaft diameter</li>
          <li>high tube stress: larger shell or thicker wall</li>
        </ul>
        <p className="mt-2">Every number has a physical reason.</p>
      </div>
    ),
  },
];

// SVG Diagram Component
function ForceDiagram() {
  return (
    <svg
      viewBox="0 0 920 320"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Belt tensions create pulley load"
      className="w-full h-auto max-w-2xl mx-auto text-gray-700"
    >
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="currentColor" />
        </marker>
      </defs>

      {/* Pulley */}
      <circle cx="460" cy="160" r="70" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="460" cy="160" r="8" fill="currentColor" />

      {/* Belt path */}
      <path
        d="M140 92 C260 92, 330 92, 390 115"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M530 205 C610 240, 700 250, 820 250"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Wrap arc */}
      <path
        d="M390 115 A70 70 0 0 1 530 205"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* T1 arrow (tight side) */}
      <line
        x1="330"
        y1="92"
        x2="150"
        y2="92"
        stroke="currentColor"
        strokeWidth="4"
        markerEnd="url(#arrow)"
      />
      <text x="155" y="76" fontSize="18" fill="currentColor">
        T1 (tight side)
      </text>

      {/* T2 arrow (slack side) */}
      <line
        x1="740"
        y1="250"
        x2="560"
        y2="220"
        stroke="currentColor"
        strokeWidth="3"
        markerEnd="url(#arrow)"
      />
      <text x="590" y="270" fontSize="18" fill="currentColor">
        T2 (slack side)
      </text>

      {/* Pulley load arrow */}
      <line
        x1="460"
        y1="160"
        x2="460"
        y2="280"
        stroke="currentColor"
        strokeWidth="4"
        markerEnd="url(#arrow)"
      />
      <text x="475" y="292" fontSize="18" fill="currentColor">
        Resultant pulley load
      </text>

      {/* Labels */}
      <text x="410" y="30" fontSize="18" fill="currentColor">
        Wrap (typically about 180°)
      </text>
      <text x="70" y="130" fontSize="16" fill="currentColor">
        Baseline tension set by take-up
      </text>
      <text x="70" y="155" fontSize="16" fill="currentColor">
        Work adds extra tension on tight side
      </text>
    </svg>
  );
}

// Export scroll function type for external use
export type ScrollToDesignLogic = (anchorId: string) => void;

interface DesignLogicPanelProps {
  className?: string;
  onScrollFunctionReady?: (scrollFn: ScrollToDesignLogic) => void;
}

export default function DesignLogicPanel({ className, onScrollFunctionReady }: DesignLogicPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll to a specific section
  const scrollToSection = useCallback((anchorId: string) => {
    // Expand panel if collapsed
    setIsExpanded(true);

    // Wait for expansion animation, then scroll
    setTimeout(() => {
      const element = document.getElementById(anchorId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight the section briefly
        setHighlightedSection(anchorId);
        setTimeout(() => setHighlightedSection(null), 1500);
      }
    }, 100);
  }, []);

  // Expose scroll function to parent
  useEffect(() => {
    if (onScrollFunctionReady) {
      onScrollFunctionReady(scrollToSection);
    }
  }, [scrollToSection, onScrollFunctionReady]);

  return (
    <div ref={panelRef} className={clsx('border border-gray-200 rounded-lg bg-white', className)}>
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div>
          <h3 className="text-base font-semibold text-gray-900">Design Logic</h3>
          <p className="text-sm text-gray-500">How forces are calculated and flow through the conveyor</p>
        </div>
        <svg
          className={clsx(
            'w-5 h-5 text-gray-400 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible Content */}
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 space-y-6">
          {/* Diagram */}
          <div className="pt-2 pb-4 border-b border-gray-100">
            <ForceDiagram />
          </div>

          {/* Sections */}
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className={clsx(
                'p-3 rounded-md transition-colors duration-300',
                highlightedSection === section.id
                  ? 'bg-primary-50 border border-primary-200'
                  : 'bg-gray-50'
              )}
            >
              <h4 className="text-sm font-semibold text-gray-800 mb-2">{section.title}</h4>
              <div className="text-sm text-gray-600 whitespace-pre-line">{section.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper component for inline "Design Logic" links
interface DesignLogicLinkProps {
  anchorId: string;
  scrollFn?: ScrollToDesignLogic;
  className?: string;
}

export function DesignLogicLink({ anchorId, scrollFn, className }: DesignLogicLinkProps) {
  if (!scrollFn) return null;

  return (
    <button
      type="button"
      onClick={() => scrollFn(anchorId)}
      className={clsx(
        'text-xs text-primary-600 hover:text-primary-800 hover:underline ml-1',
        className
      )}
      title="Learn how this is calculated"
    >
      ?
    </button>
  );
}
