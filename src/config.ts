import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export interface AppConfig {
  headless: boolean;
  userDataDir: string;
  storageStatePath: string;
  disboard: {
    dashboardUrl: string;
    serverId?: string;
    bumpIntervalMinutes: number;
  };
  scheduler: {
    loopIntervalMinutes: number;
  };
  webhookUrl?: string;
  screenshotsDir: string;
}

export const config: AppConfig = {
  headless: process.env.HEADLESS === 'true',
  userDataDir: process.env.USER_DATA_DIR
    ? path.resolve(projectRoot, process.env.USER_DATA_DIR)
    : path.resolve(projectRoot, 'user-data'),
  storageStatePath: path.resolve(projectRoot, 'storage-state.json'),
  disboard: {
    dashboardUrl: process.env.DISBOARD_DASHBOARD_URL || 'https://disboard.org/dashboard/servers',
    serverId: process.env.DISBOARD_SERVER_ID || undefined,
    bumpIntervalMinutes: parseInt(process.env.DISBOARD_BUMP_INTERVAL_MINUTES || '250', 10),
  },
  scheduler: {
    loopIntervalMinutes: parseInt(process.env.RUN_INTERVAL_MINUTES || '30', 10),
  },
  webhookUrl: process.env.DISCORD_WEBHOOK_URL || undefined,
  screenshotsDir: path.resolve(projectRoot, 'screenshots'),
};
