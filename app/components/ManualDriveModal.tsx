'use client';

import { useState, useEffect, useRef } from 'react';

interface ManualDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredOutputRpm: number | null;
  requiredOutputTorqueLbIn: number | null;
  // Current values (for editing)
  motorHp: number | null;
  outputRpm: number | null;
  outputTorqueLbIn: number | null;
  serviceFactor: number | null;
  // Callbacks
  onSave: (values: {
    motorHp: number | null;
    outputRpm: number;
    outputTorqueLbIn: number;
    serviceFactor: number;
  }) => void;
}

export default function ManualDriveModal({
  isOpen,
  onClose,
  requiredOutputRpm,
  requiredOutputTorqueLbIn,
  motorHp,
  outputRpm,
  outputTorqueLbIn,
  serviceFactor,
  onSave,
}: ManualDriveModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Local form state
  const [formMotorHp, setFormMotorHp] = useState<string>('');
  const [formOutputRpm, setFormOutputRpm] = useState<string>('');
  const [formTorque, setFormTorque] = useState<string>('');
  const [formSf, setFormSf] = useState<string>('');

  // Initialize form when modal opens or values change
  useEffect(() => {
    if (isOpen) {
      setFormMotorHp(motorHp?.toString() ?? '');
      setFormOutputRpm(outputRpm?.toString() ?? '');
      setFormTorque(outputTorqueLbIn?.toString() ?? '');
      setFormSf(serviceFactor?.toString() ?? '');
    }
  }, [isOpen, motorHp, outputRpm, outputTorqueLbIn, serviceFactor]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on backdrop click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Validation
  const parsedRpm = parseFloat(formOutputRpm);
  const parsedTorque = parseFloat(formTorque);
  const parsedSf = parseFloat(formSf);
  const parsedHp = formMotorHp ? parseFloat(formMotorHp) : null;

  const isRpmValid = !isNaN(parsedRpm) && parsedRpm > 0;
  const isTorqueValid = !isNaN(parsedTorque) && parsedTorque > 0;
  const isSfValid = !isNaN(parsedSf) && parsedSf > 0;
  const isHpValid = parsedHp === null || (!isNaN(parsedHp) && parsedHp > 0);

  const canSave = isRpmValid && isTorqueValid && isSfValid && isHpValid;

  // Warnings (non-blocking)
  const showLowSfWarning = isSfValid && parsedSf < 1.0;
  const showTorqueMismatch = isTorqueValid && requiredOutputTorqueLbIn != null &&
    Math.abs(parsedTorque - requiredOutputTorqueLbIn) / requiredOutputTorqueLbIn > 0.2;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      motorHp: parsedHp,
      outputRpm: parsedRpm,
      outputTorqueLbIn: parsedTorque,
      serviceFactor: parsedSf,
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
          className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manual Drive</h3>
                <p className="text-sm text-gray-500">Enter drive specifications manually</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            {/* Requirements summary */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Requirements
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 block">Required RPM</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {requiredOutputRpm?.toFixed(1) ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Required Torque</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {requiredOutputTorqueLbIn ? Math.round(requiredOutputTorqueLbIn) : '—'} <span className="text-xs font-normal text-gray-500">lb-in</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 2x2 input grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="manual_hp" className="block text-sm font-medium text-gray-700 mb-1">
                  Motor HP
                </label>
                <input
                  type="number"
                  id="manual_hp"
                  value={formMotorHp}
                  onChange={(e) => setFormMotorHp(e.target.value)}
                  placeholder="e.g., 1.5"
                  step="0.25"
                  min="0.1"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label htmlFor="manual_rpm" className="block text-sm font-medium text-gray-700 mb-1">
                  Output RPM <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="manual_rpm"
                  value={formOutputRpm}
                  onChange={(e) => setFormOutputRpm(e.target.value)}
                  placeholder="e.g., 56"
                  step="0.1"
                  min="0.1"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label htmlFor="manual_torque" className="block text-sm font-medium text-gray-700 mb-1">
                  Torque (lb-in) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="manual_torque"
                  value={formTorque}
                  onChange={(e) => setFormTorque(e.target.value)}
                  placeholder="e.g., 1500"
                  step="10"
                  min="0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label htmlFor="manual_sf" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Factor <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="manual_sf"
                  value={formSf}
                  onChange={(e) => setFormSf(e.target.value)}
                  placeholder="e.g., 1.5"
                  step="0.1"
                  min="0.1"
                  max="5.0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Warnings (non-blocking) */}
            {showLowSfWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Low Service Factor</p>
                    <p className="text-xs text-amber-700">SF &lt; 1.0 may result in reduced motor life under load.</p>
                  </div>
                </div>
              </div>
            )}

            {showTorqueMismatch && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Torque Mismatch</p>
                    <p className="text-xs text-amber-700">Entered torque differs significantly from calculated requirement.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
