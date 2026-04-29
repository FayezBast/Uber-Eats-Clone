import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ThemeMode, WorkspaceScope } from "@/types";

interface UiState {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  theme: ThemeMode;
  workspace: WorkspaceScope;
  setSidebarOpen: (value: boolean) => void;
  setMobileSidebarOpen: (value: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (value: ThemeMode) => void;
  setWorkspace: (value: WorkspaceScope) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      mobileSidebarOpen: false,
      theme: "system",
      workspace: "global",
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setWorkspace: (workspace) => set({ workspace })
    }),
    {
      name: "delivery-admin-ui"
    }
  )
);
