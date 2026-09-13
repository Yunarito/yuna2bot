import initialize from './initialize';
const Table = require('./dbTable.js');
const { syncSubscriptions } = require('./eventSub.js');

// Periodically re-pulls DB state that the website's panel can change, so
// those changes show up without restarting the bot. Before this, channel
// settings and timed messages were only ever read once per channel (on that
// channel's first message after a bot restart - see channelSettings.js's
// loadChannelSettings), and a new/reconnected "let bot join" authorization
// needed a restart to get its EventSub subscription created.

const channelSettingsTable = new Table('channel_settings');
const timedMessagesTable = new Table('timed_messages');

const POLL_INTERVAL_MS = 30 * 1000;

async function syncChannelSettings(channel) {
  const channelInfo = initialize.channelsInfo[channel];
  if (!channelInfo) return;

  const row = await channelSettingsTable.findOne({ channel });
  if (!row) return;

  channelInfo.enabled = !!row.queue_enabled;
  channelInfo.timeoutTime = row.timeout_time;
  channelInfo.happyHour = !!row.happy_hour;
  channelInfo.cooldownEnabled = !!row.cooldown_enabled;
  channelInfo.locale = row.locale;
}

// Reconciles the in-memory timed-message list with the DB by position,
// preserving each entry's in-progress `counter` where the message itself is
// unchanged, so a website edit to one message doesn't reset every message's
// cadence.
async function syncTimedMessages(channel) {
  const channelInfo = initialize.channelsInfo[channel];
  if (!channelInfo) return;

  const rows = await timedMessagesTable.findMany({ channel }, { orderBy: 'position ASC' });

  channelInfo.timedMessages = rows.map((row, index) => {
    const existing = channelInfo.timedMessages[index];
    const unchanged = existing && existing.text === row.message && existing.interval === row.message_interval;
    return {
      text: row.message,
      interval: row.message_interval,
      enabled: !!row.enabled,
      counter: unchanged ? existing.counter : 0,
    };
  });
}

async function syncTick() {
  // Only channels the bot has actually seen a message from have an in-memory
  // entry to update - matches loadChannelSettings' existing lazy-init model.
  for (const channel of Object.keys(initialize.channelsInfo)) {
    try {
      await syncChannelSettings(channel);
      await syncTimedMessages(channel);
    } catch (error) {
      console.error(`Error syncing config for ${channel}:`, error);
    }
  }

  try {
    await syncSubscriptions();
  } catch (error) {
    console.error('Error syncing EventSub subscriptions:', error);
  }
}

export function startConfigSync() {
  setInterval(() => {
    syncTick().catch((error) => console.error('Error during config sync tick:', error));
  }, POLL_INTERVAL_MS).unref();
}
