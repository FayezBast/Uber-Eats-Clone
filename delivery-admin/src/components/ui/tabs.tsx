import { cn } from "@/lib/utils";

export interface TabOption<T extends string> {
  label: string;
  value: T;
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<TabOption<T>>;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-wrap rounded-xl border border-border bg-muted/70 p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            option.value === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
