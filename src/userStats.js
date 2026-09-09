const fs = require('fs');
const path = require('path');
const db = require('./db.js');

import { DefaultDeserializer } from 'v8';
import client from './app.js';
import initialize from './initialize';
import { t } from './i18n';

// Path to the JSON file that stores user statistics
const statsDir = path.join(__dirname, 'json', 'userStats');
const statsFilePath = path.join(statsDir, 'userStats.json');

function ensureStatsFileExists() {
    // Ensure the directory exists
    if (!fs.existsSync(statsDir)) {
      fs.mkdirSync(statsDir, { recursive: true });
    }

    // Check if the file exists and create it if it doesn't
    if (!fs.existsSync(statsFilePath)) {
      fs.writeFileSync(statsFilePath, JSON.stringify({}));
      console.log('User stats file created.');
    }
}

// DEPRECATED: kept only as a write-through backup while the DB migration
// settles (duel_stats is now the source of truth for all reads). Remove
// readUserStats/writeUserStats and the writeUserStats call in
// updateUserStats once that's confirmed stable.
function readUserStats() {
    ensureStatsFileExists();
  try {
    if (!fs.existsSync(statsFilePath)) {
      return {}; // Return empty stats if file doesn't exist
    }
    const data = fs.readFileSync(statsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading user stats file:', err);
    return {};
  }
}

// Write user stats to the JSON file
function writeUserStats(stats) {
  try {
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error('Error writing user stats file:', err);
  }
}

// Update win/loss record for a user
function updateUserStats(channel, username, isWinner) {
    const stats = readUserStats();

    if (!stats[channel]) {
      stats[channel] = {};
    }

    if (!stats[channel][username]) {
      stats[channel][username] = { wins: 0, losses: 0 };
    }

    if (isWinner) {
      stats[channel][username].wins += 1;
    } else {
      stats[channel][username].losses += 1;
    }

    writeUserStats(stats);

    upsertDuelStatsInDb(channel, username, isWinner).catch((err) => {
      console.error('Error writing duel stats to database:', err);
    });
  }

// Mirrors updateUserStats' JSON write into the duel_stats table.
async function upsertDuelStatsInDb(channel, username, isWinner) {
  const winsIncrement = isWinner ? 1 : 0;
  const lossesIncrement = isWinner ? 0 : 1;

  await db.query(
    `INSERT INTO duel_stats (channel, username, wins, losses)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE wins = wins + VALUES(wins), losses = losses + VALUES(losses)`,
    [channel, username, winsIncrement, lossesIncrement]
  );
}

// Function to handle the stats command
async function stats(channel, userstate, message) {
    let command = message.trim().split(' ');
    console.log(command);
    let username;
    if(command.length > 1) {
      username = command[1].replace('@', '').toLowerCase();
    } else {
      username = userstate.username;
    }

    let userStats;
    try {
      userStats = await getDuelStatsFromDb(channel, username);
    } catch (err) {
      console.error('Error reading duel stats from database:', err);
      client.say(channel, t(channel, 'errors.generic'));
      return;
    }

    client.say(channel, t(channel, 'stats.duelStats', {
      username,
      wins: userStats.wins,
      losses: userStats.losses,
      pct: (userStats.wins / (userStats.wins + userStats.losses) * 100).toFixed(2)
    }));
}

async function getDuelStatsFromDb(channel, username) {
  const [rows] = await db.query(
    'SELECT wins, losses FROM duel_stats WHERE channel = ? AND username = ?',
    [channel, username]
  );

  return rows[0] || { wins: 0, losses: 0 };
}

async function getLeaderboard(channel) {
    const [rows] = await db.query(
      'SELECT username, wins, losses FROM duel_stats WHERE channel = ? ORDER BY wins DESC, losses ASC LIMIT 5',
      [channel]
    );

    return rows;
}

async function leaderboard(channel) {
    let topUsers;
    try {
      topUsers = await getLeaderboard(channel);
    } catch (err) {
      console.error('Error reading leaderboard from database:', err);
      client.say(channel, t(channel, 'errors.generic'));
      return;
    }

    if (topUsers.length === 0) {
      client.say(channel, t(channel, 'stats.noLeaderboard'));
    } else {
      let leaderboardMessage = t(channel, 'stats.leaderboardHeader');
      leaderboardMessage += topUsers.map((user, index) => `${index + 1}. @${user.username} - [${user.wins}:${user.losses}]`).join(' | ');
      client.say(channel, leaderboardMessage);
    }
}

// Subathon logic

async function addSubathonPoints(channel, username, points) {
  await db.query(
    `INSERT INTO subathon_points (channel, username, points)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE points = points + VALUES(points)`,
    [channel, username, points]
  );
}

async function getSubathonUserPoints(channel, username) {
  const [rows] = await db.query(
    'SELECT points FROM subathon_points WHERE channel = ? AND username = ?',
    [channel, username]
  );

  return rows[0] ? Number(rows[0].points) : 0;
}

async function getSubathonTotalPoints(channel) {
  const [rows] = await db.query(
    'SELECT SUM(points) AS total FROM subathon_points WHERE channel = ?',
    [channel]
  );

  return rows[0].total !== null ? Number(rows[0].total) : 0;
}

// Maps a point_values row onto the nested shape subathonCounter.js expects
// (pointTable.subscriptions['1'|'2'|'3'|'prime'], .cheers.hundred, .donations.euro).
const POINT_VALUE_SHAPE = {
  sub_tier_1: ['subscriptions', '1'],
  sub_tier_2: ['subscriptions', '2'],
  sub_tier_3: ['subscriptions', '3'],
  sub_prime: ['subscriptions', 'prime'],
  cheer_100: ['cheers', 'hundred'],
  donation_euro: ['donations', 'euro'],
};

async function getPointTable(channel) {
  const isHappyHour = !!(initialize.channelsInfo[channel] && initialize.channelsInfo[channel].happyHour);

  const [rows] = await db.query('SELECT source_type, label, normal_points, happy_points FROM point_values');

  const pointTable = { subscriptions: {}, cheers: {}, donations: {} };

  for (const row of rows) {
    const shape = POINT_VALUE_SHAPE[row.source_type];
    if (!shape) continue;

    const [group, key] = shape;
    pointTable[group][key] = {
      name: row.label,
      points: Number(isHappyHour ? row.happy_points : row.normal_points),
    };
  }

  return pointTable;
}

// Export functions using CommonJS
module.exports = {
  readUserStats,
  writeUserStats,
  updateUserStats,
  stats,
  leaderboard,
  addSubathonPoints,
  getSubathonUserPoints,
  getSubathonTotalPoints,
  getPointTable,
};
