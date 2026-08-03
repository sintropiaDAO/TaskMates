import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard: CreateTaskModal must only be mounted from
 * CreateTaskModalHost. Direct mounts caused divergent wiring — e.g. the
 * "mark as completed" field disappearing when the modal was opened from a
 * tag's Related Actions because the caller forgot the onComplete prop.
 */
const CREATE_MODALS = ["@/components/tasks/CreateTaskModal"];

const ALLOWLIST = new Set<string>([
  "src/components/common/CreateTaskModalHost.tsx",
]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

describe("architecture: create modals", () => {
  it("CreateTaskModal is only imported from its host", () => {
    const offenders: Array<{ file: string; modal: string }> = [];
    const root = join(process.cwd(), "src");
    for (const file of walk(root)) {
      const rel = file.replace(process.cwd() + "/", "");
      if (ALLOWLIST.has(rel)) continue;
      if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
      const src = readFileSync(file, "utf8");
      for (const modal of CREATE_MODALS) {
        if (new RegExp(`from ['"]${modal}['"]`).test(src)) offenders.push({ file: rel, modal });
      }
    }
    expect(
      offenders,
      `CreateTaskModal must be mounted via CreateTaskModalHost. Offending imports:\n` +
        offenders.map((o) => `  - ${o.file} → ${o.modal}`).join("\n"),
    ).toEqual([]);
  });

  it("does not gate form features on optional caller callbacks", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/tasks/CreateTaskModal.tsx"),
      "utf8",
    );
    // JSX conditions like `{!editTask && onComplete && (` make the UI depend on
    // which screen mounted the modal.
    const gated = src.match(/&&\s+on[A-Z]\w*\s+&&\s+\(/g) || [];
    expect(gated, `Feature gating on caller props found: ${gated.join(", ")}`).toEqual([]);
  });
});
