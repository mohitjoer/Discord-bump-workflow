import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, BrowserContext, Page } from 'playwright';
import { config } from './config.js';

// Activate stealth evasion
chromium.use(stealthPlugin());

export interface BrowserSession {
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}

export async function createBrowserSession(headlessOverride?: boolean): Promise<BrowserSession> {
  const headless = headlessOverride ?? config.headless;

  // Ensure screenshots directory exists
  if (!fs.existsSync(config.screenshotsDir)) {
    fs.mkdirSync(config.screenshotsDir, { recursive: true });
  }

  // If storage state is passed via env var, write it to storage-state.json
  if (process.env.STORAGE_STATE_JSON && !fs.existsSync(config.storageStatePath)) {
    fs.writeFileSync(config.storageStatePath, process.env.STORAGE_STATE_JSON, 'utf-8');
  } else if (process.env.STORAGE_STATE_BASE64 && !fs.existsSync(config.storageStatePath)) {
    fs.writeFileSync(
      config.storageStatePath,
      Buffer.from(process.env.STORAGE_STATE_BASE64, 'base64').toString('utf-8')
    );
  }

  // Detect installed Google Chrome for best Cloudflare Turnstile bypass
  const hasChrome = fs.existsSync('/usr/bin/google-chrome') || fs.existsSync('/usr/bin/google-chrome-stable');
  const channel = hasChrome ? 'chrome' : undefined;

  const browser = await chromium.launch({
    headless,
    channel,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-infobars',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const storageState = fs.existsSync(config.storageStatePath) ? config.storageStatePath : undefined;

  const context = await browser.newContext({
    storageState,
    viewport: { width: 1366, height: 768 },
  });

  const page = await context.newPage();

  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(45000);

  const close = async () => {
    try {
      await context.close();
      await browser.close();
    } catch {
      // Ignored if already closed
    }
  };

  return { context, page, close };
}

export async function saveScreenshot(page: Page, namePrefix: string): Promise<string> {
  try {
    const filename = `${namePrefix}-${Date.now()}.png`;
    const fullPath = path.join(config.screenshotsDir, filename);
    await page.screenshot({ path: fullPath, fullPage: false });
    return fullPath;
  } catch (err) {
    return '';
  }
}
