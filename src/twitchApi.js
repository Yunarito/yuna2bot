const fetch = require('node-fetch');
import { BOT_USERNAME, CLIENT_ID, OAUTH_TOKEN, CHANNEL_NAME } from './constants';

export async function timeout(channel, user, duration) {
    let userId = await getUserId(user);
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
        console.log(`Successfully timed out user with ID ${userId} for ${duration} seconds.`);
        console.log(responseData);
        } else {
        const errorData = await response.json();
        console.error(`Failed to timeout user: ${response.status} - ${response.statusText}`);
        console.error(errorData);
        }
    } catch (error) {
        console.error('Error making the API call:', error);
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
        console.log(`User ID for ${username}: ${userId}`);
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