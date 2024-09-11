import client from './app.js';
import initialize from './initialize';

const { 
    addSubathonPoints, 
    readSubathonData, 
    getPointTable,
    writeSubathonData
} = require('./userStats.js');

export function happyswitch(channel) {
    initialize.channelsInfo[channel].happyHour = true;

    client.say(channel, `Die Happyhour ist nun eingeschaltet.`);
}

export function sadswitch(channel) {
    initialize.channelsInfo[channel].happyHour = false;    

    client.say(channel, `Die Happyhour ist nun ausgeschaltet.`);
}

export function donationHandler(channel, message) {
    const regex = /€(\d+(?:\.\d{1,2})?)/;
    const match = message.match(regex);
    const username = message.split(' ')[0];

    const pointTable = getPointTable(channel);

    let points = match ? match[1] * pointTable.donations.euro.points : 0;

    addSubathonPoints(channel, username, points);
}

export function cheerHandler(channel, userstate, message) {
    let user = userstate.username;

    const pointTable = getPointTable(channel);

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
    
    const pointTable = getPointTable(channel);

    let points = pointTable.subscriptions[subPlan].points || 0;

    addSubathonPoints(channel, user, points);
}

export function subGiftHandler(channel, user, method) {
    const subPlan = method.plan / 1000;
    
    const pointTable = getPointTable(channel);

    let points = pointTable.subscriptions[subPlan].points || 0;

    addSubathonPoints(channel, user, points);
}

export function resubHandler(channel, user, method) {
    const subPlan = method.plan == "Prime" ? method.plan.toLowerCase() : method.plan / 1000;
    
    const pointTable = getPointTable(channel);  

    let points = pointTable.subscriptions[subPlan].points || 0;

    addSubathonPoints(channel, user, points);
}

export function getPointChart(channel) {
    const pointTable = getPointTable(channel);

    // client.say(channel, initialize.channelsInfo[channel].enabled);

    let pointChart = 'Punkteübersicht: ';
    pointChart += pointTable.subscriptions['1'].name + ' - ' + pointTable.subscriptions['1'].points + ' Punkte, ';
    pointChart += pointTable.subscriptions['2'].name + ' - ' + pointTable.subscriptions['2'].points + ' Punkte, ';
    pointChart += pointTable.subscriptions['3'].name + ' - ' + pointTable.subscriptions['3'].points + ' Punkte, ';
    pointChart += pointTable.subscriptions['prime'].name + ' - ' + pointTable.subscriptions['prime'].points + ' Punkte, ';
    pointChart += pointTable.cheers['hundred'].name + ' - ' + pointTable.cheers['hundred'].points + ' Punkte, ';
    pointChart += pointTable.donations['euro'].name + ' - ' + pointTable.donations['euro'].points + ' Punkte.';

    client.say(channel, pointChart);
}

export function getChannelPoints(channel, username) {
    const subathonData = readSubathonData();
    
    if (!subathonData[channel]) {
        subathonData[channel] = {
            points: 0,
        };
        writeSubathonData(subathonData);
    }

    if (!subathonData[channel][username]) {
        subathonData[channel][username] = {
            points: 0,
        };
        writeSubathonData(subathonData);
    }


    let points = Math.round(subathonData[channel][username].points * 100)/100+"".replace('.', ',');
    client.say(channel, `@${username}, du hast ${points} Punkte zum Subathon beigetragen.`);
}

export function getChannelTotalPoints(channel) {
    const subathonData = readSubathonData();
    
    if (!subathonData[channel]) {
        subathonData[channel] = {
            points: 0,
        };
        writeSubathonData(subathonData);
    }

    let points = Math.round(subathonData[channel].points)+"".replace('.', ',');
    client.say(channel, `Der aktuelle Subathon hat ${points} Punkte.`);
}