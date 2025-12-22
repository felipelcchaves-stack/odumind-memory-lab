import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import ABTestHero from "@/components/landing/ABTestHero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import { TopReferrers } from "@/components/TopReferrers";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { TechniqueShowcase } from "@/components/TechniqueShowcase";
import { PromoBanner } from "@/components/PromoBanner";
import { UrgencySection } from "@/components/UrgencySection";
import { useScrollTracking } from "@/hooks/useScrollTracking";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useSectionTracking } from "@/hooks/useSectionTracking";
import { useUtmTracking } from "@/hooks/useUtmTracking";
import { useCustomScripts } from "@/hooks/useCustomScripts";
import { useTechniqueScreenshotsSettings } from "@/hooks/useTechniqueScreenshotsSettings";

// Define sections to track visibility
const TRACKED_SECTIONS = [
  { id: 'hero', name: 'Hero' },
  { id: 'features', name: 'Features' },
  { id: 'techniques', name: 'Techniques' },
  { id: 'testimonials', name: 'Testimonials' },
  { id: 'pricing', name: 'Pricing' },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showTechniques } = useTechniqueScreenshotsSettings();

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

  // Suporte a navegação por hash (ex: /#features, /#pricing)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <PromoBanner />
      <Header />
      <ExitIntentPopup />
      <main>
        <ABTestHero />
        <TopReferrers />
        <div id="features">
          <Features />
        </div>
        {showTechniques && (
          <div id="techniques">
            <TechniqueShowcase />
          </div>
        )}
        <div id="testimonials">
          <TestimonialsSection />
        </div>
        <UrgencySection />
        <div id="pricing">
          <Pricing />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
