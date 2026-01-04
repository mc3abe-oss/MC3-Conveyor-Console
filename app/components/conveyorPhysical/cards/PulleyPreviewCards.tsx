/**
 * PulleyPreviewCards - Display-only pulley summary cards (Drive and Tail)
 * Extracted from TabConveyorPhysical.tsx (v1.41 slice 3)
 */

'use client';

import { ApplicationPulley } from '../../../api/application-pulleys/route';
import {
  SpecGrid,
  CompactCardHeader,
  CompactCard,
  EditButton,
} from '../../CompactCardLayouts';
import { LAGGING_PATTERN_LABELS, LaggingPattern } from '../../../../src/lib/lagging-patterns';
import {
  getHubConnectionOption,
  getBushingSystemOption,
  requiresBushingSystem,
  HubConnectionType,
} from '../../../../src/models/sliderbed_v1/pciHubConnections';

/**
 * Format lagging display string
 * Examples: "None", "Rubber 0.25\" Smooth", "Urethane 0.5\" Herringbone (CW)"
 */
function formatLagging(pulley: ApplicationPulley): string {
  if (pulley.lagging_type === 'NONE') return 'None';

  const parts: string[] = [pulley.lagging_type];

  if (pulley.lagging_thickness_in != null) {
    parts.push(`${pulley.lagging_thickness_in}"`);
  }

  if (pulley.lagging_pattern && pulley.lagging_pattern !== 'none' && pulley.lagging_pattern !== 'smooth') {
    const patternLabel = LAGGING_PATTERN_LABELS[pulley.lagging_pattern as LaggingPattern] || pulley.lagging_pattern;
    // Shorten some long pattern names for card display
    const shortLabel = patternLabel
      .replace('Herringbone (Clockwise)', 'Herringbone CW')
      .replace('Herringbone (Counter-Clockwise)', 'Herringbone CCW');
    parts.push(shortLabel);
  }

  return parts.join(' ');
}

/**
 * Get short hub connection label for card display
 */
function getHubConnectionLabel(hubConnectionType: string | null): string | null {
  if (!hubConnectionType) return null;
  const option = getHubConnectionOption(hubConnectionType);
  if (!option) return null;
  // Shorten long labels for card display
  return option.label
    .replace('Weld-On Hubs & Compression Bushings', 'Weld-On Hubs')
    .replace('Flat End Disk with Integral Hub', 'Flat End Disk')
    .replace('Contoured End Disk with Integral Hub', 'Contoured End Disk')
    .replace('ER Style Internal Bearings', 'ER Internal');
}

/**
 * Format balancing display string
 * Examples: "Dynamic @ 150 RPM", "Static G100", "Dynamic @ 120 RPM G100"
 */
function formatBalancing(pulley: ApplicationPulley): string | null {
  if (!pulley.balance_required) return null;

  const parts: string[] = [];

  // Method (capitalize)
  const method = pulley.balance_method || 'dynamic';
  parts.push(method.charAt(0).toUpperCase() + method.slice(1));

  // RPM if provided
  if (pulley.balance_rpm != null) {
    parts.push(`@ ${pulley.balance_rpm} RPM`);
  }

  // Grade if provided
  if (pulley.balance_grade) {
    parts.push(pulley.balance_grade);
  }

  return parts.join(' ');
}

/**
 * Get secondary detail label for hub connection (bushing system or shaft style)
 * This provides clarity on what the user selected without reopening the modal.
 */
function getHubConnectionDetail(
  hubConnectionType: string | null,
  bushingSystem: string | null
): string | null {
  if (!hubConnectionType) return null;

  // For weld-on hubs, show the bushing system
  if (requiresBushingSystem(hubConnectionType) && bushingSystem) {
    const bushingOption = getBushingSystemOption(bushingSystem);
    if (bushingOption) {
      // Format: "QD® Compression Bushing", "XT® Compression Bushing", etc.
      return `${bushingOption.label} Compression Bushing`;
    }
  }

  // For other hub types, show a clarifying detail
  switch (hubConnectionType) {
    case HubConnectionType.KeylessLockingDevices:
      return 'Shrink Disc';
    case HubConnectionType.FixedStubShafts:
      return 'Fixed Shaft';
    case HubConnectionType.RemovableStubShafts:
      return 'Removable Shaft';
    case HubConnectionType.KeyedHubSetScrew:
      return 'Keyed + Set Screw';
    case HubConnectionType.ErStyleInternalBearings:
      return 'ER Internal';
    case HubConnectionType.FlatEndDiskIntegralHub:
    case HubConnectionType.ContouredEndDiskIntegralHub:
      return 'Integral Hub';
    case HubConnectionType.DeadShaftAssembly:
      return 'Dead Shaft';
    default:
      return null;
  }
}

/**
 * Render hub connection with optional secondary detail line
 */
function HubConnectionDisplay({ pulley }: { pulley: ApplicationPulley }) {
  const hubLabel = getHubConnectionLabel(pulley.hub_connection_type);
  const hubDetail = getHubConnectionDetail(pulley.hub_connection_type, pulley.bushing_system);

  if (!hubLabel) return null;

  return (
    <span className="flex flex-col">
      <span>{hubLabel}</span>
      {hubDetail && (
        <span className="text-[10px] text-gray-500 font-normal">{hubDetail}</span>
      )}
    </span>
  );
}

interface PulleyPreviewCardsProps {
  drivePulley: ApplicationPulley | undefined;
  tailPulley: ApplicationPulley | undefined;
  trackingLabel: string;
  applicationLineId?: string | null;
  pulleysLoading: boolean;
  onEditDrive: () => void;
  onEditTail: () => void;
}

export default function PulleyPreviewCards({
  drivePulley,
  tailPulley,
  trackingLabel,
  applicationLineId,
  pulleysLoading,
  onEditDrive,
  onEditTail,
}: PulleyPreviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {/* DRIVE PULLEY CARD */}
      <CompactCard configured={!!drivePulley}>
        <CompactCardHeader
          title="Head/Drive"
          badges={drivePulley ? [{ label: 'Configured', variant: 'success' }] : []}
          actions={applicationLineId && (
            <EditButton onClick={onEditDrive} configured={!!drivePulley} />
          )}
        />
        {pulleysLoading ? (
          <p className="text-xs text-gray-500">Loading...</p>
        ) : drivePulley ? (
          <SpecGrid
            items={[
              { label: 'Style', value: drivePulley.style_key },
              { label: 'Track', value: trackingLabel },
              { label: 'Lagging', value: formatLagging(drivePulley) },
              ...(drivePulley.finished_od_in ? [{ label: 'OD', value: `${drivePulley.finished_od_in}"`, highlight: true }] : []),
              ...(drivePulley.hub_connection_type ? [{ label: 'Hub', value: <HubConnectionDisplay pulley={drivePulley} /> }] : []),
              ...(formatBalancing(drivePulley) ? [{ label: 'Balance', value: formatBalancing(drivePulley)! }] : []),
            ]}
            columns={2}
          />
        ) : !applicationLineId ? (
          <p className="text-xs text-amber-600">Save to configure</p>
        ) : (
          <p className="text-xs text-gray-500">Not configured</p>
        )}
      </CompactCard>

      {/* TAIL PULLEY CARD */}
      <CompactCard configured={!!tailPulley}>
        <CompactCardHeader
          title="Tail"
          badges={tailPulley ? [{ label: 'Configured', variant: 'success' }] : []}
          actions={applicationLineId && (
            <EditButton onClick={onEditTail} configured={!!tailPulley} />
          )}
        />
        {pulleysLoading ? (
          <p className="text-xs text-gray-500">Loading...</p>
        ) : tailPulley ? (
          <SpecGrid
            items={[
              { label: 'Style', value: tailPulley.style_key },
              { label: 'Track', value: trackingLabel },
              { label: 'Lagging', value: formatLagging(tailPulley) },
              ...(tailPulley.finished_od_in ? [{ label: 'OD', value: `${tailPulley.finished_od_in}"`, highlight: true }] : []),
              ...(tailPulley.hub_connection_type ? [{ label: 'Hub', value: <HubConnectionDisplay pulley={tailPulley} /> }] : []),
              ...(formatBalancing(tailPulley) ? [{ label: 'Balance', value: formatBalancing(tailPulley)! }] : []),
            ]}
            columns={2}
          />
        ) : !applicationLineId ? (
          <p className="text-xs text-amber-600">Save to configure</p>
        ) : (
          <p className="text-xs text-gray-500">Not configured</p>
        )}
      </CompactCard>
    </div>
  );
}
