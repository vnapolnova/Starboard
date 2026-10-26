#!/usr/bin/env node
// Screenshots for visual review: tablet 600x1000 and phone 390x844, light and dark.
//
//   node scripts/shoot.mjs <url-or-html-file> <name> [--only tablet|phone] [--hash <#route>]
//                          [--click <selector>] [--scroll <selector>] [--suffix <label>]
//                          [--wait <selector>]
//
// --wait is for the live app: Firestore keeps a channel open, so "networkidle"
// never comes. The page is shot once the selector is visible instead.
//
// Output: docs/shots/<name>/<device>-<theme>[-<suffix>].png
// Local files whose name contains "tablet" or "phone" only get that device.
// Run with: npm run shoot -- <url-or-html-file> <name> [flags]
// Requires: npm i -D playwright@1.56.1 (pinned to match the Chromium build preinstalled in
// Claude Code cloud sessions under /opt/pw-browsers). Don't run `npx playwright install` there;
// on your own machine, run it once after npm install.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const only = flag('--only');
const hash = flag('--hash') ?? '';
const click = flag('--click'); // CSS selector to tap before the shot, e.g. a tab button
const suffix = flag('--suffix');
const scroll = flag('--scroll'); // CSS selector to scroll into view, for content below the fold
const wait = flag('--wait'); // CSS selector that means the page has its data
const [target, name] = args;

if (!target || !name) {
  console.error(
    'Usage: node scripts/shoot.mjs <url-or-html-file> <name> [--only tablet|phone] [--hash <#route>]',
  );
  process.exit(1);
}

const isFile = !/^https?:\/\//.test(target);
if (isFile && !existsSync(target)) {
  console.error(`Not found: ${target}`);
  process.exit(1);
}
const url = (isFile ? pathToFileURL(resolve(target)).href : target) + hash;

const devices = {
  tablet: { width: 600, height: 1000, deviceScaleFactor: 2, isMobile: false, hasTouch: true },
  phone: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

let pick = Object.keys(devices);
if (only) pick = [only];
else if (isFile) {
  const f = basename(target).toLowerCase();
  if (f.includes('tablet')) pick = ['tablet'];
  else if (f.includes('phone')) pick = ['phone'];
}

const outDir = resolve('docs/shots', name);
await mkdir(outDir, { recursive: true });

// Cloud sessions preinstall one Chromium there, which may be newer than the pinned Playwright expects.
const CLOUD_CHROMIUM = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(
  existsSync(CLOUD_CHROMIUM) ? { executablePath: CLOUD_CHROMIUM } : {},
);
try {
  for (const device of pick) {
    const { width, height, ...rest } = devices[device];
    for (const colorScheme of ['light', 'dark']) {
      const ctx = await browser.newContext({
        viewport: { width, height },
        colorScheme,
        reducedMotion: 'reduce', // stable shots; sparkles off
        ...rest,
      });
      const page = await ctx.newPage();
      if (wait) {
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForSelector(wait);
      } else {
        await page.goto(url, { waitUntil: 'networkidle' });
      }
      await page.evaluate(() => document.fonts?.ready);
      if (click) {
        await page.click(click);
        await page.waitForTimeout(300);
      }
      if (scroll) {
        await page.locator(scroll).first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
      }
      const file = resolve(outDir, `${device}-${colorScheme}${suffix ? '-' + suffix : ''}.png`);
      await page.screenshot({ path: file });
      console.log('saved', file);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
