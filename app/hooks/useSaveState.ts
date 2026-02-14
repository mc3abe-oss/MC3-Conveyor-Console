/**
 * useSaveState - Centralized save state management hook
 *
 * Implements the save-state contract (Issue 1):
 * - States: saved | dirty | saving | error
 * - Autosave with 1000ms debounce
 * - Prevents parallel/in-flight saves
 * - Queues follow-up save if edits occur during saving
 * - Anchors dirty detection to persisted snapshot
 *
 * @module app/hooks/useSaveState
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { payloadsEqual } from '../../src/lib/payload-compare';

/** Save state values */
export type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

/** Persisted snapshot for dirty tracking */
export interface PersistedSnapshot {
  applicationId: string | null;
  revision: string | null;
  payload: unknown;
}

/** Options for the useSaveState hook */
export interface UseSaveStateOptions {
  /** Autosave debounce in milliseconds (default: 1000) */
  autosaveDebounceMs?: number;
  /** Whether autosave is enabled (default: true) */
  autosaveEnabled?: boolean;
  /** Callback to perform the actual save */
  onSave: () => Promise<SaveResult>;
  /** Callback when save succeeds */
  onSaveSuccess?: (result: SaveResult) => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
}

/** Result from a save operation */
export interface SaveResult {
  applicationId: string;
  revision: string;
  status: 'created' | 'updated' | 'no_change';
  message?: string;
}

/** Return type for the useSaveState hook */
export interface UseSaveStateReturn {
  /** Current save state */
  saveState: SaveState;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Whether save button should be enabled */
  canSave: boolean;
  /** Last save error message */
  lastError: string | null;
  /** Trigger a manual save */
  triggerSave: () => Promise<void>;
  /** Update the current payload (triggers dirty check) */
  setCurrentPayload: (payload: unknown) => void;
  /** Set the persisted snapshot (after successful load or save) */
  setPersistedSnapshot: (snapshot: PersistedSnapshot) => void;
  /** Clear the persisted snapshot (for new/cleared applications) */
  clearPersistedSnapshot: () => void;
  /** Cancel any pending autosave */
  cancelAutosave: () => void;
}

const AUTOSAVE_DEBOUNCE_MS = 1000;

/**
 * Hook for managing save state with autosave support
 */
export function useSaveState(options: UseSaveStateOptions): UseSaveStateReturn {
  const {
    autosaveDebounceMs = AUTOSAVE_DEBOUNCE_MS,
    autosaveEnabled = true,
    onSave,
    onSaveSuccess,
    onSaveError,
  } = options;

  // Core state
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [lastError, setLastError] = useState<string | null>(null);

  // Payload tracking
  const [currentPayload, setCurrentPayloadState] = useState<unknown>(null);
  const [persistedSnapshot, setPersistedSnapshotState] = useState<PersistedSnapshot | null>(null);

  // Refs for managing async operations
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const currentPayloadRef = useRef<unknown>(null);

  // Compute isDirty from payload comparison
  const isDirty = useMemo(() => {
    if (!persistedSnapshot || !currentPayload) {
      return false;
    }
    return !payloadsEqual(currentPayload, persistedSnapshot.payload);
  }, [currentPayload, persistedSnapshot]);

  // Update saveState when isDirty changes (but not during saving)
  useEffect(() => {
    if (isSavingRef.current) return;
    if (saveState === 'error') return; // Preserve error state until next save attempt

    if (isDirty) {
      setSaveState('dirty');
    } else {
      setSaveState('saved');
    }
  }, [isDirty, saveState]);

  // Can save when dirty or in error state (not when saving or already saved)
  const canSave = saveState === 'dirty' || saveState === 'error';
  const isSaving = saveState === 'saving';

  // Cancel any pending autosave
  const cancelAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  // Perform the actual save
  const performSave = useCallback(async () => {
    // Prevent parallel saves
    if (isSavingRef.current) {
      // Queue a follow-up save
      pendingSaveRef.current = true;
      return;
    }

    // Don't save if not dirty (unless error state - retry)
    if (saveState !== 'dirty' && saveState !== 'error') {
      return;
    }

    isSavingRef.current = true;
    pendingSaveRef.current = false;
    setSaveState('saving');
    setLastError(null);

    try {
      const result = await onSave();

      // Save succeeded - update state
      setSaveState('saved');
      isSavingRef.current = false;

      // Call success callback
      if (onSaveSuccess) {
        onSaveSuccess(result);
      }

      // Check if there's a queued save (edits during saving)
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        // Re-check if still dirty after snapshot update
        const stillDirty = persistedSnapshot
          ? !payloadsEqual(currentPayloadRef.current, persistedSnapshot.payload)
          : false;
        if (stillDirty) {
          // Schedule another save
          setTimeout(() => performSave(), 0);
        }
      }
    } catch (error) {
      // Save failed - transition to error state, preserve dirty
      setSaveState('error');
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      setLastError(errorMessage);
      isSavingRef.current = false;

      if (onSaveError) {
        onSaveError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  }, [saveState, onSave, onSaveSuccess, onSaveError, persistedSnapshot]);

  // Update current payload and trigger dirty check
  const setCurrentPayload = useCallback((payload: unknown) => {
    setCurrentPayloadState(payload);
    currentPayloadRef.current = payload;
  }, []);

  // Set persisted snapshot (after load or successful save)
  const setPersistedSnapshot = useCallback((snapshot: PersistedSnapshot) => {
    // Deep clone to ensure immutable snapshot
    const clonedSnapshot: PersistedSnapshot = {
      applicationId: snapshot.applicationId,
      revision: snapshot.revision,
      payload: snapshot.payload ? JSON.parse(JSON.stringify(snapshot.payload)) : null,
    };
    setPersistedSnapshotState(clonedSnapshot);
    // Reset error state on new snapshot
    setLastError(null);
    if (saveState === 'error') {
      setSaveState('saved');
    }
  }, [saveState]);

  // Clear persisted snapshot (for new/cleared applications)
  const clearPersistedSnapshot = useCallback(() => {
    setPersistedSnapshotState(null);
    setSaveState('saved');
    setLastError(null);
    cancelAutosave();
  }, [cancelAutosave]);

  // Trigger manual save
  const triggerSave = useCallback(async () => {
    cancelAutosave();
    await performSave();
  }, [cancelAutosave, performSave]);

  // Autosave effect: schedule save when dirty
  useEffect(() => {
    if (!autosaveEnabled) return;
    if (!isDirty) return;
    if (isSavingRef.current) return;
    if (!persistedSnapshot?.applicationId) return; // Only autosave existing applications

    // Cancel existing timer
    cancelAutosave();

    // Schedule new autosave
    autosaveTimerRef.current = setTimeout(() => {
      void performSave();
    }, autosaveDebounceMs);

    return () => {
      cancelAutosave();
    };
  }, [isDirty, autosaveEnabled, autosaveDebounceMs, persistedSnapshot, cancelAutosave, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAutosave();
    };
  }, [cancelAutosave]);

  return {
    saveState,
    isSaving,
    isDirty,
    canSave,
    lastError,
    triggerSave,
    setCurrentPayload,
    setPersistedSnapshot,
    clearPersistedSnapshot,
    cancelAutosave,
  };
}

export default useSaveState;
