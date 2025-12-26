'use client';

import { useState } from 'react';

interface SaveRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; recipe_type: 'golden' | 'reference'; notes: string }) => Promise<void>;
  isSaving: boolean;
}

export default function SaveRecipeModal({ isOpen, onClose, onSave, isSaving }: SaveRecipeModalProps) {
  const [name, setName] = useState('');
  const [recipeType, setRecipeType] = useState<'golden' | 'reference'>('reference');
  const [notes, setNotes] = useState('');
  const [showGoldenConfirm, setShowGoldenConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // If golden selected but not confirmed, show confirmation
    if (recipeType === 'golden' && !showGoldenConfirm) {
      setShowGoldenConfirm(true);
      return;
    }

    try {
      await onSave({ name: name.trim(), recipe_type: recipeType, notes: notes.trim() });
      // Reset form on success
      setName('');
      setRecipeType('reference');
      setNotes('');
      setShowGoldenConfirm(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    }
  };

  const handleClose = () => {
    setName('');
    setRecipeType('reference');
    setNotes('');
    setShowGoldenConfirm(false);
    setError(null);
    onClose();
  };

  const handleTypeChange = (type: 'golden' | 'reference') => {
    setRecipeType(type);
    if (type === 'reference') {
      setShowGoldenConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Save as Recipe</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="recipe-name" className="block text-sm font-medium text-gray-700 mb-1">
                Recipe Name <span className="text-red-500">*</span>
              </label>
              <input
                id="recipe-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Standard 24in conveyor at 60 FPM"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                autoFocus
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipe Type</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="recipe-type"
                    value="reference"
                    checked={recipeType === 'reference'}
                    onChange={() => handleTypeChange('reference')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Reference</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Track drift over time. Does not block CI.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="recipe-type"
                    value="golden"
                    checked={recipeType === 'golden'}
                    onChange={() => handleTypeChange('golden')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Golden</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Known-good test case. Can block CI when locked.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Golden Confirmation */}
            {showGoldenConfirm && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Confirm Golden Recipe:</strong> Golden recipes define expected outputs and can block CI when locked. Are you sure?
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="recipe-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                id="recipe-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why is this case important? What does it test?"
                rows={2}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-gray-400"
              >
                {isSaving ? 'Saving...' : showGoldenConfirm ? 'Confirm & Save' : 'Save Recipe'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
