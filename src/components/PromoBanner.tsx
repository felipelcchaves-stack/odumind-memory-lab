import { X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBannerSettings } from "@/hooks/useBannerSettings";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export const PromoBanner = () => {
  const { settings, shouldShow, dismiss, loading } = useBannerSettings();
  const navigate = useNavigate();

  if (loading || !shouldShow) return null;

  const handleClick = () => {
    if (settings.link) {
      if (settings.link.startsWith("http")) {
        window.open(settings.link, "_blank");
      } else {
        navigate(settings.link);
      }
    }
  };

  // Get background color class or style
  const getBgStyle = () => {
    const color = settings.bgColor;
    if (color.startsWith("#")) {
      return { backgroundColor: color };
    }
    // For semantic colors like 'primary', 'secondary', 'destructive'
    return {};
  };

  const getBgClass = () => {
    const color = settings.bgColor;
    if (color.startsWith("#")) {
      return "";
    }
    // Map semantic colors to Tailwind classes
    const colorMap: Record<string, string> = {
      primary: "bg-primary",
      secondary: "bg-secondary",
      destructive: "bg-destructive",
      accent: "bg-accent",
      muted: "bg-muted",
    };
    return colorMap[color] || "bg-primary";
  };

  const getTextClass = () => {
    const color = settings.textColor;
    if (color.startsWith("#")) {
      return "";
    }
    const colorMap: Record<string, string> = {
      "primary-foreground": "text-primary-foreground",
      "secondary-foreground": "text-secondary-foreground",
      "destructive-foreground": "text-destructive-foreground",
      foreground: "text-foreground",
      white: "text-white",
    };
    return colorMap[color] || "text-primary-foreground";
  };

  return (
    <div
      className={cn(
        "relative w-full py-2.5 px-4 text-center",
        getBgClass(),
        getTextClass()
      )}
      style={getBgStyle()}
    >
      <div className="container mx-auto flex items-center justify-center gap-4">
        <span className="text-sm md:text-base font-medium">
          {settings.text}
        </span>
        
        {settings.link && settings.linkText && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "font-semibold underline underline-offset-2 hover:no-underline p-0 h-auto",
              getTextClass()
            )}
            onClick={handleClick}
          >
            {settings.linkText}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      {settings.dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-white/20",
            getTextClass()
          )}
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
