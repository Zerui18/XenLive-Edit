import * as vscode from 'vscode';

const childProcess = require('child_process');
const rsync = require('rsync');
const bent = require('bent');

export class XenLiveClient {

    // Properties
    #context: vscode.ExtensionContext;
    #rootFolder?: vscode.Uri;
    #watcher?: vscode.FileSystemWatcher;
    #enabled: Boolean = false;

    constructor(context: vscode.ExtensionContext) {
        this.#context = context;
    }

    // Public API
    get enabled() {
        return this.#enabled;
    }

    enableWithFolder(rootFolder: vscode.Uri) {
        this.#enabled = true;
        this.#rootFolder = rootFolder;
        this.startWatching();
        vscode.window.showInformationMessage('XenLive Edit: Enabled');
    }
    
    disable() {
        this.#enabled = false;
        this.stopWatching();
        vscode.window.showInformationMessage('XenLive Edit: Disabled');
    }

    private getRemoteConfig() {
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
        else if (process.platform == 'win32' && remoteConfig.cwrsyncBinPath.length === 0) {
            throw new Error('cwrsync Bin Path needs to be set on Windows!');
        }
        remoteConfig.widgetPath = `/var/mobile/Library/Widgets/${remoteConfig.widgetType}/${remoteConfig.widgetName}/`;
        return remoteConfig;
    }

    private getLocalConfig() {
        // Get config and validate.
        const localConfig: any = vscode.workspace.getConfiguration('xenlive-edit').get('local');
        if (process.platform == 'win32' && localConfig.cwrsyncBinPath.length === 0) {
            throw new Error('cwrsync Bin Path needs to be set on Windows!');
        }
        if (localConfig.cwrsyncBinPath.endsWith('\\'))
        localConfig.cwrsyncBinPath.pop();
        return localConfig;
    }

    private async runSync() {
        // Rsync the workspace's root folder with the remote's folder.
        const remoteConfig = this.getRemoteConfig();
        const localConfig = this.getLocalConfig();
        // All ok, perform sync.
        const sourcePath = `//localhost/C$${this.#rootFolder!.path.split(':')[1]}/`;
        // Use root to prevent perms denied, we restore file ownership to mobile in rsync.
        const destPath = `'root@${remoteConfig.deviceIP}:${remoteConfig.widgetPath}'`;
        console.log(`rsync [${process.platform}] ${sourcePath} -> ${destPath}`)
        if (process.platform === 'win32') {
            const rsyncPath = `${localConfig.cwrsyncBinPath}\\rsync`; // don't use quotes here
            const sshPath = `'${localConfig.cwrsyncBinPath}\\ssh'`;
            console.log(`win32 rsync: ${rsyncPath}, ssh: ${sshPath}`)
            return await (new Promise((res, rej) => {
                childProcess.execFile(rsyncPath,
                                ['-rl', '-o', '--chown=mobile', '--delete', '-e', sshPath, sourcePath, destPath],
                                (err: string) => {
                                    if (err) {
                                        rej(err);
                                    }
                                    else {
                                        res(true);
                                    }
                                })
            }));
        }
        else {
            // Works on macOS, should be fine on Linux as well.
            const sync = new rsync().flags('rlo')
                                    .set('delete')
                                    .set('chown', 'mobile')
                                    // '/' syncs the content without the folder.
                                    .source(this.#rootFolder!.fsPath + '/')
                                    .destination(`mobile@${remoteConfig.deviceIP}:${remoteConfig.widgetPath}`);
            return await (new Promise((res, rej) => {
                sync.execute((err: string) => {
                    if (err) {
                        rej(err);
                    }
                    else {
                        res(true);
                    }
                });
            }));
        }
    }

    private async postToRemoteForReload(isConfigFile: boolean) {
        const remoteConfig = this.getRemoteConfig();
        const request = bent(`http://${remoteConfig.deviceIP}:2021`, 'GET', 'string');
        const path = (isConfigFile ? '/R':'/r') + encodeURIComponent(remoteConfig.widgetPath);
        await request(path);
    }

    private startWatching () {
        this.#watcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);
        const runSyncAndNotifyRemote = async (uri: vscode.Uri) => {
            // 1. Execute rsync.
            try {
                await this.runSync();
                // 2. Notify remote to reload.
                try {
                    const isConfigFile = uri.path.endsWith('config.json');
                    await this.postToRemoteForReload(isConfigFile);
                }
                catch (err) {
                    vscode.window.showErrorMessage(`XenLive Edit: Failed to communicate with device: ${err}`);
                }
            }
            catch (err) {
                vscode.window.showErrorMessage(`XenLive Edit: Failed to sync with device: ${err}`);
            }
        };
        this.#watcher.onDidChange(runSyncAndNotifyRemote);
        this.#watcher.onDidCreate(runSyncAndNotifyRemote);
        this.#watcher.onDidDelete(runSyncAndNotifyRemote);
        this.#context.subscriptions.push(this.#watcher);
    }

    private stopWatching () {
        this.#watcher?.dispose();
    }
}