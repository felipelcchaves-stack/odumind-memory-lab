import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UTMTrackingScript } from "@/components/UTMTrackingScript";
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
import Demonstracao from "./pages/Demonstracao";

// Rotas de admin carregadas sob demanda - o aluno comum nunca visita essas
// páginas, então não precisa baixar esse código no carregamento inicial
// (eram ~20 páginas estáticas no mesmo bundle de 2.1MB que todo mundo baixa).
const AdminLayout = lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOduPage = lazy(() => import("./pages/admin/AdminOduPage"));
const AdminRituaisPage = lazy(() => import("./pages/admin/AdminRituaisPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const AdminAdvancedAnalytics = lazy(() => import("./pages/admin/AdminAdvancedAnalytics"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminToolsPage = lazy(() => import("./pages/admin/AdminToolsPage"));
const AdminChangelogPage = lazy(() => import("./pages/admin/AdminChangelogPage"));
const AdminRestorePage = lazy(() => import("./pages/admin/AdminRestorePage"));
const UserDetail = lazy(() => import("./pages/UserDetail"));
const AdminGuruPage = lazy(() => import("./pages/admin/AdminGuruPage"));
const AdminFeaturesPage = lazy(() => import("./pages/admin/AdminFeaturesPage"));
const AdminAnnouncementsPage = lazy(() => import("./pages/admin/AdminAnnouncementsPage"));
const AdminCouponsPage = lazy(() => import("./pages/admin/AdminCouponsPage"));
const AdminCaminhosPage = lazy(() => import("./pages/admin/AdminCaminhosPage"));
const AdminPlansPage = lazy(() => import("./pages/admin/AdminPlansPage"));
const AdminReviewsPage = lazy(() => import("./pages/admin/AdminReviewsPage"));
const AdminFamilyGroupsPage = lazy(() => import("./pages/admin/AdminFamilyGroupsPage"));
const AdminHeatmapPage = lazy(() => import("./pages/admin/AdminHeatmapPage"));
const AdminSubscriptionsPage = lazy(() => import("./pages/admin/AdminSubscriptionsPage"));

const queryClient = new QueryClient();

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function SessionValidator() {
  useSessionValidation();
  return null;
}

// Separate component for changelog/announcements to isolate from hot reload issues
function ModalProviders() {
  const { showModal, latestChangelog, markAsViewed } = useChangelog();
  const { announcement, markAsRead } = useAnnouncements();
  
  return (
    <>
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
    </>
  );
}

function AppContent() {
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ProfileCompletionChecker />
        <ReferralWelcomeModal />
        <ModalProviders />
        <SessionValidator />
        <Suspense fallback={<RouteLoadingFallback />}>
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
          <Route path="/demonstracao" element={<Demonstracao />} />
          <Route path="/study" element={<StudySession />} />
          <Route path="/memory-palace" element={<MemoryPalace />} />
          <Route path="/tecnicas" element={<Tecnicas />} />
          <Route path="/colaborador" element={<Colaborador />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Admin routes with sidebar */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="odu" element={<AdminOduPage />} />
            <Route path="caminhos" element={<AdminCaminhosPage />} />
            <Route path="rituais" element={<AdminRituaisPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="user/:userId" element={<UserDetail />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="advanced-analytics" element={<AdminAdvancedAnalytics />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="tools" element={<AdminToolsPage />} />
            <Route path="changelog" element={<AdminChangelogPage />} />
            <Route path="guru" element={<AdminGuruPage />} />
            <Route path="planos" element={<AdminPlansPage />} />
            <Route path="features" element={<AdminFeaturesPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="family-groups" element={<AdminFamilyGroupsPage />} />
            <Route path="heatmap" element={<AdminHeatmapPage />} />
            <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
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
        </Suspense>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <UTMTrackingScript />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
