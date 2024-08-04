import client from './app.js';
import initialize from './initialize';
import { timeout } from './twitchApi.js';

export function stinkFight(channel, userstate, message) {
    const args = message.toLowerCase().split(' ');
    if (args.length < 2) {
        client.say(channel, `@${userstate.username}, please provide a user to challenge.`);
        return;
    } else if (args.length > 2) {
        client.say(channel, `@${userstate.username}, please provide only one user to challenge.`);
        return;
    } else if (args[1].charAt(0) === '@') {
        client.say(channel, `@${userstate.username}, please provide only the username to challenge.`);
        return;
    } else if (args[1] === userstate.username) {
        client.say(channel, `@${userstate.username}, you cannot challenge yourself.`);
        return;
    } else {
        client.say(channel, `@${userstate.username} has challenged ${args[1]} to a stink fight!`);
        let stink1 = Math.floor(Math.random() * 100) + 1;
        let stink2 = Math.floor(Math.random() * 100) + 1;
        if (stink1 < stink2) {
            client.say(channel, `@${userstate.username} (${stink1}%) wins the stink fight against ${args[1]} (${stink2}%)!`);
            timeout(channel, userstate.username, 300); // Timeout the user for 5 minutes
            client.say(channel, `@${args[1]} has been timed out for 5 minutes.`);
        } else if (stink1 > stink2) {
            client.say(channel, `${args[1]} (${stink2}%) wins the stink fight against @${userstate.username} (${stink1}%)!`);
            timeout(channel, args[1], 300); // Timeout the user for 5 minutes
            client.say(channel, `@${userstate.username} has been timed out for 5 minutes.`);
        } else {
            client.say(channel, `It's a tie! Both @${userstate.username} (${stink1}%) and ${args[1]} (${stink2}%) stink equally!`);
            timeout(channel, args[1], 300); // Timeout the user for 5 minutes
            timeout(channel, userstate.username, 300); // Timeout the user for 5 minutes
            client.say(channel, `Both @${userstate.username} and ${args[1]} have been timed out for 5 minutes.`);
        }
    }
}