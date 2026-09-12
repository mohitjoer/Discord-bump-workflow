import { createBrowserSession } from './browser.js';
import { bumpDisboard } from './bump-disboard.js';
import { config } from './config.js';
import { sendNotification } from './notifier.js';

interface WorkflowArgs {
  once: boolean;
}

function parseArgs(): WorkflowArgs {
  const args = process.argv.slice(2);
  let once = false;

  for (const arg of args) {
    if (arg === '--once' || arg === '-1') {
      once = true;
    }
  }

  return { once };
}

async function runBumpCycle(): Promise<{ nextDelayMinutes: number }> {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Disboard Bump Workflow [${new Date().toLocaleString()}]`);
  console.log(`Target: Disboard Dashboard`);
  console.log(`======================================================`);

  const session = await createBrowserSession();
  let nextDelayMinutes = config.scheduler.loopIntervalMinutes;

  try {
    const { page } = session;

    try {
      const disboardResult = await bumpDisboard(page);
      if (disboardResult.nextAvailableMinutes && disboardResult.nextAvailableMinutes > 0) {
        nextDelayMinutes = disboardResult.nextAvailableMinutes;
      }
    } catch (err: any) {
      console.error('[Workflow] Error executing Disboard bump:', err?.message || err);
    }

    console.log(`\n🏁 Bump cycle finished.`);
  } finally {
    await session.close();
  }

  // Ensure minimum wait time of at least 5 minutes
  nextDelayMinutes = Math.max(5, nextDelayMinutes);
  return { nextDelayMinutes };
}

async function main() {
  const { once } = parseArgs();

  if (once) {
    console.log('Mode: Single Execution (--once)');
    await runBumpCycle();
    process.exit(0);
  }

  console.log('Mode: Continuous Scheduler Daemon');
  console.log(`Base check interval: ${config.scheduler.loopIntervalMinutes} minutes`);
  console.log('Press Ctrl+C to terminate.\n');

  let running = true;

  const handleShutdown = () => {
    console.log('\n🛑 Shutdown signal received. Exiting runner gracefully...');
    running = false;
    process.exit(0);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  while (running) {
    const { nextDelayMinutes } = await runBumpCycle();
    const delayMs = nextDelayMinutes * 60 * 1000;

    console.log(`⏳ Next bump check scheduled in ~${nextDelayMinutes} minutes (${new Date(Date.now() + delayMs).toLocaleTimeString()}). Waiting...`);

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

main().catch(async (error) => {
  console.error('❌ Fatal error in bump workflow:', error);
  await sendNotification('Bump Workflow Failure', `Fatal error: ${error?.message || error}`, false);
  process.exit(1);
});
