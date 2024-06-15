import client from './app.js';
import initialize from './initialize';

export function resetTimeoutCount(channel) {
    initialize.channelsInfo[channel].timeoutTime = 300;
    client.say(channel, 'Timeouttimer resetted.');
    }

export function addTimeoutTime(channel) {
    initialize.channelsInfo[channel].timeoutTime += 300;

    const timeoutMinutes = initialize.channelsInfo[channel].timeoutTime / 60;

    client.say(channel, `New Timeout Time: ${timeoutMinutes} m [${initialize.channelsInfo[channel].timeoutTime} s]`);
}

export function getTimeoutTime(channel) {
    const timeoutMinutes = initialize.channelsInfo[channel].timeoutTime / 60;
    client.say(channel, `New Timeout Time: ${timeoutMinutes} m [${initialize.channelsInfo[channel].timeoutTime} s]`);
}