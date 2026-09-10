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

export function saveTimedMessages(channel) {
  const channelInfo = initialize.channelsInfo[channel];
  if (!channelInfo) return;

  const messages = channelInfo.timedMessages;

  (async () => {
    try {
      await db.query('DELETE FROM timed_messages WHERE channel = ?', [channel]);
      if (messages.length > 0) {
        const values = messages.map((entry, position) => [
          channel,
          position,
          entry.text,
          entry.interval,
          entry.enabled ? 1 : 0,
        ]);
        await db.query(
          'INSERT INTO timed_messages (channel, position, message, message_interval, enabled) VALUES ?',
          [values]
        );
      }
    } catch (err) {
      console.error(`Error saving timed messages for ${channel}:`, err);
    }
  })();
}
