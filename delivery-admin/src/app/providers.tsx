import { type PropsWithChildren, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { useUiStore } from "@/store/ui-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false
    }
  }
});

function ThemeSync() {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const resolvedTheme =
      theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;

    root.classList.toggle("dark", resolvedTheme === "dark");
  }, [theme]);

  return null;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
