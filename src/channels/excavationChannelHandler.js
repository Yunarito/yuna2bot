import { startsWith, hasRights } from '../helper.js';
const {
  listFossils,
  listGems,
  setDigReward,
  listDigRewards,
  setDigCooldownEnabled,
  setDigCooldownSeconds,
  listDigCooldowns,
  testDig,
} = require('../excavation.js');

// Shared by every channel that runs the excavation minigame (#itzpinky_, #yunarito).
// Returns true once it has handled a command, false otherwise.
export function handleMessage(channel, userstate, message) {
  if (startsWith(message, '!fossils')) {
    listFossils(channel, userstate, message);
    return true;
  }

  if (startsWith(message, '!gems')) {
    listGems(channel, userstate, message);
    return true;
  }

  if (hasRights(userstate, channel)) {
    if (startsWith(message, '!setdigreward')) {
      setDigReward(channel, userstate, message);
      return true;
    }

    if (startsWith(message, '!listdigrewards')) {
      listDigRewards(channel, userstate, message);
      return true;
    }

    if (startsWith(message, '!digcooldown')) {
      setDigCooldownEnabled(channel, userstate, message);
      return true;
    }

    if (startsWith(message, '!setdigcooldown')) {
      setDigCooldownSeconds(channel, userstate, message);
      return true;
    }

    if (startsWith(message, '!digcooldowns')) {
      listDigCooldowns(channel, userstate, message);
      return true;
    }

    if (startsWith(message, '!testdig')) {
      testDig(channel, userstate, message);
      return true;
    }
  }

  return false;
}
