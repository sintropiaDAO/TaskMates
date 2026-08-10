import { useEffect } from "react";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { PWAUpdateBanner } from "@/components/pwa/PWAUpdateBanner";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/NotFound";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
      },
      { title: "TaskMates - Colaboração Regenerativa" },
      {
        name: "description",
        content: "Plataforma colaborativa de tarefas e habilidades para comunidades regenerativas",
      },
      { name: "author", content: "TaskMates" },
      // PWA meta
      { name: "theme-color", content: "#10b981" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "TaskMates" },
      // Open Graph
      { property: "og:site_name", content: "TaskMates" },
      { property: "og:title", content: "TaskMates - Colaboração Regenerativa" },
      {
        property: "og:description",
        content: "Plataforma colaborativa de tarefas e habilidades para comunidades regenerativas",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://taskmates.app/" },
      { property: "og:image", content: "https://taskmates.app/og-default.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      // Twitter
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@SintropiaDAO" },
      { name: "twitter:title", content: "TaskMates - Colaboração Regenerativa" },
      {
        name: "twitter:description",
        content: "Plataforma colaborativa de tarefas e habilidades para comunidades regenerativas",
      },
      { name: "twitter:image", content: "https://taskmates.app/og-default.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
        crossOrigin: "anonymous",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// ported from App.tsx — safety net for stuck Radix overlay pointer-events
function PointerEventsGuard() {
  useEffect(() => {
    const clearIfSafe = () => {
      const hasOverlay = document.querySelector(
        '[data-radix-portal] [role="dialog"], [data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]'
      );
      if (!hasOverlay && document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };
    const observer = new MutationObserver(clearIfSafe);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "data-state"],
    });
    return () => observer.disconnect();
  }, []);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <AuthProvider>
            <ChatProvider>
              <PointerEventsGuard />
              <PWAUpdateBanner />
              <Toaster />
              <Sonner />
              <AppLayout>
                <Outlet />
              </AppLayout>
              <ChatDrawer />
            </ChatProvider>
          </AuthProvider>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  console.error(error);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-foreground p-6">
      <div className="clay p-8 max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">Esta página não carregou</h1>
        <p className="text-muted-foreground">
          Algo deu errado. Tente novamente ou volte para o início.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            className="clay-interactive rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="clay-interactive rounded-xl bg-secondary px-5 py-2.5 font-semibold text-secondary-foreground"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}
