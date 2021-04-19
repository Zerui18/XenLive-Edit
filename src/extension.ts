import * as vscode from 'vscode';
import { XenLiveClient } from './XenLiveClient';
import { Logger } from './Logger';
import { showErrorMessage } from './Status';

export function activate(context: vscode.ExtensionContext) {

	Logger.initialize(context);
	XenLiveClient.initialize(context);

	const disposables = [
		vscode.commands.registerCommand('xenlive-edit.enable', () => {
			if (XenLiveClient.shared.isEnabled) {
				return;
			}
			const folders = vscode.workspace.workspaceFolders;
			if (!folders) {
				showErrorMessage("Please open the widget's folder first!");
			}
			else if (folders.length > 1) {
				showErrorMessage('Only editing a single folder is supported, please close all other folders in this workspace.');
			}
			else {
				try {
					XenLiveClient.shared.enableWithFolder(folders[0].uri);
				}
				catch (error) {
					showErrorMessage(`Could not enable XenLive: ${error.message}`);
				}
			}
		}),

		vscode.commands.registerCommand('xenlive-edit.disable', () => {
			if (XenLiveClient.shared.isEnabled) {
				XenLiveClient.shared.disable();
			}
			else {
				showErrorMessage('Not enabled.');
			}
		}),

		vscode.commands.registerCommand('xenlive-edit.forceSyncRemote', () => {
			if (XenLiveClient.shared.isEnabled) {
				XenLiveClient.shared.forceSyncRemote();
			}
			else {
				showErrorMessage('Not enabled.');
			}
		})
	];

	context.subscriptions.push(...disposables);
}

export function deactivate() {}
