import client from '../app.js';
import { startsWith } from '../helper.js';
import { dreamRank } from '../leagueFunctions.js';
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
} = require('../stinkfight.js');
const {
  stats,
  leaderboard,
} = require('../userStats.js');

// Shared by every channel that runs the stink-duel feature (#catzzi, #yunarito).
// Returns true once it has handled a command, false if the message wasn't one
// of ours - mirrors the original inline if-block's fallthrough behavior.
export function handleMessage(channel, userstate, message) {
  if (userstate['first-msg']) {
    client.say(channel, 'FirstTimeLicka');
  }

  if (message.includes('owoCheer')) {
    client.say(channel, 'owoCheer');
  }

  if (startsWith(message, '!goal')) {
    dreamRank(channel);
    return true;
  }

  if (startsWith(message, '!duell')) {
    duel(channel, userstate, message);
    return true;
  }

  if (startsWith(message, '!accept')) {
    accept(channel, userstate, message);
    return true;
  }

  if (startsWith(message, '!run')) {
    decline(channel, userstate, message);
    return true;
  }

  if (startsWith(message, '!moshpit')) {
    groupDuel(channel, userstate, message);
    return true;
  }

  if (startsWith(message, '!acceptmoshpit')) {
    acceptGroupDuel(channel, userstate, message);
    return true;
  }

  if (startsWith(message, '!declinemoshpit')) {
    declineGroupDuel(channel, userstate, message);
    return true;
  }

  if (startsWith(message, '!rückzug')) {
    retract(channel, userstate, message);
    return true;
  }

  if (startsWith(message, '!duellinfo')) {
    duelInfo(channel, userstate, message);
    return true;
  }

  if (startsWith(message, '!duellstats')) {
    stats(channel, userstate, message);
    return true;
  }

  if (startsWith(message, '!duellboard')) {
    leaderboard(channel);
    return true;
  }

  if (startsWith(message, '!openfight')) {
    openContest(channel, userstate, message);
    return true;
  }

  if (startsWith(message, '!joinfight')) {
    joinContest(channel, userstate, message);
    return true;
  }

  return false;
}
