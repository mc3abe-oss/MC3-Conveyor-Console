/**
 * Compact Card Layout Components
 *
 * Shared layout helpers for consistent, dense card layouts across the application.
 * Used primarily in Belt & Pulleys and similar configuration sections.
 *
 * Components:
 * - SpecGrid: Dense grid of label/value pairs
 * - CompactCardHeader: Standardized card header with title, status, and actions
 * - FootnoteRow: Subtle footer for governing rules/notes
 * - CompactInfoBanner: Collapsible/inline info strip for recommendations
 */

'use client';

import { ReactNode, useState } from 'react';

/**
 * SpecGrid - Dense label/value pair grid
 * Renders specs in a tight horizontal layout
 */
interface SpecItem {
  label: string;
  value: ReactNode;
  unit?: string;
  highlight?: boolean;
  className?: string;
}

interface SpecGridProps {
  items: SpecItem[];
  /** Number of columns on desktop (default: 2) */
  columns?: 2 | 3 | 4;
  className?: string;
}

export function SpecGrid({ items, columns = 2, className = '' }: SpecGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-x-4 gap-y-1 text-sm ${className}`}>
      {items.map((item, i) => (
        <div key={i} className={`flex items-baseline gap-1.5 ${item.className || ''}`}>
          <span className="text-gray-500 text-xs">{item.label}:</span>
          <span className={`font-medium ${item.highlight ? 'text-blue-600' : 'text-gray-900'}`}>
            {item.value}
            {item.unit && <span className="text-gray-500 font-normal ml-0.5">{item.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * InlineSpecRow - Single line of specs separated by pipes
 */
interface InlineSpecRowProps {
  items: SpecItem[];
  className?: string;
}

export function InlineSpecRow({ items, className = '' }: InlineSpecRowProps) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm ${className}`}>
      {items.map((item, i) => (
        <span key={i} className={`flex items-baseline gap-1 ${item.className || ''}`}>
          {i > 0 && <span className="text-gray-300 mr-2">|</span>}
          <span className="text-gray-500 text-xs">{item.label}:</span>
          <span className={`font-medium ${item.highlight ? 'text-blue-600' : 'text-gray-900'}`}>
            {item.value}
            {item.unit && <span className="text-gray-500 font-normal ml-0.5">{item.unit}</span>}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * CompactCardHeader - Standardized card header
 */
interface StatusBadge {
  label: string;
  variant: 'success' | 'warning' | 'info' | 'default';
}

interface CompactCardHeaderProps {
  title: ReactNode;
  badges?: StatusBadge[];
  actions?: ReactNode;
  className?: string;
}

export function CompactCardHeader({ title, badges = [], actions, className = '' }: CompactCardHeaderProps) {
  const badgeStyles = {
    success: 'text-green-600 bg-green-100',
    warning: 'text-amber-600 bg-amber-100',
    info: 'text-blue-600 bg-blue-100',
    default: 'text-gray-600 bg-gray-100',
  };

  return (
    <div className={`flex items-center justify-between mb-2 ${className}`}>
      <h5 className="font-medium text-gray-900 text-sm">{title}</h5>
      <div className="flex items-center gap-2">
        {badges.map((badge, i) => (
          <span
            key={i}
            className={`text-xs px-1.5 py-0.5 rounded ${badgeStyles[badge.variant]}`}
          >
            {badge.label}
          </span>
        ))}
        {actions}
      </div>
    </div>
  );
}

/**
 * FootnoteRow - Subtle governing rule/note footer
 */
interface FootnoteRowProps {
  children: ReactNode;
  variant?: 'default' | 'warning' | 'info';
  className?: string;
}

export function FootnoteRow({ children, variant = 'default', className = '' }: FootnoteRowProps) {
  const styles = {
    default: 'text-gray-600 bg-gray-50',
    warning: 'text-amber-700 bg-amber-50 border-amber-200',
    info: 'text-blue-700 bg-blue-50 border-blue-200',
  };

  return (
    <div className={`text-xs rounded px-2.5 py-1.5 ${styles[variant]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * CompactInfoBanner - Collapsible info strip for recommendations
 */
interface CompactInfoBannerProps {
  title: string;
  subtitle?: string | null;
  detail?: string | null;
  variant?: 'info' | 'warning' | 'success';
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export function CompactInfoBanner({
  title,
  subtitle,
  detail,
  variant = 'info',
  collapsible = false,
  defaultExpanded = false,
  className = '',
}: CompactInfoBannerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };

  const iconStyles = {
    info: 'text-blue-500',
    warning: 'text-amber-500',
    success: 'text-green-500',
  };

  const content = (
    <>
      <div className="flex items-center gap-2">
        <svg className={`h-4 w-4 flex-shrink-0 ${iconStyles[variant]}`} fill="currentColor" viewBox="0 0 20 20">
          {variant === 'warning' ? (
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          ) : (
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          )}
        </svg>
        <span className="text-xs font-medium">{title}</span>
        {subtitle && <span className="text-xs opacity-80">— {subtitle}</span>}
        {collapsible && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="ml-auto text-xs opacity-60 hover:opacity-100"
          >
            {expanded ? '−' : '+'}
          </button>
        )}
      </div>
      {(!collapsible || expanded) && detail && (
        <p className="text-xs opacity-80 mt-1 ml-6">{detail}</p>
      )}
    </>
  );

  return (
    <div className={`rounded px-2.5 py-1.5 border ${styles[variant]} ${className}`}>
      {content}
    </div>
  );
}

/**
 * CompactCard - Standard card wrapper with consistent styling
 */
interface CompactCardProps {
  children: ReactNode;
  configured?: boolean;
  className?: string;
}

export function CompactCard({ children, configured = false, className = '' }: CompactCardProps) {
  return (
    <div
      className={`border rounded-lg p-3 ${
        configured ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * EditButton - Consistent edit/configure button
 */
interface EditButtonProps {
  onClick: () => void;
  configured?: boolean;
  label?: string;
  className?: string;
}

export function EditButton({ onClick, configured = false, label, className = '' }: EditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors ${className}`}
    >
      {label ?? (configured ? 'Edit' : 'Configure')}
    </button>
  );
}

/**
 * SectionDivider - Compact section header within accordion
 */
interface SectionDividerProps {
  title: string;
  className?: string;
}

export function SectionDivider({ title, className = '' }: SectionDividerProps) {
  return (
    <h4 className={`text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 pb-1.5 mt-4 mb-2 ${className}`}>
      {title}
    </h4>
  );
}
