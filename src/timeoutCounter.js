import client from './app.js';
import initialize from './initialize';

export function resetTime(channel) {
    initialize.channelsInfo[channel].timeoutTime = 300;
    client.say(channel, 'Timeouttimer zurückgesetzt.');
}

export function setTime(channel, message) {

    let parts = message.split(' ');

    if(!parts[1]){
        client.say(channel, 'Bitte gib eine Zeit in Sekunden an.');
        return
    }

    initialize.channelsInfo[channel].timeoutTime = parseInt(parts[1]);
    const timeoutMinutes = initialize.channelsInfo[channel].timeoutTime / 60;
    client.say(channel, `Timeout gesetzt zu: ${timeoutMinutes} m [${initialize.channelsInfo[channel].timeoutTime} s]`);
}

export function addTimeoutTime(channel) {
    initialize.channelsInfo[channel].timeoutTime += 300;

    const timeoutMinutes = initialize.channelsInfo[channel].timeoutTime / 60;

    client.say(channel, `Neuer Timeout: ${timeoutMinutes} m [${initialize.channelsInfo[channel].timeoutTime} s]`);
}

export function getTimeoutTime(channel) {
    const timeoutMinutes = initialize.channelsInfo[channel].timeoutTime / 60;
    client.say(channel, `Nächster Timeout: ${timeoutMinutes} m [${initialize.channelsInfo[channel].timeoutTime} s]`);
}