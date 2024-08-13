import fetch from 'node-fetch';
import client from './app.js';
import { RIOT_API_TOKEN, BLOCKED_WORDS } from './constants';

  export async function getSummonerData(channel, summonerName) {
    client.say(channel, 'Bitte nutze RiotID wie "Yunarito#69420".');
    return null;
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

  export function capitalizeFirstLetter(inputString) {
    // Check if the input string is not empty
    inputString = inputString.toLowerCase();
    if (inputString.length === 0) {
      return inputString; // Return the empty string as is
    }
  
    // Convert the first character to uppercase and concatenate it with the rest of the string
    return inputString.charAt(0).toUpperCase() + inputString.slice(1);
  }
  
  export function checkTwitchChat(userstate, message, channel) {
    console.log(message)
    message = message.toLowerCase()
    let shouldSendMessage = false
    shouldSendMessage = BLOCKED_WORDS.some(blockedWord => message.includes(blockedWord.toLowerCase()))
    if (shouldSendMessage) {
      // tell user
      client.say(channel, `@${userstate.username}, sorry!  Deine Nachricht wurde gelöscht.`)
      // delete message
      client.deletemessage(channel, userstate.id)
    }
  }
  
  export function removeFirstChar(inputString, charToRemove) {
    const index = inputString.indexOf(charToRemove);
  
    if (index !== -1) {
      return inputString.slice(0, index) + inputString.slice(index + 1);
    }
  
    // Character not found, return the original string
    return inputString;
  }
  
  export function startsWith(message, searchString){
        const words = message.split(' ');
        return words[0].toLowerCase() === searchString;
  }
  
  export async function getRankString(channel, rankData, summonerName) {
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
  
  export async function getSummonerDataTagline(channel, name){
    if(name.includes('smolcatzzi') || name.includes('smolercatzzi') || name.includes('smolestcatzzi')) return;
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
      client.say(channel, `Account nicht gefunden`);
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
      client.say(channel, `Der Account ist kein League-Summoner`);
      throw new Error('Account has no league summoner');
      return;
    }
  
    const data = await summonerResponse.json();
  
    return data;
  }
  
  export async function getAccountDataForPuuid(channel, puuid){
    const apiKey = RIOT_API_TOKEN;
  
    const apiUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Riot-Token': apiKey,
      },
    });
  
    if (!response.ok) {
      client.say(channel, `Account nicht gefunden`);
      // throw new Error('Account not found');
      return;
    }
    const account = await response.json();
  
    return account;
  }
  
  export async function getRankDataForSummonerId(channel, summonerId) {
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
        client.say(channel, `Datenziehung des Accounts nicht möglich`);
        // throw new Error('Unable to fetch summoner rank data');
        return;
      }
  
      const rankData = await rankResponse.json();
  
      return rankData;
  }
  
  export async function getRankForSummonerId(channel, summonerId) {
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
  
  export async function getLiveMatchDataForSummonerId(channel, summonerId) {
    const apiKey = RIOT_API_TOKEN;
    const liveGameUrl = `https://euw1.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${summonerId}`;
    const matchData = await fetch(liveGameUrl, {
      method: 'GET',
      headers: {
        'X-Riot-Token': apiKey,
      },
    });
  
    if (!matchData.ok) {
      client.say(channel, `Spieler ist nicht in einem Spiel`);
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
  
  export async function calculateAverageRank(rankDataArray) {
    // Define the ranks and their corresponding numerical values
    let rankValues = {
      'IRON': 28,
      'BRONZE': 24,
      'SILVER': 20,
      'GOLD': 16,
      'PLATINUM': 12,
      'EMERALD': 8,
      'DIAMOND': 4,
      'MASTER': 3,
      'GRANDMASTER': 2,
      'CHALLENGER': 1
    };

    console.log(rankValues);
  
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

    console.log(validRankDataArray);
    
    // Calculate the sum of numerical values for each rank
    let totalRankValue = validRankDataArray.reduce(function(sum, rankData) {
      let rankValue = rankValues[rankData.tier];
      let divisionValue = romanToInteger(rankData.rank); // Adjusted to use values from 1 to 4
      return sum + rankValue + divisionValue; // Add division as a decimal part
    }, 0);

    console.log(totalRankValue);

    totalRankValue = Math.round(totalRankValue / validRankDataArray.length);

    let averageTier;
    let averageDivisionValue

    for (let rank in rankValues) {
      if(rankValues[rank] <= totalRankValue){
        averageTier = rank;
        break;
      }
    }

    averageDivisionValue = totalRankValue - rankValues[averageTier];

    averageDivisionValue = integerToRoman(averageDivisionValue);
  
    let averageRank = `${capitalizeFirstLetter(averageTier)} ${averageDivisionValue}`;
    console.log('Average Rank:', averageRank);
  
    return averageRank;
  }
  
  export function romanToInteger(roman) {
    const romanNumeralMap = {
      'IV': 3,
      'III': 2,
      'II': 1,
      'I': 0,
    };
    return romanNumeralMap[roman];
  }

  export function integerToRoman(roman) {
    const romanNumeralMap = {
      3: 'IV',
      2: 'III',
      1: 'II',
      0: 'I',
    };
    return romanNumeralMap[roman];
  }

  export function getNameMapping(username) {
    const nameMappings = {
      'chris5560': 'Nathaniel Flint#Scrin',
      'amaar270': 'PvB Ekoko#Haku',
      'callme_chilli': 'Chilli#2680',
      'catzzi': 'catzzi#euw',
      'yunarito': 'Yunarito#69420',
    };
  
    return nameMappings[username] || username;
  }