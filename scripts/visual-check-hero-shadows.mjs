#!/usr/bin/env node
/**
 * Visual regression check for hero claymorphism shadows.
 *
 * Captures the 3 chips (Colaboração / Matchmaking / Regenerativo) and the
 * "Já tenho conta" button — including the offset shadow area below each — and
 * compares them against committed baselines under tests/visual/baselines/.
 *
 * Usage:
 *   node scripts/visual-check-hero-shadows.mjs              # compare vs baseline
 *   node scripts/visual-check-hero-shadows.mjs --update     # refresh baselines
 *   URL=https://taskmates.app node scripts/visual-check-hero-shadows.mjs
 *
 * Requires (dev): playwright, pixelmatch, pngjs
 *   npm i -D playwright pixelmatch pngjs && npx playwright install chromium
 *
 * Exits non-zero when any element diverges more than THRESHOLD pixels (~0.5%).
 */
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASELINE_DIR = join(ROOT, 'tests/visual/baselines');
const ACTUAL_DIR = join(ROOT, 'tests/visual/actual');
const DIFF_DIR = join(ROOT, 'tests/visual/diffs');

const URL = process.env.URL || 'http://localhost:8080/';
const UPDATE = process.argv.includes('--update');
const THRESHOLD_RATIO = 0.005; // 0.5% of pixels may differ
const SHADOW_PAD_PX = 24;      // extra pixels below element to include shadow

const TARGETS = [
  { name: 'chip-0', selector: '[data-testid="hero-chip"]', nth: 0 },
  { name: 'chip-1', selector: '[data-testid="hero-chip"]', nth: 1 },
  { name: 'chip-2', selector: '[data-testid="hero-chip"]', nth: 2 },
  { name: 'btn-have-account', selector: '[data-testid="hero-have-account"]', nth: 0 },
];

for (const d of [BASELINE_DIR, ACTUAL_DIR, DIFF_DIR]) mkdirSync(d, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="hero-have-account"]');
await page.waitForTimeout(400); // let framer-motion settle

let failures = 0;
for (const t of TARGETS) {
  const handle = page.locator(t.selector).nth(t.nth);
  const box = await handle.boundingBox();
  if (!box) { console.error(`✗ ${t.name}: element not found`); failures++; continue; }

  const clip = {
    x: Math.max(0, Math.floor(box.x - 4)),
    y: Math.max(0, Math.floor(box.y - 4)),
    width: Math.ceil(box.width + 8),
    height: Math.ceil(box.height + SHADOW_PAD_PX),
  };
  const actualPath = join(ACTUAL_DIR, `${t.name}.png`);
  await page.screenshot({ path: actualPath, clip });

  const baselinePath = join(BASELINE_DIR, `${t.name}.png`);
  if (UPDATE || !existsSync(baselinePath)) {
    writeFileSync(baselinePath, readFileSync(actualPath));
    console.log(`↻ ${t.name}: baseline ${UPDATE ? 'updated' : 'created'}`);
    continue;
  }

  const a = PNG.sync.read(readFileSync(baselinePath));
  const b = PNG.sync.read(readFileSync(actualPath));
  if (a.width !== b.width || a.height !== b.height) {
    console.error(`✗ ${t.name}: size mismatch (baseline ${a.width}x${a.height} vs ${b.width}x${b.height})`);
    failures++; continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const diffPx = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  const ratio = diffPx / (a.width * a.height);
  if (ratio > THRESHOLD_RATIO) {
    writeFileSync(join(DIFF_DIR, `${t.name}.png`), PNG.sync.write(diff));
    console.error(`✗ ${t.name}: ${(ratio * 100).toFixed(2)}% pixels differ (> ${(THRESHOLD_RATIO * 100).toFixed(2)}%) — see tests/visual/diffs/${t.name}.png`);
    failures++;
  } else {
    console.log(`✓ ${t.name}: ${(ratio * 100).toFixed(3)}% diff`);
  }
}

await browser.close();
process.exit(failures > 0 ? 1 : 0);
