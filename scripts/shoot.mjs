#!/usr/bin/env node
// Screenshots for visual review: tablet 600x1000 and phone 390x844, light and dark.
//
//   node scripts/shoot.mjs <url-or-html-file> <name> [--only tablet|phone] [--hash <#route>]
//                          [--click <selector>] [--suffix <label>]
//
// Output: docs/shots/<name>/<device>-<theme>[-<suffix>].png
// Local files whose name contains "tablet" or "phone" only get that device.
// Requires: npm i -D playwright && npx playwright install chromium

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

const browser = await chromium.launch();
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
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts?.ready);
      if (click) {
        await page.click(click);
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
