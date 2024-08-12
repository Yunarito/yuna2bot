import client from './app.js';
import initialize from './initialize';
import { timeout } from './twitchApi.js';
const {
  updateUserStats,
} = require('./userStats.js');

export function duel(channel, userstate, message) {
    let command = message.trim().split(' ');
    let username = userstate.username;
    if (command.length < 2) {
      client.say(channel, `@${username}, bitte nenne einen Gegner. Prayge `);
      return;
    }
    const opponent = command[1].replace('@', '').toLowerCase();
    if (opponent === username.toLowerCase()) {
      client.say(channel, `@${username}, du kannst dich nicht selbst duellieren! nh `);
      return;
    }
  
    const channelData = initialize.channelsInfo[channel];
    if (channelData.pendingDuels[username]) {
      client.say(channel, `@${username}, du hast bereits eine Ausstehende Duellanfrage! MADcat `);
      return;
    }
    
    channelData.pendingDuels[username] = { opponent, timeout: null };
    client.say(channel, `@${opponent}, du wurdest von @${username} zu einem Duell herausgefordert! 
      Schreibe !accept um anzunehmen! Verlierer ist 5 minuten im Timeout`);

    channelData.pendingDuels[username].timeout = setTimeout(() => {
      client.say(channel, `@${username}, deine Duellanfrage an @${opponent} is abgelaufen. SadCat`);
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
      client.say(channel, `@${username}, du hast keine ausstehenden Duellanfragen.`);
      return;
    }

    clearTimeout(channelData.pendingDuels[challenger].timeout);
    delete initialize.channelsInfo[channel].pendingDuels[challenger];
    
    client.say(channel, `@${challenger} und @${username}, das Stinkerduell beginnt! PauseChamp`);
  
    let stink1 = Math.floor(Math.random() * 100) + 1;
    let stink2 = Math.floor(Math.random() * 100) + 1;
  
    if (stink1 < stink2) {
      client.say(channel, `@${challenger} (${stink1}%) gewinnt das Stinkerduell @${username} (${stink2}%)! Smelly`);
      timeout(username, channel, channelData.timeoutTime); // Timeout the user
      updateUserStats(channel, challenger, true);  // Update stats for winner
      updateUserStats(channel, username, false);   // Update stats for loser
    } else if (stink1 > stink2) {
      client.say(channel, `@${username} (${stink2}%) gewinnt das Stinkerduell @${challenger} (${stink1}%)! Smelly`);
      timeout(challenger, channel, channelData.timeoutTime); // Timeout the user
      updateUserStats(channel, username, true);  // Update stats for winner
      updateUserStats(channel, challenger, false);   // Update stats for loser
    } else {
      client.say(channel, `Unentschieden! @${challenger} (${stink1}%) und @${username} (${stink2}%) stinken gleich stark! Smelly`);
      timeout(username, channel, channelData.timeoutTime); // Timeout both users
      timeout(challenger, channel, channelData.timeoutTime);
      updateUserStats(channel, username, false);  // Update stats for tie
      updateUserStats(channel, challenger, false);
      client.say(channel, `@${challenger} und @${username} sind nun im Timeout pepePoint .`);
    }

}

export function decline(channel, userstate, message) {
    
    let username = userstate.username;

    const challenger = Object.keys(initialize.channelsInfo[channel].pendingDuels).find(key => initialize.channelsInfo[channel].pendingDuels[key].opponent === username.toLowerCase());

    if (!challenger) {
      client.say(channel, `@${username}, du hast keine ausstehenden Duellanfragen.`);
      return;
    }

    const challengerIndex = initialize.channelsInfo[channel].pendingDuels[challenger];

    if (challengerIndex.opponent !== username.toLowerCase()) {
      client.say(channel, `@${username}, du kannst keine Duellanfrage ablehnen, die du nie erhalten hast KEKW`);
      return;
    }

    clearTimeout(initialize.channelsInfo[channel].pendingDuels[challenger].timeout);
    delete initialize.channelsInfo[channel].pendingDuels[challenger];
    client.say(channel, `@${challenger}, deine Duellanfrage an @${username} wurde abgelehnt. SadCat`);
}

export function retract(channel, userstate, message) {
        let username = userstate.username;
    
        const opponent = Object.keys(initialize.channelsInfo[channel].pendingDuels).find(key => key === username.toLowerCase());
        
        if (!opponent) {
        client.say(channel, `@${username}, du hast keine ausstehenden Duellanfragen. Hmm`);
        return;
        }
  
        console.log(initialize.channelsInfo[channel].pendingDuels[username]);
        clearTimeout(initialize.channelsInfo[channel].pendingDuels[username].timeout);
        delete initialize.channelsInfo[channel].pendingDuels[username];
        
        client.say(channel, `@${username}, deine Duellanfrage wurde zurückgezogen. Yoink`);
}

export function duelInfo(channel, userstate, message) {
    let username = userstate.username;
    client.say(channel, `@${username}, verfügbarer Befehle: 
      !duell <username>, !accept, !decline, !retract, !duellinfo, !moshpit <name> <name2>.., !acceptmoshpit, !declinemoshpit, !openfight, !joinfight
      !duellstats, !duellboard`);
}

// Group duel functions

export function groupDuel(channel, userstate, message) {
  const command = message.trim().split(' ');
  const username = userstate.username;

  if (command.length < 2) {
      client.say(channel, `@${username}, bitte nenne mindestens einen Gegner. FlowerCatJAM`);
      return;
  }

  const opponents = command.slice(1).map(opponent => opponent.replace('@', '').toLowerCase());

  if (opponents.includes(username.toLowerCase())) {
      client.say(channel, `@${username}, nenn dich nicht selbst! fricc`);
      return;
  }

  if (new Set(opponents).size !== opponents.length) {
      client.say(channel, `@${username}, doppelte Gegner erkannt. Bitte nur unterschiedliche Namen nennen. fricc`);
      return;
  }

  const channelData = initialize.channelsInfo[channel];
  if (channelData.pendingDuels[username]) {
      client.say(channel, `@${username}, du hast bereits ein ausstehendes Duell`);
      return;
  }

  channelData.pendingDuels[username] = {
      opponents: [username, ...opponents],
      accepted: new Set().add(username),
      timeout: null
  };

  client.say(channel, `@${opponents.join(', @')}, ihr wurdet von @${username} zu einem Gruppenduell eingeladen! 
  Schreibt !acceptmoshpit um beizutreten. Alle bis auf der Gewinner mit der niedrigsten Stinkung werden 5 Minuten im Timeout sein. chillCat `);

  channelData.pendingDuels[username].timeout = setTimeout(() => {
      client.say(channel, `@${username}, deine Gruppenduellanfrage an ${opponents.join(', ')} ist abgelaufen. SadCat`);
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
      client.say(channel, `@${username}, du hast keine ausstehenden Gruppenduelle. Hmm`);
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
      client.say(channel, `@${username} hat das Duell angenommen. Warte auf das Annehmen oder Ablehnen der anderen Teilnehmer. chillCat`);
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
      client.say(channel, `@${username}, du hat keine ausstehenden Anfragen für Gruppenduelle, die du ablehnen kannst. Hmm`);
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

  client.say(channel, `@${username} hat das Gruppenduell abgelehnt. Warten auf die verbleibenden Teilnehmer. catWait`);

  if (duel.opponents.length < 2) {
      // If fewer than two participants remain, cancel the duel
      clearTimeout(duel.timeout);
      delete channelData.pendingDuels[challenger];
      client.say(channel, `@${challenger}, es gibt nicht genug Teilnehmer. Das Gruppenduell wurde abgebrochen. SadCat`);
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

  client.say(channel, `@${winner.name} gewinnt das Duell mit einer Stinkung von ${winner.score}%! owofinger`);

  scores.slice(1).forEach(loser => {
      client.say(channel, `@${loser.name} (${loser.score}%) verliert das Duell und ist im Timeout .`);
      timeout(loser.name, channel, channelData.timeoutTime); // Timeout losers
      updateUserStats(channel, loser.name, false);  // Update stats for losers
  });

  updateUserStats(channel, winner.name, true);  // Update stats for the winner
}

// Contest functions

export function openContest(channel, userstate, message) {
  const username = userstate.username;
  const channelData = initialize.channelsInfo[channel] || (initialize.channelsInfo[channel] = {});

  if (channelData.currentContest) {
      client.say(channel, `@${username}, es gibt bereits einen Stinkkrieg. Bitte warte bis dieser endet. Hmm`);
      return;
  }

  const contestDuration = 120000; // 60 seconds

  channelData.currentContest = {
      participants: new Set().add(username.toLowerCase()),
      timeout: setTimeout(() => {
          endContest(channel);
      }, contestDuration)
  };

  client.say(channel, `@${username} hat einen Stinkkrieg gestartet! HYPERYump Schreibe !joinfight um teilzunehmen!
     Der Stinkkrieg ended in ${contestDuration / 1000 / 60} Minuten.`);
}

export function joinContest(channel, userstate, message) {
  const username = userstate.username.toLowerCase();
  const channelData = initialize.channelsInfo[channel];

  if (!channelData || !channelData.currentContest) {
      client.say(channel, `@${username}, es gibt keine aktiven Stinkkrieg Deadge .`);
      return;
  }

  if (channelData.currentContest.participants.has(username)) {
      client.say(channel, `@${username}, du bist bereits im Stinkkrieg Madge .`);
      return;
  }

  channelData.currentContest.participants.add(username);
  client.say(channel, `@${username} ist dem Stinkkrieg beigetreten! owoCheer Fight `);
}

function endContest(channel) {
  const channelData = initialize.channelsInfo[channel];

  if (!channelData || !channelData.currentContest) {
      client.say(channel, `Es gibt keinen aktiven Stinkkrieg zu beenden.`);
      return;
  }

  const participants = Array.from(channelData.currentContest.participants);

  if (participants.length < 1) {
      client.say(channel, `Der Stinkkrieg hatte keine Teilnehmer. Deadge`);
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

      client.say(channel, `Der Stinkkrieg ist zu Ende! Gewinner: ${winnerNames} mit einer Stinkung von ${minScore}%! owofinger`);

      // winners.forEach(winner => updateUserStats(channel, winner.name, true));
      // Notify non-winning participants
      scores.filter(participant => participant.score !== minScore).forEach(loser => {
          client.say(channel, `@${loser.name} stinkt zu ${loser.score}% und hat verloren. fricc`);
          // updateUserStats(channel, loser.name, false);
          timeout(loser.name, channel, 60);
      });
  }

  clearTimeout(channelData.currentContest.timeout);
  delete channelData.currentContest;
}
