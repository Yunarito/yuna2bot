import client from './app.js';
import initialize from './initialize';
import { timeout } from './twitchApi.js';
const {
  updateUserStats,
} = require('./userStats.js');

export function duel(channel, userstate, message) {
    let command = message.trim().split(' ');
    let username = userstate.username;
    if (command.length < 2) {
      client.say(channel, `@${username}, please provide a user to challenge.`);
      return;
    }
    const opponent = command[1].replace('@', '').toLowerCase();
    if (opponent === username.toLowerCase()) {
      client.say(channel, `@${username}, you cannot duel yourself!`);
      return;
    }
  
    const channelData = initialize.channelsInfo[channel];
    if (channelData.pendingDuels[username]) {
      client.say(channel, `@${username}, you already have a pending duel!`);
      return;
    }
    
    channelData.pendingDuels[username] = { opponent, timeout: null };
    client.say(channel, `@${opponent}, you have been challenged to a duel by @${username}! 
      Type !accept to accept the challenge. Loser will be 5 minutes in Timeout .`);
  
    channelData.pendingDuels[username].timeout = setTimeout(() => {
      client.say(channel, `@${username}, your duel request to @${opponent} has expired.`);
      delete channelData.pendingDuels[username];
    }, 60000); // 60 seconds
}

export function accept(channel, userstate, message) {

    let username = userstate.username;
    
    const channelData = initialize.channelsInfo[channel];

    const challenger = Object.keys(channelData.pendingDuels).find(
      (key) => channelData.pendingDuels[key].opponent === username.toLowerCase()
    );

    if (!challenger) {
      client.say(channel, `@${username}, you don't have any pending duel requests.`);
      return;
    }

    clearTimeout(channelData.pendingDuels[challenger].timeout);
    delete initialize.channelsInfo[channel].pendingDuels[challenger];
    
    client.say(channel, `@${challenger} and @${username}, the duel has begun!`);
  
    let stink1 = Math.floor(Math.random() * 100) + 1;
    let stink2 = Math.floor(Math.random() * 100) + 1;
  
    if (stink1 < stink2) {
      client.say(channel, `@${challenger} (${stink1}%) wins the stink duel against @${username} (${stink2}%)! o7`);
      timeout(username, channel, channelData.timeoutTime); // Timeout the user
      updateUserStats(channel, challenger, true);  // Update stats for winner
      updateUserStats(channel, username, false);   // Update stats for loser
    } else if (stink1 > stink2) {
      client.say(channel, `@${username} (${stink2}%) wins the stink duel against @${challenger} (${stink1}%)! o7`);
      timeout(challenger, channel, channelData.timeoutTime); // Timeout the user
      updateUserStats(channel, username, true);  // Update stats for winner
      updateUserStats(channel, challenger, false);   // Update stats for loser
    } else {
      client.say(channel, `It's a tie! Both @${challenger} (${stink1}%) and @${username} (${stink2}%) stink equally!`);
      timeout(username, channel, channelData.timeoutTime); // Timeout both users
      timeout(challenger, channel, channelData.timeoutTime);
      updateUserStats(channel, username, false);  // Update stats for tie
      updateUserStats(channel, challenger, false);
      client.say(channel, `Both @${challenger} and @${username} are now in Timeout o7 .`);
    }

}

export function decline(channel, userstate, message) {
    
    let username = userstate.username;

    const challenger = Object.keys(initialize.channelsInfo[channel].pendingDuels).find(key => initialize.channelsInfo[channel].pendingDuels[key] === username.toLowerCase());

    if (!challenger) {
      client.say(channel, `@${username}, you don't have any pending duel requests.`);
      return;
    }

    const challengerIndex = initialize.channelsInfo[channel].pendingDuels[challenger];
    if (challengerIndex !== username.toLowerCase()) {
      client.say(channel, `@${username}, you cannot decline a duel that you did not receive.`);
      return;
    }

    clearTimeout(initialize.channelsInfo[channel].pendingDuels[challenger].timeout);
    delete initialize.channelsInfo[channel].pendingDuels[challenger];
    client.say(channel, `@${challenger}, your duel request to @${username} has been declined.`);
}

export function retract(channel, userstate, message) {
        let username = userstate.username;
    
        const opponent = Object.keys(initialize.channelsInfo[channel].pendingDuels).find(key => key === username.toLowerCase());
        
        if (!opponent) {
        client.say(channel, `@${username}, you don't have any pending duel requests.`);
        return;
        }
  
        console.log(initialize.channelsInfo[channel].pendingDuels[username]);
        clearTimeout(initialize.channelsInfo[channel].pendingDuels[username].timeout);
        delete initialize.channelsInfo[channel].pendingDuels[username];
        
        client.say(channel, `@${username}, your duel request has been retracted.`);
}

export function duelInfo(channel, userstate, message) {
    let username = userstate.username;
    client.say(channel, `@${username}, the available duel commands are: !duel <username>, !accept, !decline, !retract, !duelinfo, !duelstats, !duelleaderboard`);
}

export function groupduel(channel, userstate, message) {
  const command = message.trim().split(' ');
  const username = userstate.username;

  if (command.length < 3) {
      client.say(channel, `@${username}, please provide at least one user to challenge for a group duel.`);
      return;
  }

  const opponents = command.slice(1).map(opponent => opponent.replace('@', '').toLowerCase());

  if (opponents.includes(username.toLowerCase())) {
      client.say(channel, `@${username}, you cannot include yourself in the opponent list!`);
      return;
  }

  if (new Set(opponents).size !== opponents.length) {
      client.say(channel, `@${username}, duplicate opponents detected. Please provide unique usernames.`);
      return;
  }

  const channelData = initialize.channelsInfo[channel];
  if (channelData.pendingDuels[username]) {
      client.say(channel, `@${username}, you already have a pending duel!`);
      return;
  }

  channelData.pendingDuels[username] = {
      opponents: [username, ...opponents],
      accepted: new Set(),
      timeout: null
  };

  client.say(channel, `@${opponents.join(', @')}, you have been invited to a group duel by @${username}! Type !accept to join. All except the lowest score will be timed out for 5 minutes.`);

  channelData.pendingDuels[username].timeout = setTimeout(() => {
      client.say(channel, `@${username}, your group duel request to ${opponents.join(', ')} has expired.`);
      delete channelData.pendingDuels[username];
  }, 60000); // 60 seconds
}


export function acceptGroupDuel(channel, userstate, message) {
  const username = userstate.username;
  const channelData = initialize.channelsInfo[channel];

  const challenger = Object.keys(channelData.pendingDuels).find(
      key => channelData.pendingDuels[key].opponents.includes(username.toLowerCase())
  );

  if (!challenger) {
      client.say(channel, `@${username}, you don't have any pending group duel requests.`);
      return;
  }

  const duel = channelData.pendingDuels[challenger];
  duel.accepted.add(username.toLowerCase());

  if (duel.accepted.size === duel.opponents.length) {
      clearTimeout(duel.timeout);
      delete channelData.pendingDuels[challenger];
      startGroupDuel(channel, duel.opponents);
  } else {
      client.say(channel, `@${username} has accepted the duel. Waiting for others to accept.`);
  }
}

function startGroupDuel(channel, participants) {
  const scores = participants.map(participant => ({
      name: participant,
      score: Math.floor(Math.random() * 100) + 1
  }));

  scores.sort((a, b) => a.score - b.score); // Sort in ascending order by score
  const winner = scores[0];

  client.say(channel, `@${winner.name} wins the group duel with the lowest score of ${winner.score}%!`);

  scores.slice(1).forEach(loser => {
      client.say(channel, `@${loser.name} (${loser.score}%) loses the duel and will be timed out.`);
      timeout(loser.name, channel, channelData.timeoutTime); // Timeout losers
      updateUserStats(channel, loser.name, false);  // Update stats for losers
  });

  updateUserStats(channel, winner.name, true);  // Update stats for the winner
}

