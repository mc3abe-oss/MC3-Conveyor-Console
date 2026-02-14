'use client';

import { useState, useEffect, useCallback } from 'react';
import { Note, Spec, ScopeLine, Attachment, ScopeCategory, ScopeInclusion, SpecConfidence } from '../../src/lib/database/quote-types';

type VaultSubTab = 'attachments' | 'notes' | 'specs' | 'scope';

// Draft vault types (local state before first save)
interface DraftNote { id: string; content: string; created_at: string; }
interface DraftSpec { id: string; key: string; value: string; units: string | null; confidence: SpecConfidence; is_current: boolean; created_at: string; }
interface DraftScopeLine { id: string; category: ScopeCategory; text: string; inclusion: ScopeInclusion; position: number; created_at: string; }
interface DraftAttachment { id: string; file_name: string; file_path: string; tag: 'drawing' | 'sketch' | 'email' | 'photo' | 'other'; created_at: string; }

export interface DraftVault {
  notes: DraftNote[];
  specs: DraftSpec[];
  scopeLines: DraftScopeLine[];
  attachments: DraftAttachment[];
}

interface VaultTabProps {
  applicationId: string | null; // null = Draft (local state), set = saved (API state)
  onOpenSaveModal: () => void;
  // Draft vault state (lifted to parent for persistence across tab switches)
  draftVault: DraftVault;
  onDraftVaultChange: (vault: DraftVault) => void;
}

function generateDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function VaultTab({ applicationId, onOpenSaveModal, draftVault, onDraftVaultChange }: VaultTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<VaultSubTab>('notes');

  // Persisted data (loaded from API when applicationId is set)
  const [notes, setNotes] = useState<Note[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [scopeLines, setScopeLines] = useState<ScopeLine[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newNote, setNewNote] = useState('');
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [newSpecUnits, setNewSpecUnits] = useState('');
  const [newSpecConfidence, setNewSpecConfidence] = useState<SpecConfidence>('estimated');
  const [newScopeText, setNewScopeText] = useState('');
  const [newScopeCategory, setNewScopeCategory] = useState<ScopeCategory>('mechanical');
  const [newScopeInclusion, setNewScopeInclusion] = useState<ScopeInclusion>('included');
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentTag, setNewAttachmentTag] = useState<'drawing' | 'sketch' | 'email' | 'photo' | 'other'>('other');

  const [saving, setSaving] = useState(false);

  const isDraft = !applicationId;

  // Load vault data when applicationId changes (only for saved apps)
  const loadVaultData = useCallback(async () => {
    if (!applicationId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications/${applicationId}/vault`);

      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
        setSpecs(data.specs || []);
        setScopeLines(data.scope_lines || []);
        setAttachments(data.attachments || []);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to load vault');
      }
    } catch (err) {
      console.error('Failed to load vault data:', err);
      setError('Failed to load vault data');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (applicationId) {
      void loadVaultData();
    }
  }, [applicationId, loadVaultData]);

  // DRAFT MODE: Add to local state
  // SAVED MODE: Add via API

  // Add Note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    if (isDraft) {
      // Draft mode: add to local state
      const newDraftNote: DraftNote = {
        id: generateDraftId(),
        content: newNote.trim(),
        created_at: new Date().toISOString(),
      };
      onDraftVaultChange({
        ...draftVault,
        notes: [newDraftNote, ...draftVault.notes],
      });
      setNewNote('');
      return;
    }

    // Saved mode: add via API
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add note');
      }

      setNewNote('');
      void loadVaultData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  // Add Spec
  const handleAddSpec = async () => {
    if (!newSpecKey.trim() || !newSpecValue.trim()) return;

    if (isDraft) {
      // Mark previous specs with same key as not current
      const updatedSpecs = draftVault.specs.map(s =>
        s.key === newSpecKey.trim() ? { ...s, is_current: false } : s
      );

      const newDraftSpec: DraftSpec = {
        id: generateDraftId(),
        key: newSpecKey.trim(),
        value: newSpecValue.trim(),
        units: newSpecUnits.trim() || null,
        confidence: newSpecConfidence,
        is_current: true,
        created_at: new Date().toISOString(),
      };
      onDraftVaultChange({
        ...draftVault,
        specs: [newDraftSpec, ...updatedSpecs],
      });
      setNewSpecKey('');
      setNewSpecValue('');
      setNewSpecUnits('');
      setNewSpecConfidence('estimated');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/specs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newSpecKey.trim(),
          value: newSpecValue.trim(),
          units: newSpecUnits.trim() || null,
          confidence: newSpecConfidence,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add spec');
      }

      setNewSpecKey('');
      setNewSpecValue('');
      setNewSpecUnits('');
      setNewSpecConfidence('estimated');
      void loadVaultData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add spec');
    } finally {
      setSaving(false);
    }
  };

  // Add Scope Line
  const handleAddScopeLine = async () => {
    if (!newScopeText.trim()) return;

    if (isDraft) {
      const newDraftScopeLine: DraftScopeLine = {
        id: generateDraftId(),
        text: newScopeText.trim(),
        category: newScopeCategory,
        inclusion: newScopeInclusion,
        position: draftVault.scopeLines.length,
        created_at: new Date().toISOString(),
      };
      onDraftVaultChange({
        ...draftVault,
        scopeLines: [...draftVault.scopeLines, newDraftScopeLine],
      });
      setNewScopeText('');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/scope-lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newScopeText.trim(),
          category: newScopeCategory,
          inclusion: newScopeInclusion,
          position: scopeLines.length,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add scope line');
      }

      setNewScopeText('');
      void loadVaultData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add scope line');
    } finally {
      setSaving(false);
    }
  };

  // Add Attachment (metadata only)
  const handleAddAttachment = async () => {
    if (!newAttachmentName.trim()) return;

    if (isDraft) {
      const newDraftAttachment: DraftAttachment = {
        id: generateDraftId(),
        file_name: newAttachmentName.trim(),
        file_path: `/uploads/draft/${newAttachmentName.trim()}`,
        tag: newAttachmentTag,
        created_at: new Date().toISOString(),
      };
      onDraftVaultChange({
        ...draftVault,
        attachments: [newDraftAttachment, ...draftVault.attachments],
      });
      setNewAttachmentName('');
      setNewAttachmentTag('other');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: newAttachmentName.trim(),
          file_path: `/uploads/applications/${applicationId}/${newAttachmentName.trim()}`,
          tag: newAttachmentTag,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add attachment');
      }

      setNewAttachmentName('');
      setNewAttachmentTag('other');
      void loadVaultData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add attachment');
    } finally {
      setSaving(false);
    }
  };

  // Determine which data to display (draft or persisted)
  const displayNotes = isDraft ? draftVault.notes : notes;
  const displaySpecs = isDraft ? draftVault.specs : specs;
  const displayScopeLines = isDraft ? draftVault.scopeLines : scopeLines;
  const displayAttachments = isDraft ? draftVault.attachments : attachments;

  return (
    <div className="space-y-4">
      {/* Vault Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Vault</h3>
          <p className="text-sm text-gray-500">
            {isDraft ? (
              <>
                <span className="text-amber-600">Draft</span>
                {' '}&mdash; Save your application to persist vault entries
              </>
            ) : (
              'Attached to this Application'
            )}
          </p>
        </div>
        {isDraft && (
          <button
            onClick={onOpenSaveModal}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Save Application
          </button>
        )}
      </div>

      {/* Draft mode indicator */}
      {isDraft && (draftVault.notes.length > 0 || draftVault.specs.length > 0 || draftVault.scopeLines.length > 0 || draftVault.attachments.length > 0) && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
          <strong>Draft mode:</strong> {draftVault.notes.length + draftVault.specs.length + draftVault.scopeLines.length + draftVault.attachments.length} item(s) will be saved when you save this application.
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-x-6">
          {(['notes', 'specs', 'scope', 'attachments'] as VaultSubTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveSubTab(tab)}
              className={`
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeSubTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-1 text-xs text-gray-400">
                ({tab === 'notes' ? displayNotes.length :
                  tab === 'specs' ? displaySpecs.filter(s => s.is_current).length :
                  tab === 'scope' ? displayScopeLines.length :
                  displayAttachments.length})
              </span>
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="card">
          {/* Notes Sub-tab */}
          {activeSubTab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note Form */}
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
                <button
                  onClick={handleAddNote}
                  disabled={saving || !newNote.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors self-end"
                >
                  Add
                </button>
              </div>

              {/* Notes List */}
              {displayNotes.length === 0 ? (
                <p className="text-center py-4 text-gray-500 text-sm">No notes yet</p>
              ) : (
                <div className="space-y-2">
                  {displayNotes.map((note) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(note.created_at).toLocaleString()}
                        {isDraft && <span className="ml-2 text-amber-500">(draft)</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Specs Sub-tab */}
          {activeSubTab === 'specs' && (
            <div className="space-y-4">
              {/* Add Spec Form */}
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newSpecKey}
                  onChange={(e) => setNewSpecKey(e.target.value)}
                  placeholder="Key (e.g., belt_speed)"
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newSpecValue}
                  onChange={(e) => setNewSpecValue(e.target.value)}
                  placeholder="Value"
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newSpecUnits}
                  onChange={(e) => setNewSpecUnits(e.target.value)}
                  placeholder="Units"
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newSpecConfidence}
                  onChange={(e) => setNewSpecConfidence(e.target.value as SpecConfidence)}
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="estimated">Estimated</option>
                  <option value="confirmed">Confirmed</option>
                </select>
                <button
                  onClick={handleAddSpec}
                  disabled={saving || !newSpecKey.trim() || !newSpecValue.trim()}
                  className="col-span-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Specs List */}
              {displaySpecs.filter(s => s.is_current).length === 0 ? (
                <p className="text-center py-4 text-gray-500 text-sm">No specs yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {displaySpecs.filter(s => s.is_current).map((spec) => (
                        <tr key={spec.id}>
                          <td className="px-4 py-2 text-sm font-mono text-gray-900">{spec.key}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{spec.value}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{spec.units || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              spec.confidence === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {spec.confidence}
                            </span>
                            {isDraft && <span className="ml-2 text-xs text-amber-500">(draft)</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Scope Sub-tab */}
          {activeSubTab === 'scope' && (
            <div className="space-y-4">
              {/* Add Scope Form */}
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newScopeText}
                  onChange={(e) => setNewScopeText(e.target.value)}
                  placeholder="Scope line text..."
                  className="col-span-5 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newScopeCategory}
                  onChange={(e) => setNewScopeCategory(e.target.value as ScopeCategory)}
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mechanical">Mechanical</option>
                  <option value="electrical">Electrical</option>
                  <option value="controls">Controls</option>
                  <option value="installation">Installation</option>
                  <option value="documentation">Documentation</option>
                  <option value="training">Training</option>
                  <option value="warranty">Warranty</option>
                  <option value="exclusion">Exclusion</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={newScopeInclusion}
                  onChange={(e) => setNewScopeInclusion(e.target.value as ScopeInclusion)}
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="included">Included</option>
                  <option value="excluded">Excluded</option>
                </select>
                <button
                  onClick={handleAddScopeLine}
                  disabled={saving || !newScopeText.trim()}
                  className="col-span-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Scope List */}
              {displayScopeLines.length === 0 ? (
                <p className="text-center py-4 text-gray-500 text-sm">No scope lines yet</p>
              ) : (
                <div className="space-y-2">
                  {[...displayScopeLines].sort((a, b) => a.position - b.position).map((line) => (
                    <div key={line.id} className={`p-3 rounded-lg flex items-start gap-3 ${
                      line.inclusion === 'excluded' ? 'bg-red-50' : 'bg-gray-50'
                    }`}>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        line.inclusion === 'excluded' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {line.inclusion}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                        {line.category}
                      </span>
                      <p className="flex-1 text-sm text-gray-800">{line.text}</p>
                      {isDraft && <span className="text-xs text-amber-500">(draft)</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attachments Sub-tab */}
          {activeSubTab === 'attachments' && (
            <div className="space-y-4">
              {/* Add Attachment Form (metadata only for Phase 1) */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-700 text-sm mb-4">
                Phase 1: File upload not yet implemented. Adding attachment metadata only.
              </div>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newAttachmentName}
                  onChange={(e) => setNewAttachmentName(e.target.value)}
                  placeholder="File name..."
                  className="col-span-6 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newAttachmentTag}
                  onChange={(e) => setNewAttachmentTag(e.target.value as 'drawing' | 'sketch' | 'email' | 'photo' | 'other')}
                  className="col-span-4 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="drawing">Drawing</option>
                  <option value="sketch">Sketch</option>
                  <option value="email">Email</option>
                  <option value="photo">Photo</option>
                  <option value="other">Other</option>
                </select>
                <button
                  onClick={handleAddAttachment}
                  disabled={saving || !newAttachmentName.trim()}
                  className="col-span-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Attachments List */}
              {displayAttachments.length === 0 ? (
                <p className="text-center py-4 text-gray-500 text-sm">No attachments yet</p>
              ) : (
                <div className="space-y-2">
                  {displayAttachments.map((att) => (
                    <div key={att.id} className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{att.file_name}</p>
                        <p className="text-xs text-gray-400">{att.tag}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        att.tag === 'drawing' ? 'bg-blue-100 text-blue-700' :
                        att.tag === 'email' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {att.tag}
                      </span>
                      {isDraft && <span className="text-xs text-amber-500">(draft)</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
