const fetch = require('node-fetch');
const Table = require('./dbTable.js');

require('dotenv').config();

// Reads/refreshes the *broadcaster's* own OAuth grant (needed for EventSub
// Channel Points subscriptions), separate from the bot account's token in
// twitchAuth.js. This table is owned by the yunarito-web Laravel app's
// "let bot join" flow (app/Http/Controllers/TwitchAuthController.php,
// channel_bot_auth table) - both apps share the same MySQL database, so the
// bot just reads what the website's OAuth callback already wrote, and writes
// refreshed tokens back to the same row (the website itself has no refresh
// logic, so this is the only thing keeping these tokens alive past their
// first ~4 hours).

const REDEMPTIONS_SCOPE = 'channel:read:redemptions';

const channelBotAuthTable = new Table('channel_bot_auth');

const refreshTimers = {};
const REFRESH_MARGIN_SECONDS = 600;

function scheduleBroadcasterRefresh(channel, expiresInSeconds) {
  if (refreshTimers[channel]) clearTimeout(refreshTimers[channel]);

  const refreshInMs = Math.max((expiresInSeconds - REFRESH_MARGIN_SECONDS) * 1000, 60 * 1000);
  refreshTimers[channel] = setTimeout(() => {
    refreshBroadcasterAccessToken(channel).catch((error) => {
      console.error(`Scheduled broadcaster token refresh failed for ${channel}:`, error);
    });
  }, refreshInMs);
  refreshTimers[channel].unref();
}

async function refreshBroadcasterAccessToken(channel) {
  const tokenRow = await channelBotAuthTable.findOne({ channel });
  if (!tokenRow) {
    throw new Error(`No channel_bot_auth row for ${channel} - streamer needs to use "let bot join" on the website first.`);
  }

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRow.refresh_token,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh broadcaster token for ${channel}: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await channelBotAuthTable.update(
    { channel },
    { access_token: data.access_token, refresh_token: data.refresh_token, token_expires_at: expiresAt }
  );

  scheduleBroadcasterRefresh(channel, data.expires_in);
  return data.access_token;
}

// Returns null if the channel hasn't used "let bot join" at all, or hasn't
// granted the redemptions scope (e.g. they connected before it was added, or
// only need the bot for chat and never re-authorized).
async function getBroadcasterAccessToken(channel) {
  const tokenRow = await channelBotAuthTable.findOne({ channel });
  if (!tokenRow || !hasRedemptionsScope(tokenRow)) return null;

  const secondsLeft = (new Date(tokenRow.token_expires_at).getTime() - Date.now()) / 1000;
  if (secondsLeft <= REFRESH_MARGIN_SECONDS) {
    return refreshBroadcasterAccessToken(channel);
  }

  return tokenRow.access_token;
}

function hasRedemptionsScope(tokenRow) {
  return (tokenRow.scope || '').split(' ').includes(REDEMPTIONS_SCOPE);
}

// Call once at startup: schedules a refresh for every channel_bot_auth row
// that has the redemptions scope, refreshing immediately if one is already due.
async function initBroadcasterTokens() {
  const rows = await channelBotAuthTable.findMany();

  for (const row of rows) {
    if (!hasRedemptionsScope(row)) continue;

    const secondsLeft = (new Date(row.token_expires_at).getTime() - Date.now()) / 1000;
    try {
      if (secondsLeft <= REFRESH_MARGIN_SECONDS) {
        await refreshBroadcasterAccessToken(row.channel);
      } else {
        scheduleBroadcasterRefresh(row.channel, secondsLeft);
      }
    } catch (error) {
      console.error(`Failed to initialize broadcaster token for ${row.channel}:`, error);
    }
  }
}

module.exports = {
  getBroadcasterAccessToken,
  refreshBroadcasterAccessToken,
  initBroadcasterTokens,
};
