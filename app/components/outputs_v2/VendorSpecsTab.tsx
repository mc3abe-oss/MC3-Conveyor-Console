'use client';

import { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  OutputsV2,
  VendorPacketBeltV2,
  VendorPacketPulleyV2,
  VendorPacketRollerV2,
  VendorPacketDriveV2,
  VendorPacketLegsV2,
  VendorPacketCastersV2,
} from '../../../src/models/sliderbed_v1/outputs_v2';

interface VendorSpecsTabProps {
  outputs: OutputsV2;
}

type SectionKey = 'belt' | 'pulleys' | 'rollers' | 'drive' | 'supports';

/**
 * VendorSpecsTab - Aggregated vendor packets with copy/download actions
 * Answers: "What do I send?"
 */
export default function VendorSpecsTab({ outputs }: VendorSpecsTabProps) {
  const { vendor_packets } = outputs.exports;

  const sections: { key: SectionKey; label: string; hasData: boolean }[] = [
    { key: 'belt', label: 'Belt', hasData: !!vendor_packets.belt },
    { key: 'pulleys', label: 'Pulleys', hasData: vendor_packets.pulleys.length > 0 },
    { key: 'rollers', label: 'Rollers', hasData: vendor_packets.rollers.length > 0 },
    { key: 'drive', label: 'Drive', hasData: !!vendor_packets.drive },
    {
      key: 'supports',
      label: 'Supports',
      hasData: !!vendor_packets.supports.legs || !!vendor_packets.supports.casters,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Vendor Specification Packets</h3>
        <p className="text-sm text-blue-800">
          Use these specification packets when ordering components from vendors.
          Each section contains only the fields needed for quoting and ordering.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {sections.map((section) => (
            <span
              key={section.key}
              className={clsx(
                'px-2 py-1 rounded text-xs font-medium',
                section.hasData
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              {section.label}: {section.hasData ? 'Ready' : 'N/A'}
            </span>
          ))}
        </div>
      </div>

      {/* Belt Section */}
      {vendor_packets.belt && (
        <VendorSection
          title="Belt"
          subtitle="Belting vendor specification"
          data={vendor_packets.belt}
        >
          <BeltSpec packet={vendor_packets.belt} />
        </VendorSection>
      )}

      {/* Pulleys Section */}
      {vendor_packets.pulleys.length > 0 && (
        <VendorSection
          title="Pulleys"
          subtitle={`${vendor_packets.pulleys.length} pulley specification${vendor_packets.pulleys.length !== 1 ? 's' : ''}`}
          data={vendor_packets.pulleys}
        >
          <div className="space-y-4">
            {vendor_packets.pulleys.map((pulley, i) => (
              <PulleySpec key={i} packet={pulley} />
            ))}
          </div>
        </VendorSection>
      )}

      {/* Rollers Section */}
      {vendor_packets.rollers.length > 0 && (
        <VendorSection
          title="Rollers"
          subtitle={`${vendor_packets.rollers.length} roller specification${vendor_packets.rollers.length !== 1 ? 's' : ''}`}
          data={vendor_packets.rollers}
        >
          <div className="space-y-4">
            {vendor_packets.rollers.map((roller, i) => (
              <RollerSpec key={i} packet={roller} />
            ))}
          </div>
        </VendorSection>
      )}

      {/* Drive Section */}
      {vendor_packets.drive && (
        <VendorSection
          title="Drive"
          subtitle="Gearmotor vendor specification"
          data={vendor_packets.drive}
        >
          <DriveSpec packet={vendor_packets.drive} />
        </VendorSection>
      )}

      {/* Supports Section */}
      {(vendor_packets.supports.legs || vendor_packets.supports.casters) && (
        <VendorSection
          title="Supports"
          subtitle="Floor support specifications"
          data={vendor_packets.supports}
        >
          <div className="space-y-4">
            {vendor_packets.supports.legs && (
              <LegsSpec packet={vendor_packets.supports.legs} />
            )}
            {vendor_packets.supports.casters && (
              <CastersSpec packet={vendor_packets.supports.casters} />
            )}
          </div>
        </VendorSection>
      )}

      {/* Empty State */}
      {!sections.some((s) => s.hasData) && (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 mx-auto text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-3 text-gray-500">No vendor packets available.</p>
        </div>
      )}
    </div>
  );
}

function VendorSection({
  title,
  subtitle,
  data,
  children,
}: {
  title: string;
  subtitle: string;
  data: unknown;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const jsonString = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data]);

  const handleDownload = useCallback(() => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor_packet_${title.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data, title]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy JSON
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">{children}</div>
    </div>
  );
}

function SpecField({
  label,
  value,
  unit,
  mono = true,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  unit?: string;
  mono?: boolean;
}) {
  if (value == null) return null;

  let displayValue: string;
  if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No';
  } else if (typeof value === 'number') {
    displayValue = String(value);
    if (unit) displayValue += ` ${unit}`;
  } else {
    displayValue = value;
  }

  return (
    <div className="flex justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-gray-600 text-sm">{label}</span>
      <span className={clsx('text-gray-900 text-sm', mono && 'font-mono')}>{displayValue}</span>
    </div>
  );
}

function BeltSpec({ packet }: { packet: VendorPacketBeltV2 }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Belt Specifications
        </h4>
        <SpecField label="Width" value={packet.belt_width_in} unit="in" />
        <SpecField label="Overall Length" value={packet.overall_length_in} unit="in" />
        <SpecField label="Material" value={packet.material} />
        <SpecField label="Series" value={packet.series} />
        <SpecField label="Plies" value={packet.plies} />
        <SpecField label="Total Thickness" value={packet.total_thickness_in} unit="in" />
        <SpecField label="Splice Type" value={packet.splice_type} />
        <SpecField label="Min Pulley Diameter" value={packet.minimum_pulley_diameter_in} unit="in" />
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Options & Conditions
        </h4>
        <SpecField label="Tracking Type" value={packet.tracking.type} />
        <SpecField label="V-Guide" value={packet.v_guide.included} />
        {packet.v_guide.included && (
          <>
            <SpecField label="V-Guide Profile" value={packet.v_guide.profile} />
            <SpecField label="V-Guide Location" value={packet.v_guide.location} />
          </>
        )}
        <SpecField label="Cleats" value={packet.cleats.included} />
        {packet.cleats.included && (
          <>
            <SpecField label="Cleat Height" value={packet.cleats.height_in} unit="in" />
            <SpecField label="Cleat Spacing" value={packet.cleats.spacing_in} unit="in" />
          </>
        )}
        <SpecField label="Speed" value={packet.operating_conditions.speed_fpm} unit="FPM" />
        <SpecField label="Load Type" value={packet.operating_conditions.load_type} />
      </div>
    </div>
  );
}

function PulleySpec({ packet }: { packet: VendorPacketPulleyV2 }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-900 capitalize">
          {packet.pulley_role.replace(/_/g, ' ')} Pulley
        </span>
        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
          Qty: {packet.qty}
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <SpecField label="Diameter" value={packet.diameter_in} unit="in" />
          <SpecField label="Face Length" value={packet.face_length_in} unit="in" />
          <SpecField label="Belt Width" value={packet.belt_width_in} unit="in" />
          <SpecField label="Bearing Centers" value={packet.bearing_centers_in} unit="in" />
          <SpecField label="Surface Finish" value={packet.surface_finish} />
        </div>
        <div>
          <SpecField label="Hub Bore" value={packet.hub.bore_in} unit="in" />
          <SpecField label="Hub Key" value={packet.hub.key} />
          <SpecField label="Shaft Diameter" value={packet.shaft.required_diameter_in} unit="in" />
          {packet.lagging && (
            <>
              <SpecField label="Lagging Type" value={packet.lagging.type} />
              <SpecField label="Lagging Thickness" value={packet.lagging.thickness_in} unit="in" />
            </>
          )}
          <SpecField label="Belt Tension" value={packet.loads.belt_tension_lbf} unit="lbf" />
        </div>
      </div>
    </div>
  );
}

function RollerSpec({ packet }: { packet: VendorPacketRollerV2 }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-900 capitalize">
          {packet.roller_role.replace(/_/g, ' ')} Roller
        </span>
        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
          Qty: {packet.qty}
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <SpecField label="Diameter" value={packet.roller_diameter_in} unit="in" />
          <SpecField label="Face Width" value={packet.roller_face_in} unit="in" />
          <SpecField label="Tube Material" value={packet.tube.material} />
          <SpecField label="Tube Gauge" value={packet.tube.gauge} />
        </div>
        <div>
          <SpecField label="Axle Type" value={packet.axle.type} />
          <SpecField label="Axle Diameter" value={packet.axle.diameter_in} unit="in" />
          <SpecField label="Bearing Type" value={packet.bearing.type} />
          <SpecField label="Required Load" value={packet.required_load_lbf} unit="lbf" />
          <SpecField label="Load Rating" value={packet.load_rating_lbf} unit="lbf" />
        </div>
      </div>
    </div>
  );
}

function DriveSpec({ packet }: { packet: VendorPacketDriveV2 }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Requirements
        </h4>
        <SpecField label="Required Power" value={packet.required_power_hp} unit="HP" />
        <SpecField label="Required Output RPM" value={packet.required_output_rpm} />
        <SpecField label="Required Output Torque" value={packet.required_output_torque_inlb} unit="in-lb" />
        <SpecField label="Service Factor Target" value={packet.service_factor_target} />
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Electrical & Mechanical
        </h4>
        <SpecField label="Voltage" value={packet.electrical.volts} unit="V" />
        <SpecField label="Phase" value={packet.electrical.phase} />
        <SpecField label="Frequency" value={packet.electrical.hz} unit="Hz" />
        <SpecField label="Enclosure" value={packet.enclosure} />
        <SpecField label="Mounting" value={packet.mounting} />
        <SpecField label="Brake Required" value={packet.brake.required} />
        <SpecField label="Output Shaft Diameter" value={packet.output_shaft.diameter_in} unit="in" />
        <SpecField label="Output Shaft Key" value={packet.output_shaft.key} />
      </div>
    </div>
  );
}

function LegsSpec({ packet }: { packet: VendorPacketLegsV2 }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-900">Legs</span>
        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
          Qty: {packet.qty}
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <SpecField label="Material" value={packet.material} />
          <SpecField label="Foot Type" value={packet.foot_type} />
          <SpecField label="Load Rating (each)" value={packet.load_rating_lbf_each} unit="lbf" />
        </div>
        <div>
          <SpecField label="Height Adj. Min" value={packet.height_adjustment_range_in.min} unit="in" />
          <SpecField label="Height Adj. Max" value={packet.height_adjustment_range_in.max} unit="in" />
        </div>
      </div>
    </div>
  );
}

function CastersSpec({ packet }: { packet: VendorPacketCastersV2 }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-900">Casters</span>
        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
          Qty: {packet.qty}
        </span>
      </div>
      <div>
        <SpecField label="Wheel Diameter" value={packet.wheel_diameter_in} unit="in" />
        <SpecField label="Locking" value={packet.locking} />
        <SpecField label="Load Rating (each)" value={packet.load_rating_lbf_each} unit="lbf" />
      </div>
    </div>
  );
}
