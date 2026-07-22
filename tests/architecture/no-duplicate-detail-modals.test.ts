import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard: the three item detail modals (Task / Product / Poll) must
 * only be mounted from the shared ItemDetailModalHost. Direct imports elsewhere
 * lead to divergent handler wiring — e.g. missing onDelete on completed polls
 * opened from Tag pages. Update the allowlist intentionally when a new host is
 * genuinely required, and add ItemDetailModalHost coverage for it.
 */

const DETAIL_MODALS = [
  "@/components/tasks/TaskDetailModal",
  "@/components/products/ProductDetailModal",
  "@/components/polls/PollDetailModal",
];

// Files that are explicitly allowed to import the detail modals directly.
// Every entry here is an accepted host location; new entries require review.
const ALLOWLIST = new Set<string>([
  "src/components/common/ItemDetailModalHost.tsx",
  // Legacy hosts pending migration to ItemDetailModalHost. Do NOT add new files
  // here — build them on top of ItemDetailModalHost instead.
  "src/pages/Dashboard.tsx",
  "src/pages/PublicProfile.tsx",
  "src/components/layout/AppHeader.tsx",
  "src/components/profile/ProfileMySections.tsx",
]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

describe("architecture: item detail modals", () => {
  it("are only imported from allowlisted hosts", () => {
    const offenders: Array<{ file: string; modal: string }> = [];
    const root = join(process.cwd(), "src");
    for (const file of walk(root)) {
      const rel = file.replace(process.cwd() + "/", "");
      if (ALLOWLIST.has(rel)) continue;
      const src = readFileSync(file, "utf8");
      for (const modal of DETAIL_MODALS) {
        const re = new RegExp(`from ['"]${modal}['"]`);
        if (re.test(src)) offenders.push({ file: rel, modal });
      }
    }
    expect(
      offenders,
      `Detail modals must be mounted via ItemDetailModalHost. Offending imports:\n` +
        offenders.map((o) => `  - ${o.file} → ${o.modal}`).join("\n"),
    ).toEqual([]);
  });
});
