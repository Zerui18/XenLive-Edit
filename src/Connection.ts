import { Socket } from 'net';
import { ConnectionStatus, updateConnectionStatus, updateErrorStatus } from './Status';
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
            updateConnectionStatus(ConnectionStatus.none, this.#remoteIP);
        });
    }

    private createSocket() {
        this.#logger.logInfo('Creating socket');
        updateConnectionStatus(ConnectionStatus.connecting, this.#remoteIP);
        
        try {
            this.#socket = new Socket();
            this.#socket.connect(2021, this.#remoteIP);

            this.#socket.on('connect', () => {
                this.isConnected = true;
                updateConnectionStatus(ConnectionStatus.connected, this.#remoteIP);
                updateErrorStatus();
                this.#logger.logInfo(`Connected to device at: ${JSON.stringify(this.#remoteIP)}`);
                if (this.#reconnectToken) {
                    clearInterval(this.#reconnectToken);
                    this.#reconnectToken = undefined;
                }
            });

            const autoReconnect = () => {
                if (this.#shouldAutoReconnect && !this.#reconnectToken) {
                    updateConnectionStatus(ConnectionStatus.connecting, this.#remoteIP);
                    updateErrorStatus();
                    this.#logger.logInfo(`Auto-reconnecting.`);
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
                updateConnectionStatus(ConnectionStatus.connecting, this.#remoteIP);
                updateErrorStatus('Connection Error', error.message);
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
            updateErrorStatus('Connection Error', error.message);
        }
    }
}