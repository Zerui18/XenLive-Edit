import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function showInfo(message: string) {
    vscode.window.showInformationMessage(`XenLive Edit: ${message}`);
}

export function showError(message: string) {
    vscode.window.showErrorMessage(`XenLive Edit: ${message}`);
}

export function showWarning(message: string) {
    vscode.window.showWarningMessage(`XenLive Edit: ${message}`);
}

export function getRemoteConfig(): RemoteConfig {
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

export async function* walkPreorder(directoryPath: string): any {
    for await (const d of await fs.promises.opendir(directoryPath)) {
        const entry = path.join(directoryPath, d.name);
        const isDirectory = d.isDirectory();
        const isFile = d.isFile();
        if (isDirectory || isFile) {
            yield [entry, isDirectory];
        }
        if (isDirectory) { yield* walkPreorder(entry); }
    }
}

export interface RemoteConfig {
    deviceIP: string
    widgetName: string
    widgetType: string
}