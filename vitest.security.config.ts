import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// No application/server transforms: import the real route with a minimal router mock.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/security/share-*.test.{ts,tsx}", "tests/security/chat-share.test.ts", "tests/security/poll-voting.integration.test.ts", "tests/security/mentions.integration.test.ts", "src/lib/pollVoting.test.ts", "src/lib/mentions.test.ts"],
    restoreMocks: true,
  },
});
