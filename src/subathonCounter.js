import client from './app.js';

const { 
    addSubathonPoints, 
    addUserPoints, 
    readSubathonData, 
    getPointTable,
    writeSubathonData
} = require('./userStats.js');

export function donationHandler(channel, message) {
    const regex = /€(\d+(?:\.\d{1,2})?)/;
    const match = message.match(regex);
    const username = message.split(' ')[0];
    
    const pointTable = getPointTable();

    let points = match ? match[1] * pointTable.donations.euro.points : 0;

    addSubathonPoints(channel, username, points);
}

export function cheerHandler(channel, userstate, message) {
    let user = userstate.username;

    const pointTable = getPointTable();

    // Regular expression to match "Cheer" followed by digits
    const regex = /Cheer(\d+)/g;
    
    // Array to hold all the matched numbers
    let match;
    let total = 0;
    
    // Loop through all matches and sum the numbers
    while ((match = regex.exec(message)) !== null) {
        total += parseInt(match[1], 10);  // Convert the captured number to integer and add it to the total
    }

    let points = pointTable.cheers.hundred.points * (total/100);  

    addSubathonPoints(channel, user, points);
}

export function subHandler(channel, user, method) {
    
    const subPlan = method.plan == "Prime" ? method.plan.toLowerCase() : method.plan / 1000;
    
    const pointTable = getPointTable();

    console.log("sub");
    console.log(subPlan, method.plan, method, pointTable.subscriptions[subPlan]);
    console.log(pointTable.subscriptions[subPlan].points);

    let points = pointTable.subscriptions[subPlan].points || 0;

    addSubathonPoints(channel, user, points);
}

export function subGiftHandler(channel, user, method) {
    const subPlan = method.plan / 1000;
    
    const pointTable = getPointTable();

    console.log("subgift");
    
    console.log(subPlan, method.plan, method, pointTable.subscriptions[subPlan]);
    console.log(pointTable.subscriptions[subPlan].points);

    let points = pointTable.subscriptions[subPlan].points || 0;

    addSubathonPoints(channel, user, points);
}

export function resubHandler(channel, user, method) {
    const subPlan = method.plan == "Prime" ? method.plan.toLowerCase() : method.plan / 1000;
    
    const pointTable = getPointTable();
    
    console.log("resub");
    console.log(subPlan, method.plan, method, pointTable.subscriptions[subPlan]);
    console.log(pointTable.subscriptions[subPlan].points);
    

    let points = pointTable.subscriptions[subPlan].points || 0;

    addSubathonPoints(channel, user, points);
}

export function getChannelPoints(channel, username) {
    const subathonData = readSubathonData();
    
    if (!subathonData[channel]) {
        subathonData[channel] = {
        points: 0,
        };
    }

    if (!subathonData[channel][username]) {
        subathonData[channel][username] = {
            points: 0,
            };
    }

    writeSubathonData(subathonData);

    let points = subathonData[channel][username].points;
    client.say(channel, `@${username}, du hast ${points} Punkte zum Subatahon beigetragen.`);
}

export function getChannelTotalPoints(channel) {
    const subathonData = readSubathonData();
    
    if (!subathonData[channel]) {
        subathonData[channel] = {
        points: 0,
        };
    }
    
    writeSubathonData(subathonData);

    let points = subathonData[channel].points;
    client.say(channel, `Der aktuelle Subathon hat ${points} Punkte.`);
}