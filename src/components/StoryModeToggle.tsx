import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";

interface StoryModeToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const StoryModeToggle = ({ enabled, onChange }: StoryModeToggleProps) => {
  return (
    <div className="flex items-center gap-2">
      <Switch 
        id="story-mode" 
        checked={enabled} 
        onCheckedChange={onChange}
      />
      <Label htmlFor="story-mode" className="flex items-center gap-2 cursor-pointer">
        <BookOpen className="h-4 w-4" />
        Modo História (oculta números)
      </Label>
    </div>
  );
};
