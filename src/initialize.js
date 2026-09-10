const initialize = {
    channelsInfo: {},

    initializeChannel(channel) {
        if (!this.channelsInfo[channel]) {
            this.channelsInfo[channel] = {
                pendingDuels: {},
                queue: [],
                shoutout: {},
                enabled: false,
                timeoutTime: 300,
                happyHour: false,
                settingsLoaded: false,
                // Each entry runs independently: { text, interval, enabled, counter }.
                // interval/counter are both in "chat messages seen", not time.
                timedMessages: [],
            };
        }
    }
}

module.exports = initialize;
