✨ Yuna2bot ✨

## Twitch OAuth setup

The bot authenticates with a Twitch access token that expires every few hours. Instead of manually regenerating it, the bot refreshes it automatically in the background using a refresh token.

One-time setup:

1. `.env` needs `CLIENT_ID` and `CLIENT_SECRET` from a Twitch app registered at https://dev.twitch.tv/console/apps (redirect URL `http://localhost:3000`).
2. Run `npm run auth` once, open the printed link while logged into twitch.tv as the bot account, and approve the requested scopes. This writes `OAUTH_TOKEN` and `REFRESH_TOKEN` into `.env`.
3. `npm start` as usual — `src/twitchAuth.js` keeps the token refreshed for you from then on, and `.env` is updated automatically each time. No more manual token regeneration.

League of Legends related commands:

If there are names here, they are always optional. No name entered in the command, it will automatically search with the main of the channel.

    - !rank/!elo <name#id>/<name1#id,name2#id,name3....>    --> Gets the current rank, lp and wr of the players given.

    - !avgrank/!avgelo <name#id>                            --> Gets the average soloq rank of all the players in that given players game.

    - !lastgame <name#id>                                   --> Gets the last game and stats for the player.

    - !topmastery <name#id>                                 --> Gets the highest mastery and champion along the points.



Queue commands:

    - !join                                                 --> Joins the queue.

    - !leave                                                --> Leaves the queue.

    - !list                                                 --> Prints the current queue list.

    Mod commands:
    
    - !pick <number>                                        --> Gets the given number of people of the list and deletes them from it. Is there no number given, it will only pick one.

    - !enablequeue                                          --> Enables the queue.

    - !disablequeue                                         --> Disabled the queue.


Duel commands:

    - !duell <name>                                          --> Starts a duel request.

    - !accept                                               --> Accepts the duel.

    - !decline                                              --> Declines the duel.
    
    - !retract                                              --> Retracts the duel.

    - !duelinfo                                             --> Gives info of the duel commands.

    - !moshpit <name> <name>                                --> Starts a group duel request.

    - !acceptmoshpit                                        --> Accepts the group duel.

    - !declinemoshpit                                       --> Declines the group duel.

    - !openfight                                            --> Opens a fight for anyone to join.

    - !joinfight                                            --> Joins the fight

    - !duelstats                                            --> Gives your duelstats.

    - !duelleaderboard                                      --> Gives the current top 5 duelists.


Timeout Timer commands:

    - !scamout                                              --> Prints out the time for the next timeout.

    Mod commands:

    - !scammed                                              --> Adds 300 seconds (5 minutes) to the timecounter.

    - !scamreset                                            --> Resets the timeoutcounter back to 300 seconds (5 minutes).

    - !scamset <time>                                       --> Sets the timeoutcounter to the given seconds.


Timed Message commands:

Each timed message runs independently with its own interval, so you can have several posting on different cadences at the same time (e.g. socials every 40 messages, a discord plug every 150).

    - !listtimedmessages                                    --> Lists all timed messages with their number, interval, and on/off status.

    Mod commands:

    - !addtimedmessage <interval> <text>                    --> Adds a new timed message that posts every <interval> chat messages.

    - !removetimedmessage <number>                          --> Removes a message by its number (see !listtimedmessages).

    - !enabletimedmessage <number|all>                      --> Turns a specific message on, or all of them.

    - !disabletimedmessage <number|all>                     --> Turns a specific message off, or all of them.

    - !timedmessageinterval <number> <interval>             --> Changes the interval of an existing message.


Uptime:

    - !uptime                                               --> Shows how long the channel has been live, or that it's offline.


Language:

    - !setlanguage <de|en> (Mod command)                    --> Sets the bot's reply language for this channel.


All of the settings above (queue on/off, timeout timer, happy hour, timed messages, language) are persisted to the database and survive a bot restart. See `src/json/userStats/schema.sql` for a fresh install, or `src/json/userStats/migrations/` to add the new tables to an existing database.
