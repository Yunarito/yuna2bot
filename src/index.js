require = require("esm")(module/*, options*/)

const { validateAndScheduleInitialRefresh } = require("./twitchAuth.js");

validateAndScheduleInitialRefresh()
  .then(() => {
    module.exports = require("./app.js")
  })
  .catch((error) => {
    console.error('Failed to obtain a valid Twitch OAuth token:', error);
    process.exit(1);
  });
