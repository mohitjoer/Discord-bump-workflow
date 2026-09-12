import type { Page } from 'playwright';
import { createBrowserSession, saveScreenshot, type BrowserSession } from './browser.js';
import { config } from './config.js';
import { sendNotification } from './notifier.js';

export interface DisboardBumpResult {
  success: boolean;
  bumpedCount: number;
  cooldownCount: number;
  message: string;
  nextAvailableMinutes?: number;
}

/**
 * Detect whether the current page is a Cloudflare challenge.
 */
function isCloudflareChallenge(title: string, bodyText: string): boolean {
  return (
    title.includes('Just a moment') ||
    title.includes('Security Verification') ||
    title.includes('Cloudflare') ||
    bodyText.includes('Verify you are human') ||
    bodyText.includes('Performing security verification') ||
    bodyText.includes('Checking your browser') ||
    bodyText.includes('Enable JavaScript and cookies')
  );
}

/**
 * Wait for Cloudflare's JS challenge to auto-resolve, with interactive fallback.
 * Returns true if the challenge resolved, false if it timed out.
 */
async function waitForCloudflareResolution(page: Page, maxWaitSeconds: number = 45): Promise<boolean> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;
  let attempt = 0;

  while (Date.now() - startTime < maxWaitMs) {
    attempt++;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const title = await page.title().catch(() => '');
    const bodySnippet = (await page.innerText('body').catch(() => '')).slice(0, 300);

    if (!isCloudflareChallenge(title, bodySnippet)) {
      console.log(`[Disboard] ✓ Cloudflare challenge resolved after ${elapsed}s (attempt ${attempt}).`);
      return true;
    }

    // Log diagnostics every few attempts
    if (attempt % 3 === 1) {
      const url = page.url();
      const frameCount = page.frames().length;

      // Check for Turnstile iframes
      const turnstileIframeSelector =
        'iframe[src*="challenges.cloudflare.com"], iframe[src*="turnstile"]';
      const iframeCount = await page.locator(turnstileIframeSelector).count();

      console.log(
        `[Disboard] Cloudflare challenge still active (${elapsed}s elapsed, attempt ${attempt}). ` +
          `URL: ${url}, Title: "${title}", Frames: ${frameCount}, Turnstile iframes: ${iframeCount}`
      );

      // If there's an interactive Turnstile iframe, try clicking it
      if (iframeCount > 0) {
        try {
          const frameEl = page.locator(turnstileIframeSelector).first();
          const box = await frameEl.boundingBox();
          if (box && box.width > 0 && box.height > 0) {
            const targetX = box.x + Math.min(30, box.width / 4);
            const targetY = box.y + box.height / 2;

            // Simulate human-like cursor approach
            await page.mouse.move(
              targetX - 80 - Math.random() * 40,
              targetY - 30 - Math.random() * 20,
              { steps: 6 }
            );
            await page.waitForTimeout(150 + Math.random() * 200);
            await page.mouse.move(targetX, targetY, { steps: 10 });
            await page.waitForTimeout(100 + Math.random() * 200);
            await page.mouse.click(targetX, targetY);
            console.log(`[Disboard] Clicked Turnstile iframe at (${Math.round(targetX)}, ${Math.round(targetY)}).`);
          }
        } catch (e) {
          console.warn('[Disboard] Error clicking Turnstile iframe:', (e as Error).message);
        }
      }

      // Take a diagnostic screenshot periodically
      if (attempt === 1 || attempt === 7) {
        await saveScreenshot(page, `disboard-cf-challenge-${elapsed}s`);
      }
    }

    // Wait 2 seconds between checks — Cloudflare JS evaluation can take 5-15s
    await page.waitForTimeout(2000);
  }

  const finalTitle = await page.title().catch(() => '');
  const finalBody = (await page.innerText('body').catch(() => '')).slice(0, 300);
  console.log(`[Disboard] ✗ Cloudflare challenge timed out after ${maxWaitSeconds}s.`);
  console.log(`[Disboard]   Final title: "${finalTitle}"`);
  console.log(`[Disboard]   Final body snippet: "${finalBody}"`);
  return false;
}

/**
 * Navigate to a URL and handle Cloudflare challenges.
 * First warms up on the homepage if dashboard navigation gets blocked.
 */
async function navigateWithCloudflareBypass(page: Page, targetUrl: string): Promise<boolean> {
  // Strategy 1: Navigate directly to the target
  console.log(`[Disboard] Navigating to: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  const title1 = await page.title().catch(() => '');
  const body1 = (await page.innerText('body').catch(() => '')).slice(0, 300);

  if (!isCloudflareChallenge(title1, body1)) {
    console.log('[Disboard] Direct navigation succeeded — no Cloudflare challenge.');
    return true;
  }

  console.log('[Disboard] Cloudflare challenge on direct navigation. Waiting for auto-resolution...');

  // Give the JS challenge up to 30 seconds to auto-resolve
  if (await waitForCloudflareResolution(page, 30)) {
    return true;
  }

  // Strategy 2: Warm up on the homepage to earn cf_clearance
  console.log('[Disboard] Direct approach failed. Trying homepage warm-up strategy...');
  await page.goto('https://disboard.org/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  if (await waitForCloudflareResolution(page, 30)) {
    console.log('[Disboard] Homepage passed Cloudflare. Now navigating to dashboard...');
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const titleAfter = await page.title().catch(() => '');
    const bodyAfter = (await page.innerText('body').catch(() => '')).slice(0, 300);
    if (!isCloudflareChallenge(titleAfter, bodyAfter)) {
      return true;
    }

    // One more chance for the dashboard challenge to resolve
    return await waitForCloudflareResolution(page, 20);
  }

  // Strategy 3: Try a page reload (sometimes helps with stale JS challenge state)
  console.log('[Disboard] Homepage warm-up failed. Trying reload on target...');
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  return await waitForCloudflareResolution(page, 20);
}

export async function bumpDisboard(existingPage?: Page): Promise<DisboardBumpResult> {
  let session: BrowserSession | null = null;
  const page = existingPage || (session = await createBrowserSession()).page;

  try {
    // Navigate with multi-strategy Cloudflare bypass
    const cfPassed = await navigateWithCloudflareBypass(page, config.disboard.dashboardUrl);

    if (!cfPassed) {
      const msg = 'Cloudflare challenge blocked access to Disboard after all bypass strategies. Check screenshot artifacts.';
      await saveScreenshot(page, 'disboard-cf-blocked');
      await sendNotification('Disboard Bump', msg, false);
      return { success: false, bumpedCount: 0, cooldownCount: 0, message: msg };
    }

    // Check if we were redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('discord.com/oauth2') || currentUrl.includes('/site/login')) {
      const msg = 'Session expired or not logged in. Please run `npm run login` to authenticate and update STORAGE_STATE_JSON secret.';
      await saveScreenshot(page, 'disboard-login-required');
      await sendNotification('Disboard Bump', msg, false);
      return { success: false, bumpedCount: 0, cooldownCount: 0, message: msg };
    }

    console.log(`[Disboard] Dashboard loaded. URL: ${currentUrl}`);
    await saveScreenshot(page, 'disboard-dashboard');

    // Wait for dashboard content to fully hydrate
    await page.waitForTimeout(2000);

    // Find bump buttons
    const bumpButtons = await page.$$(
      'a[href*="/server/bump/"], a.button.is-info:has-text("Bump"), button:has-text("Bump"), .btn-bump'
    );

    console.log(`[Disboard] Found ${bumpButtons.length} bump button(s).`);

    let bumpedCount = 0;
    let cooldownCount = 0;
    let minCooldownMinutes = config.disboard.bumpIntervalMinutes;

    if (bumpButtons.length === 0) {
      // Check if cooldown timer is present on the page
      const pageText = await page.innerText('body').catch(() => '');
      const timerMatch = pageText.match(/(\d{1,2}):(\d{2}):(\d{2})/);
      const textCooldownMatches = pageText.match(/bump (?:in|again in) (\d+)\s*(?:hours?|h)?\s*(\d+)?\s*(?:minutes?|m)?/i);

      if (timerMatch) {
        const hours = parseInt(timerMatch[1], 10);
        const mins = parseInt(timerMatch[2], 10);
        minCooldownMinutes = hours * 60 + mins;
      } else if (textCooldownMatches) {
        const hours = parseInt(textCooldownMatches[1] || '0', 10);
        const mins = parseInt(textCooldownMatches[2] || '0', 10);
        minCooldownMinutes = hours * 60 + mins;
      }

      const isCooldown =
        Boolean(timerMatch) ||
        pageText.includes('You can bump') ||
        pageText.includes('Bump in') ||
        pageText.includes('cooldown');

      if (isCooldown) {
        cooldownCount++;
        const msg = `Disboard server is currently on cooldown (${minCooldownMinutes} mins remaining).`;
        await saveScreenshot(page, 'disboard-cooldown');
        await sendNotification('Disboard Bump', msg, true);
        return {
          success: true,
          bumpedCount: 0,
          cooldownCount: 1,
          message: msg,
          nextAvailableMinutes: minCooldownMinutes,
        };
      }

      const msg = 'No bump buttons found. Verify that your server is listed on https://disboard.org/dashboard/servers.';
      await saveScreenshot(page, 'disboard-nobuttons');
      await sendNotification('Disboard Bump', msg, false);
      return { success: false, bumpedCount: 0, cooldownCount: 0, message: msg };
    }

    // Process each bump button
    for (const button of bumpButtons) {
      try {
        const isVisible = await button.isVisible();
        if (!isVisible) continue;

        const href = (await button.getAttribute('href')) || '';
        const buttonText = ((await button.textContent()) || '').trim();

        if (config.disboard.serverId && !href.includes(config.disboard.serverId)) {
          console.log(`[Disboard] Skipping server (${href}) — does not match target: ${config.disboard.serverId}`);
          continue;
        }

        // Check if this button shows a cooldown timer (e.g. "01:06:19")
        const timerMatch = buttonText.match(/(\d{1,2}):(\d{2}):(\d{2})/);
        if (timerMatch) {
          const hours = parseInt(timerMatch[1], 10);
          const mins = parseInt(timerMatch[2], 10);
          minCooldownMinutes = hours * 60 + mins;
          cooldownCount++;
          console.log(`[Disboard] Server is on cooldown: ${buttonText} (~${minCooldownMinutes} mins remaining).`);
          continue;
        }

        if (buttonText.toLowerCase().includes('bump')) {
          console.log(`[Disboard] Clicking Bump button for ${href}...`);
          await button.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          await button.click();

          // Wait for network response / page update
          await page.waitForTimeout(4000);
          bumpedCount++;
        }
      } catch (err) {
        console.warn('[Disboard] Failed clicking bump button:', err);
      }
    }

    await saveScreenshot(page, 'disboard-bump-result');

    if (bumpedCount > 0) {
      const resultMessage = `Successfully bumped ${bumpedCount} server(s) on Disboard!`;
      await sendNotification('Disboard Bump', resultMessage, true);
      return {
        success: true,
        bumpedCount,
        cooldownCount,
        message: resultMessage,
        nextAvailableMinutes: config.disboard.bumpIntervalMinutes,
      };
    }

    if (cooldownCount > 0) {
      const cooldownMsg = `Disboard server is currently on cooldown (${minCooldownMinutes} mins remaining).`;
      await sendNotification('Disboard Bump', cooldownMsg, true);
      return {
        success: true,
        bumpedCount: 0,
        cooldownCount,
        message: cooldownMsg,
        nextAvailableMinutes: minCooldownMinutes,
      };
    }

    const noActionMsg = `Disboard check completed. No servers ready to bump.`;
    await sendNotification('Disboard Bump', noActionMsg, false);
    return { success: false, bumpedCount: 0, cooldownCount: 0, message: noActionMsg };
  } catch (error: any) {
    const errorMsg = `Disboard bump error: ${error?.message || error}`;
    console.error(`[Disboard] ${errorMsg}`);
    await saveScreenshot(page, 'disboard-error');
    await sendNotification('Disboard Bump', errorMsg, false);
    return { success: false, bumpedCount: 0, cooldownCount: 0, message: errorMsg };
  } finally {
    if (session) {
      await session.close();
    }
  }
}

if (process.argv[1]?.endsWith('bump-disboard.ts') || process.argv[1]?.endsWith('bump-disboard.js')) {
  bumpDisboard().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
