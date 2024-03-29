// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ParsonViewerProvider } from './ParsonViewerProvider';
import { ParsonExplorer } from './ParsonExplorer';
import { AdminTools } from './AdminTools';
import { ParsonDecorationProvider } from './ParsonDecorationProvider';
import { AnswerVerification } from './AnswerVerification';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
const disposables: Array<vscode.Disposable> = [];
export function activate(context: vscode.ExtensionContext) {
	let workspaceroot = vscode.workspace.workspaceFolders!![0].uri.fsPath;
	let parsonExplorerResult = ParsonExplorer.register(workspaceroot);
	let decorationProvider = ParsonDecorationProvider.register(workspaceroot);
	let parsonViewerResult = ParsonViewerProvider.register(context, decorationProvider.it, workspaceroot);
	context.subscriptions.push(parsonViewerResult.disposable);
	let adminCommands = AdminTools.register(parsonExplorerResult.it, parsonViewerResult.it, decorationProvider.it);
	let answerVerification = AnswerVerification.register(workspaceroot);
	let displayFile = vscode.commands.registerCommand('parsonExplorer.displayFile', (filename, uri) => parsonViewerResult.it.showFile(filename, uri));
	
	
	disposables.push(adminCommands.disposable);
	disposables.push(answerVerification.disposable);
	disposables.push(parsonViewerResult.disposable);
	disposables.push(displayFile);
	disposables.push(parsonExplorerResult.disposable);
	disposables.push(decorationProvider.disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
	disposables.forEach(d => d.dispose());
}
