import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import LearningPath from "@/components/LearningPath";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { ComparisonSection } from "@/components/ComparisonSection";
import { FAQSection } from "@/components/FAQSection";
import { UrgencySection } from "@/components/UrgencySection";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import { DynamicSocialProof } from "@/components/DynamicSocialProof";
import { TopReferrers } from "@/components/TopReferrers";
const Index = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  return <div className="min-h-screen">
      <Header />
      <ExitIntentPopup />
      <main>
        <Hero />
        
        
        <TopReferrers />
        <div id="features">
          <Features />
        </div>
        
        <div id="learning">
          
        </div>
        <div id="faq">
          
        </div>
        <div id="pricing">
          <Pricing />
        </div>
        
      </main>
      <Footer />
    </div>;
};
export default Index;