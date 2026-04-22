import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ImageTheme } from "@/types";

const themeStyles: Record<ImageTheme, { shell: string; orb: string; plate: string }> = {
  saffron: {
    shell: "from-amber-100 via-orange-50 to-rose-50",
    orb: "bg-orange-200/70",
    plate: "bg-white/80"
  },
  ember: {
    shell: "from-stone-900 via-orange-900/80 to-amber-400/60",
    orb: "bg-orange-300/40",
    plate: "bg-stone-100/85"
  },
  mint: {
    shell: "from-emerald-50 via-lime-100/70 to-teal-100/70",
    orb: "bg-emerald-200/60",
    plate: "bg-white/80"
  },
  coast: {
    shell: "from-cyan-100 via-sky-50 to-indigo-100",
    orb: "bg-sky-200/60",
    plate: "bg-white/75"
  },
  berry: {
    shell: "from-rose-100 via-fuchsia-50 to-amber-50",
    orb: "bg-pink-200/60",
    plate: "bg-white/80"
  },
  night: {
    shell: "from-slate-950 via-slate-800 to-indigo-600/80",
    orb: "bg-cyan-300/30",
    plate: "bg-slate-50/90"
  }
};

interface MockImageProps {
  title: string;
  subtitle?: string;
  theme: ImageTheme;
  className?: string;
  badgeLabel?: string | null;
}

export function MockImage({
  title,
  subtitle,
  theme,
  className,
  badgeLabel = "House art"
}: MockImageProps) {
  const style = themeStyles[theme];

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[26px] bg-gradient-to-br p-5",
        style.shell,
        className
      )}
    >
      <div className={cn("absolute -right-8 top-4 h-28 w-28 rounded-full blur-2xl", style.orb)} />
      <div className="absolute inset-x-5 bottom-4 top-8">
        <div
          className={cn(
            "absolute bottom-0 left-1/2 h-[68%] w-[72%] -translate-x-1/2 rounded-[42px] shadow-2xl",
            style.plate
          )}
        />
        <div className="absolute left-[18%] top-[18%] h-24 w-24 rounded-full bg-white/55 blur-xl" />
        <div className="absolute right-[20%] top-[28%] h-16 w-16 rounded-full bg-white/50 blur-lg" />
      </div>
      <div className="relative grid h-full grid-rows-[auto_1fr_auto] gap-4">
        {badgeLabel ? (
          <div className="inline-flex w-fit whitespace-nowrap items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-medium uppercase leading-none tracking-[0.18em] text-foreground/70">
            <Sparkles className="h-3.5 w-3.5" />
            {badgeLabel}
          </div>
        ) : (
          <div />
        )}
        <div />
        <div className="max-w-[78%] space-y-1 self-end">
          <p className="line-clamp-2 font-display text-2xl leading-tight text-foreground">{title}</p>
          {subtitle ? (
            <p className="line-clamp-2 max-w-xs text-sm leading-5 text-foreground/70">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
