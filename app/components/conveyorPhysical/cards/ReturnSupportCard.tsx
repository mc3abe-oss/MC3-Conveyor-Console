/**
 * ReturnSupportCard.tsx
 *
 * Compact summary card for Return Support configuration.
 * Displays frame style, snub/gravity roller settings.
 *
 * Extracted from TabConveyorPhysical.tsx (v1.41) for UI organization.
 * NO LOGIC CHANGES - pure relocation of JSX and derived display values.
 */

'use client';

import {
  SliderbedInputs,
  ReturnFrameStyle,
  ReturnSnubMode,
  RETURN_FRAME_STYLE_LABELS,
} from '../../../../src/models/sliderbed_v1/schema';
import {
  computeSnubsEnabled,
  computeReturnSpan,
  computeGravityRollerCenters,
} from '../../ReturnSupportModal';
import {
  InlineSpecRow,
  CompactCardHeader,
  CompactCard,
  EditButton,
} from '../../CompactCardLayouts';

interface ReturnSupportCardProps {
  inputs: SliderbedInputs;
  onEditClick: () => void;
}

/**
 * Return Support Summary Card
 *
 * Displays:
 * - Frame style (Standard/Low Profile/No Return)
 * - Snubs enabled (Yes/No with warning if cleats+snubs)
 * - Gravity roller count and centers
 * - Roller diameters
 */
export default function ReturnSupportCard({ inputs, onEditClick }: ReturnSupportCardProps) {
  // Derive display values from inputs
  const frameStyle = inputs.return_frame_style ?? ReturnFrameStyle.Standard;
  const snubMode = inputs.return_snub_mode ?? ReturnSnubMode.Auto;
  const endOffsetIn = inputs.return_end_offset_in ?? 24;
  const snubsEnabled = computeSnubsEnabled(frameStyle, snubMode);
  const conveyorLength = inputs.conveyor_length_cc_in ?? 120;
  const returnSpan = computeReturnSpan(conveyorLength, snubsEnabled, endOffsetIn);
  const rollerCount =
    inputs.return_gravity_roller_count ?? Math.max(Math.floor(returnSpan / 60) + 1, 2);
  const gravityCenters = computeGravityRollerCenters(returnSpan, rollerCount);
  const gravityDia = inputs.return_gravity_roller_diameter_in ?? 1.9;
  const snubDia = inputs.return_snub_roller_diameter_in ?? 2.5;
  const frameStyleLabel =
    RETURN_FRAME_STYLE_LABELS[frameStyle as ReturnFrameStyle] ?? frameStyle;

  // v1.37: Cleats + snubs warning indicator
  const cleatsEnabledForReturn =
    inputs.cleats_enabled === true || inputs.cleats_mode === 'cleated';
  const showCleatsSnubsWarning = cleatsEnabledForReturn && snubsEnabled;

  return (
    <CompactCard configured>
      <CompactCardHeader
        title={
          <span className="flex items-center gap-2">
            Return Rollers
            {showCleatsSnubsWarning && (
              <span title="Snub rollers with cleats - verify clearance">
                <svg
                  className="w-4 h-4 text-amber-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </span>
        }
        badges={[{ label: 'Configured', variant: 'success' }]}
        actions={<EditButton onClick={onEditClick} configured label="Edit" />}
      />
      <div className="space-y-1">
        <InlineSpecRow
          items={[
            { label: 'Frame', value: frameStyleLabel },
            { label: 'Snubs', value: snubsEnabled ? 'Yes' : 'No', highlight: snubsEnabled },
            {
              label: 'Gravity',
              value: `${rollerCount} @ ${gravityCenters?.toFixed(1) ?? '—'}"`,
            },
          ]}
        />
        <InlineSpecRow
          items={[
            { label: 'Gravity Dia', value: `${gravityDia}"` },
            ...(snubsEnabled ? [{ label: 'Snub Dia', value: `${snubDia}"` }] : []),
          ]}
        />
      </div>
    </CompactCard>
  );
}
