// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ParsonViewerProvider } from './ParsonViewerProvider';
import { ParsonExplorer } from './ParsonExplorer';
import { AdminTools } from './AdminTools';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log("start");
	AdminTools.register(context);
	let result = ParsonViewerProvider.register(context);
	context.subscriptions.push(result.providerRegistration);
	vscode.commands.registerCommand('parsonExplorer.displayFile', (filename, uri) => result.provider.showFile(filename, uri));
	vscode.window.registerTreeDataProvider('parsonExplorer', new ParsonExplorer(vscode.workspace.workspaceFolders!![0].uri.fsPath));
}

// this method is called when your extension is deactivated
export function deactivate() {
}
