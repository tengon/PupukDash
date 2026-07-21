import { create } from 'zustand'

interface AppState {
  activeTab: string
  setActiveTab: (tab: string) => void
  refreshKey: number
  triggerRefresh: () => void
  /** A signal set by the page-level keyboard shortcut handler and consumed by views. */
  shortcutAction: string | null
  triggerShortcut: (action: string) => void
  clearShortcut: () => void
  /** Pre-fill farmer ID when creating a repeat order */
  prefillFarmerId: string | null
  setPrefillFarmerId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  shortcutAction: null,
  triggerShortcut: (action) => set({ shortcutAction: action }),
  clearShortcut: () => set({ shortcutAction: null }),
  prefillFarmerId: null,
  setPrefillFarmerId: (id) => set({ prefillFarmerId: id }),
}))