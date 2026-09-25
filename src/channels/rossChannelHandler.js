import client from '../app.js';
import { startsWith } from '../helper.js';
import { t } from '../i18n.js';
const Table = require('../dbTable.js');

const rossCounterTable = new Table('bob_ross_counter');

function ordinalSuffix(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return 'th';

  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// #itzpinky_ only - counts how many times chat has run !ross.
export function handleMessage(channel, userstate, message) {
  if (startsWith(message, '!ross')) {
    incrementRossCounter(channel);
    return true;
  }

  return false;
}

async function incrementRossCounter(channel) {
  try {
    await rossCounterTable.upsert({ channel, count: 1 }, { increment: ['count'] });
    const row = await rossCounterTable.findOne({ channel });
    const count = row.count;

    client.say(channel, t(channel, 'ross.count', { count, ordinal: ordinalSuffix(count) }));
  } catch (err) {
    console.error(`Error incrementing ross counter for ${channel}:`, err);
    client.say(channel, t(channel, 'errors.generic'));
  }
}
