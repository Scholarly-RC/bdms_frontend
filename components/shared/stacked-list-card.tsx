import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type StackedListCardItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
};

type StackedListCardProps = {
  title: string;
  description: string;
  items: StackedListCardItem[];
};

export function StackedListCard({
  title,
  description,
  items,
}: StackedListCardProps) {
  return (
    <Card className="border-zinc-300/70 bg-white/82 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3"
          >
            <p className="font-medium text-zinc-900">{item.title}</p>
            <p className="text-sm text-zinc-600">{item.subtitle}</p>
            <p className="text-xs text-zinc-500">{item.meta}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
