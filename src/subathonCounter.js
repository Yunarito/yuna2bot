import client from './app.js';
import initialize from './initialize';
import { t } from './i18n';
import { saveChannelSettings } from './channelSettings';

const {
    addSubathonPoints,
    getPointTable,
    getSubathonUserPoints,
    getSubathonTotalPoints,
} = require('./userStats.js');

export function happyswitch(channel) {
    initialize.channelsInfo[channel].happyHour = true;
    saveChannelSettings(channel);

    client.say(channel, t(channel, 'subathon.happyOn'));
}

export function sadswitch(channel) {
    initialize.channelsInfo[channel].happyHour = false;
    saveChannelSettings(channel);

    client.say(channel, t(channel, 'subathon.happyOff'));
}

export async function donationHandler(channel, message) {
    const regex = /€(\d+(?:\.\d{1,2})?)/;
    const match = message.match(regex);
    const username = message.split(' ')[0];

    const pointTable = await getPointTable(channel);

    let points = match ? match[1] * pointTable.donations.euro.points : 0;

    await addSubathonPoints(channel, username, points);
}

export async function cheerHandler(channel, userstate, message) {
    let user = userstate['display-name'];

    const pointTable = await getPointTable(channel);

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

    await addSubathonPoints(channel, user, points);
}

export async function subHandler(channel, user, method) {

    const subPlan = method.plan == "Prime" ? method.plan.toLowerCase() : method.plan / 1000;

    const pointTable = await getPointTable(channel);

    let points = pointTable.subscriptions[subPlan].points || 0;

    await addSubathonPoints(channel, user, points);
}

export async function subGiftHandler(channel, user, method) {
    const subPlan = method.plan / 1000;

    const pointTable = await getPointTable(channel);

    let points = pointTable.subscriptions[subPlan].points || 0;

    await addSubathonPoints(channel, user, points);
}

export async function resubHandler(channel, user, method) {
    const subPlan = method.plan == "Prime" ? method.plan.toLowerCase() : method.plan / 1000;

    const pointTable = await getPointTable(channel);

    let points = pointTable.subscriptions[subPlan].points || 0;

    await addSubathonPoints(channel, user, points);
}

export async function getPointChart(channel) {
    const pointTable = await getPointTable(channel);

    const pointsUnit = t(channel, 'subathon.pointsUnit');

    const entries = [
        `${pointTable.subscriptions['1'].name} - ${pointTable.subscriptions['1'].points} ${pointsUnit}`,
        `${pointTable.subscriptions['2'].name} - ${pointTable.subscriptions['2'].points} ${pointsUnit}`,
        `${pointTable.subscriptions['3'].name} - ${pointTable.subscriptions['3'].points} ${pointsUnit}`,
        `${pointTable.subscriptions['prime'].name} - ${pointTable.subscriptions['prime'].points} ${pointsUnit}`,
        `${pointTable.cheers['hundred'].name} - ${pointTable.cheers['hundred'].points} ${pointsUnit}`,
        `${pointTable.donations['euro'].name} - ${pointTable.donations['euro'].points} ${pointsUnit}`,
    ];

    client.say(channel, t(channel, 'subathon.pointChartHeader') + entries.join(', ') + '.');
}

export async function getChannelPoints(channel, username) {
    const userPoints = await getSubathonUserPoints(channel, username);

    let points = Math.round(userPoints * 100)/100+"".replace(',', '.');
    client.say(channel, t(channel, 'subathon.userPoints', { username, points }));
}

export async function getChannelTotalPoints(channel) {
    const totalPoints = await getSubathonTotalPoints(channel);

    let points = Math.round(totalPoints)+"".replace('.', ',');
    client.say(channel, t(channel, 'subathon.totalPoints', { points }));
}
