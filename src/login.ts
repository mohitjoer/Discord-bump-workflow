import readline from 'node:readline';
import { createBrowserSession, saveScreenshot } from './browser.js';
import { config } from './config.js';

function askEnterToContinue(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n👉 Press [ENTER] in this terminal once you have finished logging into Discord on Disboard: ', () => {
      rl.close();
      resolve();
    });
  });
}

export async function runInteractiveLogin(): Promise<void> {
  console.log('=====================================================');
  console.log('🔑 Disboard Bump Workflow - Interactive Session Login');
  console.log('=====================================================');
  console.log('Launching browser with persistent profile storage...');
  console.log(`Profile directory: ${config.userDataDir}\n`);

  const session = await createBrowserSession(false); // Force headless = false

  try {
    const { context, page } = session;

    console.log('🌐 Opening Disboard login (https://disboard.org/login)...');
    await page.goto('https://disboard.org/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    console.log('\n-----------------------------------------------------');
    console.log('1. Click "Verify you are human" if Cloudflare appears.');
    console.log('2. Log in to Discord and authorize Disboard.');
    console.log('3. Ensure you can see your servers on the dashboard.');
    console.log('-----------------------------------------------------\n');

    await askEnterToContinue();

    // Check Disboard state
    await page.goto('https://disboard.org/dashboard/servers', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }).catch(() => null);

    const disboardUrl = page.url();
    const disboardContent = await page.content();
    const disboardAuthed =
      disboardUrl.includes('dashboard') ||
      disboardContent.includes('logout') ||
      disboardContent.includes('Logout');

    if (disboardAuthed) {
      console.log('✅ Disboard authentication verified!');
    } else {
      console.warn('⚠️ Disboard does not appear fully logged in. Current URL: ' + disboardUrl);
    }

    // Save storage state file as backup
    await context.storageState({ path: config.storageStatePath });
    await saveScreenshot(page, 'login-disboard');

    console.log('\n💾 Session data successfully saved in: ' + config.userDataDir);
    console.log('💾 Backup storage state saved in: ' + config.storageStatePath);
    console.log('🎉 Setup complete! You can now run the automated bump workflow with:');
    console.log('   npm run bump   (single bump run)');
    console.log('   npm run start  (continuous recurring runner)\n');
  } finally {
    await session.close();
  }
}

if (process.argv[1]?.endsWith('login.ts') || process.argv[1]?.endsWith('login.js')) {
  runInteractiveLogin().catch((err) => {
    console.error('❌ Login failed:', err);
    process.exit(1);
  });
}
