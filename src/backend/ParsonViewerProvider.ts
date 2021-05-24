import * as path from 'path';
import * as vscode from 'vscode';
import { generateNonce, nonce } from '../util';
import { loadExercisesToString, loadExercises, readParsonFileToString } from './FileReader';
import { SavedExerciseAnswer, Answer, DisposableWrapper} from '../model';
import { ParsonDecorationProvider } from './ParsonDecorationProvider';


export class ParsonViewerProvider implements vscode.CustomTextEditorProvider {

    public static register(
		context: vscode.ExtensionContext, 
		decorator: ParsonDecorationProvider,
		workspaceroot: string): DisposableWrapper<ParsonViewerProvider> {
		const provider = new ParsonViewerProvider(context, decorator, workspaceroot);
		const providerRegistration = vscode.window.registerCustomEditorProvider(ParsonViewerProvider.viewType, provider);
		return {it: provider, disposable: providerRegistration};
	}

    private static readonly viewType = 'testExtension.parsonViewer';
	private postMessage: Map<string, (message?: {type: string, text: string}) => void> = new Map();
	private currentFileMap: {[key: string]: string} = {};

    constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly decorator: ParsonDecorationProvider,
		private readonly workspaceroot: string
	) { }

    public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		// Setup initial content for the webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};

		const workspaceroot = vscode.workspace.workspaceFolders![0].uri.fsPath;
		
		const identifier = document.fileName.substr(workspaceroot.length+1);
		this.postMessage.set(identifier, a=> webviewPanel.webview.postMessage(a));

		const parson = loadExercises(JSON.parse(document.getText()), workspaceroot);
		this.currentFileMap[document.uri.fsPath.substring(workspaceroot.length+1)] = parson.exercise.files[0].name;
		
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

		function updateWebview() {
			const text = loadExercisesToString(document.getText(), workspaceroot);
			webviewPanel.webview.postMessage({
				type: 'update',
				text,
			});
		}
		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebview();
			}
		});

		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		webviewPanel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
				case 'log':
					console.log("log: ", e.text);
                    return;
				case 'remove answer':
					this.removeAnswer(e.text, document);
					return;
				case 'add answer':
					this.addAnswer(e.text, document);
					return;
			}
		});
		updateWebview();
	}

	public showFile(fileName: string, uri: string): void{
		this.currentFileMap[uri] = fileName;
		vscode.commands.executeCommand(
			"vscode.openWith",
			vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, uri), ParsonViewerProvider.viewType
		).then(()=>{
			let sendMessage = this.postMessage.get(uri);
			if(sendMessage){
				sendMessage({type: "show file", text: fileName});
			}
		});
	}

	public updateFile(uri: string): void{
		const updatedfile = readParsonFileToString(uri, this.workspaceroot);
		let sendMessage = this.postMessage.get(uri);
		if(sendMessage){
			sendMessage({type: "update", text: updatedfile});
		}
	}

	private removeAnswer(snippetId: string, document: vscode.TextDocument){
		const parson: SavedExerciseAnswer = this.getDocumentAsSavedExerciseAnswer(document);
		parson.answers = parson.answers.filter(answer => answer.snippet.id !==snippetId);
		this.updateParsonDefFile(document, parson);
	}

	private addAnswer(answer: Answer, document: vscode.TextDocument){
		const parson: SavedExerciseAnswer = this.getDocumentAsSavedExerciseAnswer(document);
		if(answer.snippet.id === ""){
			answer.snippet.id = generateNonce();
			parson.answers = parson.answers.filter(a => a.gap.id !== answer.gap.id && a.snippet.id !== answer.snippet.id);
		}else{
			const otherSnippet = parson.answers.find(an => an.gap.id === answer.gap.id)?.snippet;
			const otherGap = parson.answers.find(an => an.snippet.id === answer.snippet.id)?.gap;
			parson.answers = parson.answers.filter(a => a.gap.id !== answer.gap.id && a.snippet.id !== answer.snippet.id);
			if(otherSnippet && otherGap){
				parson.answers.push({snippet: otherSnippet, gap: otherGap});
			}
		}
		parson.answers.push(answer);
		this.updateParsonDefFile(document, parson);
	}

	private getDocumentAsSavedExerciseAnswer(document: vscode.TextDocument): SavedExerciseAnswer{
		return JSON.parse(document.getText()) as SavedExerciseAnswer;
	}

	private updateParsonDefFile(document: vscode.TextDocument, json: SavedExerciseAnswer){
		const edit = new vscode.WorkspaceEdit();
		const fileUri = document.uri.fsPath.substring(this.workspaceroot.length+1);
		const parsonUri = vscode.Uri.parse(`parson:${path.join(fileUri, this.currentFileMap[fileUri] || "")}`);
		this.decorator.fileChangeEmitter.fire(parsonUri);
		edit.replace(document.uri, new vscode.Range(0,0,document.lineCount, 0), JSON.stringify(json, null, 4));
		vscode.workspace.applyEdit(edit);
	}

    private getHtmlForWebview(webview: vscode.Webview): string {
		const scriptUri = webview.asWebviewUri(vscode.Uri.file(
			path.join(this.context.extensionPath, 'dist', 'webView.js')
		));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.file(
			path.join(this.context.extensionPath, 'dist', 'webView.css')
		));

		return /* html */`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleMainUri}" rel="stylesheet" />
				<link href="${styleMainUri}" rel="stylesheet" >

				<title>Parsons viewer</title>
			</head>
			<body>
				<div id="code" class="hljs"></div>
                <div id="snippets"></div>
				<div id="error"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}