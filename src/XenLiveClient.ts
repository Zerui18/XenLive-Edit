import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Connection } from './Connection';
import { walkPreorder } from './Common';
import { Logger, NamedLogger } from './Logger';
import { Configuration } from './Configuration';
import { showErrorMessage, showInfoMessage, updateErrorStatus } from './Status';

enum RequestType {
    connect = 0,
    write  = 1,
    delete = 2,
    createFolder = 3,
    clearFolder = 4,
    refresh = 5,
    restart = 6,
}

export class XenLiveClient {

    static shared: XenLiveClient;

    static initialize(context: vscode.ExtensionContext) {
        this.shared = new XenLiveClient(context);
    }

    // PROPERTIES
    #context: vscode.ExtensionContext;
    #isEnabled: Boolean = false;
    #logger: NamedLogger;

    // Only valid when isEnabled.
    #rootFolder?: vscode.Uri;
    #watcher?: vscode.FileSystemWatcher;
    #currentTask?: Promise<void>;

    #configuration?: Configuration;
    #connection?: Connection;

    constructor(context: vscode.ExtensionContext) {
        this.#context = context;
        this.#logger = Logger.shared.createNamedLogger('Client');
    }

    // PUBLIC
    get isEnabled() {
        return this.#isEnabled;
    }

    // This method may throw errors.
    enableWithFolder(rootFolder: vscode.Uri) {
        this.#rootFolder = rootFolder;
        this.#configuration = new Configuration(this.#context, rootFolder, (deviceIP) => {
            if (this.#isEnabled) {
                this.#connection?.disconnect();
                this.#connection = new Connection(deviceIP);
                this.#connection.connect();
            }
        });
        this.#connection = new Connection(this.#configuration.getConfig().remote.deviceIP);
        this.#connection.connect();
        this.startWatching();
        this.#isEnabled = true;
    }
    
    disable() {
        this.#connection!.disconnect();
        this.stopWatching();
        this.#isEnabled = false;
    }

    forceSyncRemote() {
        this.stopWatching();
        vscode.window.withProgress({
            location : vscode.ProgressLocation.Notification,
            title : "Syncing to Remote",
            cancellable : false
        }, async (progress) => {
            progress.report({
                message : 'cleaning remote...'
            });
            try {
                // First clean remote.
                await this.sendRequestWrapped(RequestType.clearFolder, this.#rootFolder!, false);
                let paths = [];
                // We perform pre-order traversal of current root folder,
                // creating folders before transfering their items.
                // We first collect the paths for progress displaying.
                const localConfig = this.#configuration!.getConfig().local;
                for await (const path of walkPreorder(this.#rootFolder!.fsPath, localConfig)) {
                    paths.push(path);
                }
                let cnt = 0;
                for (const [p, isDirectory] of paths) {
                    await this.sendRequestWrapped(isDirectory ? RequestType.createFolder:RequestType.write, vscode.Uri.file(p), false);
                    cnt += 1;
                    progress.report({
                        message : `uploading ${p}`,
                        increment : cnt / paths.length
                    });
                }
                // Finally send an explicit refresh request.
                await this.sendRequestWrapped(RequestType.refresh, this.#rootFolder!, false);
                showInfoMessage('Remote sync completed!');
            }
            catch (error) {
                showErrorMessage(`Sync Error: ${error}`);
            }
            finally {
                this.startWatching();
            }
        });
    }

    // PRIVATE METHODS

    private async sendRequest(type: RequestType, uri: vscode.Uri, performRefresh: Boolean) {
        const config = this.#configuration!.getConfig();
        if (config.local.shouldExclude(uri)) {
            this.#logger.logInfo(`Ignoring ${uri} due to exclude pattern.`);
            return;
        }
        // 1. Send header.
        const remoteConfig = config.remote;
        // Write Header
        // Note we convert all strings to buffers so later .length returns truthful bytes count, not utf8 characters count.
        const widgetName = Buffer.from(remoteConfig.widgetName);
        const widgetType = Buffer.from(remoteConfig.widgetType);
        const fileRelPath = Buffer.from(path.relative(this.#rootFolder!.path, uri.path).replace(path.sep, '/'));
        const fileContent = type === RequestType.write ? fs.readFileSync(uri.fsPath):Buffer.alloc(0);
        const requestHeader = Buffer.alloc(28);
        // iOS uses LE.
        // Magic.
        requestHeader.write('ZXL\0');
        // Request type.
        requestHeader.writeUInt32LE(type, 4);
        // Widget name length.
        requestHeader.writeUInt32LE(widgetName.length, 8);
        // Widget type length.
        requestHeader.writeUInt32LE(widgetType.length, 12);
        // File rel-path length.
        requestHeader.writeUInt32LE(fileRelPath.length, 16);
        // File content length.
        requestHeader.writeUInt32LE(fileContent.length, 20);
        // Options:
        // First bit is perform_refresh.
        const options = performRefresh ? 1 : 0;
        requestHeader.writeUInt32LE(options, 24);
        await this.#connection!.send(requestHeader);
        // 2. Send body.
        const requestBody = Buffer.concat([Buffer.from(widgetName), Buffer.from(widgetType), Buffer.from(fileRelPath), fileContent]);
        await this.#connection!.send(requestBody);
        this.#logger.logInfo(`Sent request of type ${type} with widgetName: ${widgetName}, widgetType: ${widgetType}, fileRelPath: ${fileRelPath}, fileContentLength: ${fileContent.length}`);
    }

    // A wrapper for this.sendRequest that handles its errors.
    // It also enforces linear execution with a trick from:
    // https://stackoverflow.com/a/53540586
    private sendRequestWrapped(type: RequestType, uri: vscode.Uri, performRefresh: Boolean) {
        // Package the actions as an async block.
        const run = async () => {
            // When run, it awaits the current task.
            if (this.#currentTask) {
                await this.#currentTask;
            }
            try {
                await this.sendRequest(type, uri, performRefresh);
            }
            catch (error) {
                this.#logger.logError(`Request Error: ${error.message}`);
            }
        };
        // We update the current task to be this block, 
        // forming a linked list of async blocks awaiting their ancestor.
        this.#currentTask = run();
        return this.#currentTask;
    }

    private startWatching () {
        // Init watcher on all files.
        this.#watcher = vscode.workspace.createFileSystemWatcher(`${this.#rootFolder!.fsPath}/**/*`, false, false, false);
        // Events.
        this.#watcher.onDidChange(uri => {
            this.sendRequestWrapped(RequestType.write, uri, true);
        });
        this.#watcher.onDidCreate(uri => {
            const isDirectory = fs.lstatSync(uri.fsPath).isDirectory();
            this.sendRequestWrapped(isDirectory ? RequestType.createFolder:RequestType.write, uri, true);
        });
        this.#watcher.onDidDelete(uri => {
            this.sendRequestWrapped(RequestType.delete, uri, true);
        });
        this.#context.subscriptions.push(this.#watcher);
        this.#logger.logInfo(`Created filesystem watcher at ${this.#rootFolder!}`);
    }

    private stopWatching () {
        this.#watcher?.dispose();
        this.#logger.logInfo('Removed filesystem watcher.');
    }
}
