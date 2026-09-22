import client from '../app.js';
import { startsWith } from '../helper.js';
import { t } from '../i18n.js';
import { timeout } from '../twitchApi.js';

const DEFAULT_SIDES = 20;
const NAT_ONE_TIMEOUT_SECONDS = 120;
const ROLL_COOLDOWN_MS = 15 * 60 * 1000;

const lastRollAt = new Map();

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
  const cooldownKey = `${channel}:${username}`;
  const lastRoll = lastRollAt.get(cooldownKey);

  if (lastRoll !== undefined) {
    const remainingMs = ROLL_COOLDOWN_MS - (Date.now() - lastRoll);
    if (remainingMs > 0) {
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      client.say(channel, t(channel, 'roll.cooldown', { username, minutes: remainingMinutes }));
      return;
    }
  }

  const args = cleanMessage(message).split(/\s+/).filter(Boolean);
  let sides = DEFAULT_SIDES;

  if (args.slice(1).join(' ').toLowerCase() === 'a cigarette') {
    lastRollAt.set(cooldownKey, Date.now());
    client.say(channel, t(channel, 'roll.cigarette', { username }));
    return;
  }

  if (args.length > 1) {
    const parsed = parseInt(args[1], 10);
    if (!Number.isInteger(parsed) || parsed < 2) {
      client.say(channel, t(channel, 'roll.invalidSides', { username }));
      return;
    }
    sides = parsed;
  }

  lastRollAt.set(cooldownKey, Date.now());

  const result = Math.floor(Math.random() * sides) + 1;
  client.say(channel, t(channel, 'roll.result', { username, result, sides }));

  if (result === 1) {
    client.say(channel, t(channel, 'roll.natOne', { username }));
    timeout(username, channel, NAT_ONE_TIMEOUT_SECONDS);
  } else if (sides === DEFAULT_SIDES && result === DEFAULT_SIDES) {
    client.say(channel, t(channel, 'roll.natTwenty', { username }));
  }
}
