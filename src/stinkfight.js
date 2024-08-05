import client from './app.js';
import initialize from './initialize';
import { timeout } from './twitchApi.js';

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
  
    channelData.pendingDuels[username] = opponent;
    client.say(channel, `@${opponent}, you have been challenged to a duel by @${username}! Type !accept to accept the challenge.`);
  }

export function accept(channel, userstate, message) {

    let username = userstate.username;
    
    const challenger = Object.keys(initialize.channelsInfo[channel].pendingDuels).find(key => initialize.channelsInfo[channel].pendingDuels[key] === username.toLowerCase());

    if (!challenger) {
      client.say(channel, `@${username}, you don't have any pending duel requests.`);
      return;
    }

    const challengerIndex = initialize.channelsInfo[channel].pendingDuels[challenger];
    if (challengerIndex !== username.toLowerCase()) {
      client.say(channel, `@${username}, you cannot accept a duel that you did not receive.`);
      return;
    }

    delete initialize.channelsInfo[channel].pendingDuels[challenger];
    client.say(channel, `@${challenger} and @${username}, the duel has begun!`);
    
    let stink1 = Math.floor(Math.random() * 100) + 1;
    let stink2 = Math.floor(Math.random() * 100) + 1;
    if (stink1 < stink2) {
        client.say(channel, `@${challenger} (${stink1}%) wins the stink duel against @${username} (${stink2}%)!`);
        timeout(channel, username, 300); // Timeout the user for 5 minutes
        client.say(channel, `@${username} has been timed out for 5 minutes.`);
    } else if (stink1 > stink2) {
        client.say(channel, `${username} (${stink2}%) wins the stink duel against @${challenger} (${stink1}%)!`);
        timeout(channel, challenger, 300); // Timeout the user for 5 minutes
        client.say(channel, `@${challenger} has been timed out for 5 minutes.`);
    } else {
        client.say(channel, `It's a tie! Both @${challenger} (${stink1}%) and ${username} (${stink2}%) stink equally!`);
        timeout(channel, username, 300); // Timeout the user for 5 minutes
        timeout(channel, challenger, 300); // Timeout the user for 5 minutes
        client.say(channel, `Both @${challenger} and @${username} have been timed out for 5 minutes.`);
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
    
        delete initialize.channelsInfo[channel].pendingDuels[opponent];
        client.say(channel, `@${opponent}, your duel request has been retracted.`);
}

export function duelInfo(channel, userstate, message) {
    let username = userstate.username;
    client.say(channel, `@${username}, the available duel commands are: !duel <username>, !accept, !decline, !retract`);
}