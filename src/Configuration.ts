import * as vscode from 'vscode';
import * as path from 'path';
import { Logger, NamedLogger } from './Logger';
import { showError } from './Common';

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
    excludePatterns: string[];

    constructor(config: any, rootFolder: vscode.Uri) {
        const trimmed = config.excludePatterns.trim();
        if (trimmed.length > 0) {
            this.excludePatterns = trimmed.split('||').map((relPathMaybe: string) => {
                // Convert rel paths to abs paths for glob to work properly.
                if (path.isAbsolute(relPathMaybe)) {
                    return relPathMaybe;
                }
                return path.join(rootFolder.fsPath, relPathMaybe);
            });
            console.log('exclude patterns: ', this.excludePatterns);
        }
        else {
            this.excludePatterns = [];
        }
    }

    shouldExclude(path: string): Boolean {
        const ret = this.excludePatterns.length > 0 && micromatch.isMatch(path, this.excludePatterns);
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