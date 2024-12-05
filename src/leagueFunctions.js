import client from './app.js';

const {
    getSummonerDataTagline,
    getRankDataForSummonerId,
    romanToInteger,
    capitalizeFirstLetter,
} = require('./helper.js');

const tiers = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond",];
const lpPerDivision = 100; // You need 100 LP to promote from one division to the next


export async function dreamRank(channel) {

    const summonerName = 'catzzi#euw';

    const response = await getSummonerDataTagline(channel, summonerName);

    if (!response || !response.ok && response.status === 404) {
        console.log(response);
        client.say(channel, `Da ist n Fehler iwie oder so fricc riot.`);
        return;
    }

    let rankData = await getRankDataForSummonerId(channel, response.id);

    if (rankData.length > 0) {
        const rankedSoloQ = rankData.find((entry) => entry.queueType === 'RANKED_SOLO_5x5');
        let rankMessage = `${summonerName}: `

        let currentRank = {
            tier: capitalizeFirstLetter(rankedSoloQ.tier),
            division: romanToInteger(rankedSoloQ.rank)+1,
            lp: rankedSoloQ.leaguePoints
        };

        let totalLpNeeded = lpToEmerald4(currentRank);

        rankMessage += `${capitalizeFirstLetter(rankedSoloQ.tier)} ${rankedSoloQ.rank} ${rankedSoloQ.leaguePoints}LP - ${totalLpNeeded}LP bis Emerald IV woah`;

        client.say(channel, rankMessage);
        return;
    }

    client.say(channel, `${summonerName} ist unranked.`);
    return;
}

function lpToEmerald4(currentRank) {
    let totalLpNeeded = 0;

    // Find the current tier and division in the list
    let currentTierIndex = tiers.indexOf(currentRank.tier);

    // Loop through until we hit Emerald 4
    while (currentTierIndex < tiers.indexOf("Emerald") || (currentTierIndex === tiers.indexOf("Emerald") && currentRank.division > 4)) {
        // LP to promote to the next division
        totalLpNeeded += (lpPerDivision - currentRank.lp);

        // Reset LP for the next division/tier
        currentRank.lp = 0;

        // Move to the next division
        if (currentRank.division > 1) {
            currentRank.division--;
        } else {
            // Move to the next tier if we're in division 1
            currentTierIndex++;
            currentRank.division = 4; // Reset division to 4 in the new tier
        }
    }
    return totalLpNeeded;
}
