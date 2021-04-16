import { Socket } from 'net';
import { showError, showInfo, showWarning } from './Common';
import { Logger, NamedLogger } from './Logger';

export class Connection {

    isConnected = false;

    #socket?: Socket;
    #logger: NamedLogger;
    #reconnectToken?: any;
    #remoteIP: string;
    #shouldAutoReconnect = false;

    constructor(remoteIP: string) {
        this.#remoteIP = remoteIP;
        this.#logger = Logger.shared.createNamedLogger('Connection');
        this.#logger.logInfo('Initiated');
    }

    send(buffer: Buffer): Promise<Boolean> {
        if (!this.isConnected) {
            return Promise.reject('Not connected to device.');
        }
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
        this.#shouldAutoReconnect = true;
        this.createSocket();
    }

    disconnect() {
        this.#shouldAutoReconnect = false;
        clearInterval(this.#reconnectToken);
        this.destroySocket();
    }
    
    private destroySocket(): Promise<Boolean> {
        return new Promise((res) => {
            this.#socket!.end(() => res(true));
            this.#socket = undefined;
        });
    }

    private createSocket() {
        this.#logger.logInfo('Creating socket');
        try {
            this.#socket = new Socket();
            this.#socket.connect(2021, this.#remoteIP);

            this.#socket.on('connect', () => {
                this.isConnected = true;
                showInfo('Connected to device');
                this.#logger.logInfo(`Connected to device at: ${JSON.stringify(this.#remoteIP)}`);
                if (this.#reconnectToken) {
                    clearInterval(this.#reconnectToken);
                    this.#reconnectToken = undefined;
                }
            });

            const autoReconnect = () => {
                if (this.#shouldAutoReconnect && !this.#reconnectToken) {
                    showWarning('Disconnected from device, trying to reconnect.');
                    this.#logger.logError(`Auto-reconnecting.`);
                    // Attempt to reconnect every second.
                    this.#reconnectToken = setInterval(() => {
                        if (!this.#socket!.connecting) {
                            this.#socket!.connect(2021, this.#remoteIP);
                        }
                    }, 1000);
                }
            };

            this.#socket.on('error', (error) => {
                this.isConnected = false;
                showError(`Socket Error: ${error.message}`);
                this.#logger.logError(`Socket Error: ${error.message}`);
                autoReconnect();
            });

            this.#socket.on('end', () => {
                this.isConnected = false;
                if (this.#reconnectToken) {
                    clearInterval(this.#reconnectToken);
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