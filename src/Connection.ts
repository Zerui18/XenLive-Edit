import { Socket } from 'net';
import { getRemoteConfig, showError, showInfo, showWarning } from './Common';
import { Logger, NamedLogger } from './Logger';

export class Connection {

    #socket?: Socket;
    #_isConnected = false;
    #logger: NamedLogger;
    #reconnectToken?: any;
    shouldAutoReconnect = false;

    constructor() {
        this.#logger = Logger.shared.createNamedLogger('Connection');
        this.#logger.logInfo('Initiated');
    }
    
    get isConnected() {
        return this.#_isConnected;
    }
    
    set isConnected(flag) {
        this.#_isConnected = flag;
    }

    send(buffer: Buffer): Promise<Boolean> {
        return new Promise((res, rej) => {
            this.#socket!.write(buffer, (error) => {
                if (error) {
                    rej(error);
                }
                else {
                    res(true);
                }
            });
        });
    };

    connect() {
        if (this.#socket) {
            this.destroySocket();
        }
        this.shouldAutoReconnect = true;
        this.createSocket();
    }

    disconnect() {
        this.shouldAutoReconnect = false;
        this.destroySocket();
    }
    
    private destroySocket(): Promise<Boolean> {
        return new Promise((res) => {
            this.#socket!.end(() => res(true));
            this.#socket = undefined;
        });
    }

    private createSocket() {
        this.#logger.logInfo('Creating socket.');
        try {
            const remoteConfig = getRemoteConfig();
            this.#socket = new Socket();
            this.#socket.connect(2021, remoteConfig.deviceIP);

            this.#socket.on('connect', () => {
                showInfo('Connected to device');
                this.#logger.logInfo(`Connected to device with config: ${JSON.stringify(remoteConfig)}`);
                if (this.#reconnectToken) {
                    clearTimeout(this.#reconnectToken);
                    this.#reconnectToken = undefined;
                }
            });

            const autoReconnect = () => {
                if (this.shouldAutoReconnect && !this.#reconnectToken) {
                    showWarning('Disconnected from device, trying to reconnect.');
                    this.#logger.logError(`Auto-reconnecting.`);
                    // Attempt to reconnect every second.
                    this.#reconnectToken = setInterval(() => {
                        if (!this.#socket!.connecting) {
                            this.#socket!.connect(2021, remoteConfig.deviceIP);
                        }
                    }, 1000);
                }
            };

            this.#socket.on('error', (error) => {
                showError(`Socket Error: ${error.message}`);
                this.#logger.logError(`Socket Error: ${error.message}`);
                autoReconnect();
            });

            this.#socket.on('end', () => {
                if (this.#reconnectToken) {
                    clearTimeout(this.#reconnectToken);
                    this.#reconnectToken = undefined;
                }
                autoReconnect();
            });
        }
        catch (error) {
            showError(`Settings Error: ${error}`);
        }
    }
}