import { useEffect, useCallback, useRef } from 'react';
import type { EditorState, DraftState } from '../types';

const DRAFT_PREFIX = 'iggy-draft-';

export function useDraftPersistence(
  specialId: string | undefined,
  state: EditorState,
  saveForm: { title: string; description: string; type: 'drink' | 'food' | 'seasonal'; price: string }
) {
  const draftKey = `${DRAFT_PREFIX}${specialId || 'new'}`;
  const lastSavedRef = useRef<string>('');

  // Auto-save every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const draft: DraftState = {
        editorState: state,
        saveForm,
        updatedAt: new Date().toISOString(),
        specialId: specialId ? Number(specialId) : undefined,
      };
      const serialized = JSON.stringify(draft);

      // Only save if changed
      if (serialized !== lastSavedRef.current) {
        localStorage.setItem(draftKey, serialized);
        lastSavedRef.current = serialized;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [state, saveForm, draftKey, specialId]);

  // Save on beforeunload
  useEffect(() => {
    const handler = () => {
      const draft: DraftState = {
        editorState: state,
        saveForm,
        updatedAt: new Date().toISOString(),
        specialId: specialId ? Number(specialId) : undefined,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state, saveForm, draftKey, specialId]);

  const loadDraft = useCallback((): DraftState | null => {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DraftState;
    } catch {
      return null;
    }
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    lastSavedRef.current = '';
  }, [draftKey]);

  const hasDraft = useCallback((): boolean => {
    return localStorage.getItem(draftKey) !== null;
  }, [draftKey]);

  return { loadDraft, clearDraft, hasDraft };
}

// Utility to get all drafts (for Specials page)
export function getAllDrafts(): DraftState[] {
  const drafts: DraftState[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(DRAFT_PREFIX)) {
      try {
        const draft = JSON.parse(localStorage.getItem(key)!) as DraftState;
        drafts.push(draft);
      } catch {
        // ignore invalid drafts
      }
    }
  }
  return drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function clearDraftByKey(specialId?: number) {
  const key = `${DRAFT_PREFIX}${specialId || 'new'}`;
  localStorage.removeItem(key);
}
