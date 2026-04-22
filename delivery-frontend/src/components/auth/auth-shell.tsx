import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-foreground">Eats</span>
            <span className="text-xs font-medium text-muted-foreground">by Savora</span>
          </Link>
          <Link
            href="/auth/sign-in"
            className="text-sm font-medium text-foreground transition-opacity hover:opacity-70"
          >
            Help
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          ) : null}
          <div className="mt-8">{children}</div>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-7xl px-4 text-xs text-muted-foreground sm:px-6">
          <p>This site is for demo purposes only.</p>
        </div>
      </footer>
    </div>
  );
}
