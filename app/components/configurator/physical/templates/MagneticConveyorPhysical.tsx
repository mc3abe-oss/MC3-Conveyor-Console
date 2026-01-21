/**
 * Magnetic Conveyor Physical Tab Template
 *
 * Simplified physical conveyor definition for Magnetic Conveyor product.
 * Currently only includes Conveyor Type & Geometry section.
 */

'use client';

import { useState } from 'react';
import MagneticGeometrySection from '../../magnetic/MagneticGeometrySection';
import {
  MagneticConveyorInputs,
  DEFAULT_MAGNETIC_INPUTS,
} from '../../../../../src/models/magnetic_conveyor_v1/schema';
import { SliderbedInputs, SliderbedOutputs } from '../../../../../src/models/sliderbed_v1/schema';
import { SectionCounts, SectionKey, Issue } from '../../../useConfigureIssues';

export interface MagneticConveyorPhysicalProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
  sectionCounts: Record<SectionKey, SectionCounts>;
  getTrackingIssue: () => Issue | undefined;
  getMinPulleyIssues: () => Issue[];
  applicationLineId?: string | null;
  getMergedIssuesForSection?: (sectionKey: SectionKey) => Issue[];
  outputs?: SliderbedOutputs | null;
  showToast?: (message: string) => void;
}

export default function MagneticConveyorPhysical({
  // Props kept for interface compatibility, but not used yet
  // Will be wired when magnetic conveyor state is lifted to parent
}: MagneticConveyorPhysicalProps) {
  // Local state for magnetic-specific geometry inputs
  // TODO: Lift this state to parent calculator app when wiring to persistence
  const [magneticInputs, setMagneticInputs] = useState<MagneticConveyorInputs>(DEFAULT_MAGNETIC_INPUTS);

  const updateMagneticInput = <K extends keyof MagneticConveyorInputs>(
    field: K,
    value: MagneticConveyorInputs[K]
  ) => {
    setMagneticInputs((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-full">
      <MagneticGeometrySection
        inputs={magneticInputs}
        updateInput={updateMagneticInput}
      />
    </div>
  );
}
