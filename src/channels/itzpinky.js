import { handleMessage as handleRollMessage } from './rollChannelHandler.js';
import { handleMessage as handleExcavationMessage } from './excavationChannelHandler.js';

export function handleMessage(channel, userstate, message) {
  return handleRollMessage(channel, userstate, message)
    || handleExcavationMessage(channel, userstate, message);
}
