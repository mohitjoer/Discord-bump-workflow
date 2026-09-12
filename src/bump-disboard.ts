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

async function handleCloudflareChallenge(page: Page): Promise<boolean> {
  for (let attempt = 1; attempt <= 10; attempt++) {
    const title = await page.title().catch(() => '');
    const body = await page.innerText('body').catch(() => '');

    const isChallenge =
      title.includes('Just a moment') ||
      title.includes('Security Verification') ||
      title.includes('Cloudflare') ||
      body.includes('Performing security verification') ||
      body.includes('Verify you are human') ||
      body.includes('Cloudflare Turnstile');

    if (!isChallenge) {
      if (attempt > 1) {
        console.log('[Disboard] Cloudflare challenge passed!');
      }
      return true;
    }

    console.log(`[Disboard] Cloudflare Turnstile detected (attempt ${attempt}/10). Attempting to solve...`);

    try {
      // 1. Try finding Turnstile iframe using Playwright locator (pierces host shadow roots)
      const iframeSelector =
        'iframe[src*="challenges.cloudflare.com"], iframe[src*="cloudflare.com"], iframe[src*="turnstile"], iframe[title*="Cloudflare"], iframe[title*="Turnstile"], iframe[title*="security challenge"]';

      const iframeLocator = page.locator(iframeSelector);
      const count = await iframeLocator.count();

      if (count > 0) {
        const frameEl = iframeLocator.first();
        const box = await frameEl.boundingBox();

        if (box && box.width > 0 && box.height > 0) {
          const targetX = box.x + Math.min(30, box.width / 4);
          const targetY = box.y + box.height / 2;

          console.log(`[Disboard] Simulating human mouse movement to Turnstile box at (${Math.round(targetX)}, ${Math.round(targetY)})...`);
          await page.mouse.move(targetX - 50, targetY - 20, { steps: 5 });
          await page.waitForTimeout(200);
          await page.mouse.move(targetX, targetY, { steps: 8 });
          await page.waitForTimeout(300);
          await page.mouse.click(targetX, targetY);
          console.log('[Disboard] Clicked Turnstile checkbox area.');
          await page.waitForTimeout(4000);
        }
      }

      // 2. Try piercing into frame with frameLocator
      const turnstileFrame = page.frameLocator(iframeSelector).first();
      const checkbox = turnstileFrame.locator('input[type="checkbox"], .ctp-checkbox-label, span.mark, #challenge-stage, .cb-lb');
      if (await checkbox.count() > 0) {
        const cb = checkbox.first();
        if (await cb.isVisible().catch(() => false)) {
          console.log('[Disboard] Found checkbox via frameLocator. Clicking...');
          await cb.click({ delay: 150 }).catch(() => null);
          await page.waitForTimeout(4000);
        }
      }

      // 3. Check inside attached frames
      for (const frame of page.frames()) {
        const fUrl = frame.url();
        if (fUrl.includes('cloudflare') || fUrl.includes('turnstile') || fUrl.includes('challenge')) {
          const frameCheckbox = frame.locator('input[type="checkbox"], .ctp-checkbox-label, span.mark, #challenge-stage, .cb-lb');
          if (await frameCheckbox.count() > 0) {
            console.log('[Disboard] Found checkbox in subframe. Clicking...');
            await frameCheckbox.first().click({ delay: 150 }).catch(() => null);
            await page.waitForTimeout(4000);
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[Disboard] Error during Turnstile attempt:', e);
    }

    await page.waitForTimeout(3000);
  }

  const finalTitle = await page.title().catch(() => '');
  const finalBody = await page.innerText('body').catch(() => '');
  return !(
    finalTitle.includes('Just a moment') ||
    finalTitle.includes('Security Verification') ||
    finalBody.includes('Performing security verification') ||
    finalBody.includes('Verify you are human')
  );
}

export async function bumpDisboard(existingPage?: Page): Promise<DisboardBumpResult> {
  let session: BrowserSession | null = null;
  const page = existingPage || (session = await createBrowserSession()).page;

  try {
    console.log('\n[Disboard] Navigating to dashboard: ' + config.disboard.dashboardUrl);
    await page.goto(config.disboard.dashboardUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    // Wait a brief moment for dynamic elements/hydration
    await page.waitForTimeout(3000);

    // Handle Cloudflare Turnstile challenge if present
    const challengeCleared = await handleCloudflareChallenge(page);
    if (!challengeCleared) {
      const msg = 'Cloudflare challenge blocked access to Disboard. Check the run screenshot artifact for details.';
      await saveScreenshot(page, 'disboard-cf-blocked');
      await sendNotification('Disboard Bump', msg, false);
      return { success: false, bumpedCount: 0, cooldownCount: 0, message: msg };
    }

    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('discord.com/oauth2') || currentUrl.includes('/site/login')) {
      const msg = 'Session expired or not logged in. Please run `npm run login` to authenticate and update STORAGE_STATE_JSON secret.';
      await saveScreenshot(page, 'disboard-login-required');
      await sendNotification('Disboard Bump', msg, false);
      return { success: false, bumpedCount: 0, cooldownCount: 0, message: msg };
    }

    // Identify server cards on the dashboard
    // Disboard markup typically uses .server-card, .column, or server containers
    const serverSelectors = [
      '.server-card',
      '.server',
      '.dashboard-server',
      '.column.is-half',
      '.column.is-one-third',
      '.box',
    ];

    let serverContainers = await page.$$(
      serverSelectors.map((s) => `${s}:has(a[href*="/server/bump/"], button, .button)`).join(', ')
    );

    // If generic card selectors don't match, find bump buttons directly
    const bumpButtons = await page.$$(
      'a[href*="/server/bump/"], a.button.is-info:has-text("Bump"), button:has-text("Bump"), .btn-bump'
    );

    console.log(`[Disboard] Found ${bumpButtons.length} active bump button(s).`);

    let bumpedCount = 0;
    let cooldownCount = 0;
    let minCooldownMinutes = config.disboard.bumpIntervalMinutes;

    if (bumpButtons.length === 0) {
      // Check if cooldown timer is present on the page (e.g. "01:37:18" or "bump in 1 hour")
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

    // If specific server ID specified, filter for it, otherwise bump all available
    for (const button of bumpButtons) {
      try {
        const isVisible = await button.isVisible();
        if (!isVisible) continue;

        const href = (await button.getAttribute('href')) || '';
        const buttonText = ((await button.textContent()) || '').trim();

        if (config.disboard.serverId && !href.includes(config.disboard.serverId)) {
          console.log(`[Disboard] Skipping server (${href}) - does not match target server ID: ${config.disboard.serverId}`);
          continue;
        }

        // Check if this specific button shows a cooldown timer (e.g., "01:06:19")
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

          // Wait for network response / update
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
