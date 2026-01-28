'use client';

import { useState } from 'react';
import { IssuesList } from '../shared';
import {
  ConfigSummaryCard,
  DriveSummaryCard,
  TensionsSummaryCard,
  PulleySummaryCard,
  ThroughputSummaryCard,
  SpeedSummaryCard,
} from './BeltSummaryCards';
import {
  TensionsDetailCard,
  BeltDetailCard,
  PulleysDetailCard,
  PulleyLoadsDetailCard,
  DriveDetailCard,
  ShaftDetailCard,
  LoadDetailCard,
  ParametersCard,
  PciStressCard,
  GeometryDetailCard,
} from './BeltDetailCards';

interface BeltOutputsTabsProps {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  warnings?: Array<{ severity: 'error' | 'warning' | 'info'; field?: string; code?: string; message: string }>;
  errors?: Array<{ severity: 'error' | 'warning' | 'info'; field?: string; code?: string; message: string }>;
  className?: string;
}

type TabId = 'summary' | 'tensions' | 'belt' | 'pulleys' | 'drive' | 'issues';

export function BeltOutputsTabs({
  inputs,
  outputs,
  warnings = [],
  errors = [],
  className = '',
}: BeltOutputsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  const allIssues = [...errors.map(e => ({ ...e, severity: 'error' as const })), ...warnings];
  const errorCount = errors.length;
  const warningCount = warnings.length;
  const totalIssues = errorCount + warningCount;

  const tabs: { id: TabId; label: string; badge?: number | string; badgeType?: 'error' | 'warning' | 'success' }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'tensions', label: 'Tensions' },
    { id: 'belt', label: 'Belt' },
    { id: 'pulleys', label: 'Pulleys' },
    { id: 'drive', label: 'Drive' },
    {
      id: 'issues',
      label: 'Issues',
      badge: totalIssues > 0 ? totalIssues : undefined,
      badgeType: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : undefined,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ConfigSummaryCard inputs={inputs} />
            <DriveSummaryCard outputs={outputs} />
            <TensionsSummaryCard outputs={outputs} />
            <PulleySummaryCard outputs={outputs} />
            <div className="md:col-span-2">
              <ThroughputSummaryCard outputs={outputs} />
            </div>
          </div>
        );
      case 'tensions':
        return (
          <div className="space-y-4">
            <TensionsDetailCard outputs={outputs} />
            <LoadDetailCard outputs={outputs} />
          </div>
        );
      case 'belt':
        return (
          <div className="space-y-4">
            <BeltDetailCard outputs={outputs} />
            <GeometryDetailCard outputs={outputs} />
            <SpeedSummaryCard inputs={inputs} outputs={outputs} />
          </div>
        );
      case 'pulleys':
        return (
          <div className="space-y-4">
            <PulleysDetailCard outputs={outputs} />
            <PulleyLoadsDetailCard outputs={outputs} />
            <ShaftDetailCard outputs={outputs} />
            <PciStressCard outputs={outputs} />
          </div>
        );
      case 'drive':
        return (
          <div className="space-y-4">
            <DriveDetailCard outputs={outputs} />
            <ParametersCard outputs={outputs} />
          </div>
        );
      case 'issues':
        return <IssuesList issues={allIssues} />;
      default:
        return null;
    }
  };

  return (
    <div className={'bg-white border border-gray-200 rounded-lg overflow-hidden ' + className}>
      {/* Tab Header */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ' +
                (activeTab === tab.id
                  ? 'border-blue-500 text-blue-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100')
              }
            >
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={
                      'px-1.5 py-0.5 text-xs rounded-full ' +
                      (tab.badgeType === 'error'
                        ? 'bg-red-100 text-red-700'
                        : tab.badgeType === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700')
                    }
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

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500 flex justify-between">
        <span>Belt Conveyor v1</span>
        <span>
          {errorCount === 0 ? (
            <span className="text-green-600">&#10003; Ready</span>
          ) : (
            <span className="text-red-600">{errorCount} error(s)</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default BeltOutputsTabs;
