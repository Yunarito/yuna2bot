import client from './app.js';
import initialize from './initialize';

export function joinQueue(channel, userstate) {
    if (!initialize.channelsInfo[channel].queue.includes(userstate.username)) {
        initialize.channelsInfo[channel].queue.push(userstate.username);
        client.say(channel, `${userstate.username} ist der Schlange beigetreten. catWait`);
    } else {
        client.say(channel, `@${userstate.username}, du bist bereits in der Schlange.`);
    }
}

export function leaveQueue(channel, userstate) {
    if (initialize.channelsInfo[channel].queue.includes(userstate.username)) {
        initialize.channelsInfo[channel].queue = initialize.channelsInfo[channel].queue.filter(user => user !== userstate.username);
        client.say(channel, `${userstate.username} hat die Schlange verlassen. catLeave`);
    } else {
        client.say(channel, `@${userstate.username}, du bist nicht in der Schlange.`);
    }
}

export function listQueue(channel, userstate) {
    if (initialize.channelsInfo[channel].queue.length > 0) {
        const userList = initialize.channelsInfo[channel].queue.join(', ');
        client.say(channel, `Schlange: ${userList}`);
    } else {
        client.say(channel, 'Die Schlange ist leer.');
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
        client.say(channel, `${numPicks} ausgewählt: ${pickedList}`);
        } else {
        client.say(channel, 'Die Schlange ist leer.');
        }
    } else {
        client.say(channel, 'Die Schlange ist momentan aus.');
    }
    }

export function enableQueue(channel) {
    initialize.channelsInfo[channel].enabled = true;
    client.say(channel, 'Die Schlange ist nun eingeschaltet.');
    }

export function disableQueue(channel) {
    initialize.channelsInfo[channel].enabled = false;
    client.say(channel, 'Die Schlange ist nun ausgeschaltet.');
}