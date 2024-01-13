import tmi from 'tmi.js'
import fetch from 'node-fetch';

import { BOT_USERNAME , OAUTH_TOKEN, CHANNEL_NAME, BLOCKED_WORDS, RIOT_API_TOKEN } from './constants'

const options = {
	options: { debug: true },
	connection: {
    reconnect: true,
    secure: true,
    timeout: 180000,
    reconnectDecay: 1.4,
    reconnectInterval: 1000,
	},
	identity: {
		username: BOT_USERNAME,
		password: OAUTH_TOKEN
	},
	channels: [ CHANNEL_NAME ]
}

const client = new tmi.Client(options)

client.connect()

// event handlers

client.on('message', (channel, userstate, message, self) => {
  if(self) {
    return
  }

  if (userstate.username === BOT_USERNAME) {
    console.log(`Not checking bot's messages.`)
    return
  }

  if(startsWith(message, '!rank') || startsWith(message, '!elo')) 
  {
    if(channel.includes('catzzi') || message.includes(',')){
      if(startsWith(message, '!rank')){
        let names = message.replace('!rank', '') === '' ? 'catzzi#EUW,smolcatzzi#EUW,smolercatzzi#6969,smolestcatzzi#6969' : message.replace('!rank ', '');
        getSummonerRank(channel, userstate, '!rank ' + names, true)
      } else {
        let names = message.replace('!elo', '') === '' ? 'catzzi#EUW,smolcatzzi#EUW,smolercatzzi#6969,smolestcatzzi#6969' : message.replace('!elo ', '');
        getSummonerRank(channel, userstate, '!elo ' + names, true)
      }
    } else {
      getSummonerRank(channel, userstate, message)
    }
    return
  }

  if(startsWith(message, '!avgrank') || startsWith(message, '!avgelo')) {
    getAvgRankInMatch(channel, userstate, message)
    return
  }

  if(startsWith(message,'!lastgame')) {
    getLastGameData(channel, userstate, message)
    return
  }

  if(startsWith(message,'!topmastery')) {
    masteryscore(channel, userstate, message)
    return
  }

  if(startsWith(message,'!commands')) {
    commands(channel)
    return
  }

  onMessageHandler(channel, userstate, message, self)
})

function onMessageHandler (channel, userstate, message, self) {
  checkTwitchChat(userstate, message, channel)
}


// commands

async function getSummonerRank(channel, userstate, message, multiSummoner = false) {
  let summonerName;
  if(startsWith(message, '!rank')){
    summonerName = message.replace('!rank', '') === '' ? channel.replace('#', '') : message.replace('!rank ', '');
  } else {
    summonerName = message.replace('!elo', '') === '' ? channel.replace('#', '') : message.replace('!elo ', '');
  }

  console.log(summonerName);

  let names;
  if(multiSummoner || summonerName.includes(',')){
    names = summonerName.split(',');
  } else {
    summonerName = summonerName === 'chris5560' ? 'Nathaniel Flint#Scrin' : summonerName;
    summonerName = summonerName === 'pluffuff' ? 'Pluffuff#EUW' : summonerName;
    summonerName = summonerName === 'amaar270' ? 'WHY Ekoko#EUW' : summonerName;
    summonerName = summonerName === 'yuuukix3' ? 'xYukix#EUW' : summonerName;
    summonerName = summonerName === 'callme_chilli' ? 'Chìllì' : summonerName;
  }

  let rankMessage = '';

  try {
    if(multiSummoner || summonerName.includes(',')){
      let summonerResponses = [];
      for (let i = 0; i < names.length; i++) {
        if(names[i] == null) continue;
        let name = names[i];
        let response = name.includes('#') ? await getSummonerDataTagline(channel, name) : await getSummonerData(channel, name);
        summonerResponses.push(response)
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

async function getLastGameData(channel, userstate, message) {

  let summonerName = message.replace('!lastgame', '') === '' ? channel.replace('#', '') : message.replace('!lastgame ', '');

  summonerName = summonerName === 'chris5560' ? 'Hashira Kyojuro' : summonerName;
  summonerName = summonerName === 'amaar270' ? 'WHY Ekoko' : summonerName;
  summonerName = summonerName === 'yuuukix3' ? 'xYukix' : summonerName;
  summonerName = summonerName === 'callme_chilli' ? 'Chìllì' : summonerName;

  try {
    const apiKey = RIOT_API_TOKEN;
    const apiUrl = `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`
    
    // Make a request to get the summoner's ID
    const summonerData = summonerName.includes('#') ? await getSummonerDataTagline(channel, summonerName) : await getSummonerData(channel, summonerName);

    if (summonerData) {
      const summonerId = summonerData.puuid;
      const gameResponse = await fetch(
        `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${summonerId}/ids?start=0&count=5`, {
          method: 'GET',
          headers: {
            'X-Riot-Token': apiKey,
          },
        }
      );

      if (!gameResponse.ok) {
        client.say(channel, 'No recent games found');
        throw new Error('gameResponsebad');
        return;
      }

      const gameData = await gameResponse.json();


      if (gameData.length > 0) {
        // Get the most recent game
        const lastGame = gameData[0];

        // Fetch detailed statistics for the last game
        const matchResponse = await fetch(
          `https://europe.api.riotgames.com/lol/match/v5/matches/${lastGame}`, {
            method: 'GET',
            headers: {
              'X-Riot-Token': apiKey,
            },
          }
        );
        const matchData = await matchResponse.json();
        // Extract the desired statistics
        const participants = matchData.info.participants;
      
        const participantId = participants.find(participant => participant.puuid === summonerId)

        const kda = `${participantId.kills}/${participantId.deaths}/${participantId.assists}`;
        const csPerMinute = ((participantId.totalMinionsKilled + participantId.totalEnemyJungleMinionsKilled + participantId.totalAllyJungleMinionsKilled) / (matchData.info.gameDuration / 60)).toFixed(2);
        const goldPerMinute = (participantId.goldEarned / (matchData.info.gameDuration / 60)).toFixed(2);
        const totalDamageDealtToChampions = participantId.totalDamageDealtToChampions;
        const championId = participantId.championName;
        const win = participantId.win == 1 ? 'Victory' : 'Defeat';
        const hours = Math.floor(matchData.info.gameDuration / 60);
        const minutes = matchData.info.gameDuration % 60;
        
        client.say(channel, `${summonerName}: ${championId} 
        | KDA: ${kda} | CS/minute: ${csPerMinute} | Gold/minute: ${goldPerMinute} 
        | Total Damage Dealt to Champions: ${totalDamageDealtToChampions} 
        | ${win} | Game Duration: ${hours}:${minutes}`)
      } else {
        client.say(channel, `${summonerName} has no recent games.`);
      }
    } else {
      client.say(channel, `Summoner ${summonerName} not found.`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function masteryscore(channel, userstate, message) {

  
  let summonerName = message.replace('!topmastery', '') === '' ? channel.replace('#', '') : message.replace('!topmastery ', '');

  summonerName = summonerName === 'chris5560' ? 'Hashira Kyojuro' : summonerName;
  summonerName = summonerName === 'amaar270' ? 'WHY Ekoko' : summonerName;
  summonerName = summonerName === 'yuuukix3' ? 'xYukix' : summonerName;
  summonerName = summonerName === 'callme_chilli' ? 'Chìllì' : summonerName;

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

async function getAvgRankInMatch(channel, userstate, message) {
let summonerName;
  if(startsWith(message, '!avgrank')){
    summonerName = message.replace('!avgrank', '') === '' ? channel.replace('#', '') : message.replace('!avgrank ', '');
  } else {
    summonerName = message.replace('!avgelo', '') === '' ? channel.replace('#', '') : message.replace('!avgelo ', '');
  }

  summonerName = summonerName === 'chris5560' ? 'Nathaniel Flint#Scrin' : summonerName;
  summonerName = summonerName === 'pluffuff' ? 'Pluffuff#EUW' : summonerName;
  summonerName = summonerName === 'amaar270' ? 'WHY Ekoko#EUW' : summonerName;
  summonerName = summonerName === 'yuuukix3' ? 'xYukix#EUW' : summonerName;
  summonerName = summonerName === 'callme_chilli' ? 'Chìllì' : summonerName;
  

  try {
      const summonerData =  summonerName.includes('#') ? await getSummonerDataTagline(channel, summonerName) : await getSummonerData(channel, summonerName);

      console.log(summonerData, message);
    
      const avgrank = await getLiveMatchDataForSummonerId(channel, summonerData.id)

      client.say(channel, 'Average SoloQ Rank: ' + avgrank)

    return
  } catch (error) {
    console.error('Error:', error);
    return 'Error fetching data';
  }
}

function commands(channel) {
  channel.say(channel, '!rank/!elo <name,name2>, !avgrank/!avgelo <name>, !lastgame <name>, !topmastery <name>')
}
// helpers

function capitalizeFirstLetter(inputString) {
  // Check if the input string is not empty
  inputString = inputString.toLowerCase();
  if (inputString.length === 0) {
    return inputString; // Return the empty string as is
  }

  // Convert the first character to uppercase and concatenate it with the rest of the string
  return inputString.charAt(0).toUpperCase() + inputString.slice(1);
}

function checkTwitchChat(userstate, message, channel) {
  console.log(message)
  message = message.toLowerCase()
  let shouldSendMessage = false
  shouldSendMessage = BLOCKED_WORDS.some(blockedWord => message.includes(blockedWord.toLowerCase()))
  if (shouldSendMessage) {
    // tell user
    client.say(channel, `@${userstate.username}, sorry!  You message was deleted.`)
    // delete message
    client.deletemessage(channel, userstate.id)
  }
}

function removeFirstChar(inputString, charToRemove) {
  const index = inputString.indexOf(charToRemove);

  if (index !== -1) {
    return inputString.slice(0, index) + inputString.slice(index + 1);
  }

  // Character not found, return the original string
  return inputString;
}

function startsWith(message, searchString){
      const words = message.split(' ');
      return words[0] === searchString;
}

async function getRankString(channel, rankData, summonerName) {
  // Assuming the summoner has a ranked record, you can return their rank
  if (rankData.length > 0) {
    const rankedSoloQ = rankData.find((entry) => entry.queueType === 'RANKED_SOLO_5x5');
    const rankedFlexQ = rankData.find((entry) => entry.queueType === 'RANKED_FLEX_SR');
    let rankMessage = `${summonerName}: `
    if (rankedSoloQ) {
      let rank = capitalizeFirstLetter(rankedSoloQ.tier) + ' ' + rankedSoloQ.rank;
      rankMessage += `[SOLOQ ${rank} (${rankedSoloQ.leaguePoints} LP) | ${rankedSoloQ.wins}W/${rankedSoloQ.losses}L 
      WR: ${Math.round(rankedSoloQ.wins / (rankedSoloQ.wins + rankedSoloQ.losses) * 100)}%]`;
    }
    if (rankedFlexQ) {
      rankMessage = rankedSoloQ ? rankMessage + ' || ' : rankMessage;
      let rank = capitalizeFirstLetter(rankedFlexQ.tier) + ' ' + rankedFlexQ.rank;
      rankMessage += `[FlexQ ${rank} (${rankedFlexQ.leaguePoints} LP)⠀| ${rankedFlexQ.wins}W/${rankedFlexQ.losses}L WR:⠀${Math.round(rankedFlexQ.wins / (rankedFlexQ.wins + rankedFlexQ.losses) * 100)}%]`;
    }
    const brailleSpace = '\u2800';
    // return rankMessage.replace(/ /g, () => brailleSpace);
    return rankMessage.replace(' ', '⠀')
  } else {
    // If the summoner has no ranked record, return unranked
    return `${summonerName}: unranked`;
  }
}

async function getSummonerData(channel, summonerName) {
  const apiKey = RIOT_API_TOKEN; // Replace with your League of Legends API key
  const apiUrl = `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`
  
  // Make a request to get the summoner's ID
  const summonerResponse = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'X-Riot-Token': apiKey,
    },
  });

  if (!summonerResponse.ok) {
    client.say(channel, `Summoner not found`);
    throw new Error('Summoner not found');
    return;
  }

  const summonerData = await summonerResponse.json();

  return summonerData;
}

async function getSummonerDataTagline(channel, name){
  const apiKey = RIOT_API_TOKEN;

  let accTag = name.split('#');

  const apiUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${accTag[0]}/${accTag[1]}`
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'X-Riot-Token': apiKey,
    },
  });

  if (!response.ok) {
    client.say(channel, `Account not found`);
    throw new Error('Account not found');
    return;
  }
  const puuid = await response.json();

  const summonerApi = `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid.puuid}`

  
  const summonerResponse = await fetch(summonerApi, {
    method: 'GET',
    headers: {
      'X-Riot-Token': apiKey,
    },
  });

  if (!summonerResponse.ok) {
    client.say(channel, `Account has no league summoner`);
    throw new Error('Account has no league summoner');
    return;
  }

  const data = await summonerResponse.json();

  return data;
}

async function getAccountDataForPuuid(channel, puuid){
  const apiKey = RIOT_API_TOKEN;

  const apiUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'X-Riot-Token': apiKey,
    },
  });

  if (!response.ok) {
    client.say(channel, `Account not found`);
    // throw new Error('Account not found');
    return;
  }
  const account = await response.json();

  return account;
}

async function getRankDataForSummonerId(channel, summonerId) {
  const apiKey = RIOT_API_TOKEN;
    const rankUrl = `https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
    const rankResponse = await fetch(rankUrl, {
      method: 'GET',
      headers: {
        'X-Riot-Token': apiKey,
      },
    });

    if (!rankResponse.ok) {
      console.log(rankResponse);
      client.say(channel, `Unable to fetch summoner rank data`);
      // throw new Error('Unable to fetch summoner rank data');
      return;
    }

    const rankData = await rankResponse.json();

    return rankData;
}

async function getRankForSummonerId(channel, summonerId) {
  const apiKey = RIOT_API_TOKEN;
    const rankUrl = `https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
    const rankResponse = await fetch(rankUrl, {
      method: 'GET',
      headers: {
        'X-Riot-Token': apiKey,
      },
    });

    if (!rankResponse.ok) {
      console.log("no bueno");
      // client.say(channel, `Unable to fetch summoner rank data`);
      // throw new Error('Unable to fetch summoner rank data');
      return;
    }

    const rankData = await rankResponse.json();

    const rankedSoloQ = rankData.find((entry) => entry.queueType === 'RANKED_SOLO_5x5');

    if(rankedSoloQ == null) return null;

    // Extract relevant information
    let relevantInformation = {
      tier: rankedSoloQ.tier,
      rank: rankedSoloQ.rank,
    };

    return relevantInformation;
}

async function getLiveMatchDataForSummonerId(channel, summonerId) {
  const apiKey = RIOT_API_TOKEN;
  const liveGameUrl = `https://euw1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${summonerId}`;
  const matchData = await fetch(liveGameUrl, {
    method: 'GET',
    headers: {
      'X-Riot-Token': apiKey,
    },
  });

  if (!matchData.ok) {
    console.log(matchData, liveGameUrl);
    client.say(channel, `Unable to fetch summoner live match data`);
    // throw new Error('Unable to fetch summoner live match data');
    return;
  }

  const data = await matchData.json();

  let summonerIds = data.participants.map(function(obj) {
    return obj.summonerId;
  });

  let rankDatas = await Promise.all(summonerIds.map(id => getRankForSummonerId(channel, id)));

  let avgrank = await calculateAverageRank(rankDatas);

  return avgrank;
}

async function calculateAverageRank(rankDataArray) {
  // Define the ranks and their corresponding numerical values
  let rankValues = {
    'IRON': 1,
    'BRONZE': 2,
    'SILVER': 3,
    'GOLD': 4,
    'PLATINUM': 5,
    'EMERALD': 6,
    'DIAMOND': 7,
    'MASTER': 8,
    'GRANDMASTER': 9,
    'CHALLENGER': 10
  };

  // Filter out empty arrays from rankDataArray
  let validRankDataArray = rankDataArray.filter(function(rankData) {
    if (rankData == null) return false;
    return rankData && rankData.tier && rankData.rank;
  });

  if (validRankDataArray.length === 0) {
    // Handle the case where there are no valid rank data entries
    console.log('No valid rank data entries.');
    return null; // or return a default value, depending on your needs
  }

  // Calculate the sum of numerical values for each rank
  let totalRankValue = validRankDataArray.reduce(function(sum, rankData) {
    let rankValue = rankValues[rankData.tier];
    let divisionValue = parseInt(rankData.rank.replace(/\D/g, '')) || 1; // Adjusted to use values from 1 to 4
    return sum + rankValue + divisionValue / 10; // Add division as a decimal part
  }, 0);

  console.log(rankDataArray);

  // Display the totalRankValue
  console.log('Total Rank Value:', totalRankValue);

  // Calculate the average rank value
  let averageRankValue = totalRankValue / validRankDataArray.length;

  // Display the averageRankValue
  console.log('Average Rank Value:', averageRankValue);

  // Find the tier and rank corresponding to the average rank value
  let averageTier = Object.keys(rankValues).find(function(rank) {
    return rankValues[rank] === Math.floor(averageRankValue);
  });

  // Display the averageTier
  console.log('Average Tier:', averageTier);

  // Calculate the average division value
  let averageDivisionValue = Math.round((averageRankValue % 1) * validRankDataArray.length);

  // Display the averageDivisionValue
  console.log('Average Division Value:', averageDivisionValue);

  // Return the average tier + rank
  let averageRank = `${averageTier} ${averageDivisionValue}`;
  console.log('Average Rank:', averageRank);

  return averageRank;
}

function romanToInteger(roman) {
  const romanNumerals = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };

  let result = 0;

  for (let i = 0; i < roman.length; i++) {
    const currentSymbolValue = romanNumerals[roman[i]];
    const nextSymbolValue = romanNumerals[roman[i + 1]];

    if (nextSymbolValue > currentSymbolValue) {
      result += nextSymbolValue - currentSymbolValue;
      i++; // Skip the next symbol, as it has been accounted for
    } else {
      result += currentSymbolValue;
    }
  }

  return result;
}