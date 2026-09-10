const fetch = require('node-fetch');
import client from './app.js';
import initialize from './initialize';
import { getAccessToken, refreshAccessToken } from './twitchAuth.js';
import { t } from './i18n';

require('dotenv').config();
const BOT_USERNAME = process.env.BOT_USERNAME;
const CLIENT_ID = process.env.CLIENT_ID;
const CHANNEL_NAME = process.env.CHANNEL_NAME;

// Shared fetch wrapper: attaches auth headers and, on a 401, refreshes the
// token once and retries before giving up.
async function twitchFetch(url, options = {}) {
  const doFetch = (token) => fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Client-Id': CLIENT_ID,
    },
  });

  let response = await doFetch(getAccessToken());

  if (response.status === 401) {
    await refreshAccessToken();
    response = await doFetch(getAccessToken());
  }

  return response;
}


export async function timeout(user, channel, duration) {
    let userId = await getUserId(user.replace('#', ''));
    let broadcasterId = await getUserId(channel.replace('#', ''));
    let moderatorId = await getUserId(BOT_USERNAME);

    const url = `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`;
    const body = {
        data: {
        user_id: userId,
        duration: duration, // Duration in seconds (300 seconds = 5 minutes)
        },
    };

    try {
        const response = await twitchFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        });

        if (response.ok) {
        const responseData = await response.json();
        } else {
        const errorData = await response.json();
        console.error(`Failed to timeout user: ${response.status} - ${response.statusText}`);
        console.error(errorData);
        }
    } catch (error) {
        console.error('Error making the API call:', error);
    }
}

export async function getFollowage(user, channel) {
  try {
    // Hole die IDs des Benutzers und des Kanals
    const userId = await getUserId(user.replace('#', ''));
    const channelId = await getUserId(channel.replace('#', ''));

    if (!userId || !channelId) {
      console.log('Benutzer oder Kanal nicht gefunden.');
      return t(channel, 'followage.error', { user });
    }

    // API-Aufruf zum Abrufen der Follower-Daten
    const url = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${channelId}&user_id=${userId}`;

    const response = await twitchFetch(url);

    if (response.ok) {
      const data = await response.json();
      console.log(data);


      if (data.data.length > 0) {
        const followDate = new Date(data.data[0].followed_at);
        const duration = calculateFollowDuration(followDate);

        let result = t(channel, 'followage.prefix', { user });
        if (duration.years > 0) result += ` ${duration.years} ${t(channel, 'followage.years')}` + (duration.months > 0 || duration.weeks > 0 || duration.days > 0 ? ', ' : '');
        if (duration.months > 0) result += `${duration.months} ${t(channel, 'followage.months')}` + (duration.weeks > 0 || duration.days > 0 ? ', ' : '');
        if (duration.weeks > 0) result += `${duration.weeks} ${t(channel, 'followage.weeks')}` + (duration.days > 0 ? ', ' : '');
        if (duration.days > 0) result += `${duration.days} ${t(channel, 'followage.days')}`;

        client.say(channel, result);
      } else {
        client.say(channel, t(channel, 'followage.notFollowing', { user, channel }));
      }
    } else {
      const errorData = await response.json();
      console.error(`Fehler beim Abrufen der Follow-Daten: ${response.status} - ${response.statusText}`);
      console.error(errorData);
      client.say(channel, t(channel, 'followage.fetchError', { user }));
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Follow-Dauer:', error);
    client.say(channel, t(channel, 'followage.fetchError', { user }));
  }
}

export async function getUptime(channel) {
  try {
    const channelId = await getUserId(channel.replace('#', ''));
    const url = `https://api.twitch.tv/helix/streams?user_id=${channelId}`;

    const response = await twitchFetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Failed to get stream info: ${response.status} - ${response.statusText}`);
      console.error(errorData);
      client.say(channel, t(channel, 'uptime.error', { channel: channel.replace('#', '') }));
      return;
    }

    const data = await response.json();

    if (data.data.length === 0) {
      client.say(channel, t(channel, 'uptime.offline', { channel: channel.replace('#', '') }));
      return;
    }

    const startedAt = new Date(data.data[0].started_at);
    const diff = new Date() - startedAt;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let duration = '';
    if (hours > 0) duration += `${hours} ${t(channel, 'uptime.hours')}` + (minutes > 0 ? ', ' : '');
    if (minutes > 0 || hours === 0) duration += `${minutes} ${t(channel, 'uptime.minutes')}`;

    client.say(channel, t(channel, 'uptime.live', { channel: channel.replace('#', ''), duration }));
  } catch (error) {
    console.error('Error fetching uptime:', error);
    client.say(channel, t(channel, 'uptime.error', { channel: channel.replace('#', '') }));
  }
}

export async function banUser(user, channel) {

  //check the user age if its younger than 30 days, then ban the user
  const userId = await getUserId(user.replace('#', ''));
  const channelId = await getUserId(channel.replace('#', ''));
  const moderatorId = await getUserId(BOT_USERNAME);
  const ageUrl = `https://api.twitch.tv/helix/users/follows?from_id=${userId}&to_id=${channelId}`;

  try {
    const ageResponse = await twitchFetch(ageUrl);

    if (ageResponse.ok) {
      const ageData = await ageResponse.json();
      if (ageData.data.length > 0) {
        const followDate = new Date(ageData.data[0].followed_at);
        const now = new Date();
        const diff = now - followDate;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days < 30) {
          console.log(`User ${user} is younger than 30 days old. Banning...`);
        } else {
          console.log(`User ${user} is older than 30 days old. Not banning.`);
          return;
        }
      }
    } else {
      const errorData = await ageResponse.json();
      console.error(`Failed to get user age: ${ageResponse.status} - ${ageResponse.statusText}`);
      console.error(errorData);
    }


    const url = `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channelId}&moderator_id=${moderatorId}`;

    const body = {
      data: {
        user_id: userId,
        reason: "nice try"
      },
    };

    const response = await twitchFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      console.log(`User ${user} has been banned from channel ${channel}.`);
    } else {
      const errorData = await response.json();
      console.error(`Failed to ban user: ${response.status} - ${response.statusText}`);
      console.error(errorData);
    }
  } catch (error) {
    console.error('Error making the API call:', error);
  }
}

export async function getFollowers(channel) {
  const channelId = await getUserId(channel.replace('#', ''));

  const url = `https://api.twitch.tv/helix/users/follows?to_id=${channelId}`;

  try {
    const response = await twitchFetch(url);

    if (response.ok) {
      const data = await response.json();
      return data.data;
    } else {
      const errorData = await response.json();
      console.error(`Failed to get followers: ${response.status} - ${response.statusText}`);
      console.error(errorData);
      return null;
    }
  } catch (error) {
    console.error('Error making the API call:', error);
    return null;
  }
}

export async function shoutout(channel) {
  const channelInfo = initialize.channelsInfo[channel];
  const usernames = Object.keys(channelInfo.shoutout);
  if (usernames.length === 0) return; // nothing to shoutout

  const username = usernames[0]; // just grab the first one

  const channelId = await getUserId(channel.replace('#', ''));
  const moderatorId = await getUserId(BOT_USERNAME.replace('#', ''));

  const userId = await getUserId(username);

  const url = `https://api.twitch.tv/helix/chat/shoutouts?from_broadcaster_id=${channelId}&to_broadcaster_id=${userId}&moderator_id=${moderatorId}`

  try {
    const response = await twitchFetch(url, { method: 'POST' });
    if (response.ok) {
      console.log(`Shoutout successful for ${username} in channel ${channel}`);
      delete channelInfo.shoutout[username];
    } else {
      const errorData = await response.json();
      console.error(`Failed to give shoutout: ${response.status} - ${response.statusText}`);
      console.error(errorData);
    }
  } catch (error) {
    console.error('Error making the API call:', error);
  }
}

async function getUserId(username) {
  const url = `https://api.twitch.tv/helix/users?login=${username}`;

  try {
    const response = await twitchFetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.data.length > 0) {
        const userId = data.data[0].id;
        return userId;
      } else {
        console.log(`User ${username} not found.`);
        return null;
      }
    } else {
      const errorData = await response.json();
      console.error(`Failed to get user ID: ${response.status} - ${response.statusText}`);
      console.error(errorData);
      return null;
    }
  } catch (error) {
    console.error('Error making the API call:', error);
    return null;
  }
}

function calculateFollowDuration(followDate) {
  const now = new Date();
  const diff = now - followDate;

  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
  const weeks = Math.floor(((diff % (1000 * 60 * 60 * 24 * 365.25)) % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24 * 7));
  const days = Math.floor((((diff % (1000 * 60 * 60 * 24 * 365.25)) % (1000 * 60 * 60 * 24 * 30.44)) % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24));

  return { years, months, weeks, days };
}
