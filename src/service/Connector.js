const core = require('cyberway-core-service');
const { Connector: BasicConnector } = core.services;

const env = require('../env');

class Connector extends BasicConnector {
    constructor(services) {
        super();

        this._services = services;
    }

    async start() {
        const { broker } = this._services;

        await super.start({
            serverRoutes: {
                transfer: {
                    handler: broker.transfer,
                    scope: broker,
                    validation: {
                        required: ['channelId', 'method', 'data'],
                        properties: {
                            channelId: {
                                type: 'string',
                            },
                            method: {
                                type: 'string',
                            },
                            data: {
                                type: 'object',
                            },
                        },
                    },
                },
                checkChannel: {
                    handler: broker.checkChannel,
                    scope: broker,
                    validation: {
                        required: ['channelId'],
                        properties: {
                            channelId: {
                                type: 'string',
                            },
                        },
                    },
                },
                checkChannels: {
                    handler: broker.checkChannels,
                    scope: broker,
                    validation: {
                        required: ['channelsIds'],
                        properties: {
                            channelsIds: {
                                type: 'array',
                                minItems: 1,
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
            requiredClients: {
                facade: env.GLS_FACADE_CONNECT,
                auth: env.GLS_AUTH_CONNECT,
            },
        });
    }
}

module.exports = Connector;
