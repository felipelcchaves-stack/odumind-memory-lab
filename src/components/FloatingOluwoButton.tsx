import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { OluwoExplanationModal } from "./OluwoExplanationModal";
import { useLandingTracking } from "@/hooks/useLandingTracking";

export const FloatingOluwoButton = () => {
  const [showModal, setShowModal] = useState(false);
  const { trackCTAClick } = useLandingTracking();

  const handleOpenModal = () => {
    trackCTAClick('oluwo_explanation_open', 'floating_button');
    setShowModal(true);
  };

  return (
    <>
      <Button
        className="fixed bottom-6 left-6 rounded-full shadow-lg z-50 
                   hover:scale-110 transition-all gap-2 px-5 py-6
                   animate-pulse hover:animate-none"
        variant="hero"
        onClick={handleOpenModal}
      >
        <Play className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Oluwo Explica</span>
      </Button>

      <OluwoExplanationModal 
        open={showModal} 
        onOpenChange={setShowModal} 
      />
    </>
  );
};
