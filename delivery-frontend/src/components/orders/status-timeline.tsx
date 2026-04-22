import { CheckCircle2, Circle } from "lucide-react";

import { formatOrderTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/types";

interface StatusTimelineProps {
  events: TimelineEvent[];
}

export function StatusTimeline({ events }: StatusTimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            {event.complete ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            {index < events.length - 1 ? <div className="mt-2 h-full w-px bg-border" /> : null}
          </div>
          <div className="pb-4">
            <p className={cn("font-medium", !event.complete && "text-muted-foreground")}>
              {event.label}
            </p>
            <p className="text-xs text-muted-foreground">{formatOrderTime(event.timestamp)}</p>
            {event.note ? <p className="mt-1 text-sm text-muted-foreground">{event.note}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
