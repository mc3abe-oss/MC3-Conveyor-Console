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

interface PulleyPreviewCardsProps {
  drivePulley: ApplicationPulley | undefined;
  tailPulley: ApplicationPulley | undefined;
  trackingLabel: string;
  applicationLineId?: string | null;
  pulleysLoading: boolean;
  onEditClick: () => void;
}

export default function PulleyPreviewCards({
  drivePulley,
  tailPulley,
  trackingLabel,
  applicationLineId,
  pulleysLoading,
  onEditClick,
}: PulleyPreviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {/* DRIVE PULLEY CARD */}
      <CompactCard configured={!!drivePulley}>
        <CompactCardHeader
          title="Head/Drive"
          badges={drivePulley ? [{ label: 'Configured', variant: 'success' }] : []}
          actions={applicationLineId && (
            <EditButton onClick={onEditClick} configured={!!drivePulley} />
          )}
        />
        {pulleysLoading ? (
          <p className="text-xs text-gray-500">Loading...</p>
        ) : drivePulley ? (
          <SpecGrid
            items={[
              { label: 'Style', value: drivePulley.style_key },
              { label: 'Track', value: trackingLabel },
              { label: 'Lagging', value: drivePulley.lagging_type === 'NONE' ? 'None' : `${drivePulley.lagging_type}` },
              ...(drivePulley.finished_od_in ? [{ label: 'OD', value: `${drivePulley.finished_od_in}"`, highlight: true }] : []),
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
            <EditButton onClick={onEditClick} configured={!!tailPulley} />
          )}
        />
        {pulleysLoading ? (
          <p className="text-xs text-gray-500">Loading...</p>
        ) : tailPulley ? (
          <SpecGrid
            items={[
              { label: 'Style', value: tailPulley.style_key },
              { label: 'Track', value: trackingLabel },
              { label: 'Lagging', value: tailPulley.lagging_type === 'NONE' ? 'None' : `${tailPulley.lagging_type}` },
              ...(tailPulley.finished_od_in ? [{ label: 'OD', value: `${tailPulley.finished_od_in}"`, highlight: true }] : []),
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
