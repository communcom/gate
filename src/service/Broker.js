const jayson = require('jayson');
const core = require('cyberway-core-service');
const { Basic } = core.services;
const { Logger, RpcObject } = core.utils;

const env = require('../env');

class Broker extends Basic {
    constructor(services) {
        super();

        this._services = services;

        this._pipeMapping = new Map(); // channelId -> pipe
        this._authMapping = new Map(); // channelId -> auth data
    }

    async start() {
        this._connector = this._services.connector;
    }

    async stop() {
        await this.stopNested();
    }

    async handleRequest({ channelId, clientRequestIp, clientInfo }, data, pipe) {
        if (typeof data === 'string') {
            await this._handleFrontendEvent({ channelId, clientInfo }, data, pipe);
        } else {
            await this._handleRequest({ channelId, clientRequestIp, clientInfo }, data, pipe);
        }
    }

    async transfer({ channelId, method, data }) {
        const pipe = this._pipeMapping.get(channelId);

        if (!pipe) {
            throw { code: 1105, message: 'Cant transfer to client - not found' };
        }

        try {
            pipe(this._makeNotifyToClientObject(method, data));
        } catch (err) {
            throw { code: 1106, message: 'Notify client error' };
        }
    }

    async checkChannel({ channelId }) {
        return {
            isConnected: this._pipeMapping.has(channelId),
        };
    }

    async checkChannels({ channelsIds }) {
        const connected = [];

        for (const channelId of channelsIds) {
            if (this._pipeMapping.has(channelId)) {
                connected.push(channelId);
            }
        }

        return {
            connected,
        };
    }

    async _handleFrontendEvent({ channelId, clientInfo }, event, pipe) {
        switch (event) {
            case 'open':
                this._pipeMapping.set(channelId, pipe);

                if (!env.GLS_DISABLE_AUTH) {
                    const { secret } = await this._connector.callService(
                        'auth',
                        'auth.generateSecret',
                        {
                            channelId,
                        }
                    );

                    const request = this._makeAuthRequestObject(secret);
                    pipe(request);
                }
                break;

            case 'close':
            case 'error':
                await this._clientOffline({ channelId });

                break;
        }
    }

    async _clientOffline({ channelId }) {
        const auth = this._authMapping.get(channelId) || {};

        this._pipeMapping.delete(channelId);
        this._authMapping.delete(channelId);

        const { userId } = auth;

        if (userId) {
            await this._notifyAboutOffline({ userId, channelId });
        }
    }

    async _handleRequest({ channelId, clientRequestIp, clientInfo }, data, pipe) {
        const parsedData = await this._parseRequest(data);

        if (parsedData.error) {
            pipe(parsedData);
            return;
        }

        if (data.method === 'auth.logout') {
            return await this._clientOffline({ channelId });
        }

        await this._handleClient({ channelId, clientRequestIp, clientInfo }, data, pipe);
    }

    _parseRequest(data) {
        return new Promise((resolve, reject) => {
            const fakeJaysonRouter = {
                router: () => new jayson.Method(() => resolve(data)),
            };
            const fakeJaysonServer = jayson.server({}, fakeJaysonRouter);

            try {
                fakeJaysonServer.call(data, rpcError => resolve(rpcError));
            } catch (parseError) {
                reject(parseError);
            }
        });
    }

    async _handleClient({ channelId, clientRequestIp, clientInfo }, data, pipe) {
        try {
            let response = {};

            if (data.method === 'auth.generateSecret' && !env.GLS_DISABLE_AUTH) {
                response = await this._connector.sendTo('auth', data.method, {
                    ...data.params,
                    channelId,
                });
            } else if (data.method === 'auth.authorize' && !env.GLS_DISABLE_AUTH) {
                response = await this._connector.sendTo('auth', data.method, {
                    ...data.params,
                    channelId,
                });

                if (response.result) {
                    this._authMapping.set(channelId, response.result);
                    this._connector
                        .sendTo(
                            'facade',
                            'registration.onboardingDeviceSwitched',
                            {auth:this._authMapping.get(channelId), clientInfo: clientInfo },
                        )
                        .catch(error => {
                            Logger.error('Error calling onboardingDeviceSwitched', error);
                        });
                }
            } else {
                const translate = this._makeTranslateToServiceData(
                    { channelId, clientRequestIp, clientInfo },
                    data
                );

                response = await this._connector.sendTo('facade', data.method, translate);
            }

            response.id = data.id;

            pipe(response);
        } catch (error) {
            Logger.error('Fail to pass data from client to facade:', error);

            pipe(RpcObject.error(1104, 'Fail to pass data from client to facade'));
        }
    }

    _makeTranslateToServiceData({ channelId, clientRequestIp, clientInfo }, data) {
        return {
            _frontendGate: true,
            auth: this._authMapping.get(channelId) || {},
            clientInfo,
            routing: {
                requestId: data.id,
                channelId,
            },
            meta: {
                clientRequestIp,
            },
            params: data.params || {},
        };
    }

    async _notifyAboutOffline({ userId, channelId }) {
        await this._connector.sendTo('facade', 'offline', { channelId, user: userId });
    }

    _makeAuthRequestObject(secret) {
        return this._makeNotifyToClientObject('sign', { secret });
    }

    _makeNotifyToClientObject(method, data) {
        return RpcObject.request(method, data, 'rpc-notify');
    }
}

module.exports = Broker;
