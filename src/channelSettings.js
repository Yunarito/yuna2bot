import initialize from './initialize';
import { getLocale } from './i18n';
const db = require('./db.js');

// Loads the persisted settings for a channel from the DB into the in-memory
// channelsInfo cache. Fire-and-forget from app.js on a channel's first
// message; until it resolves, the hardcoded defaults from initialize.js are
// used, matching how the rest of the bot treats in-memory state as the
// fast/live copy and the DB as the durable backing store.
export async function loadChannelSettings(channel) {
  const channelInfo = initialize.channelsInfo[channel];
  if (!channelInfo) return;

  try {
    const [rows] = await db.query(
      'SELECT queue_enabled, timeout_time, happy_hour, locale FROM channel_settings WHERE channel = ?',
      [channel]
    );

    if (rows[0]) {
      const row = rows[0];
      channelInfo.enabled = !!row.queue_enabled;
      channelInfo.timeoutTime = row.timeout_time;
      channelInfo.happyHour = !!row.happy_hour;
      channelInfo.locale = row.locale;
    }

    const [messageRows] = await db.query(
      'SELECT message, message_interval, enabled FROM timed_messages WHERE channel = ? ORDER BY position ASC',
      [channel]
    );

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

  db.query(
    `INSERT INTO channel_settings (channel, queue_enabled, timeout_time, happy_hour, locale)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       queue_enabled = VALUES(queue_enabled),
       timeout_time = VALUES(timeout_time),
       happy_hour = VALUES(happy_hour),
       locale = VALUES(locale)`,
    [
      channel,
      channelInfo.enabled ? 1 : 0,
      channelInfo.timeoutTime,
      channelInfo.happyHour ? 1 : 0,
      getLocale(channel),
    ]
  ).catch(err => console.error(`Error saving channel settings for ${channel}:`, err));
}

// `position` is the 0-based index of the message within a channel's
// timedMessages array - it doubles as the DB row's position and is what
// (channel, position) uniquely identifies, so the functions below can target
// a single row instead of rewriting the whole list on every mutation.

export function insertTimedMessage(channel, position, entry) {
  db.query(
    'INSERT INTO timed_messages (channel, position, message, message_interval, enabled) VALUES (?, ?, ?, ?, ?)',
    [channel, position, entry.text, entry.interval, entry.enabled ? 1 : 0]
  ).catch(err => console.error(`Error inserting timed message for ${channel}:`, err));
}

// Deletes the row at `position` and shifts every later row's position down
// by one so positions stay contiguous (0..n-1) and keep matching the
// in-memory array's indices after the splice.
export function deleteTimedMessage(channel, position) {
  (async () => {
    try {
      await db.query('DELETE FROM timed_messages WHERE channel = ? AND position = ?', [channel, position]);
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
  const query = position == null
    ? db.query('UPDATE timed_messages SET enabled = ? WHERE channel = ?', [enabled ? 1 : 0, channel])
    : db.query('UPDATE timed_messages SET enabled = ? WHERE channel = ? AND position = ?', [enabled ? 1 : 0, channel, position]);

  query.catch(err => console.error(`Error updating timed message enabled flag for ${channel}:`, err));
}

export function updateTimedMessageInterval(channel, position, interval) {
  db.query(
    'UPDATE timed_messages SET message_interval = ? WHERE channel = ? AND position = ?',
    [interval, channel, position]
  ).catch(err => console.error(`Error updating timed message interval for ${channel}:`, err));
}
