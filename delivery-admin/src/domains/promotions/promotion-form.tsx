import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PromoCampaign, PromotionFormValues, Store } from "@/types";

const promotionSchema = z
  .object({
    name: z.string().min(3, "Campaign name is required"),
    code: z.string().min(3, "Promo code is required"),
    promoType: z.enum(["percentage", "flat"]),
    percentageOff: z.coerce.number().optional(),
    flatAmountOff: z.coerce.number().optional(),
    firstOrderOnly: z.enum(["true", "false"]),
    city: z.string().optional(),
    storeIds: z.string().min(1, "Choose at least one store"),
    startAt: z.string().min(1, "Start date is required"),
    endAt: z.string().min(1, "End date is required"),
    budgetCap: z.coerce.number().min(1, "Budget cap is required"),
    abuseNotes: z.string().optional()
  })
  .superRefine((values, context) => {
    if (values.promoType === "percentage" && (!values.percentageOff || values.percentageOff <= 0)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a percentage discount", path: ["percentageOff"] });
    }

    if (values.promoType === "flat" && (!values.flatAmountOff || values.flatAmountOff <= 0)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a flat discount amount", path: ["flatAmountOff"] });
    }
  });

type PromotionSchemaValues = z.infer<typeof promotionSchema>;

function mapCampaignToValues(campaign?: PromoCampaign): PromotionSchemaValues {
  return {
    name: campaign?.name ?? "",
    code: campaign?.code ?? "",
    promoType: campaign?.promoType ?? "percentage",
    percentageOff: campaign?.percentageOff ?? undefined,
    flatAmountOff: campaign?.flatAmountOff ?? undefined,
    firstOrderOnly: String(campaign?.firstOrderOnly ?? false) as "true" | "false",
    city: campaign?.city ?? "",
    storeIds: campaign?.storeIds.join(",") ?? "",
    startAt: campaign?.startAt ? campaign.startAt.slice(0, 16) : "",
    endAt: campaign?.endAt ? campaign.endAt.slice(0, 16) : "",
    budgetCap: campaign?.budgetCap ?? 1000,
    abuseNotes: campaign?.abuseNotes.join("\n") ?? ""
  };
}

export function PromotionForm({
  stores,
  campaign,
  loading,
  onSubmit
}: {
  stores: Store[];
  campaign?: PromoCampaign;
  loading?: boolean;
  onSubmit: (values: PromotionFormValues) => Promise<void> | void;
}) {
  const form = useForm<PromotionSchemaValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: mapCampaignToValues(campaign)
  });

  const promoType = form.watch("promoType");
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = form;

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        onSubmit({
          name: values.name,
          code: values.code.toUpperCase(),
          promoType: values.promoType,
          percentageOff: values.promoType === "percentage" ? values.percentageOff : undefined,
          flatAmountOff: values.promoType === "flat" ? values.flatAmountOff : undefined,
          firstOrderOnly: values.firstOrderOnly === "true",
          city: values.city || undefined,
          storeIds: values.storeIds.split(",").map((value) => value.trim()).filter(Boolean),
          startAt: values.startAt,
          endAt: values.endAt,
          budgetCap: values.budgetCap,
          abuseNotes: values.abuseNotes ?? ""
        })
      )}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Campaign name" error={errors.name?.message}>
          <Input placeholder="Weekend recovery" {...register("name")} />
        </Field>
        <Field label="Promo code" error={errors.code?.message}>
          <Input placeholder="SAVE10" {...register("code")} />
        </Field>
        <Field label="Discount type" error={errors.promoType?.message}>
          <Select {...register("promoType")}>
            <option value="percentage">Percentage off</option>
            <option value="flat">Flat discount</option>
          </Select>
        </Field>
        {promoType === "percentage" ? (
          <Field label="Percentage off" error={errors.percentageOff?.message}>
            <Input min={1} placeholder="20" type="number" {...register("percentageOff")} />
          </Field>
        ) : (
          <Field label="Flat amount off" error={errors.flatAmountOff?.message}>
            <Input min={1} placeholder="10" type="number" {...register("flatAmountOff")} />
          </Field>
        )}
        <Field label="Audience" error={errors.firstOrderOnly?.message}>
          <Select {...register("firstOrderOnly")}>
            <option value="false">All eligible customers</option>
            <option value="true">First order only</option>
          </Select>
        </Field>
        <Field label="City" error={errors.city?.message}>
          <Input list="promotion-cities" placeholder="Optional city scope" {...register("city")} />
          <datalist id="promotion-cities">
            {["Beirut", "Dubai", "Riyadh"].map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </Field>
        <Field label="Store IDs" error={errors.storeIds?.message}>
          <Input placeholder={stores.map((store) => store.id).slice(0, 3).join(", ")} {...register("storeIds")} />
        </Field>
        <Field label="Budget cap" error={errors.budgetCap?.message}>
          <Input min={1} type="number" {...register("budgetCap")} />
        </Field>
        <Field label="Start" error={errors.startAt?.message}>
          <Input type="datetime-local" {...register("startAt")} />
        </Field>
        <Field label="End" error={errors.endAt?.message}>
          <Input type="datetime-local" {...register("endAt")} />
        </Field>
      </div>

      <Field label="Abuse prevention notes" error={errors.abuseNotes?.message}>
        <Textarea placeholder="One note per line for policy, velocity limits, and abuse controls." {...register("abuseNotes")} />
      </Field>

      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Saving..." : campaign ? "Update campaign" : "Create campaign"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
