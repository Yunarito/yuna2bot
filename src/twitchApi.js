const fetch = require('node-fetch');
import { BOT_USERNAME, CLIENT_ID, OAUTH_TOKEN, CHANNEL_NAME } from './constants';
import client from './app.js';

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
        const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OAUTH_TOKEN.replace('oauth:', '')}`,
            'Client-Id': CLIENT_ID,
            'Content-Type': 'application/json',
        },
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
      return `Ich konnte die Follow-Dauer für ${user} nicht ermitteln.`;
    }

    // API-Aufruf zum Abrufen der Follower-Daten
    const url = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${channelId}&user_id=${userId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OAUTH_TOKEN.replace('oauth:', '')}`,
        'Client-Id': CLIENT_ID,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(data);


      if (data.data.length > 0) {
        const followDate = new Date(data.data[0].followed_at);
        const duration = calculateFollowDuration(followDate);

        let result = `${user} folgt seit `;
        if (duration.years > 0) result += ` ${duration.years} Jahr(en), `;
        if (duration.months > 0) result += `${duration.months} Monat(en), `;
        if (duration.weeks > 0) result += `${duration.weeks} Woche(n) und `;
        if (duration.days > 0) result += `${duration.days} Tag(en)`;

        client.say(channel, result);
      } else {
        client.say(channel, `${user} folgt ${channel} nicht.`);
      }
    } else {
      const errorData = await response.json();
      console.error(`Fehler beim Abrufen der Follow-Daten: ${response.status} - ${response.statusText}`);
      console.error(errorData);
      client.say(channel, `Ein Fehler ist aufgetreten. Ich konnte die Follow-Dauer für ${user} nicht ermitteln.`);
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Follow-Dauer:', error);
    client.say(channel, `Ein Fehler ist aufgetreten. Ich konnte die Follow-Dauer für ${user} nicht ermitteln.`);
  }
}

async function getUserId(username) {
  const url = `https://api.twitch.tv/helix/users?login=${username}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OAUTH_TOKEN.replace('oauth:', '')}`,
        'Client-Id': CLIENT_ID,
      },
    });

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
