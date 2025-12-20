import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExercisePreviewCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  benefit: string;
  benefitColor?: string;
  previewComponent: React.ReactNode;
}

export function ExercisePreviewCard({
  icon: Icon,
  title,
  description,
  benefit,
  benefitColor = "bg-primary/10 text-primary",
  previewComponent,
}: ExercisePreviewCardProps) {
  return (
    <Card className="h-full border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 group overflow-hidden">
      <CardContent className="p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">{title}</h3>
          </div>
          <Badge variant="outline" className={cn("text-xs font-medium", benefitColor)}>
            {benefit}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
          {description}
        </p>

        {/* Preview mockup */}
        <div className="flex-1 rounded-lg border border-border/50 bg-muted/30 p-4 overflow-hidden">
          {previewComponent}
        </div>
      </CardContent>
    </Card>
  );
}
