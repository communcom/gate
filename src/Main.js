const core = require('cyberway-core-service');
const { BasicMain } = core.services;
const env = require('./env');
const Broker = require('./service/Broker');

class Main extends BasicMain {
    constructor() {
        super(env);
        this.addNested(new Broker());
    }
}

module.exports = Main;
