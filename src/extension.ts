import * as vscode from 'vscode';
import { showError, showWarning } from './Common';
import { XenLiveClient } from './XenLiveClient';

export function activate(context: vscode.ExtensionContext) {

	const client = new XenLiveClient(context);

	const disposables = [
		vscode.commands.registerCommand('xenlive-edit.enable', () => {
			if (client.isEnabled) {
				showWarning('Already enabled.');
				return;
			}
			const folders = vscode.workspace.workspaceFolders;
			if (!folders) {
				showError("Please open the widget's folder first!");
			}
			else if (folders.length > 1) {
				showError('Only editing a single folder is supported, please close all other folders in this workspace.');
			}
			else {
				client.enableWithFolder(folders[0].uri);
			}
		}),

		vscode.commands.registerCommand('xenlive-edit.disable', () => {
			if (client.isEnabled) {
				client.disable();
			}
			else {
				showWarning('Not enabled.');
			}
		}),

		vscode.commands.registerCommand('xenlive-edit.forceSyncRemote', () => {
			if (client.isEnabled) {
				client.forceSyncRemote();
			}
			else {
				showError('Not enabled.');
			}
		})
	];

	context.subscriptions.push(...disposables);
}

export function deactivate() {}
