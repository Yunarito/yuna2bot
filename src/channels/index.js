const catzzi = require('./catzzi.js');
const yunarito = require('./yunarito.js');
const itzpinky = require('./itzpinky.js');

// Per-channel command routing. app.js consults these instead of hardcoding
// channel-name checks inline, so each streamer's quirks live in one file.
const channelHandlers = {
  '#catzzi': catzzi.handleMessage,
  '#yunarito': yunarito.handleMessage,
  '#itzpinky_': itzpinky.handleMessage,
};

const rankOverrides = {
  '#catzzi': catzzi.resolveRankMessage,
};

module.exports = { channelHandlers, rankOverrides };
