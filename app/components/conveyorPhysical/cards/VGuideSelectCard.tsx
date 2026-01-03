/**
 * VGuideSelectCard - V-Guide selection UI (display + select only)
 * Extracted from TabConveyorPhysical.tsx (v1.41 slice 4b)
 *
 * NOTE: The onChange callback is implemented in the parent component.
 * This card does NOT directly call updateInput for the 4 min pulley fields.
 * The parent handles all cross-field setting logic.
 */

'use client';

import VGuideSelect from '../../VGuideSelect';
import { VGuideItem } from '../../../api/v-guides/route';

interface VGuideSelectCardProps {
  /** Whether V-Guide selection should be shown (true when tracking method is V-guided) */
  isVGuided: boolean;
  /** Current V-Guide key selection */
  vGuideKey: string | undefined;
  /** Callback when V-Guide selection changes - parent handles the 4-field update logic */
  onVGuideChange: (key: string | undefined, vguide: VGuideItem | undefined) => void;
}

export default function VGuideSelectCard({
  isVGuided,
  vGuideKey,
  onVGuideChange,
}: VGuideSelectCardProps) {
  // Only render when V-guided tracking is selected
  if (!isVGuided) {
    return null;
  }

  return (
    <div>
      <label htmlFor="v_guide_key" className="label text-xs">V-Guide</label>
      <VGuideSelect
        id="v_guide_key"
        value={vGuideKey}
        onChange={onVGuideChange}
        required
      />
    </div>
  );
}
