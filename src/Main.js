const core = require('cyberway-core-service');
const { BasicMain } = core.services;
const env = require('./env');

const Broker = require('./service/Broker');
const Connector = require('./service/Connector');
const FrontendGate = require('./service/FrontendGate');

class Main extends BasicMain {
    constructor() {
        super(env);

        const services = {
            connector: null,
            broker: null,
            gate: null,
        };

        services.connector = new Connector(services);
        services.broker = new Broker(services);
        services.gate = new FrontendGate(services);

        this.addNested(services.connector, services.gate, services.broker);
    }
}

module.exports = Main;
