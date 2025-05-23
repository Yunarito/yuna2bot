const initialize = {
    channelsInfo: {},

    initializeChannel(channel) {
        if (!this.channelsInfo[channel]) {
            this.channelsInfo[channel] = {
                pendingDuels: {},
                queue: [],
                shoutout: [],
                enabled: false,
                timeoutTime: 300,
                happyHour: false,
            };
        }
    }
}

module.exports = initialize;
