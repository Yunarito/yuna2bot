import client from './app.js';
import initialize from './initialize';
import { t } from './i18n';
import { saveChannelSettings } from './channelSettings';
const fetch = require('node-fetch');
const db = require('./db.js');
const Table = require('./dbTable.js');
const { getBroadcasterAccessToken } = require('./broadcasterAuth.js');

require('dotenv').config();
const CLIENT_ID = process.env.CLIENT_ID;

const itemsTable = new Table('excavation_items');
const cooldownsTable = new Table('excavation_cooldowns');
const findsTable = new Table('excavation_finds');
const rewardsTable = new Table('excavation_rewards');
const channelBotAuthTable = new Table('channel_bot_auth');
const speciesTable = new Table('excavation_species');
const cooldownConfigTable = new Table('excavation_cooldown_config');

export const TIERS = ['casual', 'epic', 'legendary'];

// Defaults, overridable per (channel, tier) via excavation_cooldown_config -
// see !setdigcooldown.
const DEFAULT_COOLDOWN_SECONDS = {
  casual: 60,
  epic: 5 * 60,
  legendary: 20 * 60,
};

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// Weights out of 100 per tier; 'bust' is a dig that finds nothing.
const OUTCOME_TABLE = {
  casual:    { bust: 35, common: 45, uncommon: 15, rare: 4,  epic: 1,  legendary: 0 },
  epic:      { bust: 15, common: 20, uncommon: 30, rare: 25, epic: 9,  legendary: 1 },
  legendary: { bust: 5,  common: 5,  uncommon: 15, rare: 30, epic: 30, legendary: 15 },
};

export function isValidTier(tier) {
  return TIERS.includes(tier);
}

function rollOutcome(tier) {
  const table = OUTCOME_TABLE[tier];
  const roll = Math.random() * 100;
  let acc = 0;
  for (const key of ['bust', ...RARITIES]) {
    acc += table[key];
    if (roll < acc) {
      return key;
    }
  }
  return 'bust';
}

async function pickRandomItem(rarity) {
  const rows = await itemsTable.findMany({ rarity });

  if (rows.length === 0) return null;

  const totalWeight = rows.reduce((sum, row) => sum + row.drop_weight, 0);
  let roll = Math.random() * totalWeight;
  for (const row of rows) {
    roll -= row.drop_weight;
    if (roll < 0) return row;
  }
  return rows[rows.length - 1];
}

// Lives alongside queue/timeout/happy hour in channel_settings (in-memory via
// initialize.channelsInfo, same as those) rather than its own table, so it's
// readable/writable the same way as every other channel setting, including
// from the website panel. Defaults to enabled if the channel's settings
// haven't been loaded yet for some reason (e.g. a redemption arrives before
// any chat message has - see initialize.js's default).
function isCooldownEnabled(channel) {
  const channelInfo = initialize.channelsInfo[channel];
  return !channelInfo || channelInfo.cooldownEnabled !== false;
}

async function getCooldownSeconds(channel, tier) {
  const row = await cooldownConfigTable.findOne({ channel, tier });
  return row ? row.cooldown_seconds : DEFAULT_COOLDOWN_SECONDS[tier];
}

async function getRemainingCooldownMs(channel, userId, tier) {
  if (!isCooldownEnabled(channel)) return 0;

  const [row, cooldownSeconds] = await Promise.all([
    cooldownsTable.findOne({ channel, user_id: userId, tier }),
    getCooldownSeconds(channel, tier),
  ]);
  if (!row) return 0;

  const elapsed = Date.now() - new Date(row.last_dig_at).getTime();
  return Math.max(cooldownSeconds * 1000 - elapsed, 0);
}

async function stampCooldown(channel, userId, tier) {
  await cooldownsTable.upsert(
    { channel, user_id: userId, tier, last_dig_at: new Date() },
    { overwrite: ['last_dig_at'] }
  );
}

// Counts a user's distinct found parts for a species against the catalog
// total, to tell whether this dig just completed the skeleton.
async function isSpeciesComplete(channel, username, speciesId) {
  const total = await itemsTable.count({ species_id: speciesId });
  const [foundRows] = await db.query(
    `SELECT COUNT(DISTINCT ei.id) AS found
     FROM excavation_finds ef
     JOIN excavation_items ei ON ei.id = ef.item_id
     WHERE ef.channel = ? AND ef.username = ? AND ei.species_id = ? AND ef.quantity > 0`,
    [channel, username, speciesId]
  );

  return total > 0 && foundRows[0].found === total;
}

// Core dig resolution, shared by real Channel Point redemptions (handleRedemption)
// and the mod-only !testdig command.
export async function performDig(channel, userId, username, tier) {
  const remainingMs = await getRemainingCooldownMs(channel, userId, tier);
  if (remainingMs > 0) {
    return { onCooldown: true, remainingSeconds: Math.ceil(remainingMs / 1000) };
  }

  await stampCooldown(channel, userId, tier);

  const outcome = rollOutcome(tier);
  if (outcome === 'bust') {
    return { found: null };
  }

  const item = await pickRandomItem(outcome);
  if (!item) {
    // Catalog has nothing of this rarity yet - treat like a bust rather than error.
    return { found: null };
  }

  await findsTable.upsert(
    { channel, user_id: userId, username, item_id: item.id, quantity: 1 },
    { increment: ['quantity'], overwrite: ['username'] }
  );

  // Part names ("Skull", "Jaw", ...) repeat across every species, so the
  // announcement needs the species name too or there'd be no way to tell
  // which dinosaur a find belongs to without separately checking !fossils.
  let speciesName = null;
  let speciesComplete = null;
  if (item.item_type === 'fossil' && item.species_id) {
    const species = await speciesTable.findOne({ id: item.species_id });
    speciesName = species ? species.name : null;

    if (await isSpeciesComplete(channel, username, item.species_id)) {
      speciesComplete = { speciesName };
    }
  }

  return { found: item, speciesName, speciesComplete };
}

function announceDigResult(channel, username, tier, result) {
  if (result.onCooldown) {
    const minutes = Math.floor(result.remainingSeconds / 60);
    const seconds = result.remainingSeconds % 60;
    client.say(channel, t(channel, 'excavation.dig.cooldown', { username, minutes, seconds }));
    return;
  }

  if (!result.found) {
    client.say(channel, t(channel, 'excavation.dig.bust', { username, tier: t(channel, `excavation.tier.${tier}`) }));
    return;
  }

  const itemLabel = result.speciesName ? `${result.speciesName} ${result.found.name}` : result.found.name;

  client.say(channel, t(channel, 'excavation.dig.found', {
    username,
    item: itemLabel,
    rarity: t(channel, `excavation.rarity.${result.found.rarity}`),
  }));

  if (result.speciesComplete) {
    client.say(channel, t(channel, 'excavation.dig.skeletonComplete', {
      username,
      species: result.speciesComplete.speciesName,
    }));
  }
}

// Called from the EventSub notification handler for a real Channel Points redemption.
export async function handleRedemption(channel, event) {
  try {
    const rewardRow = await rewardsTable.findOne({ channel, reward_id: event.reward.id });
    if (!rewardRow) return; // not a reward we're mapped to - ignore

    const tier = rewardRow.tier;
    const result = await performDig(channel, event.user_id, event.user_login, tier);
    announceDigResult(channel, event.user_login, tier, result);
  } catch (err) {
    console.error(`Error handling excavation redemption for ${channel}:`, err);
  }
}

function parseTargetAndRest(userstate, message) {
  const parts = message.trim().split(/\s+/).slice(1);
  let targetUsername = userstate.username;
  if (parts[0] && parts[0].startsWith('@')) {
    targetUsername = parts.shift().slice(1).toLowerCase();
  }
  return { targetUsername, rest: parts.join(' ') };
}

async function listFossilsSummary(channel, username) {
  const [rows] = await db.query(
    `SELECT es.name AS species, COUNT(DISTINCT ei.id) AS total,
            COUNT(DISTINCT CASE WHEN ef.quantity > 0 THEN ei.id END) AS found
     FROM excavation_species es
     JOIN excavation_items ei ON ei.species_id = es.id
     LEFT JOIN excavation_finds ef ON ef.item_id = ei.id AND ef.channel = ? AND ef.username = ?
     GROUP BY es.id, es.name
     HAVING found > 0
     ORDER BY es.id`,
    [channel, username]
  );

  if (rows.length === 0) {
    client.say(channel, t(channel, 'excavation.fossils.empty', { username }));
    return;
  }

  const summary = rows.map(row => {
    const complete = row.total > 0 && row.found === row.total;
    return `${row.species} ${row.found}/${row.total}${complete ? ' ✅' : ''}`;
  }).join(' | ');

  client.say(channel, t(channel, 'excavation.fossils.summary', { username, summary }));
}

async function listFossilsForSpecies(channel, username, speciesQuery) {
  const [speciesRows] = await db.query(
    'SELECT id, name FROM excavation_species WHERE LOWER(name) = LOWER(?) OR LOWER(slug) = LOWER(?)',
    [speciesQuery, speciesQuery]
  );

  if (!speciesRows[0]) {
    client.say(channel, t(channel, 'excavation.fossils.unknownSpecies', { species: speciesQuery }));
    return;
  }

  const species = speciesRows[0];

  const [partRows] = await db.query(
    `SELECT ei.name, COALESCE(ef.quantity, 0) AS quantity
     FROM excavation_items ei
     LEFT JOIN excavation_finds ef ON ef.item_id = ei.id AND ef.channel = ? AND ef.username = ?
     WHERE ei.species_id = ?
     ORDER BY ei.id`,
    [channel, username, species.id]
  );

  const detail = partRows.map(row => `${row.quantity > 0 ? '✅' : '❌'} ${row.name}`).join(' | ');

  client.say(channel, t(channel, 'excavation.fossils.detail', { username, species: species.name, detail }));
}

export async function listFossils(channel, userstate, message) {
  const { targetUsername, rest } = parseTargetAndRest(userstate, message);

  try {
    if (rest) {
      await listFossilsForSpecies(channel, targetUsername, rest);
    } else {
      await listFossilsSummary(channel, targetUsername);
    }
  } catch (err) {
    console.error(`Error listing fossils for ${channel}:`, err);
    client.say(channel, t(channel, 'errors.generic'));
  }
}

export async function listGems(channel, userstate, message) {
  const { targetUsername } = parseTargetAndRest(userstate, message);

  try {
    const [rows] = await db.query(
      `SELECT ei.name, COALESCE(ef.quantity, 0) AS quantity
       FROM excavation_items ei
       LEFT JOIN excavation_finds ef ON ef.item_id = ei.id AND ef.channel = ? AND ef.username = ?
       WHERE ei.item_type = 'gem'
       ORDER BY ei.id`,
      [channel, targetUsername]
    );

    const owned = rows.filter(row => row.quantity > 0);

    if (owned.length === 0) {
      client.say(channel, t(channel, 'excavation.gems.empty', { username: targetUsername }));
      return;
    }

    const summary = owned.map(row => `${row.name} x${row.quantity}`).join(' | ');
    client.say(channel, t(channel, 'excavation.gems.summary', { username: targetUsername, summary }));
  } catch (err) {
    console.error(`Error listing gems for ${channel}:`, err);
    client.say(channel, t(channel, 'errors.generic'));
  }
}

export function setDigCooldownEnabled(channel, userstate, message) {
  const arg = (message.trim().split(/\s+/)[1] || '').toLowerCase();

  if (arg !== 'on' && arg !== 'off') {
    client.say(channel, t(channel, 'excavation.cooldownToggle.usage'));
    return;
  }

  const enabled = arg === 'on';
  initialize.channelsInfo[channel].cooldownEnabled = enabled;
  saveChannelSettings(channel);

  client.say(channel, t(channel, enabled ? 'excavation.cooldownToggle.enabled' : 'excavation.cooldownToggle.disabled'));
}

export async function setDigCooldownSeconds(channel, userstate, message) {
  const parts = message.trim().split(/\s+/);
  const tier = (parts[1] || '').toLowerCase();
  const seconds = parseInt(parts[2], 10);

  if (!isValidTier(tier) || !parts[2] || isNaN(seconds) || seconds < 0) {
    client.say(channel, t(channel, 'excavation.cooldownConfig.usage'));
    return;
  }

  try {
    await cooldownConfigTable.upsert(
      { channel, tier, cooldown_seconds: seconds },
      { overwrite: ['cooldown_seconds'] }
    );
    client.say(channel, t(channel, 'excavation.cooldownConfig.set', { tier, seconds }));
  } catch (err) {
    console.error(`Error setting dig cooldown for ${channel}:`, err);
    client.say(channel, t(channel, 'errors.generic'));
  }
}

export async function listDigCooldowns(channel, userstate, message) {
  try {
    const seconds = await Promise.all(TIERS.map(tier => getCooldownSeconds(channel, tier)));
    const summary = TIERS.map((tier, index) => `${tier}: ${seconds[index]}s`).join(' | ');
    client.say(channel, t(channel, 'excavation.cooldownConfig.list') + summary);
  } catch (err) {
    console.error(`Error listing dig cooldowns for ${channel}:`, err);
    client.say(channel, t(channel, 'errors.generic'));
  }
}

export async function setDigReward(channel, userstate, message) {
  const parts = message.trim().split(/\s+/);
  const tier = (parts[1] || '').toLowerCase();
  const rewardId = parts[2];

  if (!isValidTier(tier) || !rewardId) {
    client.say(channel, t(channel, 'excavation.rewards.usage'));
    return;
  }

  try {
    await rewardsTable.upsert({ channel, tier, reward_id: rewardId }, { overwrite: ['reward_id'] });
    client.say(channel, t(channel, 'excavation.rewards.set', { tier, rewardId }));
  } catch (err) {
    console.error(`Error setting dig reward for ${channel}:`, err);
    client.say(channel, t(channel, 'errors.generic'));
  }
}

export async function listDigRewards(channel, userstate, message) {
  try {
    const tokenRow = await channelBotAuthTable.findOne({ channel });

    const token = tokenRow ? await getBroadcasterAccessToken(channel) : null;
    if (!token) {
      client.say(channel, t(channel, 'excavation.rewards.noBroadcasterAuth'));
      return;
    }

    const response = await fetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${tokenRow.twitch_user_id}`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': CLIENT_ID } }
    );

    if (!response.ok) {
      console.error(`Failed to list custom rewards for ${channel}:`, response.status, await response.text());
      client.say(channel, t(channel, 'errors.generic'));
      return;
    }

    const data = await response.json();
    if (data.data.length === 0) {
      client.say(channel, t(channel, 'excavation.rewards.listEmpty'));
      return;
    }

    const list = data.data.map(reward => `${reward.title} (${reward.cost}) [${reward.id}]`).join(' | ');
    client.say(channel, t(channel, 'excavation.rewards.list') + list);
  } catch (err) {
    console.error(`Error listing custom rewards for ${channel}:`, err);
    client.say(channel, t(channel, 'errors.generic'));
  }
}

export async function testDig(channel, userstate, message) {
  const parts = message.trim().split(/\s+/);
  const tier = (parts[1] || '').toLowerCase();

  if (!isValidTier(tier)) {
    client.say(channel, t(channel, 'excavation.testdig.usage'));
    return;
  }

  let targetUsername = userstate.username;
  let targetUserId = userstate['user-id'];

  if (parts[2] && parts[2].startsWith('@')) {
    targetUsername = parts[2].slice(1).toLowerCase();
    // We only have a name for someone else from chat, not their real Twitch user
    // id, so test digs for another user are tracked under a synthetic id that
    // can't collide with a real (numeric) Twitch user id.
    targetUserId = `test:${targetUsername}`;
  }

  try {
    const result = await performDig(channel, targetUserId, targetUsername, tier);
    announceDigResult(channel, targetUsername, tier, result);
  } catch (err) {
    console.error(`Error running test dig for ${channel}:`, err);
    client.say(channel, t(channel, 'errors.generic'));
  }
}
