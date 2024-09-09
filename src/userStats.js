const fs = require('fs');
const path = require('path');

import client from './app.js';

// Path to the JSON file that stores user statistics
const statsDir = path.join(__dirname, 'json', 'userStats');
const statsFilePath = path.join(statsDir, 'userStats.json');
const subathonFilePath = path.join(statsDir, 'subathon.json');
const pointTablePath = path.join(statsDir, 'pointTable.json');

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

function ensureSubathonFileExists() {
    // Ensure the directory exists
    if (!fs.existsSync(statsDir)) {
      fs.mkdirSync(statsDir, { recursive: true });
    }
  
    // Check if the file exists and create it if it doesn't
    if (!fs.existsSync(subathonFilePath)) {
      fs.writeFileSync(subathonFilePath, JSON.stringify({}));
      console.log('Subathon file created.');
    }
}

// Read user stats from the JSON file
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
  }

// Function to handle the stats command
function stats(channel, userstate, message) {
    let command = message.trim().split(' ');
    console.log(command);
    let username;
    if(command.length > 1) {
      username = command[1].replace('@', '').toLowerCase();
    } else {
      username = userstate.username;
    }
    const stats = readUserStats();
    const userStats = (stats[channel] && stats[channel][username]) || { wins: 0, losses: 0 };
  
    client.say(channel, `@${username}, deine Duellstats: Wins: ${userStats.wins}, Losses: ${userStats.losses} (${(userStats.wins / (userStats.wins + userStats.losses) * 100).toFixed(2)}%)`);
}

function getLeaderboard(channel) {
    const stats = readUserStats();
    const channelStats = stats[channel] || {};
  
    const leaderboard = Object.entries(channelStats)
      .map(([username, { wins, losses }]) => ({ username, wins, losses }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
      .slice(0, 5); // Top 5
  
    return leaderboard;
}

function leaderboard(channel) {
    const topUsers = getLeaderboard(channel);
    if (topUsers.length === 0) {
      client.say(channel, `Kein Bestenliste vorhanden.`);
    } else {
      let leaderboardMessage = `Top 5 Duelisten: `;
      leaderboardMessage += topUsers.map((user, index) => `${index + 1}. @${user.username} - [${user.wins}:${user.losses}]`).join(' | ');
      client.say(channel, leaderboardMessage);
    }
}

// Subathon logic

function addSubathonPoints(channel, username, points) {
  ensureSubathonFileExists();

  const subathonData = readSubathonData();
  if (!subathonData[channel]) {
    subathonData[channel] = {
      points: 0
    };
  } else if (!subathonData[channel][username]) {
    subathonData[channel][username] = {
      points: 0,
    };
  }

  console.log(channel, username, points, subathonData[channel]);
  

  subathonData[channel].points += points;
  subathonData[channel][username].points += points;

  writeSubathonData(subathonData);
}

function readSubathonData() {
  ensureSubathonFileExists();
  try {
    const data = fs.readFileSync(subathonFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading subathon file:', err);
    return {};
  }
}

function writeSubathonData(subathonData) {
  try {
    fs.writeFileSync(subathonFilePath, JSON.stringify(subathonData, null, 2));
  } catch (err) {
    console.error('Error writing subathon file:', err);
  }
}

function getPointTable() {
  try {
    const data = fs.readFileSync(pointTablePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading subathon file:', err);
    return {};
  }
}

function addUserPoints(channel, user, points) {
  const pointTable = getPointTable();
  if (!pointTable[channel]) {
    pointTable[channel] = {};
  }

  if (!pointTable[channel][user]) {
    pointTable[channel][user] = 0;
  }

  pointTable[channel][user] += points;
  writeSubathonData(pointTable);
}

// Export functions using CommonJS
module.exports = {
  readUserStats,
  writeUserStats,
  updateUserStats,
  stats,
  leaderboard,
  addSubathonPoints,
  readSubathonData,
  writeSubathonData,
  getPointTable,
  addUserPoints
};
