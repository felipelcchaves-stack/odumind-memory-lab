import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Full-page message used by the hub login screens (loading or error). */
export function HubSsoLoading({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

export function HubSsoMessage({
  title,
  message,
  actions,
}: {
  title: string;
  message: string;
  actions: { label: string; onClick?: () => void; href?: string; primary?: boolean }[];
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{message}</p>
          <div className="flex flex-wrap gap-2">
            {actions.map((action): ReactNode =>
              action.href ? (
                <Button key={action.label} asChild variant={action.primary ? "default" : "outline"}>
                  <a href={action.href}>{action.label}</a>
                </Button>
              ) : (
                <Button key={action.label} variant={action.primary ? "default" : "outline"} onClick={action.onClick}>
                  {action.label}
                </Button>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
