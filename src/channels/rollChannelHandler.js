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

function roll(channel, userstate, message) {
  const username = userstate.username;
  const args = message.trim().split(/\s+/);
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
  }
}
