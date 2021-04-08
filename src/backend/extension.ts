// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ParsonViewerProvider } from './ParsonViewerProvider';
import { ParsonExplorer } from './ParsonExplorer';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let result = ParsonViewerProvider.register(context);
	context.subscriptions.push(result.providerRegistration);
	
	vscode.commands.registerCommand('parsonExplorer.displayFile', (filename) => result.provider.showFile(filename));
}

// this method is called when your extension is deactivated
export function deactivate() {
}
