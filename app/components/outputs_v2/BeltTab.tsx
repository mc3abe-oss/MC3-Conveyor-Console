'use client';

import { OutputsV2, VendorPacketBeltV2 } from '../../../src/models/sliderbed_v1/outputs_v2';
import ComponentCard, { ComponentField } from './ComponentCard';

interface BeltTabProps {
  outputs: OutputsV2;
}

/**
 * BeltTab - Belt component details and vendor packet
 */
export default function BeltTab({ outputs }: BeltTabProps) {
  const beltComponent = outputs.components.find((c) => c.component_id === 'belt_primary');

  if (!beltComponent) {
    return (
      <div className="text-gray-500 text-center py-8">
        No belt component available
      </div>
    );
  }

  const packet = beltComponent.vendor_packet as VendorPacketBeltV2 | null;

  return (
    <div className="space-y-4">
      <ComponentCard component={beltComponent} warnings={outputs.warnings_and_notes}>
        {packet && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Belt Specifications
              </h5>
              <div className="space-y-1">
                <ComponentField label="Width" value={packet.belt_width_in} unit="in" />
                <ComponentField label="Overall Length" value={packet.overall_length_in} unit="in" />
                <ComponentField label="Material" value={packet.material} />
                <ComponentField label="Series" value={packet.series} />
                <ComponentField label="Plies" value={packet.plies} />
                <ComponentField label="Total Thickness" value={packet.total_thickness_in} unit="in" />
                <ComponentField label="Splice Type" value={packet.splice_type} />
                <ComponentField label="Min Pulley Diameter" value={packet.minimum_pulley_diameter_in} unit="in" />
              </div>
            </div>

            {/* Tracking */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Belt Tracking
              </h5>
              <div className="space-y-1">
                <ComponentField label="Type" value={packet.tracking.type} />
                {packet.tracking.type === 'crowned' && (
                  <ComponentField label="Crown Profile" value={packet.tracking.profile} />
                )}
              </div>
            </div>

            {/* V-Guide */}
            {packet.v_guide.included && (
              <div>
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  V-Guide
                </h5>
                <div className="space-y-1">
                  <ComponentField label="Location" value={packet.v_guide.location} />
                  <ComponentField label="Bond Type" value={packet.v_guide.bond_type} />
                  <ComponentField label="Height" value={packet.v_guide.height_in} unit="in" />
                </div>
              </div>
            )}

            {/* Cleats */}
            {packet.cleats.included && (
              <div>
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Cleats
                </h5>
                <div className="space-y-1">
                  <ComponentField label="Height" value={packet.cleats.height_in} unit="in" />
                  <ComponentField label="Spacing" value={packet.cleats.spacing_in} unit="in" />
                  <ComponentField label="Orientation" value={packet.cleats.orientation} />
                </div>
              </div>
            )}

            {/* Operating Conditions */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Operating Conditions
              </h5>
              <div className="space-y-1">
                <ComponentField label="Speed" value={packet.operating_conditions.speed_fpm} unit="FPM" />
                <ComponentField label="Load Type" value={packet.operating_conditions.load_type} />
              </div>
            </div>

            {/* Notes */}
            {packet.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Notes:</span> {packet.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
