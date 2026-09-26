const WebSocket = require('ws');
const fetch = require('node-fetch');
const Table = require('./dbTable.js');
const { getBroadcasterAccessToken } = require('./broadcasterAuth.js');
const { handleRedemption } = require('./excavation.js');

require('dotenv').config();
const CLIENT_ID = process.env.CLIENT_ID;

const channelBotAuthTable = new Table('channel_bot_auth');

const EVENTSUB_WS_URL = 'wss://eventsub.wss.twitch.tv/ws';
const RECONNECT_DELAY_MS = 5000;
// Twitch announces its keepalive interval in session_welcome (10s by default)
// and promises *some* message within it - silence past that plus this margin
// means the connection is dead even if no close event ever arrived.
const DEFAULT_KEEPALIVE_TIMEOUT_SECONDS = 10;
const KEEPALIVE_MARGIN_SECONDS = 5;

// Tracks whichever socket is currently the "live" one, so a close event on a
// socket we've already migrated away from (see session_reconnect below)
// doesn't also trigger a reconnect.
let socket = null;
let currentSessionId = null;

// Channels already subscribed under the *current* session - a subscription
// doesn't carry over to a new session, so this is cleared on every welcome.
// Lets configSync.js call syncSubscriptions() on a timer to pick up a channel
// that just did "let bot join" (or reconnected with a new scope) without
// needing to restart the bot, while skipping ones already handled this session.
const subscribedChannels = new Set();
// broadcaster_user_id -> channel, so a revocation (which only carries the
// subscription's condition) can un-mark the right channel for resubscribing.
const channelsByBroadcasterId = new Map();

function hasRedemptionsScope(row) {
  return (row.scope || '').split(' ').includes('channel:read:redemptions');
}

// Channel Point redemption events are only delivered over EventSub, and its
// WebSocket transport requires a *user* access token with channel:read:redemptions
// scope (the broadcaster's own, from broadcasterAuth.js / the website's "let bot
// join" flow) - an app access token won't work here, unlike webhook-transport EventSub.
// Skip reasons are logged once per channel per reason (this runs every 30s
// from configSync.js), so a silently-skipped channel is visible without spam.
const warnedSkips = new Set();
function warnSkipOnce(channel, reason) {
  const key = `${channel}:${reason}`;
  if (warnedSkips.has(key)) return;
  warnedSkips.add(key);
  console.warn(`EventSub: not subscribing ${channel} - ${reason}`);
}

async function subscribeChannel(row) {
  if (!currentSessionId || subscribedChannels.has(row.channel)) return;

  if (!hasRedemptionsScope(row)) {
    warnSkipOnce(row.channel, `stored scope "${row.scope}" lacks channel:read:redemptions (use "let bot join" again)`);
    return;
  }

  try {
    const token = await getBroadcasterAccessToken(row.channel);
    if (!token) {
      warnSkipOnce(row.channel, 'no usable access token');
      return;
    }

    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Client-Id': CLIENT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'channel.channel_points_custom_reward_redemption.add',
        version: '1',
        condition: { broadcaster_user_id: row.twitch_user_id },
        transport: { method: 'websocket', session_id: currentSessionId },
      }),
    });

    // 409 means a subscription for this condition already exists under this
    // session (e.g. a race between two sync ticks) - treat as success.
    if (response.ok || response.status === 409) {
      subscribedChannels.add(row.channel);
      channelsByBroadcasterId.set(row.twitch_user_id, row.channel);
      if (response.ok) console.log(`Subscribed to Channel Point redemptions for ${row.channel}.`);
    } else {
      console.error(`Failed to subscribe to redemptions for ${row.channel}:`, response.status, await response.text());
    }
  } catch (error) {
    console.error(`Error subscribing to redemptions for ${row.channel}:`, error);
  }
}

// Called on session_welcome (subscribes everyone) and by configSync.js's
// poller (subscribes whatever's new since the last tick) - subscribeChannel
// is idempotent per session, so both call sites share it safely.
async function syncSubscriptions() {
  const rows = await channelBotAuthTable.findMany();
  for (const row of rows) {
    await subscribeChannel(row);
  }
}

function handleNotification(message) {
  if (message.metadata.subscription_type !== 'channel.channel_points_custom_reward_redemption.add') return;

  const event = message.payload.event;
  const channel = `#${event.broadcaster_user_login}`;
  console.log(`EventSub: redemption on ${channel} by ${event.user_login}, reward "${event.reward.title}" (${event.reward.id})`);
  handleRedemption(channel, event).catch((error) => {
    console.error(`Error handling redemption for ${channel}:`, error);
  });
}

// Without this, a revoked subscription stayed in subscribedChannels, so the
// 30s sync kept skipping the channel and redemptions stopped until a restart.
function handleRevocation(subscription) {
  console.error(`EventSub subscription revoked (${subscription.status}):`, subscription);

  const channel = channelsByBroadcasterId.get(subscription.condition?.broadcaster_user_id);
  if (channel) {
    subscribedChannels.delete(channel);
    console.warn(`EventSub: will resubscribe ${channel} on the next sync.`);
  }
}

function connect(url = EVENTSUB_WS_URL, previousSocket = null) {
  const ws = new WebSocket(url);
  let welcomed = false;
  let watchdog = null;
  let watchdogMs = (DEFAULT_KEEPALIVE_TIMEOUT_SECONDS + KEEPALIVE_MARGIN_SECONDS) * 1000;

  // A half-open connection (network blip, NAT timeout, ...) never fires
  // 'close', which used to leave the bot silently deaf to redemptions until
  // a restart. Terminating it hands over to the normal reconnect path below.
  // Armed right away, so a connection that never gets a welcome is caught too.
  function resetWatchdog() {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      console.warn(`EventSub: no message for ${watchdogMs / 1000}s, reconnecting.`);
      ws.terminate();
    }, watchdogMs);
  }
  resetWatchdog();

  ws.on('message', (raw) => {
    if (!ws.handingOver) resetWatchdog();

    let message;
    try {
      message = JSON.parse(raw);
    } catch (error) {
      console.error('Failed to parse EventSub message:', error);
      return;
    }

    switch (message.metadata.message_type) {
      case 'session_welcome':
        welcomed = true;
        watchdogMs = ((message.payload.session.keepalive_timeout_seconds || DEFAULT_KEEPALIVE_TIMEOUT_SECONDS)
          + KEEPALIVE_MARGIN_SECONDS) * 1000;
        resetWatchdog();
        socket = ws;
        currentSessionId = message.payload.session.id;
        subscribedChannels.clear();
        // Only close the old connection once the new one is confirmed live,
        // so we don't drop events during the handover.
        if (previousSocket) previousSocket.close();
        syncSubscriptions().catch((error) => {
          console.error('Error subscribing after session_welcome:', error);
        });
        break;
      case 'session_reconnect':
        // Twitch stops keepalives on this socket now; the new one's own
        // watchdog covers a handover that never completes.
        ws.handingOver = true;
        clearTimeout(watchdog);
        connect(message.payload.session.reconnect_url, ws);
        break;
      case 'notification':
        handleNotification(message);
        break;
      case 'revocation':
        handleRevocation(message.payload.subscription);
        break;
      case 'session_keepalive':
        break;
    }
  });

  ws.on('close', () => {
    clearTimeout(watchdog);

    // A session_reconnect handover that died before its welcome: fall back to
    // a fresh connection, via the old socket's own close if it's still open.
    if (!welcomed && previousSocket) {
      if (previousSocket.readyState === WebSocket.CLOSED) {
        setTimeout(() => connect(), RECONNECT_DELAY_MS);
      } else {
        previousSocket.handingOver = false;
        previousSocket.terminate();
      }
      return;
    }

    if (socket === ws) {
      socket = null;
      currentSessionId = null;
      // Mid-handover, the replacement socket takes it from here.
      if (ws.handingOver) return;
    } else if (socket !== null) {
      // An old socket we already migrated away from.
      return;
    }

    // Also reached when the very first connection fails before its welcome
    // (socket is still null), which previously never retried.
    setTimeout(() => connect(), RECONNECT_DELAY_MS);
  });

  ws.on('error', (error) => {
    console.error('EventSub WebSocket error:', error);
  });
}

function startEventSub() {
  connect();
}

module.exports = { startEventSub, syncSubscriptions };
