import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import { TopReferrers } from "@/components/TopReferrers";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import { useScrollTracking } from "@/hooks/useScrollTracking";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useSectionTracking } from "@/hooks/useSectionTracking";
import { useUtmTracking } from "@/hooks/useUtmTracking";
import { useCustomScripts } from "@/hooks/useCustomScripts";

// Define sections to track visibility
const TRACKED_SECTIONS = [
  { id: 'hero', name: 'Hero' },
  { id: 'features', name: 'Features' },
  { id: 'pricing', name: 'Pricing' },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Initialize tracking hooks
  useScrollTracking();
  useTimeTracking();
  useSectionTracking(TRACKED_SECTIONS);
  useUtmTracking(); // Capture UTM parameters
  useCustomScripts(); // Load tracking scripts ONLY on landing page

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen">
      <Header />
      <ExitIntentPopup />
      <main>
        <Hero />
        <TopReferrers />
        <div id="features">
          <Features />
        </div>
        <div id="pricing">
          <Pricing />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
