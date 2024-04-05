const initialize = {
    channelsInfo: {},
    
    initializeChannel(channel) {
        if (!this.channelsInfo[channel]) {
            this.channelsInfo[channel] = {
                queue: [],
                enabled: false
            };
        }
    }
}

module.exports = initialize;