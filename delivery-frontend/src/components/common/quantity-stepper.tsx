"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface QuantityStepperProps {
  quantity: number;
  onChange: (value: number) => void;
}

export function QuantityStepper({ quantity, onChange }: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-border bg-white px-2 py-1 shadow-sm">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => onChange(Math.max(1, quantity - 1))}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="min-w-6 text-center text-sm font-semibold">{quantity}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => onChange(quantity + 1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
