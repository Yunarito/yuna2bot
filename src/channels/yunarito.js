import { handleMessage as handleDuelMessage } from './duelChannelHandler.js';
import { handleMessage as handleExcavationMessage } from './excavationChannelHandler.js';
import { handleMessage as handleRollMessage } from './rollChannelHandler.js';
import { handleMessage as handleRossMessage } from './rossChannelHandler.js';

// #yunarito runs the stink-duel feature, the excavation minigame, and !roll
// (it's also the streamer's own channel, used to test these).
export function handleMessage(channel, userstate, message) {
  return handleDuelMessage(channel, userstate, message)
    || handleExcavationMessage(channel, userstate, message)
    || handleRollMessage(channel, userstate, message)
    || handleRossMessage(channel, userstate, message);
}
