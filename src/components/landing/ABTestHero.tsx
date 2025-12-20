import { useABTest } from "@/hooks/useABTest";
import HeroVariantA from "./HeroVariantA";
import HeroVariantB from "./HeroVariantB";
import HeroVariantC from "./HeroVariantC";
import { Skeleton } from "@/components/ui/skeleton";

interface ABTestHeroProps {
  testName?: string;
}

/**
 * Wrapper component that renders the appropriate Hero variant based on A/B test assignment
 */
const ABTestHero = ({ testName = 'hero_v1' }: ABTestHeroProps) => {
  const { variant, variantLetter, isLoading, isEnabled, trackCTAClick } = useABTest(testName);

  // Loading state
  if (isLoading) {
    return (
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-8 w-2/3 mx-auto" />
            <Skeleton className="h-12 w-48 mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  // If no A/B test is running or no variant is assigned, show default (Variant A)
  if (!isEnabled && !variant) {
    return <HeroVariantA />;
  }

  // Render the appropriate variant
  const handleCTAClick = () => {
    trackCTAClick();
  };

  switch (variantLetter) {
    case 'A':
      return (
        <HeroVariantA
          headline={variant?.headline}
          subheadline={variant?.subheadline}
          ctaText={variant?.cta_text}
          onCTAClick={handleCTAClick}
        />
      );
    case 'B':
      return (
        <HeroVariantB
          headline={variant?.headline}
          subheadline={variant?.subheadline}
          ctaText={variant?.cta_text}
          onCTAClick={handleCTAClick}
        />
      );
    case 'C':
      return (
        <HeroVariantC
          headline={variant?.headline}
          subheadline={variant?.subheadline}
          ctaText={variant?.cta_text}
          onCTAClick={handleCTAClick}
        />
      );
    default:
      return <HeroVariantA onCTAClick={handleCTAClick} />;
  }
};

export default ABTestHero;
