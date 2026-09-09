import client from './app.js';
import initialize from './initialize';
import { t } from './i18n';
import { timeout } from './twitchApi.js';
const {
  updateUserStats,
} = require('./userStats.js');

export function duel(channel, userstate, message) {
    let command = message.trim().split(' ');
    let username = userstate.username;
    if (command.length < 2) {
      client.say(channel, t(channel, 'duel.needOpponent', { username }));
      return;
    }
    const opponent = command[1].replace('@', '').toLowerCase();
    if (opponent === username.toLowerCase()) {
      client.say(channel, t(channel, 'duel.cantSelf', { username }));
      return;
    }

    const channelData = initialize.channelsInfo[channel];
    if (channelData.pendingDuels[username]) {
      client.say(channel, t(channel, 'duel.alreadyPending', { username }));
      return;
    }

    channelData.pendingDuels[username] = { opponent, timeout: null };
    client.say(channel, t(channel, 'duel.challenge', { opponent, username }));

    channelData.pendingDuels[username].timeout = setTimeout(() => {
      client.say(channel, t(channel, 'duel.expired', { username, opponent }));
      delete channelData.pendingDuels[username];
    }, 60000); // 60 seconds
}

export function accept(channel, userstate, message) {

    let username = userstate.username;

    const channelData = initialize.channelsInfo[channel];

    const challenger = Object.keys(channelData.pendingDuels).find(
      (key) => channelData.pendingDuels[key].opponent === username.toLowerCase()
    );

    if (!challenger) {
      client.say(channel, t(channel, 'duel.noPending', { username }));
      return;
    }

    clearTimeout(channelData.pendingDuels[challenger].timeout);
    delete initialize.channelsInfo[channel].pendingDuels[challenger];

    client.say(channel, t(channel, 'duel.begins', { challenger, username }));

    let stink1 = Math.floor(Math.random() * 100) + 1;
    let stink2 = Math.floor(Math.random() * 100) + 1;

    if((challenger.toLowerCase() == "d4rkh4l3" || username.toLowerCase() == "d4rkh4l3") && Math.floor(Math.random() * 1000) + 1 == 420)
    {
      let darki = challenger.toLowerCase() == "d4rkh4l3" ? challenger : username;
      client.say(channel, t(channel, 'duel.darki', { user: darki }));
      timeout(darki, channel, 300); // Timeout the user
    } else if (stink1 < stink2) {
      client.say(channel, t(channel, 'duel.win', { winner: challenger, winnerScore: stink1, loser: username, loserScore: stink2 }));
      timeout(username, channel, 300); // Timeout the user
      updateUserStats(channel, challenger, true);  // Update stats for winner
      updateUserStats(channel, username, false);   // Update stats for loser
    } else if (stink1 > stink2) {
      client.say(channel, t(channel, 'duel.win', { winner: username, winnerScore: stink2, loser: challenger, loserScore: stink1 }));
      timeout(challenger, channel, 300); // Timeout the user
      updateUserStats(channel, username, true);  // Update stats for winner
      updateUserStats(channel, challenger, false);   // Update stats for loser
    } else {
      client.say(channel, t(channel, 'duel.tie', { a: challenger, aScore: stink1, b: username, bScore: stink2 }));
      timeout(username, channel, 300); // Timeout both users
      timeout(challenger, channel, 300);
      updateUserStats(channel, username, false);  // Update stats for tie
      updateUserStats(channel, challenger, false);
      client.say(channel, t(channel, 'duel.tieTimeout', { a: challenger, b: username }));
    }

}

export function decline(channel, userstate, message) {

    let username = userstate.username;

    const challenger = Object.keys(initialize.channelsInfo[channel].pendingDuels).find(key => initialize.channelsInfo[channel].pendingDuels[key].opponent === username.toLowerCase());

    if (!challenger) {
      client.say(channel, t(channel, 'duel.noPending', { username }));
      return;
    }

    const challengerIndex = initialize.channelsInfo[channel].pendingDuels[challenger];

    if (challengerIndex.opponent !== username.toLowerCase()) {
      client.say(channel, t(channel, 'duel.declineInvalid', { username }));
      return;
    }

    clearTimeout(initialize.channelsInfo[channel].pendingDuels[challenger].timeout);
    delete initialize.channelsInfo[channel].pendingDuels[challenger];
    client.say(channel, t(channel, 'duel.declined', { challenger, username }));
}

export function retract(channel, userstate, message) {
        let username = userstate.username;

        const opponent = Object.keys(initialize.channelsInfo[channel].pendingDuels).find(key => key === username.toLowerCase());

        if (!opponent) {
        client.say(channel, t(channel, 'duel.noPendingHmm', { username }));
        return;
        }

        console.log(initialize.channelsInfo[channel].pendingDuels[username]);
        clearTimeout(initialize.channelsInfo[channel].pendingDuels[username].timeout);
        delete initialize.channelsInfo[channel].pendingDuels[username];

        client.say(channel, t(channel, 'duel.retracted', { username }));
}

export function duelInfo(channel, userstate, message) {
    let username = userstate.username;
    client.say(channel, t(channel, 'duel.info', { username }));
}

// Group duel functions

export function groupDuel(channel, userstate, message) {
  const command = message.trim().split(' ');
  const username = userstate.username;

  if (command.length < 2) {
      client.say(channel, t(channel, 'groupDuel.needOpponent', { username }));
      return;
  }

  const opponents = command.slice(1).map(opponent => opponent.replace('@', '').toLowerCase());

  if (opponents.includes(username.toLowerCase())) {
      client.say(channel, t(channel, 'groupDuel.cantSelf', { username }));
      return;
  }

  if (new Set(opponents).size !== opponents.length) {
      client.say(channel, t(channel, 'groupDuel.duplicate', { username }));
      return;
  }

  const channelData = initialize.channelsInfo[channel];
  if (channelData.pendingDuels[username]) {
      client.say(channel, t(channel, 'groupDuel.alreadyPending', { username }));
      return;
  }

  channelData.pendingDuels[username] = {
      opponents: [username, ...opponents],
      accepted: new Set().add(username),
      timeout: null
  };

  client.say(channel, t(channel, 'groupDuel.challenge', { opponents: opponents.join(', @'), username }));

  channelData.pendingDuels[username].timeout = setTimeout(() => {
      client.say(channel, t(channel, 'groupDuel.expired', { username, opponents: opponents.join(', ') }));
      delete channelData.pendingDuels[username];
  }, 120000); // 120 seconds
}

export function acceptGroupDuel(channel, userstate, message) {
  const username = userstate.username.toLowerCase();
  const channelData = initialize.channelsInfo[channel];

  const challenger = Object.keys(channelData.pendingDuels).find(
      key => channelData.pendingDuels[key].opponents.includes(username)
  );

  if (!challenger) {
      client.say(channel, t(channel, 'groupDuel.noPending', { username }));
      return;
  }

  const duel = channelData.pendingDuels[challenger];
  duel.accepted.add(username);

  if (duel.accepted.size === duel.opponents.length) {
      // All remaining opponents have accepted
      clearTimeout(duel.timeout);
      delete channelData.pendingDuels[challenger];
      startGroupDuel(channel, duel.opponents);
  } else {
      client.say(channel, t(channel, 'groupDuel.accepted', { username }));
  }
}

export function declineGroupDuel(channel, userstate, message) {
  const username = userstate.username.toLowerCase();
  const channelData = initialize.channelsInfo[channel];

  // Find the duel where the user is an opponent
  const challenger = Object.keys(channelData.pendingDuels).find(
      key => channelData.pendingDuels[key].opponents.includes(username)
  );

  if (!challenger) {
      client.say(channel, t(channel, 'groupDuel.noPendingDecline', { username }));
      return;
  }

  const duel = channelData.pendingDuels[challenger];
  const index = duel.opponents.indexOf(username);
  if (index > -1) {
      duel.opponents.splice(index, 1); // Remove user from the opponents list
  }

  if (duel.accepted.has(username)) {
      duel.accepted.delete(username); // Remove user from accepted list if they had accepted
  }

  client.say(channel, t(channel, 'groupDuel.declined', { username }));

  if (duel.opponents.length < 2) {
      // If fewer than two participants remain, cancel the duel
      clearTimeout(duel.timeout);
      delete channelData.pendingDuels[challenger];
      client.say(channel, t(channel, 'groupDuel.cancelled', { challenger }));
  }
}

function startGroupDuel(channel, participants) {
  const channelData = initialize.channelsInfo[channel];
  const scores = participants.map(participant => ({
      name: participant,
      score: Math.floor(Math.random() * 100) + 1
  }));

  scores.sort((a, b) => a.score - b.score); // Sort in ascending order by score
  const winner = scores[0];

  client.say(channel, t(channel, 'groupDuel.winner', { winner: winner.name, score: winner.score }));

  scores.slice(1).forEach(loser => {
      client.say(channel, t(channel, 'groupDuel.loser', { loser: loser.name, score: loser.score }));
      timeout(loser.name, channel, 300); // Timeout losers
      updateUserStats(channel, loser.name, false);  // Update stats for losers
  });

  updateUserStats(channel, winner.name, true);  // Update stats for the winner
}

// Contest functions

export function openContest(channel, userstate, message) {
  const username = userstate.username;
  const channelData = initialize.channelsInfo[channel] || (initialize.channelsInfo[channel] = {});

  if (channelData.currentContest) {
      client.say(channel, t(channel, 'contest.alreadyActive', { username }));
      return;
  }

  const contestDuration = 120000; // 60 seconds

  channelData.currentContest = {
      participants: new Set().add(username.toLowerCase()),
      timeout: setTimeout(() => {
          endContest(channel);
      }, contestDuration)
  };

  client.say(channel, t(channel, 'contest.started', { username, minutes: contestDuration / 1000 / 60 }));
}

export function joinContest(channel, userstate, message) {
  const username = userstate.username.toLowerCase();
  const channelData = initialize.channelsInfo[channel];

  if (!channelData || !channelData.currentContest) {
      client.say(channel, t(channel, 'contest.none', { username }));
      return;
  }

  if (channelData.currentContest.participants.has(username)) {
      client.say(channel, t(channel, 'contest.alreadyJoined', { username }));
      return;
  }

  channelData.currentContest.participants.add(username);
  client.say(channel, t(channel, 'contest.joined', { username }));
}

function endContest(channel) {
  const channelData = initialize.channelsInfo[channel];

  if (!channelData || !channelData.currentContest) {
      client.say(channel, t(channel, 'contest.noneToEnd'));
      return;
  }

  const participants = Array.from(channelData.currentContest.participants);

  if (participants.length < 1) {
      client.say(channel, t(channel, 'contest.noParticipants'));
  } else {
      const scores = participants.map(participant => ({
          name: participant,
          score: Math.floor(Math.random() * 100) + 1
      }));

      // Sort scores to find the minimum
      scores.sort((a, b) => a.score - b.score);

      const minScore = scores[0].score;
      const winners = scores.filter(participant => participant.score === minScore);

      const winnerNames = winners.map(winner => `@${winner.name}`).join(', ');

      client.say(channel, t(channel, 'contest.ended', { winners: winnerNames, score: minScore }));

      // winners.forEach(winner => updateUserStats(channel, winner.name, true));
      // Notify non-winning participants
      scores.filter(participant => participant.score !== minScore).forEach(loser => {
          client.say(channel, t(channel, 'contest.loserResult', { loser: loser.name, score: loser.score }));
          // updateUserStats(channel, loser.name, false);
          timeout(loser.name, channel, 60);
      });
  }

  clearTimeout(channelData.currentContest.timeout);
  delete channelData.currentContest;
}
