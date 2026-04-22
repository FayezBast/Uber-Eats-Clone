"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddressInputProps {
  defaultValue?: string;
}

export function AddressInput({ defaultValue = "214 Cedar Row, Brooklyn" }: AddressInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      className="section-shell flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:p-4"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(`/restaurants?address=${encodeURIComponent(value)}`);
      }}
    >
      <div className="flex-1">
        <p className="mb-2 hidden text-[11px] font-semibold uppercase tracking-[0.24em] text-primary sm:block">
          Choose your drop-off
        </p>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-14 border-white/70 bg-white/88 pl-10"
            placeholder="Enter your delivery address"
            aria-label="Delivery address"
          />
        </div>
      </div>
      <Button type="submit" className="h-14 rounded-[22px] px-6 sm:px-7">
        <Search className="h-4 w-4" />
        Find meals
      </Button>
    </form>
  );
}
