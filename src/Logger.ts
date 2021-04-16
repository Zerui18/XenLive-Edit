import * as vscode from 'vscode';

export class Logger {

    static shared: Logger;

    static initialize(context: vscode.ExtensionContext) {
        this.shared = new Logger(context);
    }

    #infoOutput = vscode.window.createOutputChannel('XenLive Info');
    #errorOutput = vscode.window.createOutputChannel('XenLive Error');

    private constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(this.#infoOutput, this.#errorOutput);
    }

    logInfo(text: string) {
        this.#infoOutput.appendLine(text);
    }

    logError(text: string) {
        this.logInfo(text);
        this.#errorOutput.appendLine(text);
    }

    createNamedLogger(name: string): NamedLogger {
        return new NamedLogger(this, name);
    }

}

export class NamedLogger {

    #rootLogger: Logger;
    #name: string;

    constructor(rootLogger: Logger, name: string) {
        this.#name = name;
        this.#rootLogger = rootLogger;
    }

    logInfo(text: string) {
        this.#rootLogger.logInfo(`${this.#name} : ${text}`);
    }

    logError(text: string) {
        this.#rootLogger.logError(`${this.#name} : ${text}`);
    }

}