import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">404</p>
      <h1 className="font-display text-5xl text-foreground">This page drifted off the route.</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you wanted is missing, or the route hasn’t been wired to your backend yet.
      </p>
      <Button asChild>
        <Link href="/restaurants">Back to discovery</Link>
      </Button>
    </div>
  );
}
