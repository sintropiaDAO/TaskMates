// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

const state = vi.hoisted(() => ({
  type: "task",
  id: "shared-fixture",
  user: null as { id: string } | null,
  item: null as Record<string, unknown> | null,
  profile: null as Record<string, unknown> | null,
  error: null as { code: string } | null,
  navigate: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/router-compat", () => ({
  useParams: () => ({ type: state.type, id: state.id }),
  useNavigate: () => state.navigate,
  Navigate: () => null,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: state.user, loading: false }),
}));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ language: "en" }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: state.from },
}));
import SharePage from "@/pages/SharePage";

const fixture = {
  id: "shared-fixture",
  title: "Restricted garden plans",
  description: "Confidential planting details",
  image_url: "https://example.org/secret.jpg",
  created_by: "owner",
};
beforeEach(() => {
  vi.clearAllMocks();
  state.user = null;
  state.type = "task";
  state.item = fixture;
  state.profile = null;
  state.error = null;
  state.from.mockImplementation((table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({
        data: table === "public_profiles" ? state.profile : state.item,
        error: table === "public_profiles" ? null : state.error,
      }),
    };
    return chain;
  });
});
afterEach(cleanup);

// These test UI behavior for real RLS outcomes; live policy tests are separate.
describe.each(["task", "product", "poll"])("/share/%s access", (type) => {
  it.each([
    "guest",
    "signed-in non-member",
    "blocked viewer",
    "private profile viewer",
  ])("does not render or redirect a denied %s", async (viewer) => {
    state.type = type;
    state.item = null;
    state.user = viewer === "guest" ? null : { id: "viewer" };
    const view = render(<SharePage />);
    await waitFor(() => expect(state.from).toHaveBeenCalled());
    await waitFor(() =>
      expect(view.getByRole("button", { name: "Home" })).toBeDefined(),
    );
    for (const value of [fixture.title, fixture.description, fixture.image_url])
      expect(view.container.innerHTML).not.toContain(value);
    expect(state.from).not.toHaveBeenCalledWith("public_profiles");
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("redirects an authorized signed-in community member to the exact shared item", async () => {
    state.type = type;
    state.user = { id: "member" };
    render(<SharePage />);
    await waitFor(() =>
      expect(state.navigate).toHaveBeenCalledExactlyOnceWith(
        `/dashboard?${type}=shared-fixture`,
        { replace: true },
      ),
    );
  });

  it("keeps the guest sign-in destination without revealing a hidden creator profile", async () => {
    state.type = type;
    const view = render(<SharePage />);
    await view.findByRole("heading", { name: fixture.title });
    expect(view.container.textContent).not.toContain(fixture.created_by);
    expect(state.from).toHaveBeenCalledWith("public_profiles");
    fireEvent.click(
      view.getByRole("button", { name: /Sign in to participate/i }),
    );
    expect(state.navigate).toHaveBeenCalledWith(
      `/auth?redirect=${encodeURIComponent(`/dashboard?${type}=shared-fixture`)}`,
    );
  });

  it("can display an accessible creator profile returned by the public-safe view", async () => {
    state.type = type;
    state.profile = { full_name: "Public gardener identity", avatar_url: null };
    const view = render(<SharePage />);
    await waitFor(() =>
      expect(view.container.textContent).toContain("Public gardener identity"),
    );
  });

  it("fails closed on backend errors and never redirects a signed-in viewer", async () => {
    state.type = type;
    state.user = { id: "viewer" };
    state.error = { code: "42501" };
    const view = render(<SharePage />);
    await waitFor(() =>
      expect(view.getByRole("button", { name: "Home" })).toBeDefined(),
    );
    expect(view.container.textContent).not.toContain(fixture.title);
    expect(state.navigate).not.toHaveBeenCalled();
  });
});
