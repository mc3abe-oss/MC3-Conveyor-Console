'use client';

import { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  OutputsV2,
  exportOutputsV2ToJSON,
  exportOutputsV2ToCSV,
} from '../../../src/models/sliderbed_v1/outputs_v2';
import CopyBlock from './CopyBlock';

interface ExportsTabProps {
  outputs: OutputsV2;
}

/**
 * ExportsTab - JSON and CSV export with download buttons
 */
export default function ExportsTab({ outputs }: ExportsTabProps) {
  const [activeFormat, setActiveFormat] = useState<'json' | 'csv'>('json');

  const jsonContent = exportOutputsV2ToJSON(outputs);
  const csvContent = exportOutputsV2ToCSV(outputs);

  const handleDownload = useCallback(
    (format: 'json' | 'csv') => {
      const content = format === 'json' ? jsonContent : csvContent;
      const mimeType = format === 'json' ? 'application/json' : 'text/csv';
      const filename = `outputs_v2_${outputs.summary.conveyor_id ?? 'export'}_${new Date().toISOString().slice(0, 10)}.${format}`;

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [jsonContent, csvContent, outputs.summary.conveyor_id]
  );

  return (
    <div className="space-y-4">
      {/* Format Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveFormat('json')}
          className={clsx(
            'px-4 py-2 text-sm font-medium rounded-t transition-colors',
            activeFormat === 'json'
              ? 'bg-gray-100 text-gray-900 border-b-2 border-primary-500'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          JSON
        </button>
        <button
          onClick={() => setActiveFormat('csv')}
          className={clsx(
            'px-4 py-2 text-sm font-medium rounded-t transition-colors',
            activeFormat === 'csv'
              ? 'bg-gray-100 text-gray-900 border-b-2 border-primary-500'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          CSV
        </button>
      </div>

      {/* Export Description */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        {activeFormat === 'json' ? (
          <div>
            <h4 className="font-semibold text-blue-900">Full Outputs V2 JSON</h4>
            <p className="text-sm text-blue-800 mt-1">
              Complete structured output with all component data, vendor packets, and validation results.
              Use this for archiving, API integrations, or reimporting configurations.
            </p>
          </div>
        ) : (
          <div>
            <h4 className="font-semibold text-blue-900">Component CSV for Quoting</h4>
            <p className="text-sm text-blue-800 mt-1">
              Flat table with {outputs.exports.csv_rows.rows.length} components and {outputs.exports.csv_rows.columns.length} columns.
              Use this for spreadsheet analysis, quoting systems, or BOM exports.
            </p>
          </div>
        )}
      </div>

      {/* Export Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">
              {activeFormat === 'json' ? 'Download Full Export' : 'Download CSV Export'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeFormat === 'json'
                ? `Schema v${outputs.meta.schema_version} | ${outputs.meta.source_model_version}`
                : `${outputs.exports.csv_rows.rows.length} rows ready for export`}
            </p>
          </div>
          <button
            onClick={() => handleDownload(activeFormat)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download {activeFormat.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Content Preview */}
      {activeFormat === 'json' ? (
        <CopyBlock content={jsonContent} label="JSON Preview" maxHeight="500px" />
      ) : (
        <div className="space-y-2">
          <CopyBlock content={csvContent} label="CSV Preview" maxHeight="400px" />
          <div className="text-xs text-gray-500">
            <span className="font-medium">Columns:</span>{' '}
            {outputs.exports.csv_rows.columns.join(', ')}
          </div>
        </div>
      )}

      {/* Meta Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Export Metadata</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Schema Version:</span>
            <span className="font-mono text-gray-700">{outputs.meta.schema_version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Min Compatible:</span>
            <span className="font-mono text-gray-700">{outputs.meta.min_compatible_version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Generated:</span>
            <span className="font-mono text-gray-700">
              {new Date(outputs.meta.generated_at_iso).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Source Model:</span>
            <span className="font-mono text-gray-700">{outputs.meta.source_model_version}</span>
          </div>
        </div>
      </div>

      {/* Vendor Packets Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Vendor Packet Summary</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <PacketStatus label="Belt" present={!!outputs.exports.vendor_packets.belt} />
          <PacketStatus
            label="Pulleys"
            present={outputs.exports.vendor_packets.pulleys.length > 0}
            count={outputs.exports.vendor_packets.pulleys.length}
          />
          <PacketStatus
            label="Rollers"
            present={outputs.exports.vendor_packets.rollers.length > 0}
            count={outputs.exports.vendor_packets.rollers.length}
          />
          <PacketStatus label="Drive" present={!!outputs.exports.vendor_packets.drive} />
          <PacketStatus label="Legs" present={!!outputs.exports.vendor_packets.supports.legs} />
          <PacketStatus label="Casters" present={!!outputs.exports.vendor_packets.supports.casters} />
        </div>
      </div>
    </div>
  );
}

function PacketStatus({
  label,
  present,
  count,
}: {
  label: string;
  present: boolean;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {present ? (
        <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span className={present ? 'text-gray-700' : 'text-gray-400'}>
        {label}
        {count !== undefined && present && <span className="ml-0.5">({count})</span>}
      </span>
    </div>
  );
}
