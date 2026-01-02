'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { OutputsV2 } from '../../../src/models/sliderbed_v1/outputs_v2';
import SummaryTab from './SummaryTab';
import IssuesTab from './IssuesTab';
import VendorSpecsTab from './VendorSpecsTab';
import ExportsTab from './ExportsTab';
import DetailsTab from './DetailsTab';

type TabId = 'summary' | 'issues' | 'vendor_specs' | 'exports' | 'details';

interface Tab {
  id: TabId;
  label: string;
  description: string;
  badge?: number | string;
  badgeType?: 'error' | 'warning' | 'success';
}

interface OutputsV2TabsProps {
  outputs: OutputsV2;
  className?: string;
  defaultTab?: TabId;
}

/**
 * OutputsV2Tabs - Intent-driven tab structure
 *
 * Tabs answer key questions:
 * - Summary: "Is it ready?"
 * - Issues: "What needs fixing?"
 * - Vendor Specs: "What do I send?"
 * - Exports: "How do I save/share?"
 * - Details: "What are the internals?"
 */
export default function OutputsV2Tabs({ outputs, className, defaultTab = 'summary' }: OutputsV2TabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  // Calculate badges
  const errorCount = outputs.warnings_and_notes.filter((w) => w.severity === 'error').length;
  const warningCount = outputs.warnings_and_notes.filter((w) => w.severity === 'warning').length;
  const totalIssues = errorCount + warningCount;

  // Determine readiness for summary badge
  const isReady = errorCount === 0;

  const tabs: Tab[] = [
    {
      id: 'summary',
      label: 'Summary',
      description: 'Is it ready?',
      badge: isReady ? (warningCount > 0 ? 'Warnings' : 'Ready') : 'Issues',
      badgeType: isReady ? (warningCount > 0 ? 'warning' : 'success') : 'error',
    },
    {
      id: 'issues',
      label: 'Issues',
      description: 'What needs fixing?',
      badge: totalIssues > 0 ? totalIssues : undefined,
      badgeType: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : undefined,
    },
    {
      id: 'vendor_specs',
      label: 'Vendor Specs',
      description: 'What do I send?',
    },
    {
      id: 'exports',
      label: 'Exports',
      description: 'Save & share',
    },
    {
      id: 'details',
      label: 'Details',
      description: 'Advanced',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return <SummaryTab outputs={outputs} />;
      case 'issues':
        return <IssuesTab outputs={outputs} />;
      case 'vendor_specs':
        return <VendorSpecsTab outputs={outputs} />;
      case 'exports':
        return <ExportsTab outputs={outputs} />;
      case 'details':
        return <DetailsTab outputs={outputs} />;
      default:
        return null;
    }
  };

  return (
    <div className={clsx('bg-white border border-gray-200 rounded-lg overflow-hidden', className)}>
      {/* Tab Header */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={clsx(
                      'px-1.5 py-0.5 text-xs rounded-full',
                      tab.badgeType === 'error' && 'bg-red-100 text-red-700',
                      tab.badgeType === 'warning' && 'bg-yellow-100 text-yellow-700',
                      tab.badgeType === 'success' && 'bg-green-100 text-green-700',
                      !tab.badgeType && 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">{renderTabContent()}</div>

      {/* Footer with meta info */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500 flex justify-between">
        <span>
          Schema v{outputs.meta.schema_version} | {outputs.meta.source_model_version}
        </span>
        <span>
          Generated: {new Date(outputs.meta.generated_at_iso).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
