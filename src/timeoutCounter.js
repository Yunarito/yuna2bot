import client from './app.js';
import initialize from './initialize';
import { t } from './i18n';
import { saveChannelSettings } from './channelSettings';

export function resetTime(channel) {
    initialize.channelsInfo[channel].timeoutTime = 300;
    saveChannelSettings(channel);
    client.say(channel, t(channel, 'timeout.reset'));
}

export function setTime(channel, message) {

    let parts = message.split(' ');

    if(!parts[1]){
        client.say(channel, t(channel, 'timeout.needSeconds'));
        return
    }

    initialize.channelsInfo[channel].timeoutTime = parseInt(parts[1]);
    saveChannelSettings(channel);
    const timeoutMinutes = initialize.channelsInfo[channel].timeoutTime / 60;
    client.say(channel, t(channel, 'timeout.set', { minutes: timeoutMinutes, seconds: initialize.channelsInfo[channel].timeoutTime }));
}

export function addTimeoutTime(channel) {
    initialize.channelsInfo[channel].timeoutTime += 300;
    saveChannelSettings(channel);

    const timeoutMinutes = initialize.channelsInfo[channel].timeoutTime / 60;

    client.say(channel, t(channel, 'timeout.added', { minutes: timeoutMinutes, seconds: initialize.channelsInfo[channel].timeoutTime }));
}

export function getTimeoutTime(channel) {
    const timeoutMinutes = initialize.channelsInfo[channel].timeoutTime / 60;
    client.say(channel, t(channel, 'timeout.next', { minutes: timeoutMinutes, seconds: initialize.channelsInfo[channel].timeoutTime }));
}
