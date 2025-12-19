import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ReferralWelcomeModal } from "@/components/ReferralWelcomeModal";
import ChangelogModal from "@/components/ChangelogModal";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import { ProfileCompletionChecker } from "@/components/ProfileCompletionChecker";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { useChangelog } from "@/hooks/useChangelog";
import { useAnnouncements } from "@/hooks/useAnnouncements";
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
import BibliotecaYoruba from "./pages/BibliotecaYoruba";
import RitualStudy from "./pages/RitualStudy";
import CaminhoIfa from "./pages/CaminhoIfa";
import Caminhos from "./pages/Caminhos";
import Instalar from "./pages/Instalar";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOduPage from "./pages/admin/AdminOduPage";
import AdminRituaisPage from "./pages/admin/AdminRituaisPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminAdvancedAnalytics from "./pages/admin/AdminAdvancedAnalytics";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminToolsPage from "./pages/admin/AdminToolsPage";
import AdminChangelogPage from "./pages/admin/AdminChangelogPage";
import AdminRestorePage from "./pages/admin/AdminRestorePage";
import AdminGuruPage from "./pages/admin/AdminGuruPage";
import AdminFeaturesPage from "./pages/admin/AdminFeaturesPage";
import AdminAnnouncementsPage from "./pages/admin/AdminAnnouncementsPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import AdminCaminhosPage from "./pages/admin/AdminCaminhosPage";

const queryClient = new QueryClient();

function SessionValidator() {
  useSessionValidation();
  return null;
}

function AppContent() {
  const { showModal, latestChangelog, markAsViewed } = useChangelog();
  const { announcement, markAsRead } = useAnnouncements();
  
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ProfileCompletionChecker />
        <ReferralWelcomeModal />
        <ChangelogModal
          open={showModal}
          onClose={markAsViewed}
          changelog={latestChangelog}
          onMarkAsViewed={markAsViewed}
        />
        <AnnouncementModal
          open={!!announcement}
          onClose={markAsRead}
          announcement={announcement}
        />
        <SessionValidator />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/odu" element={<OduLibrary />} />
          <Route path="/odu/:id" element={<OduStudy />} />
          <Route path="/biblioteca-yoruba" element={<BibliotecaYoruba />} />
          <Route path="/ritual/:id" element={<RitualStudy />} />
          <Route path="/caminho-ifa" element={<CaminhoIfa />} />
          <Route path="/caminhos" element={<Caminhos />} />
          <Route path="/instalar" element={<Instalar />} />
          <Route path="/study" element={<StudySession />} />
          <Route path="/memory-palace" element={<MemoryPalace />} />
          <Route path="/tecnicas" element={<Tecnicas />} />
          <Route path="/colaborador" element={<Colaborador />} />
          <Route path="/admin/user/:userId" element={<UserDetail />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Admin routes with sidebar */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="odu" element={<AdminOduPage />} />
            <Route path="caminhos" element={<AdminCaminhosPage />} />
            <Route path="rituais" element={<AdminRituaisPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="advanced-analytics" element={<AdminAdvancedAnalytics />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="tools" element={<AdminToolsPage />} />
            <Route path="changelog" element={<AdminChangelogPage />} />
            <Route path="guru" element={<AdminGuruPage />} />
            <Route path="features" element={<AdminFeaturesPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="restore" element={<AdminRestorePage />} />
          </Route>
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
