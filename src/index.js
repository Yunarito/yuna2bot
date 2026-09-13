require = require("esm")(module/*, options*/)

const { validateAndScheduleInitialRefresh } = require("./twitchAuth.js");
const { initBroadcasterTokens } = require("./broadcasterAuth.js");
const { startEventSub } = require("./eventSub.js");
const { startConfigSync } = require("./configSync.js");

validateAndScheduleInitialRefresh()
  .then(() => {
    module.exports = require("./app.js")

    // Excavation minigame's Channel Points integration - optional until a
    // broadcaster has used "let bot join" on the website, so failures here
    // shouldn't take down chat.
    initBroadcasterTokens()
      .then(() => startEventSub())
      .catch((error) => {
        console.error('Failed to start excavation EventSub listener:', error);
      });

    // Picks up website-panel changes (channel settings, timed messages, new
    // "let bot join" authorizations) on a timer instead of requiring a restart.
    startConfigSync();
  })
  .catch((error) => {
    console.error('Failed to obtain a valid Twitch OAuth token:', error);
    process.exit(1);
  });
