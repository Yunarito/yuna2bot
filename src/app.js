import tmi from 'tmi.js';
import { BOT_USERNAME, OAUTH_TOKEN, CHANNEL_NAME, BLOCKED_WORDS, RIOT_API_TOKEN } from './constants';

const {
  checkTwitchChat,
  startsWith,
} = require('./helper.js');

const {
  getSummonerRank,
  getLastGameData,
  masteryscore,
  getAvgRankInMatch
} = require('./leagueApiFunctions.js');

const {
  joinQueue,
  leaveQueue,
  listQueue,
  pickFromQueue,
  enableQueue,
  disableQueue
} = require('./queue.js');

const {
  resetTime,
  setTime,
  addTimeoutTime,
  getTimeoutTime
} = require('./timeoutCounter.js')

import initialize from './initialize';

const options = {
  options: { debug: true },
  connection: {
    reconnect: true,
    secure: true,
    timeout: 180000,
    reconnectDecay: 1.4,
    reconnectInterval: 1000,
  },
  identity: {
    username: BOT_USERNAME,
    password: OAUTH_TOKEN
  },
  channels: [CHANNEL_NAME]
};

const client = new tmi.Client(options);

client.connect();

// event handlers

client.on('message', (channel, userstate, message, self) => {
  if (self) {
    return;
  }

  initialize.initializeChannel(channel);

  if (userstate.username === BOT_USERNAME) {
    console.log(`Not checking bot's messages.`);
    return;
  }

  if (startsWith(message, '!rank') || startsWith(message, '!elo')) {
    getSummonerRank(channel, userstate, message);
    return;
  }

  if (startsWith(message, '!avgrank') || startsWith(message, '!avgelo')) {
    getAvgRankInMatch(channel, userstate, message);
    return;
  }

  if (startsWith(message, '!lastgame')) {
    getLastGameData(channel, userstate, message);
    return;
  }

  if (startsWith(message, '!topmastery')) {
    masteryscore(channel, userstate, message);
    return;
  }

  if (startsWith(message, '!join') && initialize.channelsInfo[channel].enabled) {
    joinQueue(channel, userstate);
  }

  if (startsWith(message, '!leave') && initialize.channelsInfo[channel].enabled) {
    leaveQueue(channel, userstate);
  }

  if (startsWith(message, '!list') && initialize.channelsInfo[channel].enabled) {
    listQueue(channel);
  }
  
  if (startsWith(message, '!scamout')) {
    getTimeoutTime(channel)
  }

  if (startsWith(message, '!commands')) {
    commands(channel);
    return;
  }

  // Mod or Streamer commands:

  if(hasRights(userstate, channel)){
    if (startsWith(message, '!pick')) {
      pickFromQueue(channel, userstate, message);
    }

    if (startsWith(message, '!enablequeue')) {
      enableQueue(channel);
    }

    if (startsWith(message, '!disablequeue')) {
      disableQueue(channel);
    }

    if (startsWith(message, '!scamreset')) {
      resetTime(channel)
    }

    if (startsWith(message, '!scammed')) {
      addTimeoutTime(channel)
    }

    if (startsWith(message, '!scamset')) {
      setTime(channel, message)
    }
  }

  onMessageHandler(channel, userstate, message);
});

function onMessageHandler(channel, userstate, message) {
  checkTwitchChat(userstate, message, channel);
}

// commands

function commands(channel) {
  client.say(channel, '!rank/!elo <name,name2>, !avgrank/!avgelo <name>, !lastgame <name>, !topmastery <name>, !join, !leave, !list');
}

function hasRights(userstate, channel) {
  return userstate['user-type'] === 'mod' || userstate.username === channel.replace('#', '');
}

export default client;