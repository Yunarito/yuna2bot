import tmi from 'tmi.js';
import { BOT_USERNAME, OAUTH_TOKEN, CHANNEL_NAME, BLOCKED_WORDS, RIOT_API_TOKEN } from './constants';
import initialize from './initialize';

const {
  checkTwitchChat,
  startsWith,
  twentyFour
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
} = require('./timeoutCounter.js');

const {
  duel,
  accept,
  decline,
  retract,
  duelInfo,
  groupDuel,
  acceptGroupDuel,
  declineGroupDuel,
  openContest,
  joinContest
} = require('./stinkfight.js');

const {
  stats,
  leaderboard,
  getPointTable,
} = require('./userStats.js');

const {
  cheerHandler,
  subGiftHandler,
  subHandler,
  resubHandler,
  donationHandler,
  getChannelPoints,
  getChannelTotalPoints,
  happyswitch,
  sadswitch,
  getPointChart
} = require('./subathonCounter.js');

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

  if (userstate.username === "streamlabs" && message.includes("hat €")) {
    console.log(message, message.includes("hat €"));
    donationHandler(channel, message);
    return;
  }  

  // League commands:

  if (startsWith(message, '!rank') || startsWith(message, '!elo')) {
    if(channel === '#catzzi' && message.includes('mods')) {
      getSummonerRank(channel, userstate, "!rank Yunarito#69420,Leaveless#GGA,scremmys#6969");
    } else { 
      getSummonerRank(channel, userstate, message);
    }
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

  // Queue commands:

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

  // Duel commands:
  if (channel === '#catzzi') {
    if (startsWith(message, '!duell')) {
      duel(channel, userstate, message);
    }

    if (startsWith(message, '!accept')) {
      accept(channel, userstate, message);
    }

    if (startsWith(message, '!decline')) {
      decline(channel, userstate, message);
    }

    if (startsWith(message, '!moshpit')) {
      groupDuel(channel, userstate, message);
    }

    if (startsWith(message, '!acceptmoshpit')) {
      acceptGroupDuel(channel, userstate, message);
    }

    if (startsWith(message, '!declinemoshpit')) {
      declineGroupDuel(channel, userstate, message);
    }

    if (startsWith(message, '!retract')) {
      retract(channel, userstate, message);
    }

    if (startsWith(message, '!duellinfo')) {
      duelInfo(channel, userstate, message);
    }

    if(startsWith(message, '!duellstats')) {    
      stats(channel, userstate, message);
    }

    if(startsWith(message, '!duellboard')) {    
      leaderboard(channel);
    }

    if (startsWith(message, '!openfight')) {
      openContest(channel, userstate, message);
    }

    if (startsWith(message, '!joinfight')) {
      joinContest(channel, userstate, message);
    }
    
    if (startsWith(message, '!24')) {
      // twentyFour(channel);
    }

    //subathon commands

    if (startsWith(message, '!subathon')) {
      // twentyFour(channel);
    }

    if (startsWith(message, '!mypoints')) {
      getChannelPoints(channel, userstate.username);
    }

    if (startsWith(message, '!totalpoints')) {
      getChannelTotalPoints(channel);
    }

    if (startsWith(message, '!pointchart')) {
      getPointChart(channel);
    }
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

    if (startsWith(message, '!happyswitch')) {
      happyswitch(channel)
    }

    if (startsWith(message, '!sadswitch')) {
      sadswitch(channel)
    }
  }

  onMessageHandler(channel, userstate, message);
});

function onMessageHandler(channel, userstate, message) {
  checkTwitchChat(userstate, message, channel);
}

client.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
  subGiftHandler(channel, username, methods)
})
client.on('resub', (channel, username, months, message, userstate, methods) => {
  resubHandler(channel, username, methods)
})
client.on('cheer', (channel, userstate, message) => {
  cheerHandler(channel, userstate, message)
})
client.on('subscription', (channel, username, method, message, userstate) => {
  subHandler(channel, username, method)
})

// commands

function commands(channel) {
  client.say(channel, '!rank/!elo <name,name2>, !avgrank/!avgelo <name>, !lastgame <name>, !topmastery <name>, !join, !leave, !list');
}

function hasRights(userstate, channel) {
  return userstate['user-type'] === 'mod' || userstate.username === channel.replace('#', '');
}

export default client;