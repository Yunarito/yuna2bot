const initialize = {
    channelsInfo: {},

    initializeChannel(channel) {
        if (!this.channelsInfo[channel]) {
            this.channelsInfo[channel] = {
                pendingDuels: {},
                queue: [],
                shoutouts: [],
                enabled: false,
                timeoutTime: 300,
                happyHour: false,
            };
        }
    }
}

module.exports = initialize;
