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
