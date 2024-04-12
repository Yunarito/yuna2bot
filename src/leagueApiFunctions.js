const {
    startsWith,
    getRankString,
    getSummonerData,
    getSummonerDataTagline,
    getRankDataForSummonerId,
    getLiveMatchDataForSummonerId,
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
      summonerName = summonerName === 'chris5560' ? 'Nathaniel Flint#Scrin' : summonerName;
      summonerName = summonerName === 'pluffuff' ? 'Pluffuff#EUW' : summonerName;
      summonerName = summonerName === 'amaar270' ? 'Ekoko#Haku' : summonerName;
      summonerName = summonerName === 'yuuukix3' ? 'xYukix#EUW' : summonerName;
      summonerName = summonerName === 'callme_chilli' ? 'Chilli#2680' : summonerName;
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
  
  export async function masteryscore(channel, userstate, message) {
  
    
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
  
  export async function getAvgRankInMatch(channel, userstate, message) {
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