const initialize = {
    channelsInfo: {},
    
    initializeChannel(channel) {
        if (!this.channelsInfo[channel]) {
            this.channelsInfo[channel] = {
                // currentContest: {
                //     participants: Set<string>, // store participants
                //     timeout: NodeJS.Timeout,   // store contest timeout
                // },
                pendingDuels: {},
                queue: [],
                enabled: false,
                timeoutTime: 300
            };
        }
    }
}

module.exports = initialize;