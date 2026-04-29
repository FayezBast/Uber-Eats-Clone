import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Courier } from "@/types";

const assignCourierSchema = z.object({
  courierId: z.string().min(1, "Select a courier"),
  note: z.string().max(240).optional()
});

export type AssignCourierFormValues = z.infer<typeof assignCourierSchema>;

export function AssignCourierForm({
  couriers,
  loading,
  onSubmit
}: {
  couriers: Courier[];
  loading?: boolean;
  onSubmit: (values: AssignCourierFormValues) => Promise<void> | void;
}) {
  const form = useForm<AssignCourierFormValues>({
    resolver: zodResolver(assignCourierSchema),
    defaultValues: {
      courierId: "",
      note: ""
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = form;

  return (
    <form className="space-y-4" onSubmit={handleSubmit((values) => onSubmit(values))}>
      <div className="space-y-2">
        <label className="text-sm font-medium">Courier</label>
        <Select {...register("courierId")}>
          <option value="">Select courier</option>
          {couriers.map((courier) => (
            <option key={courier.id} value={courier.id}>
              {courier.name} · {courier.zone} · {courier.status}
            </option>
          ))}
        </Select>
        {errors.courierId ? <p className="text-xs text-destructive">{errors.courierId.message}</p> : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Dispatch note</label>
        <Textarea placeholder="Optional note for the courier or support team." {...register("note")} />
        {errors.note ? <p className="text-xs text-destructive">{errors.note.message}</p> : null}
      </div>

      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Saving..." : "Assign courier"}
      </Button>
    </form>
  );
}
