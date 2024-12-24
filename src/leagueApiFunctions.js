const {
    startsWith,
    getRankString,
    getSummonerData,
    getSummonerDataTagline,
    getRankDataForSummonerId,
    getLiveMatchDataForSummonerId,
    getNameMapping,
    getQueueTypeFromMessage,
} = require('./helper.js');

import fetch from 'node-fetch';
import client from './app.js';
import { RIOT_API_TOKEN } from './constants';

export async function getSummonerRank(channel, userstate, message, multiSummoner = false) {
  let summonerName;
  if(startsWith(message, '!rank')){
    summonerName = message.replace('!rank', '') === '' ? channel.replace('#', '') : message.replace('!rank ', '');
  } else {
    summonerName = message.replace('!elo', '') === '' ? channel.replace('#', '') : message.replace('!elo ', '');
  }

  let names;
  if(multiSummoner || summonerName.includes(',')){
    names = summonerName.split(',');
  } else {
    summonerName = getNameMapping(summonerName);
  }

  let rankMessage = '';

  try {
    if(multiSummoner || summonerName.includes(',')){
      let summonerResponses = [];
      for (let i = 0; i < names.length; i++) {
        if(names[i] == null) continue;
        let name = names[i];
        let response = name.includes('#') ? await getSummonerDataTagline(channel, name) : await getSummonerData(channel, name);
        if(response != null) summonerResponses.push(response)
      }

      let summonerIds = [];
      summonerResponses.forEach(response => {
        summonerIds.push(response.id);
      })

      let rankDatas = [];
      for (let i = 0; i < summonerIds.length; i++) {
        if(summonerIds[i] == null) continue;
        let response = await getRankDataForSummonerId(channel, summonerIds[i]);
        rankDatas.push(response)
      }

      let rankMessages = [];
      for (let i = 0; i < rankDatas.length; i++) {
        if(rankDatas[i] == null) continue;
        let name = names[i];
        rankMessages.push(await getRankString(channel, rankDatas[i], name));
      }

      rankMessage += '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ────────────────────────⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ '

      for (let i = 0; i < rankMessages.length; i++) {
        if(rankMessages[i] == null) continue;
        if(i == 0){
          rankMessage += rankMessages[i];
        } else {
          rankMessage += (' ────────────────────────⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀  ' + rankMessages[i])
        }
      }

      rankMessage += '⠀⠀⠀⠀⠀ ────────────────────────'

    } else {
      const summonerData =  summonerName.includes('#') ? await getSummonerDataTagline(channel, summonerName) : await getSummonerData(channel, summonerName);

      if(summonerData == null) return;

      const summonerId = summonerData.id;

      const rankData = await getRankDataForSummonerId(channel, summonerId)

      rankMessage = await getRankString(channel, rankData, summonerName)
    }

    if(rankMessage != ''){
      client.say(channel, rankMessage)
    } else {
      if(channel.includes('catzzi')) {
        client.say(channel, 'Well something went wrong here ropeFast')
      } else {
        client.say(channel, 'Well something went wrong here')
      }
    }
    return
  } catch (error) {
    console.error('Error:', error);
    return 'Error fetching data';
  }
}

export async function getLastGameData(channel, userstate, message) {
  try {
    let summonerName;

    // Extract and validate summoner name and queue type
    const commandContent = message.slice(message.indexOf(' ') + 1).trim();
    const queueTypeInfo = getQueueTypeFromMessage(message); // Use helper function
    const parts = commandContent.split(' ');

    console.log(parts, commandContent, queueTypeInfo);

    // Separate summoner name
    summonerName = parts[0].includes('#') ? parts[0] : channel.replace('#', '');

    console.log(summonerName, queueTypeInfo);

    summonerName = getNameMapping(summonerName);

    // Fetch summoner data
    const summonerData = await getSummonerDataTagline(channel, summonerName);

    if (!summonerData) {
      client.say(channel, `Summoner ${summonerName} not found.`);
      return;
    }

    // Fetch match history
    const summonerId = summonerData.puuid;
    const gameResponse = await fetch(
      `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${summonerId}/ids?start=0&count=10`, {
        method: 'GET',
        headers: { 'X-Riot-Token': RIOT_API_TOKEN },
      }
    );

    if (!gameResponse.ok) {
      client.say(channel, 'Keine vergangenen Spiele gefunden.');
      return;
    }

    const gameData = await gameResponse.json();
    if (gameData.length === 0) {
      client.say(channel, `${summonerName} has no recent games.`);
      return;
    }

    // Find the most recent game or filter by queue type
    let lastGame;
    if (queueTypeInfo.valid) {
      for (const gameId of gameData) {
        const matchResponse = await fetch(
          `https://europe.api.riotgames.com/lol/match/v5/matches/${gameId}`, {
            method: 'GET',
            headers: { 'X-Riot-Token': RIOT_API_TOKEN },
          }
        );
        const matchData = await matchResponse.json();

        if (matchData.info.queueId === queueTypeInfo.queueId) {
          lastGame = gameId;
          break;
        }
      }
    } else {
      lastGame = gameData[0]; // Default to the latest match if no valid queue type
    }

    if (!lastGame) {
      client.say(channel, `Kein Spiel im Modus "${parts[parts.length - 1]}" gefunden.`);
      return;
    }

    // Fetch details for the last game
    const matchResponse = await fetch(
      `https://europe.api.riotgames.com/lol/match/v5/matches/${lastGame}`, {
        method: 'GET',
        headers: { 'X-Riot-Token': RIOT_API_TOKEN },
      }
    );
    const matchData = await matchResponse.json();

    const participants = matchData.info.participants;
    const participantId = participants.find(participant => participant.puuid === summonerId);

    // Extract relevant game stats
    const idToMode = {
      400: 'Normal Draft Pick',
      420: 'Ranked Solo/Duo',
      430: 'Normal Blind Pick',
      440: 'Ranked Flex',
      450: 'ARAM',
      700: 'Clash',
      830: 'Co-op vs. AI Intermediate Bot',
      840: 'Co-op vs. AI Intro Bot',
      850: 'Co-op vs. AI Beginner Bot',
      900: 'URF',
      920: 'ARURF',
      1020: 'One for All',
      1300: 'Nexus Blitz',
    };

    const kda = `${participantId.kills}/${participantId.deaths}/${participantId.assists}`;
    const csPerMinute = ((participantId.totalMinionsKilled + participantId.totalEnemyJungleMinionsKilled + participantId.totalAllyJungleMinionsKilled) / (matchData.info.gameDuration / 60)).toFixed(2);
    const goldPerMinute = (participantId.goldEarned / (matchData.info.gameDuration / 60)).toFixed(2);
    const totalDamageDealtToChampions = participantId.totalDamageDealtToChampions;
    const championId = participantId.championName;
    const win = participantId.win ? 'Gewonnen' : 'Verloren';
    const hours = Math.floor(matchData.info.gameDuration / 60);
    const minutes = matchData.info.gameDuration % 60;
    const date = new Date(matchData.info.gameCreation);
    const matchType = idToMode[matchData.info.queueId] || 'Unbekannter Modus';

    const lgString = `${summonerName}: ${date.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' })} | ${matchType} | ${win} | ${hours}:${("0" + minutes).slice(-2)} |
      ${championId} | KDA: ${kda} | CS/Min: ${csPerMinute} | Gold/Min: ${goldPerMinute} | Schaden: ${totalDamageDealtToChampions}`;

    client.say(channel, lgString);
  } catch (error) {
    console.error('Error:', error);
    client.say(channel, 'Fehler beim Abrufen der Spieldaten.');
  }
}


export async function masteryscore(channel, userstate, message) {

  let summonerName = message.replace('!topmastery', '') === '' ? channel.replace('#', '') : message.replace('!topmastery ', '');

  summonerName = getNameMapping(summonerName);

  try {
    const apiKey = RIOT_API_TOKEN;

    const summonerData = summonerName.includes('#') ? await getSummonerDataTagline(channel, summonerName) : await getSummonerData(channel, summonerName);

    const summonerId = summonerData.puuid;

    // With the summoner ID, you can now request the champion mastery data.
    fetch(`https://euw1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${summonerId}`, {
      headers: {
        'X-Riot-Token': apiKey,
      },
    })
    .then(response => response.json())
    .then(masteryData => {
      // Sort the masteryData to get the champion with the highest mastery points.
      masteryData.sort((a, b) => b.championPoints - a.championPoints);

      // The champion with the highest mastery points is now at masteryData[0].
      const championId = masteryData[0].championId;
      const championPoints = masteryData[0].championPoints;
      const championLevel = masteryData[0].championLevel;

      // Construct the URL for fetching the latest game version.
      const versionURL = 'https://ddragon.leagueoflegends.com/api/versions.json';

      // Fetch the latest version.
      fetch(versionURL)
        .then(response => response.json())
        .then(data => {
          // The first item in the array is the latest version.
          const latestVersion = data[0];// You can then make another request to get champion information based on championId.
          fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`, {
            headers: {
              'X-Riot-Token': apiKey,
            },
          })
          .then(response => response.json())
          .then(championData => {
            let champion = Object.values(championData.data).find(champ => champ.key == championId).name
            client.say(channel, `${summonerName}: ${champion} Lvl ${championLevel} (${championPoints.toLocaleString()}) Punkte`)
          })
        })
        .catch(error => console.log('Error fetching latest version:', error));
    }).catch(error => console.log('Error fetching champion data:', error));


  } catch (error) {
    console.log('Error:', error);
  }
}

export async function getAvgRankInMatch(channel, userstate, message) {
let summonerName;
  if(startsWith(message, '!avgrank')){
    summonerName = message.replace('!avgrank', '') === '' ? channel.replace('#', '') : message.replace('!avgrank ', '');
  } else {
    summonerName = message.replace('!avgelo', '') === '' ? channel.replace('#', '') : message.replace('!avgelo ', '');
  }

  summonerName = getNameMapping(summonerName);


  try {
      const summonerData =  summonerName.includes('#') ? await getSummonerDataTagline(channel, summonerName) : await getSummonerData(channel, summonerName);

      const avgrank = await getLiveMatchDataForSummonerId(channel, summonerData.puuid)

      if(!avgrank) {
        return;
      }

      client.say(channel, 'Durchschnittlicher ingame Rang: ' + avgrank)

    return
  } catch (error) {
    console.error('Error:', error);
    return 'Error fetching data';
  }
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt === retries - 1) throw error; // Only throw after final retry
    }
  }
}
