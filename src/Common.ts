import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LocalConfig } from './Configuration';

export async function* walkPreorder(directoryPath: string, localConfig: LocalConfig): any {
    for await (const d of await fs.promises.opendir(directoryPath)) {
        const entry = path.join(directoryPath, d.name);
        const isDirectory = d.isDirectory();
        const isFile = d.isFile();
        if (localConfig.shouldExclude(vscode.Uri.file(entry))) {
            continue;
        }
        if (isDirectory || isFile) {
            yield [entry, isDirectory];
        }
        if (isDirectory) { yield* walkPreorder(entry, localConfig); }
    }
}