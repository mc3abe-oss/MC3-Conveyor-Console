'use client';

import { OutputsV2, VendorPacketDriveV2 } from '../../../src/models/sliderbed_v1/outputs_v2';
import ComponentCard, { ComponentField } from './ComponentCard';

interface DriveTabProps {
  outputs: OutputsV2;
}

/**
 * DriveTab - Drive component details and vendor packet
 */
export default function DriveTab({ outputs }: DriveTabProps) {
  const driveComponent = outputs.components.find((c) => c.component_id === 'drive_primary');

  if (!driveComponent) {
    return (
      <div className="text-gray-500 text-center py-8">
        No drive component available
      </div>
    );
  }

  const packet = driveComponent.vendor_packet as VendorPacketDriveV2 | null;

  return (
    <div className="space-y-4">
      <ComponentCard component={driveComponent} warnings={outputs.warnings_and_notes}>
        {packet && (
          <div className="space-y-4">
            {/* Requirements */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Requirements
              </h5>
              <div className="space-y-1">
                <ComponentField label="Required Power" value={packet.required_power_hp} unit="HP" />
                <ComponentField label="Required Output RPM" value={packet.required_output_rpm} />
                <ComponentField label="Required Output Torque" value={packet.required_output_torque_inlb} unit="in-lb" />
                <ComponentField label="Service Factor Target" value={packet.service_factor_target} />
              </div>
            </div>

            {/* Electrical */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Electrical
              </h5>
              <div className="space-y-1">
                <ComponentField label="Voltage" value={packet.electrical.volts} unit="V" />
                <ComponentField label="Phase" value={packet.electrical.phase} />
                <ComponentField label="Frequency" value={packet.electrical.hz} unit="Hz" />
              </div>
            </div>

            {/* Configuration */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Configuration
              </h5>
              <div className="space-y-1">
                <ComponentField label="Enclosure" value={packet.enclosure} />
                <ComponentField label="Thermal Protection" value={packet.thermal_protection} />
                <ComponentField label="Brake Required" value={packet.brake ? 'Yes' : 'No'} />
                <ComponentField label="Mounting" value={packet.mounting} />
                <ComponentField label="Frame Size" value={packet.frame_size} />
              </div>
            </div>

            {/* Output Shaft */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Output Shaft
              </h5>
              <div className="space-y-1">
                <ComponentField label="Type" value={packet.output_shaft.type} />
                <ComponentField label="Diameter" value={packet.output_shaft.diameter_in} unit="in" />
                <ComponentField label="Key" value={packet.output_shaft.key} />
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
