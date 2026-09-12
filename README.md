# Disboard Server Bump Workflow (Playwright + TypeScript)

An automated workflow built with **Playwright** and **TypeScript** to periodically bump your Discord community on **Disboard** ([https://disboard.org/dashboard/servers](https://disboard.org/dashboard/servers)).

## Features

- ⏱️ **Scheduled Execution:** Runs automatically **every 4 hours and 10 minutes** via GitHub Actions.
- 🛡️ **Stealth Anti-Detection:** Uses `playwright-extra` + `puppeteer-extra-plugin-stealth` with Google Chrome to bypass Cloudflare protection.
- 💾 **Persistent Session Storage:** Store your Discord login once in `user-data/`. No need to enter your Discord password or solve 2FA on every run.
- 🎯 **Target Server Filtering:** Specifically targets your server ID (`1297484076407853147`) and ignores other servers on your account.
- 🔔 **Discord Webhook Notifications:** Optional embed alerts to your Discord channel when your server is bumped or on cooldown.

---

## 1. Quick Start

### Step 1: Install Dependencies
```bash
npm install
npx playwright install chromium
```

### Step 2: Configure Environment
Copy `.env.example` to `.env` (already done) and verify:
```env
# Disboard Server Snowflake ID
DISBOARD_SERVER_ID=1297484076407853147

# Cooldown fallback (4 hours 10 mins = 250 mins)
DISBOARD_BUMP_INTERVAL_MINUTES=250

# Optional Discord Webhook for notifications
DISCORD_WEBHOOK_URL=
```

### Step 3: Authenticate with Discord (One-Time Setup)
```bash
npm run login
```
1. A Chrome browser window will open displaying Disboard.
2. Complete the Cloudflare verification and log into Discord.
3. Once your dashboard is visible, return to your terminal and press **`[ENTER]`**.

---

## 2. Running Locally

- **Single bump run:**
  ```bash
  HEADLESS=false npm run bump
  ```
- **Continuous scheduler daemon:**
  ```bash
  HEADLESS=false npm run start
  ```

---

## 3. Automated Scheduling with GitHub Actions

The repository includes a GitHub Actions workflow in [`.github/workflows/bump-disboard.yml`](file:///home/mohit/code/Discord-bump-workflow/.github/workflows/bump-disboard.yml) scheduled for **every 4 hours and 10 minutes** (`cron: '10 */4 * * *'`).

### Step 1: Export Your Session
```bash
npm run export-secret
```
Copy the JSON output (or the full contents of `storage-state.json`).

### Step 2: Add Secrets to GitHub
In your GitHub repository (*Settings → Secrets and variables → Actions → New repository secret*):
* `STORAGE_STATE_JSON`: Paste your session JSON
* `DISBOARD_SERVER_ID`: `1297484076407853147`
* `DISCORD_WEBHOOK_URL`: *(Optional)* Webhook URL for alerts

### Step 3: Push & Run
```bash
git add .
git commit -m "Configure Disboard 4h 10m bump workflow"
git push
```
Go to the **Actions** tab in GitHub and click **Disboard Bumper** → **Run workflow**.

---

## Project Structure

```
├── src/
│   ├── browser.ts         # Persistent browser context & stealth setup
│   ├── bump-disboard.ts   # Disboard dashboard bump logic & cooldown tracker
│   ├── config.ts          # Environment and configuration loader
│   ├── export-secret.ts   # Helper to export session JSON for GitHub Secrets
│   ├── index.ts           # Master daemon scheduler
│   ├── login.ts           # One-time interactive Discord login session
│   └── notifier.ts        # Discord webhook alerts & logger
├── .github/workflows/
│   └── bump-disboard.yml  # GitHub Actions 4h 10m scheduler
├── storage-state.json     # Saved login cookies (gitignored)
├── user-data/             # Saved Chromium profile (gitignored)
├── .env                   # Configuration (gitignored)
└── package.json
```
