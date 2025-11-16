import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import LearningPath from "@/components/LearningPath";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <div id="features">
          <Features />
        </div>
        <div id="learning">
          <LearningPath />
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
