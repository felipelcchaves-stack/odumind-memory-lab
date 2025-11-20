import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ReferralWelcomeModal } from "@/components/ReferralWelcomeModal";
import ChangelogModal from "@/components/ChangelogModal";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { useChangelog } from "@/hooks/useChangelog";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import OduLibrary from "./pages/OduLibrary";
import OduStudy from "./pages/OduStudy";
import StudySession from "./pages/StudySession";
import MemoryPalace from "./pages/MemoryPalace";
import Tecnicas from "./pages/Tecnicas";
import Admin from "./pages/Admin";
import Colaborador from "./pages/Colaborador";
import Analytics from "./pages/Analytics";
import UserDetail from "./pages/UserDetail";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import Success from "./pages/Success";
import NotFound from "./pages/NotFound";
import Changelog from "./pages/Changelog";
import Referral from "./pages/Referral";
import Familia from "./pages/Familia";
import FamiliaAceitar from "./pages/FamiliaAceitar";

const queryClient = new QueryClient();

function SessionValidator() {
  useSessionValidation();
  return null;
}

function AppContent() {
  const { showModal, latestChangelog, markAsViewed } = useChangelog();
  
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ReferralWelcomeModal />
        <ChangelogModal 
          open={showModal}
          onClose={markAsViewed}
          changelog={latestChangelog}
          onMarkAsViewed={markAsViewed}
        />
        <SessionValidator />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/odu" element={<OduLibrary />} />
          <Route path="/odu/:id" element={<OduStudy />} />
          <Route path="/study" element={<StudySession />} />
          <Route path="/memory-palace" element={<MemoryPalace />} />
          <Route path="/tecnicas" element={<Tecnicas />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/colaborador" element={<Colaborador />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/user/:userId" element={<UserDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/success" element={<Success />} />
          <Route path="/novidades" element={<Changelog />} />
          <Route path="/indicar" element={<Referral />} />
          <Route path="/familia" element={<Familia />} />
          <Route path="/familia/aceitar/:token" element={<FamiliaAceitar />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
