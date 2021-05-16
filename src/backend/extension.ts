// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ParsonViewerProvider } from './ParsonViewerProvider';
import { ParsonExplorer } from './ParsonExplorer';
import { AdminTools } from './AdminTools';
import { ParsonDecorationProvider } from './ParsonDecorationProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
const disposables: Array<vscode.Disposable> = [];
export function activate(context: vscode.ExtensionContext) {
	let workspaceroot = vscode.workspace.workspaceFolders!![0].uri.fsPath;
	let adminCommands = AdminTools.register();
	let decorationProvider = ParsonDecorationProvider.register(workspaceroot);
	let parsonViewerResult = ParsonViewerProvider.register(context, decorationProvider.it, workspaceroot);
	context.subscriptions.push(parsonViewerResult.disposable);
	let displayFile = vscode.commands.registerCommand('parsonExplorer.displayFile', (filename, uri) => parsonViewerResult.it.showFile(filename, uri));
	let parsonExplorer = ParsonExplorer.register(workspaceroot);
	
	disposables.push(adminCommands.disposable);
	disposables.push(parsonViewerResult.disposable);
	disposables.push(displayFile);
	disposables.push(parsonExplorer);
	disposables.push(decorationProvider.disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
	disposables.forEach(d => d.dispose());
}
