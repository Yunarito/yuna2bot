import { handleMessage } from './duelChannelHandler.js';

// #catzzi's !rank/!elo gets special-cased default arguments depending on how
// it's invoked - moved here verbatim from the old inline check in app.js.
export function resolveRankMessage(message) {
  if (message.includes('mods')) {
    return '!rank Yunarito#69420,Leaveless#bruch,scremmys#6969';
  }
  if (!message.includes('#')) {
    return '!rank catzzi#euw,smolestcatzzi#6969';
  }
  return message;
}

export { handleMessage };
