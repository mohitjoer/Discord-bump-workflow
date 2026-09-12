import { config } from './config.js';

export async function sendNotification(title: string, message: string, success: boolean = true) {
  const timestamp = new Date().toISOString();
  const icon = success ? '✅' : '⚠️';
  console.log(`[${timestamp}] ${icon} [${title}] ${message}`);

  if (!config.webhookUrl) {
    return;
  }

  try {
    const payload = {
      embeds: [
        {
          title: `${icon} ${title}`,
          description: message,
          color: success ? 0x57f287 : 0xed4245,
          timestamp,
          footer: {
            text: 'Discord Bump Automation',
          },
        },
      ],
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn(`[Notifier] Failed to send webhook notification:`, error);
  }
}
