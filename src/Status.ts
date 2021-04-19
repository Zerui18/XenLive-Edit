import * as vscode from 'vscode';

export enum ConnectionStatus {
    none,
    connected,
    connecting,
}

export class Status {

    static shared = new Status();

    #connectionStatusItem: vscode.StatusBarItem;
    #connectionErrorItem: vscode.StatusBarItem;

    private constructor() {
        this.#connectionStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        this.#connectionStatusItem.show();
        // Setup the secondary item for showing errors.
        this.#connectionErrorItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        this.#connectionErrorItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        this.#connectionErrorItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    updateConnectionStatus(status: ConnectionStatus, remoteIP?: string) {
        switch (status) {
            case ConnectionStatus.none:
                this.#connectionStatusItem.text = 'XenLive: Inactive';
                break;
            case ConnectionStatus.connected:
                this.#connectionStatusItem.text = 'XenLive: Connected';
                break;
            case ConnectionStatus.connecting:
                this.#connectionStatusItem.text = 'XenLive: Connecting';
                break;
        }
        this.#connectionStatusItem.tooltip = remoteIP ? `Device IP: ${remoteIP}`:'';
    }

    updateErrorStatus(shortName?: string, description: string = '') {
        if (!shortName) {
            this.#connectionErrorItem.hide();
        }
        else {
            this.#connectionErrorItem.text = '$(error) ' + shortName;
            this.#connectionErrorItem.tooltip = description;
            this.#connectionErrorItem.show();
        }
    }
}

const updateConnectionStatus = Status.shared.updateConnectionStatus.bind(Status.shared);
const updateErrorStatus = Status.shared.updateErrorStatus.bind(Status.shared);
const showErrorMessage = vscode.window.showErrorMessage;
const showInfoMessage = vscode.window.showInformationMessage;

export {
    updateConnectionStatus,
    updateErrorStatus,
    showErrorMessage,
    showInfoMessage,
};