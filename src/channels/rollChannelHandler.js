import client from '../app.js';
import { startsWith } from '../helper.js';
import { t } from '../i18n.js';
import { timeout } from '../twitchApi.js';

const DEFAULT_SIDES = 20;
const NAT_ONE_TIMEOUT_SECONDS = 300;

// Shared by every channel that runs the !roll dice command (#itzpinky_, #yunarito).
export function handleMessage(channel, userstate, message) {
  if (startsWith(message, '!roll')) {
    roll(channel, userstate, message);
    return true;
  }

  return false;
}

function cleanMessage(message) {
  return message.replace(/[\u{E0000}-\u{E007F}\p{Cf}\p{Mn}]/gu, '').trim();
}

function roll(channel, userstate, message) {
  const username = userstate.username;
  const args = cleanMessage(message).split(/\s+/).filter(Boolean);
  let sides = DEFAULT_SIDES;

  if (args.length > 1) {
    const parsed = parseInt(args[1], 10);
    if (!Number.isInteger(parsed) || parsed < 2) {
      client.say(channel, t(channel, 'roll.invalidSides', { username }));
      return;
    }
    sides = parsed;
  }

  const result = Math.floor(Math.random() * sides) + 1;
  client.say(channel, t(channel, 'roll.result', { username, result, sides }));

  if (result === 1) {
    client.say(channel, t(channel, 'roll.natOne', { username }));
    timeout(username, channel, NAT_ONE_TIMEOUT_SECONDS);
  } else if (sides === DEFAULT_SIDES && result === DEFAULT_SIDES) {
    client.say(channel, t(channel, 'roll.natTwenty', { username }));
  }
}
