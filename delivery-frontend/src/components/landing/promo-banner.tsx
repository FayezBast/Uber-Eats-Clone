import { ArrowRight } from "lucide-react";

import { MockImage } from "@/components/common/mock-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type PromoBanner } from "@/types";

interface PromoBannerProps {
  promo: PromoBanner;
}

export function PromoBanner({ promo }: PromoBannerProps) {
  return (
    <Card className="overflow-hidden bg-white/80">
      <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
        <CardContent className="relative flex flex-col justify-center gap-5 p-6 md:p-8">
          <div className="inline-flex w-fit items-center rounded-full bg-secondary/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            {promo.eyebrow}
          </div>
          <div className="space-y-3">
            <h3 className="balance-text font-display text-3xl leading-tight text-foreground">
              {promo.title}
            </h3>
            <p className="max-w-lg text-sm leading-6 text-muted-foreground">{promo.subtitle}</p>
          </div>
          <div className="frost-panel w-fit p-1">
            <Button variant="outline" className="w-fit border-transparent bg-white/80">
              {promo.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
        <MockImage
          title={promo.eyebrow}
          subtitle={promo.title}
          theme={promo.imageTheme}
          className="min-h-[260px] rounded-none rounded-b-[28px] md:rounded-b-none md:rounded-r-[28px]"
        />
      </div>
    </Card>
  );
}
