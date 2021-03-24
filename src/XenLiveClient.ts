import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Socket } from 'net';

enum RequestType {
    write  = 0,
    delete = 1,
    createFolder = 2,
    clearFolder = 3,
}

interface RemoteConfig {
    deviceIP: string
    widgetName: string
    widgetType: string
}

function showInfo(message: string) {
    vscode.window.showInformationMessage(`XenLive Edit: ${message}`);
}

function showError(message: string) {
    vscode.window.showErrorMessage(`XenLive Edit: ${message}`);
}

function showWarning(message: string) {
    vscode.window.showWarningMessage(`XenLive Edit: ${message}`);
}

export class XenLiveClient {

    // Properties
    #context: vscode.ExtensionContext;
    #rootFolder?: vscode.Uri;
    #socket?: Socket;
    #watcher?: vscode.FileSystemWatcher;
    #currentTask?: Promise<void>;
    #enabled: Boolean = true;

    constructor(context: vscode.ExtensionContext) {
        this.#context = context;
    }

    // PUBLIC
    get enabled() {
        return this.#enabled;
    }

    enableWithFolder(rootFolder: vscode.Uri) {
        this.#enabled = true;
        this.#rootFolder = rootFolder;
        this.createSocket();
        this.startWatching();
        showInfo('Enabled');
    }
    
    disable() {
        this.#enabled = false;
        this.destroySocket();
        this.stopWatching();
        showInfo('Disabled');
    }

    // PRIVATE
    private sendToRemote(buffer: Buffer): Promise<Boolean> {
        // if (!this.#socket!.writable) {
        //     this.createSocket();
        //     return Promise.reject('Connection lost, reconnecting.');
        // }
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

    private getRemoteConfig(): RemoteConfig {
        // Get config and validate.
        const remoteConfig: any = vscode.workspace.getConfiguration('xenlive-edit').get('remote');
        if (remoteConfig.deviceIP.length === 0) {
            throw new Error('Device IP not set!');
        }
        else if (remoteConfig.widgetName.length === 0) {
            throw new Error('Widget name not set!');
        }
        else if (remoteConfig.widgetType.length === 0) {
            throw new Error('Widget type not set!');
        }
        return remoteConfig;
    }

    // SOCKET
    private createSocket() {
        const remoteConfig = this.getRemoteConfig();
        this.#socket = new Socket();
        this.#socket.connect(2021, remoteConfig.deviceIP);
        let reconnectToken: NodeJS.Timeout;
        this.#socket.on('connect', () => {
            showInfo('Connected to device');
            if (reconnectToken) {
                clearTimeout(reconnectToken);
            }
        });
        this.#socket.on('error', (error) => showError(`Socket error: ${error}`));
        this.#socket.on('end', () => {
            // If still enabled, try to reconnect.
            if (this.#enabled) {
                showWarning('Disconnected from device, trying to reconnect.');
                // Attempt to reconnect every second.
                reconnectToken = setInterval(() => {
                    if (!this.#socket!.connecting) {
                        this.#socket!.connect(2021, remoteConfig.deviceIP);
                    }
                }, 1000);
            }
        });
    }

    private destroySocket() {
        this.#socket!.end();
        this.#socket = undefined;
    }

    // async forceSyncRemote() {
    //     // First clean remote.
    //     await this.sendRequest(RequestType.deleteNoReload, this.#rootFolder!);
    //     // Next send all files to remote in sequence.
    //     const allFiles = await vscode.workspace.findFiles('**/*');
    //     for (const file of allFiles) {
            
    //     }
    //     vscode.window.showInformationMessage('XenLive Edit: Remote sync completed!');
    // }

    private async sendRequest(type: RequestType, uri: vscode.Uri) {
        const remoteConfig = this.getRemoteConfig();
        // 1. Send header.
        // Write Header
        const widgetName = remoteConfig.widgetName;
        const widgetType = remoteConfig.widgetType;
        const fileRelPath = path.relative(this.#rootFolder!.path, uri.path);
        const fileContent = type === RequestType.write ? fs.readFileSync(uri.fsPath):Buffer.alloc(0);
        const requestHeader = Buffer.alloc(24);
        // iOS uses LE.
        requestHeader.write('ZXL\0');
        requestHeader.writeUInt32LE(type, 4);
        requestHeader.writeUInt32LE(widgetName.length, 8);
        requestHeader.writeUInt32LE(widgetType.length, 12);
        requestHeader.writeUInt32LE(fileRelPath.length, 16);
        requestHeader.writeUInt32LE(fileContent.length, 20);
        await this.sendToRemote(requestHeader);
        // 2. Send body.
        const requestBody = Buffer.concat([Buffer.from(widgetName), Buffer.from(widgetType), Buffer.from(fileRelPath), fileContent]);
        await this.sendToRemote(requestBody);
    }

    private startWatching () {
        // Init watcher on all files.
        this.#watcher = vscode.workspace.createFileSystemWatcher(`${this.#rootFolder!.path}/**/*`, false, false, false);
        // A wrapper for this.sendRequest that handles its errors.
        // Also, it enforces linear execution with a trick from:
        // https://stackoverflow.com/a/53540586
        const addTask = (type: RequestType, uri: vscode.Uri) => {
            // Package the actions as an async block.
            const run = async () => {
                // When run, it awaits the current task.
                await this.#currentTask;
                try {
                    await this.sendRequest(type, uri);
                }
                catch (error) {
                    showError(`Connection Error: ${error.message}`);
                }
            };
            // We update the current task to be this block, 
            // forming a linked list of async blocks awaiting their ancestor.
            this.#currentTask = run();
        };
        // Events.
        this.#watcher.onDidChange(async uri => {
            addTask(RequestType.write, uri);
        });
        this.#watcher.onDidCreate(async uri => {
            const isDirectory = fs.lstatSync(uri.path).isDirectory();
            addTask(isDirectory ? RequestType.createFolder:RequestType.write, uri);
        });
        this.#watcher.onDidDelete(async uri => {
            addTask(RequestType.delete, uri);
        });
        this.#context.subscriptions.push(this.#watcher);
    }

    private stopWatching () {
        this.#watcher?.dispose();
    }
}
