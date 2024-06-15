import client from './app.js';
import initialize from './initialize';

export function resetTime(channel) {
    initialize.channelsInfo[channel].timeoutTime = 300;
    client.say(channel, 'Timeouttimer resetted.');
}

export function setTime(channel, message) {

    let parts = message.split(' ');

    if(!parts[1]){
        client.say(channel, 'Please enter a valid time')
        return
    }

    initialize.channelsInfo[channel].timeoutTime = parts[1];
    const timeoutMinutes = initialize.channelsInfo[channel].timeoutTime / 60;
    client.say(channel, `Timeout set to: ${timeoutMinutes} m [${initialize.channelsInfo[channel].timeoutTime} s]`);
}

export function addTimeoutTime(channel) {
    initialize.channelsInfo[channel].timeoutTime += 300;

    const timeoutMinutes = initialize.channelsInfo[channel].timeoutTime / 60;

    client.say(channel, `New Timeout: ${timeoutMinutes} m [${initialize.channelsInfo[channel].timeoutTime} s]`);
}

export function getTimeoutTime(channel) {
    const timeoutMinutes = initialize.channelsInfo[channel].timeoutTime / 60;
    client.say(channel, `Upcoming Timeout: ${timeoutMinutes} m [${initialize.channelsInfo[channel].timeoutTime} s]`);
}