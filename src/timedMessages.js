import client from './app.js';
import initialize from './initialize';

export function setTimedMessage(channel, message) {
    const text = message.split(' ').slice(1).join(' ').trim();

    if (!text) {
        client.say(channel, 'Please provide a message.');
        return;
    }

    initialize.channelsInfo[channel].timedMessage.text = text;
    client.say(channel, `Timed message set to: "${text}"`);
}

export function enableTimedMessage(channel) {
    if (!initialize.channelsInfo[channel].timedMessage.text) {
        client.say(channel, 'No timed message has been set yet. Use !settimedmessage <message>.');
        return;
    }

    initialize.channelsInfo[channel].timedMessage.enabled = true;
    initialize.channelsInfo[channel].timedMessage.counter = 0;
    client.say(channel, 'Timed messages are now enabled.');
}

export function disableTimedMessage(channel) {
    initialize.channelsInfo[channel].timedMessage.enabled = false;
    client.say(channel, 'Timed messages are now disabled.');
}

export function setTimedMessageInterval(channel, message) {
    const parts = message.split(' ');
    const interval = parseInt(parts[1]);

    if (!parts[1] || isNaN(interval) || interval < 1) {
        client.say(channel, 'Please provide a valid number of messages.');
        return;
    }

    initialize.channelsInfo[channel].timedMessage.interval = interval;
    initialize.channelsInfo[channel].timedMessage.counter = 0;
    client.say(channel, `Timed message interval set to: every ${interval} messages`);
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
