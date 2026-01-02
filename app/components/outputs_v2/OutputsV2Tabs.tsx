'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { OutputsV2 } from '../../../src/models/sliderbed_v1/outputs_v2';
import OverviewTab from './OverviewTab';
import BeltTab from './BeltTab';
import PulleysRollersTab from './PulleysRollersTab';
import DriveTab from './DriveTab';
import SupportsTab from './SupportsTab';
import ValidationTab from './ValidationTab';
import ExportsTab from './ExportsTab';

type TabId = 'overview' | 'belt' | 'pulleys_rollers' | 'drive' | 'supports' | 'validation' | 'exports';

interface Tab {
  id: TabId;
  label: string;
  badge?: number | string;
  badgeType?: 'error' | 'warning' | 'info';
}

interface OutputsV2TabsProps {
  outputs: OutputsV2;
  className?: string;
  defaultTab?: TabId;
}

/**
 * OutputsV2Tabs - Main wrapper component with 7 tabs for displaying outputs_v2
 */
export default function OutputsV2Tabs({ outputs, className, defaultTab = 'overview' }: OutputsV2TabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  // Calculate badges
  const errorCount = outputs.warnings_and_notes.filter((w) => w.severity === 'error').length;
  const warningCount = outputs.warnings_and_notes.filter((w) => w.severity === 'warning').length;

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'belt', label: 'Belt' },
    { id: 'pulleys_rollers', label: 'Pulleys & Rollers' },
    { id: 'drive', label: 'Drive' },
    { id: 'supports', label: 'Supports' },
    {
      id: 'validation',
      label: 'Validation',
      badge: errorCount > 0 ? errorCount : warningCount > 0 ? warningCount : undefined,
      badgeType: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : undefined,
    },
    { id: 'exports', label: 'Exports' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab outputs={outputs} />;
      case 'belt':
        return <BeltTab outputs={outputs} />;
      case 'pulleys_rollers':
        return <PulleysRollersTab outputs={outputs} />;
      case 'drive':
        return <DriveTab outputs={outputs} />;
      case 'supports':
        return <SupportsTab outputs={outputs} />;
      case 'validation':
        return <ValidationTab outputs={outputs} />;
      case 'exports':
        return <ExportsTab outputs={outputs} />;
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
                'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
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
                      tab.badgeType === 'info' && 'bg-blue-100 text-blue-700',
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
