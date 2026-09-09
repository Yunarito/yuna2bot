import client from './app.js';
import initialize from './initialize';
import { t } from './i18n';

export function setTimedMessage(channel, message) {
    const text = message.split(' ').slice(1).join(' ').trim();

    if (!text) {
        client.say(channel, t(channel, 'timedMessage.needText'));
        return;
    }

    initialize.channelsInfo[channel].timedMessage.text = text;
    client.say(channel, t(channel, 'timedMessage.set', { text }));
}

export function enableTimedMessage(channel) {
    if (!initialize.channelsInfo[channel].timedMessage.text) {
        client.say(channel, t(channel, 'timedMessage.notSet'));
        return;
    }

    initialize.channelsInfo[channel].timedMessage.enabled = true;
    initialize.channelsInfo[channel].timedMessage.counter = 0;
    client.say(channel, t(channel, 'timedMessage.enabled'));
}

export function disableTimedMessage(channel) {
    initialize.channelsInfo[channel].timedMessage.enabled = false;
    client.say(channel, t(channel, 'timedMessage.disabled'));
}

export function setTimedMessageInterval(channel, message) {
    const parts = message.split(' ');
    const interval = parseInt(parts[1]);

    if (!parts[1] || isNaN(interval) || interval < 1) {
        client.say(channel, t(channel, 'timedMessage.needInterval'));
        return;
    }

    initialize.channelsInfo[channel].timedMessage.interval = interval;
    initialize.channelsInfo[channel].timedMessage.counter = 0;
    client.say(channel, t(channel, 'timedMessage.intervalSet', { interval }));
}

export function checkTimedMessage(channel) {
    const timedMessage = initialize.channelsInfo[channel].timedMessage;

    if (!timedMessage.enabled || !timedMessage.text) {
        return;
    }

    timedMessage.counter += 1;

    if (timedMessage.counter >= timedMessage.interval) {
        client.say(channel, timedMessage.text);
        timedMessage.counter = 0;
    }
}
