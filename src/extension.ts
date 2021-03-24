import * as vscode from 'vscode';
import { XenLiveClient } from './XenLiveClient';

export function activate(context: vscode.ExtensionContext) {

	const client = new XenLiveClient(context);

	const disposables = [
		vscode.commands.registerCommand('xenlive-edit.enable', () => {
			if (client.enabled) {
				vscode.window.showWarningMessage('XenLive Edit: Already enabled.');
				return;
			}
			const folders = vscode.workspace.workspaceFolders;
			if (!folders) {
				vscode.window.showErrorMessage("XenLive Edit: Please open the widget's folder first!");
			}
			else if (folders.length > 1) {
				vscode.window.showErrorMessage('XenLive Edit: Only editing a single folder is supported, please close all other folders in this workspace.');
			}
			else {
				client.enableWithFolder(folders[0].uri);
			}
		}),

		vscode.commands.registerCommand('xenlive-edit.disable', () => {
			if (client.enabled) {
				client.disable();
			}
			else {
				vscode.window.showWarningMessage('XenLive Edit: Not enabled.');
			}
		}),
	];

	client.enableWithFolder(vscode.workspace.workspaceFolders![0].uri);

	context.subscriptions.push(...disposables);
}

export function deactivate() {}
