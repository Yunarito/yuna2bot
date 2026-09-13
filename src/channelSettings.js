import initialize from './initialize';
import { getLocale } from './i18n';
const db = require('./db.js');
const Table = require('./dbTable.js');

const channelSettingsTable = new Table('channel_settings');
const timedMessagesTable = new Table('timed_messages');

// Loads the persisted settings for a channel from the DB into the in-memory
// channelsInfo cache. Fire-and-forget from app.js on a channel's first
// message; until it resolves, the hardcoded defaults from initialize.js are
// used, matching how the rest of the bot treats in-memory state as the
// fast/live copy and the DB as the durable backing store.
export async function loadChannelSettings(channel) {
  const channelInfo = initialize.channelsInfo[channel];
  if (!channelInfo) return;

  try {
    const row = await channelSettingsTable.findOne({ channel });

    if (row) {
      channelInfo.enabled = !!row.queue_enabled;
      channelInfo.timeoutTime = row.timeout_time;
      channelInfo.happyHour = !!row.happy_hour;
      channelInfo.cooldownEnabled = !!row.cooldown_enabled;
      channelInfo.locale = row.locale;
    }

    const messageRows = await timedMessagesTable.findMany({ channel }, { orderBy: 'position ASC' });

    // Only apply if nothing has mutated the list since this load started
    // (e.g. a mod running !addtimedmessage before this query resolved) -
    // otherwise this stale read would clobber that newer in-memory change.
    if (channelInfo.timedMessages.length === 0) {
      channelInfo.timedMessages = messageRows.map(row => ({
        text: row.message,
        interval: row.message_interval,
        enabled: !!row.enabled,
        counter: 0,
      }));
    }
  } catch (err) {
    console.error(`Error loading channel settings for ${channel}:`, err);
  }
}

export function saveChannelSettings(channel) {
  const channelInfo = initialize.channelsInfo[channel];
  if (!channelInfo) return;

  channelSettingsTable.upsert(
    {
      channel,
      queue_enabled: channelInfo.enabled ? 1 : 0,
      timeout_time: channelInfo.timeoutTime,
      happy_hour: channelInfo.happyHour ? 1 : 0,
      cooldown_enabled: channelInfo.cooldownEnabled ? 1 : 0,
      locale: getLocale(channel),
    },
    { overwrite: ['queue_enabled', 'timeout_time', 'happy_hour', 'cooldown_enabled', 'locale'] }
  ).catch(err => console.error(`Error saving channel settings for ${channel}:`, err));
}

// `position` is the 0-based index of the message within a channel's
// timedMessages array - it doubles as the DB row's position and is what
// (channel, position) uniquely identifies, so the functions below can target
// a single row instead of rewriting the whole list on every mutation.

export function insertTimedMessage(channel, position, entry) {
  timedMessagesTable.insert({
    channel,
    position,
    message: entry.text,
    message_interval: entry.interval,
    enabled: entry.enabled ? 1 : 0,
  }).catch(err => console.error(`Error inserting timed message for ${channel}:`, err));
}

// Deletes the row at `position` and shifts every later row's position down
// by one so positions stay contiguous (0..n-1) and keep matching the
// in-memory array's indices after the splice. The shift is a `position > ?`
// range update, which doesn't fit the generic equality-only Table helper, so
// it goes straight through the pool.
export function deleteTimedMessage(channel, position) {
  (async () => {
    try {
      await timedMessagesTable.deleteWhere({ channel, position });
      await db.query(
        'UPDATE timed_messages SET position = position - 1 WHERE channel = ? AND position > ?',
        [channel, position]
      );
    } catch (err) {
      console.error(`Error deleting timed message for ${channel}:`, err);
    }
  })();
}

// `position` null/undefined updates every row for the channel (the "all" target).
export function updateTimedMessageEnabled(channel, position, enabled) {
  const where = position == null ? { channel } : { channel, position };

  timedMessagesTable.update(where, { enabled: enabled ? 1 : 0 })
    .catch(err => console.error(`Error updating timed message enabled flag for ${channel}:`, err));
}

export function updateTimedMessageInterval(channel, position, interval) {
  timedMessagesTable.update({ channel, position }, { message_interval: interval })
    .catch(err => console.error(`Error updating timed message interval for ${channel}:`, err));
}
