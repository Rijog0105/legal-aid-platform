import { create } from 'zustand';

export type SyncState = 'idle' | 'syncing' | 'success' | 'failed' | 'offline';

interface SyncStoreState {
  syncState: SyncState;
  pendingCount: number;
  failedCount: number;
  lastErrorMessage: string | null;
  
  setSyncState: (state: SyncState) => void;
  setCounts: (pending: number, failed: number) => void;
  setLastErrorMessage: (msg: string | null) => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  syncState: 'idle',
  pendingCount: 0,
  failedCount: 0,
  lastErrorMessage: null,
  
  setSyncState: (syncState) => set({ syncState }),
  setCounts: (pendingCount, failedCount) => set({ pendingCount, failedCount }),
  setLastErrorMessage: (lastErrorMessage) => set({ lastErrorMessage })
}));
