/**
 * DriveArrangementModal - Modal for editing Drive Arrangement settings
 *
 * Contains Drive Arrangement fields + Motor RPM:
 * - Direction Mode
 * - Start/Stop Application (+ Cycle Time)
 * - Drive Location
 * - Gearmotor Mounting Style (+ Sprocket Config)
 * - Gearmotor Mounting Orientation
 * - Drive Hand
 * - Motor RPM
 *
 * Uses draft state pattern:
 * - Cancel = discard all changes
 * - Apply = batch commit changes and close
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  SliderbedInputs,
  DriveLocation,
  GearmotorOrientation,
  GearmotorMountingStyle,
  DriveHand,
  DirectionMode,
} from '../../src/models/sliderbed_v1/schema';

// Fields managed by this modal
type DraftFields = Pick<
  SliderbedInputs,
  | 'direction_mode'
  | 'start_stop_application'
  | 'cycle_time_seconds'
  | 'drive_location'
  | 'gearmotor_mounting_style'
  | 'gm_sprocket_teeth'
  | 'drive_shaft_sprocket_teeth'
  | 'gearmotor_orientation'
  | 'drive_hand'
  | 'motor_rpm'
>;

interface DriveArrangementModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function DriveArrangementModal({
  isOpen,
  onClose,
  inputs,
  updateInput,
}: DriveArrangementModalProps) {
  const [draft, setDraft] = useState<DraftFields>({} as DraftFields);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize draft when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraft({
        direction_mode: inputs.direction_mode,
        start_stop_application: inputs.start_stop_application,
        cycle_time_seconds: inputs.cycle_time_seconds,
        drive_location: inputs.drive_location,
        gearmotor_mounting_style: inputs.gearmotor_mounting_style,
        gm_sprocket_teeth: inputs.gm_sprocket_teeth,
        drive_shaft_sprocket_teeth: inputs.drive_shaft_sprocket_teeth,
        gearmotor_orientation: inputs.gearmotor_orientation,
        drive_hand: inputs.drive_hand,
        motor_rpm: inputs.motor_rpm,
      });
    }
  }, [isOpen, inputs]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateDraft = <K extends keyof DraftFields>(field: K, value: DraftFields[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    onClose();
  };

  const handleApply = () => {
    const fieldsToUpdate: Array<[keyof SliderbedInputs, any]> = [];

    (Object.keys(draft) as Array<keyof DraftFields>).forEach((field) => {
      const draftValue = draft[field];
      const currentValue = inputs[field];

      if (draftValue !== currentValue) {
        fieldsToUpdate.push([field, draftValue]);
      }
    });

    fieldsToUpdate.forEach(([field, value]) => {
      updateInput(field, value);
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="relative w-full max-w-lg bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Edit Drive Arrangement</h2>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Direction Mode */}
            <div>
              <label className="label">Direction Mode</label>
              <div className="flex gap-4">
                {Object.values(DirectionMode).map((option) => (
                  <label key={option} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="modal_direction_mode"
                      checked={draft.direction_mode === option}
                      onChange={() => updateDraft('direction_mode', option)}
                      className="mr-2"
                    />
                    {option}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Reversing affects pulleys, V-guides, and controls.</p>
            </div>

            {/* Start/Stop Application */}
            <div>
              <label className="label">Start/Stop Application</label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="modal_start_stop"
                    checked={draft.start_stop_application === false}
                    onChange={() => updateDraft('start_stop_application', false)}
                    className="mr-2"
                  />
                  No
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="modal_start_stop"
                    checked={draft.start_stop_application === true}
                    onChange={() => updateDraft('start_stop_application', true)}
                    className="mr-2"
                  />
                  Yes
                </label>
              </div>
            </div>

            {/* Cycle time - only show if start/stop = true */}
            {draft.start_stop_application && (
              <div>
                <label htmlFor="modal_cycle_time" className="label">
                  Cycle Time (seconds)
                </label>
                <input
                  type="number"
                  id="modal_cycle_time"
                  className="input"
                  value={draft.cycle_time_seconds || ''}
                  onChange={(e) =>
                    updateDraft('cycle_time_seconds', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.1"
                  min="0"
                />
              </div>
            )}

            {/* Drive Location */}
            <div>
              <label htmlFor="modal_drive_location" className="label">
                Drive Location
              </label>
              <select
                id="modal_drive_location"
                className="input"
                value={draft.drive_location}
                onChange={(e) => updateDraft('drive_location', e.target.value as DriveLocation)}
              >
                {Object.values(DriveLocation).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Gearmotor Mounting Style */}
            <div>
              <label className="label">Gearmotor Mounting Style</label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="modal_gearmotor_mounting"
                    checked={(draft.gearmotor_mounting_style ?? GearmotorMountingStyle.ShaftMounted) === GearmotorMountingStyle.ShaftMounted}
                    onChange={() => updateDraft('gearmotor_mounting_style', GearmotorMountingStyle.ShaftMounted)}
                    className="mr-2"
                  />
                  Shaft Mounted
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="modal_gearmotor_mounting"
                    checked={draft.gearmotor_mounting_style === GearmotorMountingStyle.BottomMount}
                    onChange={() => {
                      updateDraft('gearmotor_mounting_style', GearmotorMountingStyle.BottomMount);
                      if (draft.gm_sprocket_teeth === undefined) {
                        updateDraft('gm_sprocket_teeth', 18);
                      }
                      if (draft.drive_shaft_sprocket_teeth === undefined) {
                        updateDraft('drive_shaft_sprocket_teeth', 24);
                      }
                    }}
                    className="mr-2"
                  />
                  Bottom Mount (Chain Drive)
                </label>
              </div>
            </div>

            {/* Sprocket Configuration - only shown for bottom mount */}
            {draft.gearmotor_mounting_style === GearmotorMountingStyle.BottomMount && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Sprocket Configuration</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="modal_gm_sprocket" className="label">
                      Gearmotor Sprocket (Driver)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        id="modal_gm_sprocket"
                        className="input"
                        value={draft.gm_sprocket_teeth ?? 18}
                        onChange={(e) => updateDraft('gm_sprocket_teeth', parseInt(e.target.value) || 18)}
                        step="1"
                        min="1"
                      />
                      <span className="text-sm text-gray-500">teeth</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="modal_drive_sprocket" className="label">
                      Drive Shaft Sprocket (Driven)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        id="modal_drive_sprocket"
                        className="input"
                        value={draft.drive_shaft_sprocket_teeth ?? 24}
                        onChange={(e) => updateDraft('drive_shaft_sprocket_teeth', parseInt(e.target.value) || 24)}
                        step="1"
                        min="1"
                      />
                      <span className="text-sm text-gray-500">teeth</span>
                    </div>
                  </div>
                </div>

                {/* Chain ratio preview */}
                <div className="bg-white border border-gray-200 rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Chain Ratio:</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {(() => {
                        const gmTeeth = draft.gm_sprocket_teeth ?? 18;
                        const driveTeeth = draft.drive_shaft_sprocket_teeth ?? 24;
                        if (gmTeeth > 0 && driveTeeth > 0) {
                          const ratio = driveTeeth / gmTeeth;
                          return `${ratio.toFixed(3)} (${driveTeeth}T / ${gmTeeth}T)`;
                        }
                        return '—';
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Gearmotor Orientation */}
            <div>
              <label htmlFor="modal_gearmotor_orientation" className="label">
                Gearmotor Mounting Orientation
              </label>
              <select
                id="modal_gearmotor_orientation"
                className="input"
                value={draft.gearmotor_orientation}
                onChange={(e) => updateDraft('gearmotor_orientation', e.target.value as GearmotorOrientation)}
              >
                {Object.values(GearmotorOrientation).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Drive Hand */}
            <div>
              <label className="label">Drive Hand</label>
              <div className="flex gap-4">
                {Object.values(DriveHand).map((option) => (
                  <label key={option} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="modal_drive_hand"
                      checked={draft.drive_hand === option}
                      onChange={() => updateDraft('drive_hand', option)}
                      className="mr-2"
                    />
                    {option}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Reference: when facing the discharge end.</p>
            </div>

            {/* Motor RPM */}
            <div>
              <label htmlFor="modal_motor_rpm" className="label">
                Motor RPM
              </label>
              <input
                type="number"
                id="modal_motor_rpm"
                className="input"
                value={draft.motor_rpm ?? 1750}
                onChange={(e) => updateDraft('motor_rpm', parseFloat(e.target.value) || 1750)}
                step="1"
                min="800"
                max="3600"
              />
              <p className="text-xs text-gray-500 mt-1">Default: 1750 RPM. Range: 800–3600 RPM</p>
            </div>
          </div>

          {/* Footer - Actions */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
