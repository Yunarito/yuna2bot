import tmi from 'tmi.js';
import initialize from './initialize';
// get everything from the .env file
import dotenv from 'dotenv';
dotenv.config();

const {
  checkTwitchChat,
  startsWith,
  hasRights,
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
  getPointTable,
} = require('./userStats.js');

const { channelHandlers, rankOverrides } = require('./channels');

const {
  addTimedMessage,
  removeTimedMessage,
  listTimedMessages,
  enableTimedMessage,
  disableTimedMessage,
  setTimedMessageInterval,
  checkTimedMessage
} = require('./timedMessages.js');

const {
  t,
  setLocale,
  isSupportedLocale
} = require('./i18n.js');

const {
  loadChannelSettings,
  saveChannelSettings
} = require('./channelSettings.js');

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
  getUptime,
  shoutout,
  timeout
} = require('./twitchApi.js');

const {
  getAccessToken,
  refreshAccessToken
} = require('./twitchAuth.js');

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
    // tmi.js calls this fresh on every (re)connect, so a token refreshed
    // in the background is always picked up automatically.
    password: () => `oauth:${getAccessToken()}`
  },
  channels: [process.env.CHANNEL_NAME]
};

const client = new tmi.Client(options);

client.connect().catch(
  (err) => {
    console.error('Error connecting to Twitch:', err);
    process.exit(1); // Exit the process if connection fails
  }
);

// Reactive fallback: if chat gets disconnected for a reason other than us
// calling client.disconnect() ourselves, make sure we're not just retrying
// with a dead token.
client.on('disconnected', (reason) => {
  console.error('Twitch chat disconnected:', reason);
  refreshAccessToken().catch((error) => {
    console.error('Failed to refresh Twitch token after disconnect:', error);
  });
});

// event handlers

client.on('message', (channel, userstate, message, self) => {
  try {

    initialize.initializeChannel(channel);

    if (!initialize.channelsInfo[channel].settingsLoaded) {
      initialize.channelsInfo[channel].settingsLoaded = true;
      loadChannelSettings(channel);
    }

    isHina(userstate, channel);

    if (userstate.username === BOT_USERNAME) {
      console.log(`Not checking bot's messages.`);
      return;
    }

    checkTimedMessage(channel);

    if (userstate.username === "streamlabs" && message.includes("hat €")) {
      console.log(message, message.includes("hat €"));
      donationHandler(channel, message);
      return;
    }

    if (startsWith(message, '!followage')) {
      getFollowage(userstate.username, channel);
      return;
    }

    if (startsWith(message, '!uptime')) {
      getUptime(channel);
      return;
    }

    if (startsWith(message, '!listtimedmessages')) {
      listTimedMessages(channel);
      return;
    }

    // League commands:

    if (startsWith(message, '!rank') || startsWith(message, '!elo')) {
      const rankOverride = rankOverrides[channel];
      const effectiveMessage = rankOverride ? rankOverride(message) : message;
      getSummonerRank(channel, userstate, effectiveMessage);
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

    // Per-channel commands (duel/excavation/etc. - see src/channels/):
    if (channelHandlers[channel] && channelHandlers[channel](channel, userstate, message)) {
      return;
    }

    if (startsWith(message, '!commands')) {
      client.say(channel, t(channel, 'commands.link'));
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

      if (startsWith(message, '!addtimedmessage')) {
        addTimedMessage(channel, message);
        return;
      }

      if (startsWith(message, '!removetimedmessage')) {
        removeTimedMessage(channel, message);
        return;
      }

      if (startsWith(message, '!enabletimedmessage')) {
        enableTimedMessage(channel, message);
        return;
      }

      if (startsWith(message, '!disabletimedmessage')) {
        disableTimedMessage(channel, message);
        return;
      }

      if (startsWith(message, '!timedmessageinterval')) {
        setTimedMessageInterval(channel, message);
        return;
      }

      if (startsWith(message, '!setlanguage')) {
        const locale = message.split(' ')[1];
        if (locale && isSupportedLocale(locale)) {
          setLocale(channel, locale);
          saveChannelSettings(channel);
          client.say(channel, t(channel, 'language.set', { locale }));
        } else {
          client.say(channel, t(channel, 'language.invalid'));
        }
        return;
      }
    }
  } catch (error) {
    console.error('Error in message event handler:', error);

    client.say(channel, t(channel, 'errors.generic'));
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
  if (!initialize.channelsInfo[channel].shoutout[username]) {
    initialize.channelsInfo[channel].shoutout[username] = {};
  }
  initialize.channelsInfo[channel].shoutout[username].timeout = setTimeout(() => {
    delete initialize.channelsInfo[channel].shoutout[username];
  }, 1000 * 60 * 10); // 10 minutes
});


// commands

function commands(channel) {
  client.say(channel, t(channel, 'commands.help'));
}

export default client;
