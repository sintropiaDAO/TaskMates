import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildPublicPortfolio } from "@/lib/portfolio.server";

export const getPublicPortfolio = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string().regex(/^[a-z0-9-]{3,80}$/), view: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data }) => buildPublicPortfolio(data.slug, !!data.view));
