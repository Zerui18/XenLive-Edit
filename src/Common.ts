import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LocalConfig } from './Configuration';

export function showInfo(message: string) {
    vscode.window.setStatusBarMessage(message, 5000);
    // vscode.window.showInformationMessage(`XenLive Edit: ${message}`);
}

export function showError(message: string) {
    vscode.window.setStatusBarMessage(message, 5000);
    // vscode.window.showErrorMessage(`XenLive Edit: ${message}`);
}

export function showWarning(message: string) {
    vscode.window.setStatusBarMessage(message, 5000);
    // vscode.window.showWarningMessage(`XenLive Edit: ${message}`);
}

export async function* walkPreorder(directoryPath: string, localConfig: LocalConfig): any {
    for await (const d of await fs.promises.opendir(directoryPath)) {
        const entry = path.join(directoryPath, d.name);
        const isDirectory = d.isDirectory();
        const isFile = d.isFile();
        if (localConfig.shouldExclude(entry)) {
            continue;
        }
        if (isDirectory || isFile) {
            yield [entry, isDirectory];
        }
        if (isDirectory) { yield* walkPreorder(entry, localConfig); }
    }
}