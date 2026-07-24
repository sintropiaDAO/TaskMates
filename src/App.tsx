import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { PWAUpdateBanner } from "@/components/pwa/PWAUpdateBanner";
import { ChatDrawer } from "@/components/chat/ChatDrawer";


import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ProfileEdit from "./pages/ProfileEdit";
import PublicProfile from "./pages/PublicProfile";
import FollowList from "./pages/FollowList";
import UserSearch from "./pages/UserSearch";
import Admin from "./pages/Admin";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import PotentialsQuiz from "./pages/PotentialsQuiz";
import Chat from "./pages/Chat";
import Badges from "./pages/Badges";
import TagDetail from "./pages/TagDetail";
import TagsList from "./pages/TagsList";
import SharePage from "./pages/SharePage";

const queryClient = new QueryClient();

const PointerEventsGuard = () => {
  useEffect(() => {
    // Safety net: if a Radix Dialog/AlertDialog leaves body pointer-events:none
    // stuck (Edge/Chromium race with nested overlays), clear it whenever no
    // Radix overlay is present in the DOM. Runs on every DOM mutation.
    const clearIfSafe = () => {
      const hasOverlay = document.querySelector(
        '[data-radix-portal] [role="dialog"], [data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]'
      );
      if (!hasOverlay && document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    };
    const observer = new MutationObserver(clearIfSafe);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'data-state'] });
    return () => observer.disconnect();
  }, []);
  return null;
};

const App = () => (

  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <AuthProvider>
          <ChatProvider>
            <PointerEventsGuard />
            <PWAUpdateBanner />

            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile/edit" element={<ProfileEdit />} />
                  <Route path="/profile/:userId" element={<PublicProfile />} />
                  <Route path="/profile/:userId/:type" element={<FollowList />} />
                  <Route path="/search" element={<UserSearch />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/quiz" element={<PotentialsQuiz />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/badges/:userId" element={<Badges />} />
                  <Route path="/tags/:tagId" element={<TagDetail />} />
                  <Route path="/tags" element={<TagsList />} />
                  <Route path="/share/:type/:id" element={<SharePage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
              <ChatDrawer />
              
            </BrowserRouter>
          </ChatProvider>
        </AuthProvider>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
