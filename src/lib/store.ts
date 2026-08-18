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
  /** Command palette open state */
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  /** User Authentication state */
  isAuthenticated: boolean
  user: { name: string; email: string; role: string; avatar?: string } | null
  login: (credentials: { username: string; role?: string }) => void
  logout: () => void
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
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  isAuthenticated: false, // Default unauthenticated until user logs in
  user: null,
  login: (credentials) =>
    set({
      isAuthenticated: true,
      user: {
        name: credentials.username || 'Admin Distributor',
        email: `${(credentials.username || 'admin').toLowerCase().replace(/\s+/g, '')}@anugerahmakmur.co.id`,
        role: credentials.role || 'Administrator Distributor',
      },
    }),
  logout: () => set({ isAuthenticated: false, user: null }),
}))