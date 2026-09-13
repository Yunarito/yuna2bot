import { handleMessage as handleDuelMessage } from './duelChannelHandler.js';
import { handleMessage as handleExcavationMessage } from './excavationChannelHandler.js';

// #yunarito runs both the stink-duel feature and the excavation minigame
// (it's also the streamer's own channel, used to test the latter).
export function handleMessage(channel, userstate, message) {
  return handleDuelMessage(channel, userstate, message)
    || handleExcavationMessage(channel, userstate, message);
}
