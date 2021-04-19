import * as vscode from 'vscode';
import * as path from 'path';

const micromatch = require('micromatch');

export class RemoteConfig {
    deviceIP: string;
    widgetName: string;
    widgetType: string;

    constructor(config: any) {
        if (config.deviceIP.length === 0) {
            throw new Error('Device IP not set!');
        }
        if (config.widgetName.length === 0) {
            throw new Error('Widget name not set!');
        }
        if (config.widgetType.length === 0) {
            throw new Error('Widget type not set!');
        }

        this.deviceIP = config.deviceIP;
        this.widgetName = config.widgetName;
        this.widgetType = config.widgetType;
    }
}

export class LocalConfig {
    excludePatterns?: string[];
    #rootFolder: vscode.Uri;

    constructor(config: any, rootFolder: vscode.Uri) {
        const trimmed = config.excludePatterns.trim();
        this.excludePatterns = trimmed.length > 0 ? trimmed.split(','):[];
        // Fix up the patterns.
        this.excludePatterns = this.excludePatterns!.map(pattern => {
            // For performance reasons, take pattern as a directory IFF it ends with '/'.
            let newPattern = pattern.endsWith('/') ? pattern+'**':pattern;
            // Also normalise relative paths (remove './' which interferes with glob).
            return newPattern.startsWith('./') ? newPattern.slice(2):newPattern;
        });
        this.#rootFolder = rootFolder;
    }

    shouldExclude(file: vscode.Uri): Boolean {
        // We attempt to match the path of the file relative to the rootFolder with each pattern.
        const relPath = path.relative(this.#rootFolder.path, file.path);
        const ret = this.excludePatterns && micromatch.isMatch(relPath, this.excludePatterns);
        return ret;
    }
}

export interface Config {
    local: LocalConfig
    remote: RemoteConfig
}

export class Configuration {

    #configObject?: Config;
    #rootFolder: vscode.Uri;
    #onDeviceIPChanged: (deviceIP: string) => void;

    constructor(context: vscode.ExtensionContext, rootFolder: vscode.Uri, onDeviceIPChanged: (deviceIP: string) => void) {
        this.#rootFolder = rootFolder;
        this.#onDeviceIPChanged = onDeviceIPChanged;
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('xenlive-edit')) {
                this.updateConfig(true);
            }
        }));
    }

    private updateConfig(isCallback: Boolean) {
        const config = vscode.workspace.getConfiguration('xenlive-edit');
        const oldConfig = this.#configObject;
        // Try to update config, possibly throwing errors.
        this.#configObject = undefined;
        this.#configObject = {
            local : new LocalConfig(config.local, this.#rootFolder),
            remote : new RemoteConfig(config.remote)
        };
        // If in config changed callback, check if we should notify deviceIP changed.
        if (isCallback && oldConfig && oldConfig.remote.deviceIP !== this.#configObject.remote.deviceIP) {
            this.#onDeviceIPChanged(this.#configObject.remote.deviceIP);
        }
    }

    getConfig(): Config {
        if (!this.#configObject) {
            // Indicate we're no in callback to prevent onDeviceIPChanged callback.
            this.updateConfig(false);
        }
        return this.#configObject!;
    }

}