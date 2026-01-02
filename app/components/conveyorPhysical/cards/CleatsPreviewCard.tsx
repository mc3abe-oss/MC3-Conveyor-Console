/**
 * Cleats Preview Card
 *
 * Read-only display of cleat configuration summary.
 * Opens CleatsConfigModal via onEditClick callback.
 *
 * Extracted from TabConveyorPhysical.tsx (v1.41)
 */

'use client';

import { SliderbedInputs } from '../../../../src/models/sliderbed_v1/schema';
import { CLEAT_PATTERN_LABELS } from '../../../../src/lib/cleat-catalog';
import {
  CompactCard,
  CompactCardHeader,
  InlineSpecRow,
  EditButton,
} from '../../CompactCardLayouts';

interface CleatsPreviewCardProps {
  inputs: SliderbedInputs;
  /** Computed min pulley diameter from cleat catalog lookup */
  cleatsMinPulleyDiaIn: number | null;
  /** Callback to open the cleats configuration modal */
  onEditClick: () => void;
}

export default function CleatsPreviewCard({
  inputs,
  cleatsMinPulleyDiaIn,
  onEditClick,
}: CleatsPreviewCardProps) {
  const isConfigured = inputs.cleats_mode === 'cleated';

  return (
    <CompactCard configured={isConfigured}>
      <CompactCardHeader
        title="Belt Cleats"
        badges={[
          ...(isConfigured && inputs.cleats_notched ? [{ label: 'Notched', variant: 'warning' as const }] : []),
          ...(isConfigured ? [{ label: 'Configured', variant: 'success' as const }] : []),
        ]}
        actions={
          <EditButton
            onClick={onEditClick}
            configured={isConfigured}
          />
        }
      />
      {isConfigured ? (
        <InlineSpecRow
          items={[
            ...(inputs.cleat_profile ? [{ label: 'Profile', value: inputs.cleat_profile }] : []),
            ...(inputs.cleat_size ? [{ label: 'Size', value: inputs.cleat_size }] : []),
            ...(inputs.cleat_spacing_in ? [{ label: 'Centers', value: `${inputs.cleat_spacing_in}"`, highlight: true }] : []),
            ...(inputs.cleat_pattern ? [{ label: 'Pattern', value: CLEAT_PATTERN_LABELS[inputs.cleat_pattern as keyof typeof CLEAT_PATTERN_LABELS] ?? inputs.cleat_pattern }] : []),
            ...(cleatsMinPulleyDiaIn !== null ? [{ label: 'Min Pulley', value: `${cleatsMinPulleyDiaIn}"`, className: 'text-amber-600' }] : []),
          ]}
        />
      ) : (
        <p className="text-xs text-gray-500">Not configured</p>
      )}
    </CompactCard>
  );
}
