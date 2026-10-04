import client from './app.js';
import { twitchFetch, getUserId } from './twitchApi.js';
import { t } from './i18n.js';
const pool = require('./db.js');
const Table = require('./dbTable.js');

require('dotenv').config();
const BOT_USERNAME = process.env.BOT_USERNAME;

// Twitch doesn't expose per-viewer watchtime, so this approximates it the same
// way StreamElements & co. do: every POLL_INTERVAL_MS, for each joined channel
// that's live, credit everyone currently in chat (Helix Get Chatters) with one
// interval's worth of seconds. Needs the bot's token to have
// moderator:read:chatters and the bot to be a mod in the channel. Anonymous
// viewers aren't in the chatter list and are never counted.

const watchtimeTable = new Table('viewer_watchtime');

// Only these channels are tracked and get the !watchtime command.
const WATCHTIME_CHANNELS = new Set(['#yunarito', '#itzpinky_']);

export function isWatchtimeChannel(channel) {
  return WATCHTIME_CHANNELS.has(channel);
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const POLL_INTERVAL_SECONDS = POLL_INTERVAL_MS / 1000;

// Other bots sit in chat 24/7 and would otherwise top every leaderboard.
const IGNORED_LOGINS = new Set([
  (BOT_USERNAME || '').toLowerCase(),
  'streamelements',
  'streamlabs',
  'nightbot',
  'moobot',
  'fossabot',
  'wizebot',
  'sery_bot',
  'soundalerts',
  'commanderroot',
]);

// Returns the set of logins (without '#') that are currently live.
async function getLiveLogins(logins) {
  const query = logins.map((login) => `user_login=${encodeURIComponent(login)}`).join('&');
  const response = await twitchFetch(`https://api.twitch.tv/helix/streams?${query}`);

  if (!response.ok) {
    console.error(`Watchtime: failed to get stream status: ${response.status}`, await response.json());
    return new Set();
  }

  const data = await response.json();
  return new Set(data.data.map((stream) => stream.user_login.toLowerCase()));
}

async function getChatters(broadcasterId, moderatorId) {
  const chatters = [];
  let cursor = null;

  do {
    let url = `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&first=1000`;
    if (cursor) url += `&after=${cursor}`;

    const response = await twitchFetch(url);
    if (!response.ok) {
      // 403 = bot isn't a mod there or the token is missing moderator:read:chatters.
      throw new Error(`Get Chatters failed: ${response.status} ${JSON.stringify(await response.json())}`);
    }

    const data = await response.json();
    chatters.push(...data.data);
    cursor = data.pagination && data.pagination.cursor;
  } while (cursor);

  return chatters;
}

async function creditChatters(channel, chatters) {
  const now = new Date();
  const rows = chatters
    .filter((chatter) => !IGNORED_LOGINS.has(chatter.user_login))
    .map((chatter) => [channel, chatter.user_id, chatter.user_login, POLL_INTERVAL_SECONDS, now]);

  if (rows.length === 0) return;

  // Bulk version of watchtimeTable.upsert - one query per poll instead of one
  // per viewer.
  await pool.query(
    `INSERT INTO viewer_watchtime (channel, user_id, user_login, seconds, last_seen) VALUES ?
     ON DUPLICATE KEY UPDATE seconds = seconds + VALUES(seconds), user_login = VALUES(user_login), last_seen = VALUES(last_seen)`,
    [rows]
  );
}

async function pollTick() {
  const channels = client.getChannels().filter(isWatchtimeChannel);
  if (channels.length === 0) return;

  const liveLogins = await getLiveLogins(channels.map((channel) => channel.replace('#', '')));
  if (liveLogins.size === 0) return;

  const moderatorId = await getUserId(BOT_USERNAME);
  if (!moderatorId) return;

  for (const channel of channels) {
    const login = channel.replace('#', '');
    if (!liveLogins.has(login)) continue;

    try {
      const broadcasterId = await getUserId(login);
      if (!broadcasterId) continue;

      const chatters = await getChatters(broadcasterId, moderatorId);
      await creditChatters(channel, chatters);
    } catch (error) {
      console.error(`Watchtime: error polling ${channel}:`, error.message || error);
    }
  }
}

export function startWatchtimeTracking() {
  setInterval(() => {
    pollTick().catch((error) => console.error('Watchtime: error during poll tick:', error));
  }, POLL_INTERVAL_MS).unref();
}

function formatDuration(channel, totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  let duration = '';
  if (hours > 0) duration += `${hours} ${t(channel, 'uptime.hours')}` + (minutes > 0 ? ', ' : '');
  if (minutes > 0 || hours === 0) duration += `${minutes} ${t(channel, 'uptime.minutes')}`;
  return duration;
}

// !watchtime [user] - defaults to the person asking.
export async function getWatchtime(channel, userstate, message) {
  const target = (message.split(' ')[1] || userstate.username).replace('@', '').toLowerCase();

  try {
    const row = await watchtimeTable.findOne({ channel, user_login: target });

    if (!row || row.seconds === 0) {
      client.say(channel, t(channel, 'watchtime.none', { user: target }));
      return;
    }

    client.say(channel, t(channel, 'watchtime.result', {
      user: target,
      channel: channel.replace('#', ''),
      duration: formatDuration(channel, row.seconds),
    }));
  } catch (error) {
    console.error(`Error fetching watchtime for ${target} in ${channel}:`, error);
    client.say(channel, t(channel, 'errors.generic'));
  }
}
