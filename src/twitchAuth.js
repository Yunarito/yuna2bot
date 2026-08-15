const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

require('dotenv').config();

const ENV_PATH = path.resolve(__dirname, '..', '.env');

// Refresh this many seconds before the token actually expires.
const REFRESH_MARGIN_SECONDS = 600;

let currentAccessToken = process.env.OAUTH_TOKEN
  ? process.env.OAUTH_TOKEN.replace('oauth:', '')
  : null;
let refreshTimer = null;

function updateEnvFile(values) {
  let content = fs.readFileSync(ENV_PATH, 'utf8');

  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    content = regex.test(content) ? content.replace(regex, line) : `${content}\n${line}`;
  }

  fs.writeFileSync(ENV_PATH, content);
}

function scheduleRefresh(expiresInSeconds) {
  if (refreshTimer) clearTimeout(refreshTimer);

  const refreshInMs = Math.max((expiresInSeconds - REFRESH_MARGIN_SECONDS) * 1000, 60 * 1000);
  refreshTimer = setTimeout(() => {
    refreshAccessToken().catch((error) => {
      console.error('Scheduled Twitch token refresh failed:', error);
    });
  }, refreshInMs);
  refreshTimer.unref();
}

async function refreshAccessToken() {
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.REFRESH_TOKEN,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh Twitch token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  currentAccessToken = data.access_token;
  process.env.OAUTH_TOKEN = `oauth:${data.access_token}`;
  process.env.REFRESH_TOKEN = data.refresh_token;

  updateEnvFile({
    OAUTH_TOKEN: `'oauth:${data.access_token}'`,
    REFRESH_TOKEN: `'${data.refresh_token}'`,
  });

  console.log('Twitch OAuth token refreshed successfully.');
  scheduleRefresh(data.expires_in);

  return currentAccessToken;
}

async function validateAndScheduleInitialRefresh() {
  if (!currentAccessToken) {
    await refreshAccessToken();
    return;
  }

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${currentAccessToken}` },
    });

    if (response.ok) {
      const data = await response.json();
      scheduleRefresh(data.expires_in);
      return;
    }
  } catch (error) {
    console.error('Failed to validate Twitch token, refreshing instead:', error);
  }

  await refreshAccessToken();
}

function getAccessToken() {
  return currentAccessToken;
}

module.exports = {
  getAccessToken,
  refreshAccessToken,
  validateAndScheduleInitialRefresh,
  updateEnvFile,
};
