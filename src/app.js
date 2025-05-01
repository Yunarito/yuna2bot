import tmi from 'tmi.js';
import initialize from './initialize';
import { dreamRank } from './leagueFunctions.js';
// get everything from the .env file
import dotenv from 'dotenv';
dotenv.config();

const {
  checkTwitchChat,
  startsWith,
  twentyFour,
  isHina
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

const {
  getFollowage,
  shoutout
} = require('./twitchApi.js');

const BOT_USERNAME = process.env.BOT_USERNAME;

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
    username: process.env.BOT_USERNAME,
    password: process.env.OAUTH_TOKEN
  },
  channels: [process.env.CHANNEL_NAME]
};

console.log(process.env.BOT_USERNAME, process.env.OAUTH_TOKEN, process.env.CHANNEL_NAME);


const client = new tmi.Client(options);

client.connect();

let messageCount = 0;

// i need to automatically renew the oauth token, so i can use it for the twitch api
// setInterval(() => {
//   client.api({

// event handlers

client.on('message', (channel, userstate, message, self) => {
  try {
    isHina(userstate, channel);

    messageCount += 1;

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

    if (startsWith(message, '!followage')) {
      getFollowage(userstate.username, channel);
      return;
    }

    // League commands:

    if (startsWith(message, '!rank') || startsWith(message, '!elo')) {
      if(channel === '#catzzi' && message.includes('mods')) {
        getSummonerRank(channel, userstate, "!rank Yunarito#69420,Leaveless#bruch,scremmys#6969");
      } else if(channel === '#catzzi' && !message.includes('#')) {
        getSummonerRank(channel, userstate, "!rank catzzi#euw,smolestcatzzi#6969"); //catzzi#euw,smolcatzzi#EUW,smolercatzzi#6969,smolestcatzzi#6969
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
      return;
    }

    if (startsWith(message, '!leave') && initialize.channelsInfo[channel].enabled) {
      leaveQueue(channel, userstate);
      return;
    }

    if (startsWith(message, '!list') && initialize.channelsInfo[channel].enabled) {
      listQueue(channel);
      return;
    }

    if (startsWith(message, '!scamout')) {
      getTimeoutTime(channel);
      return;
    }

    // Duel commands:
    if (channel === '#catzzi' || channel === '#yunarito') {

      if(userstate['first-msg']){
        client.say(channel, 'FirstTimeLicka');
      }

      if (messageCount % 60 === 0) {
        // client.say(channel, 'Momentan kann man für die Streamawards abstimmen! Stimmt für catzzi unter Beste/r Newcomer/in ab! Do your part ! owo7 https://streamawards.de');
      }

      if (message.includes('owoCheer')) {
        client.say(channel, 'owoCheer');
      }

      if (startsWith(message, '!goal')) {
        dreamRank(channel);
        return;
      }

      if (startsWith(message, '!duell')) {
        duel(channel, userstate, message);
        return;
      }

      if (startsWith(message, '!accept')) {
        accept(channel, userstate, message);
        return;
      }

      if (startsWith(message, '!decline')) {
        decline(channel, userstate, message);
        return;
      }

      if (startsWith(message, '!moshpit')) {
        groupDuel(channel, userstate, message);
        return;
      }

      if (startsWith(message, '!acceptmoshpit')) {
        acceptGroupDuel(channel, userstate, message);
        return;
      }

      if (startsWith(message, '!declinemoshpit')) {
        declineGroupDuel(channel, userstate, message);
        return;
      }

      if (startsWith(message, '!retract')) {
        retract(channel, userstate, message);
        return;
        return;
      }

      if (startsWith(message, '!duellinfo')) {
        duelInfo(channel, userstate, message);
        return;
      }

      if(startsWith(message, '!duellstats')) {
        stats(channel, userstate, message);
        return;
      }

      if(startsWith(message, '!duellboard')) {
        leaderboard(channel);
        return;
      }

      if (startsWith(message, '!openfight')) {
        openContest(channel, userstate, message);
        return;
      }

      if (startsWith(message, '!joinfight')) {
        joinContest(channel, userstate, message);
        return;
      }

      //subathon commands

      /*
        if (startsWith(message, '!mypoints')) {
          getChannelPoints(channel, userstate['display-name']);
        }

        if (startsWith(message, '!totalpoints')) {
          getChannelTotalPoints(channel);
        }

        if (startsWith(message, '!pointchart')) {
          getPointChart(channel);
        }
      */
    }

    if (startsWith(message, '!commands')) {
      client.say(channel, 'Die Commands könnt ihr hier finden: https://yunarito.de/yuna2bot');
      return;
    }

    // Mod or Streamer commands:

    if(hasRights(userstate, channel)){
      if (startsWith(message, '!pick')) {
        pickFromQueue(channel, userstate, message);
        return;
      }

      if (startsWith(message, '!enablequeue')) {
        enableQueue(channel);
        return;
      }

      if (startsWith(message, '!disablequeue')) {
        disableQueue(channel);
        return;
      }

      if (startsWith(message, '!scamreset')) {
        resetTime(channel);
        return;
      }

      if (startsWith(message, '!scammed')) {
        addTimeoutTime(channel);
        return;
      }

      if (startsWith(message, '!scamset')) {
        setTime(channel, message);
        return;
      }

      if (startsWith(message, '!happyswitch')) {
        happyswitch(channel);
        return;
      }

      if (startsWith(message, '!sadswitch')) {
        sadswitch(channel);
        return;
      }

      if (startsWith(message, '!so')) {
        shoutout(channel);
        return;
      }
    }
  } catch (error) {
    console.error('Error in message event handler:', error);

    client.say(channel, `Nö, kein Bock angySit`);
  }
  if (self) {
    return;
  }
});

// function onMessageHandler(channel, userstate, message) {
//   checkTwitchChat(userstate, message, channel);
// }

// client.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
//   if (channel === '#catzzi') {
//     subGiftHandler(channel, username, methods)
//   }
// })
// client.on('resub', (channel, username, months, message, userstate, methods) => {
//   if (channel === '#catzzi') {
//     resubHandler(channel, username, methods)
//   }
// })
// client.on('cheer', (channel, userstate, message) => {
//   if (channel === '#catzzi') {
//     cheerHandler(channel, userstate, message)
//   }
// })
// client.on('subscription', (channel, username, method, message, userstate) => {
//   if (channel === '#catzzi') {
//     subHandler(channel, username, method)
//   }
// })


client.on('raided', (channel, username, viewers) => {
  if (!initialize.channelsInfo[channel].shoutout.includes(username)) {
    initialize.channelsInfo[channel].shoutout.push(username);
  }
});


// commands

function commands(channel) {
  client.say(channel, '!rank/!elo <name,name2>, !avgrank/!avgelo <name>, !lastgame <name>, !topmastery <name>, !join, !leave, !list');
}

function hasRights(userstate, channel) {
  return userstate['user-type'] === 'mod' || userstate.username === channel.replace('#', '');
}

export default client;
