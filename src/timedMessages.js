import client from './app.js';
import initialize from './initialize';
import { t } from './i18n';
import { insertTimedMessage, deleteTimedMessage, updateTimedMessageEnabled, updateTimedMessageInterval } from './channelSettings';

export function addTimedMessage(channel, message) {
    const parts = message.split(' ');
    const interval = parseInt(parts[1]);
    const text = parts.slice(2).join(' ').trim();

    if (!parts[1] || isNaN(interval) || interval < 1 || !text) {
        client.say(channel, t(channel, 'timedMessage.usage'));
        return;
    }

    const messages = initialize.channelsInfo[channel].timedMessages;
    const entry = { text, interval, enabled: true, counter: 0 };
    messages.push(entry);
    insertTimedMessage(channel, messages.length - 1, entry);
    client.say(channel, t(channel, 'timedMessage.added', { count: messages.length, interval, text }));
}

export function removeTimedMessage(channel, message) {
    const messages = initialize.channelsInfo[channel].timedMessages;
    const index = parseInt(message.split(' ')[1]);

    if (!message.split(' ')[1] || isNaN(index) || index < 1 || index > messages.length) {
        client.say(channel, t(channel, 'timedMessage.invalidIndex'));
        return;
    }

    const [removed] = messages.splice(index - 1, 1);
    deleteTimedMessage(channel, index - 1);
    client.say(channel, t(channel, 'timedMessage.removed', { index, text: removed.text }));
}

export function listTimedMessages(channel) {
    const messages = initialize.channelsInfo[channel].timedMessages;

    if (messages.length === 0) {
        client.say(channel, t(channel, 'timedMessage.listEmpty'));
        return;
    }

    const list = messages.map((entry, index) => {
        const status = t(channel, entry.enabled ? 'timedMessage.statusOn' : 'timedMessage.statusOff');
        return `${index + 1}) [${status}, ${t(channel, 'timedMessage.every', { interval: entry.interval })}] ${entry.text}`;
    }).join(' | ');

    client.say(channel, t(channel, 'timedMessage.listHeader') + list);
}

// message may be an index (1-based, see !listtimedmessages) or "all".
function resolveTargets(channel, message) {
    const messages = initialize.channelsInfo[channel].timedMessages;
    const arg = (message.split(' ')[1] || '').toLowerCase();

    if (arg === 'all') {
        return messages;
    }

    const index = parseInt(arg);
    if (!arg || isNaN(index) || index < 1 || index > messages.length) {
        return null;
    }

    return [messages[index - 1]];
}

export function enableTimedMessage(channel, message) {
    const targets = resolveTargets(channel, message);

    if (!targets) {
        client.say(channel, t(channel, 'timedMessage.invalidTarget'));
        return;
    }

    const isAll = message.split(' ')[1].toLowerCase() === 'all';
    targets.forEach(entry => {
        entry.enabled = true;
        entry.counter = 0;
    });
    updateTimedMessageEnabled(channel, isAll ? null : parseInt(message.split(' ')[1]) - 1, true);

    client.say(channel, t(channel, isAll ? 'timedMessage.enabledAll' : 'timedMessage.enabledOne', {
        index: message.split(' ')[1]
    }));
}

export function disableTimedMessage(channel, message) {
    const targets = resolveTargets(channel, message);

    if (!targets) {
        client.say(channel, t(channel, 'timedMessage.invalidTarget'));
        return;
    }

    const isAll = message.split(' ')[1].toLowerCase() === 'all';
    targets.forEach(entry => {
        entry.enabled = false;
    });
    updateTimedMessageEnabled(channel, isAll ? null : parseInt(message.split(' ')[1]) - 1, false);

    client.say(channel, t(channel, isAll ? 'timedMessage.disabledAll' : 'timedMessage.disabledOne', {
        index: message.split(' ')[1]
    }));
}

export function setTimedMessageInterval(channel, message) {
    const messages = initialize.channelsInfo[channel].timedMessages;
    const parts = message.split(' ');
    const index = parseInt(parts[1]);
    const interval = parseInt(parts[2]);

    if (!parts[1] || isNaN(index) || index < 1 || index > messages.length || !parts[2] || isNaN(interval) || interval < 1) {
        client.say(channel, t(channel, 'timedMessage.intervalUsage'));
        return;
    }

    const entry = messages[index - 1];
    entry.interval = interval;
    entry.counter = 0;
    updateTimedMessageInterval(channel, index - 1, interval);
    client.say(channel, t(channel, 'timedMessage.intervalSet', { index, interval }));
}

export function checkTimedMessage(channel) {
    const messages = initialize.channelsInfo[channel].timedMessages;

    messages.forEach(entry => {
        if (!entry.enabled) return;

        entry.counter += 1;
        if (entry.counter >= entry.interval) {
            client.say(channel, entry.text);
            entry.counter = 0;
        }
    });
}
