import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Attaches the Supabase session token to every server-function request so
// server-side auth (requireUserId) sees the caller's identity. The Supabase
// client is imported lazily inside the handler — module-scope client
// construction is not allowed in start.ts (it also runs on the server).
const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let headers: Record<string, string> = {};
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers = { Authorization: `Bearer ${token}` };
    } catch {
      // no session available — proceed unauthenticated
    }
    return next({ headers });
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
