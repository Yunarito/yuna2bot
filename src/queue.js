import client from './app.js';
import initialize from './initialize';

export function joinQueue(channel, userstate) {
    if (!initialize.channelsInfo[channel].queue.includes(userstate.username)) {
        initialize.channelsInfo[channel].queue.push(userstate.username);
        client.say(channel, `${userstate.username} has joined the queue.`);
    } else {
        client.say(channel, `@${userstate.username}, you are already in the queue.`);
    }
}

export function leaveQueue(channel, userstate) {
    if (initialize.channelsInfo[channel].queue.includes(userstate.username)) {
        initialize.channelsInfo[channel].queue = initialize.channelsInfo[channel].queue.filter(user => user !== userstate.username);
        client.say(channel, `${userstate.username} has left the queue.`);
    } else {
        client.say(channel, `@${userstate.username}, you are not in the queue.`);
    }
}

export function listQueue(channel, userstate) {
    if (initialize.channelsInfo[channel].queue.length > 0) {
        const userList = initialize.channelsInfo[channel].queue.join(', ');
        client.say(channel, `Current queue: ${userList}`);
    } else {
        client.say(channel, 'Queue is empty.');
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
        client.say(channel, `Picked ${numPicks} users: ${pickedList}`);
        } else {
        client.say(channel, 'Queue is empty.');
        }
    } else {
        client.say(channel, 'Queue is currently disabled.');
    }
    }

export function enableQueue(channel) {
    initialize.channelsInfo[channel].enabled = true;
    client.say(channel, 'Queue is now enabled.');
    }

export function disableQueue(channel) {
    initialize.channelsInfo[channel].enabled = false;
    client.say(channel, 'Queue is now disabled.');
}