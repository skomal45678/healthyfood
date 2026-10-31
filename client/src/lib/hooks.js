import { useMemo } from 'react';
import { useApp } from '../store/useApp';
import { calcTargets } from './nutrition';

const EMPTY = [];

// Selectors must return stable references with zustand v5, so derived values
// are memoised here instead of being computed inside the selector.
export function useTargets() {
  const profile = useApp((s) => s.profile);
  return useMemo(() => calcTargets(profile), [profile]);
}

export function useAllergies() {
  return useApp((s) => s.profile?.allergies) || EMPTY;
}

export function useDayLogs(date) {
  return useApp((s) => s.logs[date]) || EMPTY;
}
