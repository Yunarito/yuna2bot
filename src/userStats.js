const fs = require('fs');
const path = require('path');

import client from './app.js';

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
function updateUserStats(username, isWinner) {
  const stats = readUserStats();

  // Ensure the user exists in the stats
  if (!stats[username]) {
    stats[username] = { wins: 0, losses: 0 };
  }

  // Update the stats based on duel outcome
  if (isWinner) {
    stats[username].wins += 1;
  } else {
    stats[username].losses += 1;
  }

  // Write updated stats back to the file
  writeUserStats(stats);
}

// Function to handle the stats command
function stats(channel, userstate) {    
  const username = userstate.username;
  const stats = readUserStats();
  const userStats = stats[username] || { wins: 0, losses: 0 };

  client.say(channel, `@${username}, your duel stats: Wins: ${userStats.wins}, Losses: ${userStats.losses}`);
}

function leaderboard(channel) {
    const stats = readUserStats();
  
    // Convert stats object to an array and sort by wins
    const sortedUsers = Object.entries(stats)
      .sort(([, a], [, b]) => b.wins - a.wins)
      .slice(0, 5); // Get top 5 users
  
    // Format the leaderboard message
    let leaderboardMessage = 'Top 5 Duelers:';
    sortedUsers.forEach(([username, userStats], index) => {
      leaderboardMessage += `\n${index + 1}. ${username} - Wins: ${userStats.wins}, Losses: ${userStats.losses}`;
    });
  
    client.say(channel, leaderboardMessage);
  }

// Export functions using CommonJS
module.exports = {
  readUserStats,
  writeUserStats,
  updateUserStats,
  stats,
  leaderboard,
};
