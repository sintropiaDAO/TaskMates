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
import { ChatFAB } from "@/components/chat/ChatFAB";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <AuthProvider>
          <ChatProvider>
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
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
              <ChatDrawer />
              <ChatFAB />
            </BrowserRouter>
          </ChatProvider>
        </AuthProvider>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
