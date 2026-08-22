import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveLinkPreview } from "@/lib/link-preview.server";
import { buildItemSharePreview, buildTagSharePreview } from "@/lib/share-preview.server";
import { UUID_RE } from "@/lib/supabase-server";

export const getLinkPreview = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ url: z.string().url().max(2000) }).parse(data),
  )
  .handler(async ({ data }) => resolveLinkPreview(data.url));

export const getItemSharePreview = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        type: z.enum(["task", "poll", "product"]),
        id: z.string().regex(UUID_RE),
      })
      .parse(data),
  )
  .handler(async ({ data }) => buildItemSharePreview(data.type, data.id));

export const getTagSharePreview = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ tagId: z.string().regex(UUID_RE) }).parse(data),
  )
  .handler(async ({ data }) => buildTagSharePreview(data.tagId));
