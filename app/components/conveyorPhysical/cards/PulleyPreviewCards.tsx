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
import { getHubConnectionOption } from '../../../../src/models/sliderbed_v1/pciHubConnections';

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
              ...(getHubConnectionLabel(drivePulley.hub_connection_type) ? [{ label: 'Hub', value: getHubConnectionLabel(drivePulley.hub_connection_type)! }] : []),
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
              ...(getHubConnectionLabel(tailPulley.hub_connection_type) ? [{ label: 'Hub', value: getHubConnectionLabel(tailPulley.hub_connection_type)! }] : []),
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
