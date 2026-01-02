'use client';

import { OutputsV2, VendorPacketLegsV2, VendorPacketCastersV2 } from '../../../src/models/sliderbed_v1/outputs_v2';
import ComponentCard, { ComponentField } from './ComponentCard';

interface SupportsTabProps {
  outputs: OutputsV2;
}

/**
 * SupportsTab - Legs and Casters component details
 */
export default function SupportsTab({ outputs }: SupportsTabProps) {
  const legsComponent = outputs.components.find((c) => c.component_id === 'support_legs');
  const castersComponent = outputs.components.find((c) => c.component_id === 'support_casters');

  if (!legsComponent && !castersComponent) {
    return (
      <div className="text-gray-500 text-center py-8">
        No support components (conveyor may be externally supported or suspended)
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Support System Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Support System</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <div className="flex justify-between">
            <span>Type:</span>
            <span className="font-mono capitalize">
              {outputs.support_system.support_type.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Floor Supported:</span>
            <span className="font-mono">{outputs.support_system.is_floor_supported ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span>TOB Relevance:</span>
            <span className="font-mono capitalize">
              {outputs.support_system.tob_relevance.replace(/_/g, ' ')}
            </span>
          </div>
          {outputs.support_system.notes && (
            <p className="mt-2 text-xs italic">{outputs.support_system.notes}</p>
          )}
        </div>
      </div>

      {/* Legs Component */}
      {legsComponent && (
        <LegsCard
          component={legsComponent}
          packet={legsComponent.vendor_packet as VendorPacketLegsV2 | null}
          warnings={outputs.warnings_and_notes}
        />
      )}

      {/* Casters Component */}
      {castersComponent && (
        <CastersCard
          component={castersComponent}
          packet={castersComponent.vendor_packet as VendorPacketCastersV2 | null}
          warnings={outputs.warnings_and_notes}
        />
      )}
    </div>
  );
}

function LegsCard({
  component,
  packet,
  warnings,
}: {
  component: OutputsV2['components'][0];
  packet: VendorPacketLegsV2 | null;
  warnings: OutputsV2['warnings_and_notes'];
}) {
  return (
    <ComponentCard component={component} warnings={warnings}>
      {packet && (
        <div className="space-y-3">
          <div className="space-y-1">
            <ComponentField label="Qty" value={packet.qty} />
            <ComponentField label="Material" value={packet.material} />
            <ComponentField label="Foot Type" value={packet.foot_type} />
            <ComponentField label="Load Rating (each)" value={packet.load_rating_lbf_each} unit="lbf" />
          </div>

          {/* Height Adjustment */}
          <div>
            <h6 className="text-xs font-medium text-gray-500 mb-1">Height Adjustment Range</h6>
            <div className="pl-2 border-l-2 border-gray-100 space-y-1">
              <ComponentField label="Min" value={packet.height_adjustment_range_in.min} unit="in" />
              <ComponentField label="Max" value={packet.height_adjustment_range_in.max} unit="in" />
            </div>
          </div>

          {packet.notes && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Notes:</span> {packet.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </ComponentCard>
  );
}

function CastersCard({
  component,
  packet,
  warnings,
}: {
  component: OutputsV2['components'][0];
  packet: VendorPacketCastersV2 | null;
  warnings: OutputsV2['warnings_and_notes'];
}) {
  return (
    <ComponentCard component={component} warnings={warnings}>
      {packet && (
        <div className="space-y-3">
          <div className="space-y-1">
            <ComponentField label="Qty" value={packet.qty} />
            <ComponentField label="Wheel Diameter" value={packet.wheel_diameter_in} unit="in" />
            <ComponentField label="Locking" value={packet.locking ? 'Yes' : 'No'} />
            <ComponentField label="Load Rating (each)" value={packet.load_rating_lbf_each} unit="lbf" />
          </div>

          {packet.notes && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Notes:</span> {packet.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </ComponentCard>
  );
}
