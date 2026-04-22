import { DishModal } from "@/components/restaurants/dish-modal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { type MenuSection as MenuSectionType } from "@/types";

interface MenuSectionProps {
  restaurantId: string;
  section: MenuSectionType;
}

export function MenuSection({ restaurantId, section }: MenuSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-3xl text-foreground">{section.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
      </div>
      <div className="grid gap-4">
        {section.items.map((item) => (
          <Card key={item.id} className="bg-white/85">
            <CardHeader className="space-y-3 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{item.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <p className="shrink-0 text-lg font-semibold">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.popular ? <Badge>Popular</Badge> : null}
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {item.calories ? `${item.calories} calories` : "Customization available"}
              </div>
              <DishModal restaurantId={restaurantId} item={item} />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
