import { Badge } from "@/components/ui/badge";
import {
  courierStatusTone,
  menuSyncStatusTone,
  orderStatusTone,
  paymentStatusTone,
  refundStatusTone,
  settlementStatusTone,
  storeStatusTone,
  ticketPriorityTone,
  ticketStatusTone,
  genericStatusTone
} from "@/constants/status";
import { toTitleCase } from "@/lib/utils";

type SupportedStatus =
  | keyof typeof orderStatusTone
  | keyof typeof paymentStatusTone
  | keyof typeof courierStatusTone
  | keyof typeof storeStatusTone
  | keyof typeof ticketStatusTone
  | keyof typeof ticketPriorityTone
  | keyof typeof settlementStatusTone
  | keyof typeof refundStatusTone
  | keyof typeof menuSyncStatusTone
  | string;

function resolveTone(status: SupportedStatus) {
  return (
    orderStatusTone[status as keyof typeof orderStatusTone] ??
    paymentStatusTone[status as keyof typeof paymentStatusTone] ??
    courierStatusTone[status as keyof typeof courierStatusTone] ??
    storeStatusTone[status as keyof typeof storeStatusTone] ??
    ticketStatusTone[status as keyof typeof ticketStatusTone] ??
    ticketPriorityTone[status as keyof typeof ticketPriorityTone] ??
    settlementStatusTone[status as keyof typeof settlementStatusTone] ??
    refundStatusTone[status as keyof typeof refundStatusTone] ??
    menuSyncStatusTone[status as keyof typeof menuSyncStatusTone] ??
    genericStatusTone[status] ??
    "default"
  );
}

export function StatusBadge({ status, label }: { status: SupportedStatus; label?: string }) {
  return <Badge variant={resolveTone(status)}>{label ?? toTitleCase(status)}</Badge>;
}
