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

  if(!channel.toLowerCase().includes('catzzi') && !channel.toLowerCase().includes('amaar')) {
    if(message.toLowerCase() === 'hello' 
    || message.toLowerCase() === 'hallo' 
    || message.toLowerCase() === 'hey' 
      || message.toLowerCase() === 'hi' 
      ||message.toLowerCase() === 'moin'
      ||message.toLowerCase() === 'mmeowdy'
      ||message.toLowerCase() === 'haudi') {
      hello(channel, userstate)
      return
    }

    if(message.toLowerCase() === 'uwu') {
      uwu(channel, userstate)
      return
    }

    if(message.toLowerCase().includes('moo')) {
      moo(channel, userstate)
      return
    }

    if(message.toLowerCase() === 'ara ara') {
      goodgirl(channel, userstate)
      return
    }
  }

  if(message.toLowerCase().includes('!rank')) {
    getSummonerRank(channel, userstate, message)
    return
  }

  if(message.toLowerCase().includes('!lastgame')) {
    getLastGameData(channel, userstate, message)
    return
  }

  if(message.toLowerCase().includes('!topmastery')) {
    masteryscore(channel, userstate, message)
    return
  }

  onMessageHandler(channel, userstate, message, self)
})

function onMessageHandler (channel, userstate, message, self) {
  checkTwitchChat(userstate, message, channel)
}


// commands

function hello (channel, userstate) {
  client.say(channel, `@${userstate.username}, alooo !`)
}

function uwu (channel, userstate) {
  client.say(channel, `/me ⎝⎠ ╲╱╲╱ ⎝⎠`)
}

function moo (channel, userstate) {
  client.say(channel, `moo`)
}

function goodgirl (channel, userstate) {
  client.say(channel, ` GoodGirl `);
}

async function getSummonerRank(channel, userstate, message) {

  let summonerName = message.replace('!rank', '') === '' ? channel.replace('#', '') : message.replace('!rank ', '');

  summonerName = summonerName === 'chris5560' ? 'Hashira Kyojuro' : summonerName;
  summonerName = summonerName === 'amaar270' ? 'WHY Ekoko' : summonerName;
  summonerName = summonerName === 'yuuukix3' ? 'xYukix' : summonerName;
  summonerName = summonerName === 'callme_chilli' ? 'Chìllì' : summonerName;
  
  console.log(summonerName, channel)

  if(summonerName.toLowerCase() === 'luci3fer'){
    let rank = capitalizeFirstLetter('Challenger ') + ' I';
    let wins = 69;
    let losses = 31;
    client.say(channel, `${summonerName}: ${rank} (1337 LP) || ${wins}W/${losses}L 
    WR: ${Math.round(wins / (wins + losses) * 100)}%`);
    return
  }

  try {
    const apiKey = RIOT_API_TOKEN; // Replace with your League of Legends API key
    const region = 'euw1'
    const apiUrl = `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`
    
    // Make a request to get the summoner's ID
    const summonerResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Riot-Token': apiKey,
      },
    });

    if (!summonerResponse.ok) {
      throw new Error('Summoner not found');
      client.say(channel, `Summoner not found`);
      return;
    }

    const summonerData = await summonerResponse.json();

    const summonerId = summonerData.id;

    // Make a request to get the summoner's rank
    const rankUrl = `https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
    const rankResponse = await fetch(rankUrl, {
      method: 'GET',
      headers: {
        'X-Riot-Token': apiKey,
      },
    });

    if (!rankResponse.ok) {
      throw new Error('Unable to fetch summoner rank data');
      client.say(channel, `Unable to fetch summoner rank data`);
      return;
    }

    const rankData = await rankResponse.json();

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
        rankMessage += `[FlexQ ${rank} (${rankedFlexQ.leaguePoints} LP) | ${rankedFlexQ.wins}W/${rankedFlexQ.losses}L 
        WR: ${Math.round(rankedFlexQ.wins / (rankedFlexQ.wins + rankedFlexQ.losses) * 100)}%]`;
      }
      client.say(channel, rankMessage)
      return
    }

    // If the summoner has no ranked record, return unranked
      client.say(channel, `Summoner unranked`);
    return;
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
    const summonerResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Riot-Token': apiKey,
      },
    });

    if (!summonerResponse.ok) {
      client.say(channel, 'Summoner not found');
      throw new Error('Summoner not found');
      return;
    }

    const summonerData = await summonerResponse.json();

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
        
        client.say(channel, `${participantId.summonerName}: ${championId} 
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
    const apiUrl = `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`
    
    fetch(apiUrl, {
      headers: {
        'X-Riot-Token': apiKey,
      },
    })
    .then(response => response.json())
    .then(data => {
      const summonerId = data.id;
      
      // With the summoner ID, you can now request the champion mastery data.
      fetch(`https://euw1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}`, {
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
      })
        .catch(error => console.log('Error fetching champion data:', error));
      })
      .catch(error => console.log('Error fetching mastery data:', error));
    
  } catch (error) {
    console.log('Error:', error);
  }
}

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
