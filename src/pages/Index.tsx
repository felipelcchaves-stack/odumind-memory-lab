import { useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { LandingConfigProvider, useLandingConfig } from "@/contexts/LandingConfigContext";
import { useLandingAnalytics } from "@/hooks/useLandingAnalytics";
import { useLazyCustomScripts } from "@/hooks/useLazyCustomScripts";
import { useDelayedClickTracking } from "@/hooks/useDelayedClickTracking";
import { useUtmTracking } from "@/hooks/useUtmTracking";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy loaded components for below-the-fold content
const ABTestHero = lazy(() => import("@/components/landing/ABTestHero"));
const TopReferrers = lazy(() => import("@/components/TopReferrers"));
const Features = lazy(() => import("@/components/Features"));
const TechniqueShowcase = lazy(() => import("@/components/TechniqueShowcase"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));
const UrgencySection = lazy(() => import("@/components/UrgencySection"));
const Pricing = lazy(() => import("@/components/Pricing"));
const Footer = lazy(() => import("@/components/Footer"));
const ExitIntentPopup = lazy(() => import("@/components/ExitIntentPopup").then(m => ({ default: m.ExitIntentPopup })));
const PromoBanner = lazy(() => import("@/components/PromoBanner").then(m => ({ default: m.PromoBanner })));
const FloatingOluwoButton = lazy(() => import("@/components/FloatingOluwoButton").then(m => ({ default: m.FloatingOluwoButton })));

// Section skeleton for loading states
const SectionSkeleton = ({ height = "400px" }: { height?: string }) => (
  <div className="w-full py-16" style={{ minHeight: height }}>
    <div className="container mx-auto px-4">
      <Skeleton className="h-8 w-64 mx-auto mb-8" />
      <div className="grid md:grid-cols-3 gap-6">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  </div>
);

// Define sections to track visibility
const TRACKED_SECTIONS = [
  { id: 'hero', name: 'Hero' },
  { id: 'features', name: 'Features' },
  { id: 'techniques', name: 'Techniques' },
  { id: 'testimonials', name: 'Testimonials' },
  { id: 'pricing', name: 'Pricing' },
];

// Inner component that uses the config context
function IndexContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSettingEnabled, settingsLoaded } = useLandingConfig();
  
  // Show techniques only if enabled
  const showTechniques = settingsLoaded ? isSettingEnabled('technique_screenshots_enabled') : true;

  // Consolidated analytics hook (scroll, time, sections)
  useLandingAnalytics({
    sections: TRACKED_SECTIONS,
    enabled: true,
    delayStart: 1500,
  });

  // Lazy load tracking scripts after 2 seconds
  useLazyCustomScripts({ enabled: true, delayMs: 2000 });

  // Delayed click tracking for heatmap
  useDelayedClickTracking(true, 3000);

  // Capture UTM parameters
  useUtmTracking();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Handle hash navigation
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
      {/* Promo Banner - lazy but prioritized */}
      <Suspense fallback={null}>
        <PromoBanner />
      </Suspense>
      
      {/* Header loads immediately (critical) */}
      <Header />
      
      {/* Exit popup - lazy, no visual fallback needed */}
      <Suspense fallback={null}>
        <ExitIntentPopup />
      </Suspense>
      
      <main>
        {/* Hero - critical, but uses lazy ABTestHero internally */}
        <div id="hero">
          <Suspense fallback={<SectionSkeleton height="600px" />}>
            <ABTestHero />
          </Suspense>
        </div>

        {/* Top Referrers - social proof */}
        <Suspense fallback={null}>
          <TopReferrers />
        </Suspense>

        {/* Features section */}
        <div id="features">
          <Suspense fallback={<SectionSkeleton />}>
            <Features />
          </Suspense>
        </div>

        {/* Techniques section - conditional */}
        {showTechniques && (
          <div id="techniques">
            <Suspense fallback={<SectionSkeleton />}>
              <TechniqueShowcase />
            </Suspense>
          </div>
        )}

        {/* Testimonials section */}
        <div id="testimonials">
          <Suspense fallback={<SectionSkeleton />}>
            <TestimonialsSection />
          </Suspense>
        </div>

        {/* Urgency section */}
        <Suspense fallback={null}>
          <UrgencySection />
        </Suspense>

        {/* Pricing section */}
        <div id="pricing">
          <Suspense fallback={<SectionSkeleton height="500px" />}>
            <Pricing />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <Suspense fallback={<div className="h-64 bg-muted" />}>
        <Footer />
      </Suspense>

      {/* Floating button */}
      <Suspense fallback={null}>
        <FloatingOluwoButton />
      </Suspense>
    </div>
  );
}

// Main component wrapped with provider
const Index = () => {
  return (
    <LandingConfigProvider testName="hero_v1">
      <IndexContent />
    </LandingConfigProvider>
  );
};

export default Index;
