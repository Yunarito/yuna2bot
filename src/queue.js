import client from './app.js';
import initialize from './initialize';
import { t } from './i18n';

export function joinQueue(channel, userstate) {
    if (!initialize.channelsInfo[channel].queue.includes(userstate.username)) {
        initialize.channelsInfo[channel].queue.push(userstate.username);
        client.say(channel, t(channel, 'queue.joined', { username: userstate.username }));
    } else {
        client.say(channel, t(channel, 'queue.alreadyIn', { username: userstate.username }));
    }
}

export function leaveQueue(channel, userstate) {
    if (initialize.channelsInfo[channel].queue.includes(userstate.username)) {
        initialize.channelsInfo[channel].queue = initialize.channelsInfo[channel].queue.filter(user => user !== userstate.username);
        client.say(channel, t(channel, 'queue.left', { username: userstate.username }));
    } else {
        client.say(channel, t(channel, 'queue.notIn', { username: userstate.username }));
    }
}

export function listQueue(channel, userstate) {
    if (initialize.channelsInfo[channel].queue.length > 0) {
        const userList = initialize.channelsInfo[channel].queue.join(', ');
        client.say(channel, t(channel, 'queue.list', { list: userList }));
    } else {
        client.say(channel, t(channel, 'queue.empty'));
    }
}

export function pickFromQueue(channel, userstate, message) {
    const args = message.toLowerCase().split(' ');
    let numPicks = 1; // Default to picking 1 user

    // Check if argument for number of picks is provided
    if (args.length > 1 && !isNaN(args[1])) {
        numPicks = parseInt(args[1]);
    }

    if (initialize.channelsInfo[channel].enabled) {
        const pickedUsers = initialize.channelsInfo[channel].queue.slice(0, numPicks);
        initialize.channelsInfo[channel].queue = initialize.channelsInfo[channel].queue.slice(numPicks);

        if (pickedUsers.length > 0) {
        const pickedList = pickedUsers.join(', ');
        client.say(channel, t(channel, 'queue.picked', { count: numPicks, list: pickedList }));
        } else {
        client.say(channel, t(channel, 'queue.empty'));
        }
    } else {
        client.say(channel, t(channel, 'queue.offNotice'));
    }
    }

export function enableQueue(channel) {
    initialize.channelsInfo[channel].enabled = true;
    client.say(channel, t(channel, 'queue.enabled'));
    }

export function disableQueue(channel) {
    initialize.channelsInfo[channel].enabled = false;
    client.say(channel, t(channel, 'queue.disabled'));
}
