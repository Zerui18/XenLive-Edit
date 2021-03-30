import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Connection } from './Connection';
import { getRemoteConfig, showError, showInfo, walkPreorder } from './Common';

enum RequestType {
    write  = 0,
    delete = 1,
    createFolder = 2,
    clearFolder = 3,
    refresh = 4,
}

export class XenLiveClient {

    // Properties
    #context: vscode.ExtensionContext;
    #rootFolder?: vscode.Uri;
    #watcher?: vscode.FileSystemWatcher;
    #currentTask?: Promise<void>;
    #isEnabled: Boolean = false;
    #connection: Connection;

    constructor(context: vscode.ExtensionContext) {
        this.#context = context;
        this.#connection = new Connection();
    }

    // PUBLIC
    get isEnabled() {
        return this.#isEnabled;
    }

    enableWithFolder(rootFolder: vscode.Uri) {
        this.#isEnabled = true;
        this.#rootFolder = rootFolder;
        this.#connection.connect();
        this.startWatching();
        showInfo('Enabled');
    }
    
    disable() {
        this.#isEnabled = false;
        this.#connection.disconnect();
        this.stopWatching();
        showInfo('Disabled');
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
                for await (const path of walkPreorder(this.#rootFolder!.fsPath)) {
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
                showInfo('Remote sync completed!');
            }
            catch (error) {
                showError(`Sync Error: ${error}`);
            }
            finally {
                this.startWatching();
            }
        });
    }

    private async sendRequest(type: RequestType, uri: vscode.Uri, performRefresh: Boolean) {
        // 1. Send header.
        const remoteConfig = getRemoteConfig();
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
        await this.#connection.send(requestHeader);
        // 2. Send body.
        const requestBody = Buffer.concat([Buffer.from(widgetName), Buffer.from(widgetType), Buffer.from(fileRelPath), fileContent]);
        await this.#connection.send(requestBody);
        // if (uri.path.includes('JavaScript')) {
        //     console.log(`sent request for file: ${fileRelPath}`);
        // }
    }

    // A wrapper for this.sendRequest that handles its errors.
    // It also enforces linear execution with a trick from:
    // https://stackoverflow.com/a/53540586
    private sendRequestWrapped(type: RequestType, uri: vscode.Uri, performRefresh: Boolean) {
        // Package the actions as an async block.
        const run = async () => {
            // When run, it awaits the current task.
            await this.#currentTask;
            try {
                await this.sendRequest(type, uri, performRefresh);
            }
            catch (error) {
                showError(`Connection Error: ${error.message}`);
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
    }

    private stopWatching () {
        this.#watcher?.dispose();
    }
}
