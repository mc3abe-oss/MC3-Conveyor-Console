'use client';

import { OutputsV2, VendorPacketPulleyV2, VendorPacketRollerV2 } from '../../../src/models/sliderbed_v1/outputs_v2';
import ComponentCard, { ComponentField } from './ComponentCard';

interface PulleysRollersTabProps {
  outputs: OutputsV2;
}

/**
 * PulleysRollersTab - Pulley and Roller component details
 */
export default function PulleysRollersTab({ outputs }: PulleysRollersTabProps) {
  const pulleys = outputs.components.filter((c) => c.component_type === 'pulley');
  const rollers = outputs.components.filter((c) => c.component_type === 'roller');

  return (
    <div className="space-y-6">
      {/* Pulleys Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Pulleys</h3>
        {pulleys.length === 0 ? (
          <p className="text-gray-500 text-sm">No pulley components</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pulleys.map((pulley) => (
              <PulleyCard
                key={pulley.component_id}
                component={pulley}
                packet={pulley.vendor_packet as VendorPacketPulleyV2 | null}
                warnings={outputs.warnings_and_notes}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rollers Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Rollers</h3>
        {rollers.length === 0 ? (
          <p className="text-gray-500 text-sm">No roller components</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rollers.map((roller) => (
              <RollerCard
                key={roller.component_id}
                component={roller}
                packet={roller.vendor_packet as VendorPacketRollerV2 | null}
                warnings={outputs.warnings_and_notes}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PulleyCard({
  component,
  packet,
  warnings,
}: {
  component: OutputsV2['components'][0];
  packet: VendorPacketPulleyV2 | null;
  warnings: OutputsV2['warnings_and_notes'];
}) {
  return (
    <ComponentCard component={component} warnings={warnings}>
      {packet && (
        <div className="space-y-3">
          {/* Basic Dimensions */}
          <div className="space-y-1">
            <ComponentField label="Qty" value={packet.qty} />
            <ComponentField label="Role" value={packet.pulley_role} />
            <ComponentField label="Diameter" value={packet.diameter_in} unit="in" />
            <ComponentField label="Face Length" value={packet.face_length_in} unit="in" />
            <ComponentField label="Belt Width" value={packet.belt_width_in} unit="in" />
            <ComponentField label="Bearing Centers" value={packet.bearing_centers_in} unit="in" />
            <ComponentField label="Surface Finish" value={packet.surface_finish} />
            <ComponentField label="Balance" value={packet.balance} />
          </div>

          {/* Lagging */}
          {packet.lagging && (
            <div>
              <h6 className="text-xs font-medium text-gray-500 mb-1">Lagging</h6>
              <div className="pl-2 border-l-2 border-gray-100 space-y-1">
                <ComponentField label="Type" value={packet.lagging.type} />
                <ComponentField label="Thickness" value={packet.lagging.thickness_in} unit="in" />
                <ComponentField label="Coverage" value={packet.lagging.coverage} />
              </div>
            </div>
          )}

          {/* Crown */}
          {packet.crown && (
            <div>
              <h6 className="text-xs font-medium text-gray-500 mb-1">Crown</h6>
              <div className="pl-2 border-l-2 border-gray-100 space-y-1">
                <ComponentField label="Value" value={packet.crown.value_in} unit="in" />
              </div>
            </div>
          )}

          {/* Hub */}
          <div>
            <h6 className="text-xs font-medium text-gray-500 mb-1">Hub</h6>
            <div className="pl-2 border-l-2 border-gray-100 space-y-1">
              <ComponentField label="Bore" value={packet.hub.bore_in} unit="in" />
              <ComponentField label="Key" value={packet.hub.key} />
            </div>
          </div>

          {/* Shaft */}
          <div>
            <h6 className="text-xs font-medium text-gray-500 mb-1">Shaft</h6>
            <div className="pl-2 border-l-2 border-gray-100 space-y-1">
              <ComponentField label="Required Diameter" value={packet.shaft.required_diameter_in} unit="in" />
              <ComponentField label="Extension Left" value={packet.shaft.extension_left_in} unit="in" />
              <ComponentField label="Extension Right" value={packet.shaft.extension_right_in} unit="in" />
            </div>
          </div>

          {/* Loads */}
          <div>
            <h6 className="text-xs font-medium text-gray-500 mb-1">Loads</h6>
            <div className="pl-2 border-l-2 border-gray-100 space-y-1">
              <ComponentField label="Belt Tension" value={packet.loads.belt_tension_lbf} unit="lbf" />
              <ComponentField label="Torque" value={packet.loads.torque_inlb} unit="in-lb" />
            </div>
          </div>

          <ComponentField label="Weight" value={packet.weight_lbs} unit="lbs" />

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

function RollerCard({
  component,
  packet,
  warnings,
}: {
  component: OutputsV2['components'][0];
  packet: VendorPacketRollerV2 | null;
  warnings: OutputsV2['warnings_and_notes'];
}) {
  return (
    <ComponentCard component={component} warnings={warnings}>
      {packet && (
        <div className="space-y-3">
          {/* Basic Dimensions */}
          <div className="space-y-1">
            <ComponentField label="Qty" value={packet.qty} />
            <ComponentField label="Role" value={packet.roller_role} />
            <ComponentField label="Diameter" value={packet.roller_diameter_in} unit="in" />
            <ComponentField label="Face Width" value={packet.roller_face_in} unit="in" />
            <ComponentField label="Required Load" value={packet.required_load_lbf} unit="lbf" />
            <ComponentField label="Load Rating" value={packet.load_rating_lbf} unit="lbf" />
          </div>

          {/* Tube */}
          <div>
            <h6 className="text-xs font-medium text-gray-500 mb-1">Tube</h6>
            <div className="pl-2 border-l-2 border-gray-100 space-y-1">
              <ComponentField label="Material" value={packet.tube.material} />
              <ComponentField label="Gauge" value={packet.tube.gauge} />
            </div>
          </div>

          {/* Axle */}
          <div>
            <h6 className="text-xs font-medium text-gray-500 mb-1">Axle</h6>
            <div className="pl-2 border-l-2 border-gray-100 space-y-1">
              <ComponentField label="Type" value={packet.axle.type} />
              <ComponentField label="Diameter" value={packet.axle.diameter_in} unit="in" />
            </div>
          </div>

          {/* Bearing */}
          <div>
            <h6 className="text-xs font-medium text-gray-500 mb-1">Bearing</h6>
            <div className="pl-2 border-l-2 border-gray-100 space-y-1">
              <ComponentField label="Type" value={packet.bearing.type} />
              <ComponentField label="Seal" value={packet.bearing.seal} />
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
