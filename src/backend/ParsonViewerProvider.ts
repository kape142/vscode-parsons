import * as path from 'path';
import * as vscode from 'vscode';
import { nonce } from '../util';
import { loadExercisesToString, getFilesFromText, loadExercises, readParsonFileToString } from './FileReader';
import { SavedExerciseAnswer, Answer, ExerciseAnswer, DisposableWrapper} from '../model';
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
		console.log("init curfile" , this.currentFileMap,document.uri.fsPath , document.uri.fsPath.substring(workspaceroot.length+1), parson.exercise.files[0].name);
		
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

		function updateWebview() {
			const text = loadExercisesToString(document.getText(), workspaceroot);
			webviewPanel.webview.postMessage({
				type: 'update',
				text,
			});
		}

		// Hook up event handlers so that we can synchronize the webview with the text document.
		//
		// The text document acts as our model, so we have to sync change in the document to our
		// editor and sync changes in the editor back to the document.
		// 
		// Remember that a single text document can also be shared between multiple custom
		// editors (this happens for example when you split a custom editor)

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebview();
			}
		});

		// Make sure we get rid of the listener when our editor is closed.
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		// Receive message from the webview.
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
		console.log("show file click", fileName, uri);
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
		console.log("update file send", uri);
		const updatedfile = readParsonFileToString(uri, this.workspaceroot);
		console.log(updatedfile);
		let sendMessage = this.postMessage.get(uri);
		if(sendMessage){
			sendMessage({type: "update", text: updatedfile});
		}
	}

	private removeAnswer(snippetId: string, document: vscode.TextDocument){
		const parson: SavedExerciseAnswer = this.getDocumentAsSavedExerciseAnswer(document);
		parson.answers = parson.answers.filter(answer => answer.snippet.id !== Number(snippetId));
		if(parson.customSnippets){
			parson.customSnippets = parson.customSnippets.filter(snip => snip.id !== Number(snippetId));
		}
		console.log(parson.answers, snippetId);
		this.updateParsonDefFile(document, parson);
	}

	private addAnswer(answer: Answer, document: vscode.TextDocument){
		const parson: SavedExerciseAnswer = this.getDocumentAsSavedExerciseAnswer(document);
		console.log(parson.answers);
		if(answer.snippet.id === -1){
			if(!parson.customSnippets){
				parson.customSnippets = [];
			}
			const prevSnippet = parson.answers.find(an => an.gap.id === answer.gap.id)?.snippet;
			let nextId = 1000;
			if(prevSnippet){
				parson.customSnippets = parson.customSnippets.filter(snip => snip.id !== prevSnippet.id);
				nextId = prevSnippet.id;
			}else{
				parson.customSnippets.forEach(snip => {nextId = snip.id > nextId ? snip.id : nextId;});
				nextId++;
			}
			parson.answers = parson.answers.filter(a => a.gap.id !== answer.gap.id);
			answer.snippet.id = nextId;
			parson.customSnippets.push(answer.snippet);
		}else{
			const otherSnippet = parson.answers.find(an => an.gap.id === answer.gap.id)?.snippet;
			const otherGap = parson.answers.find(an => an.snippet.id === answer.snippet.id)?.gap;
			parson.answers = parson.answers.filter(a => a.gap.id !== answer.gap.id && a.snippet.id !== answer.snippet.id);
			if(otherSnippet && otherGap){
				parson.answers.push({snippet: otherSnippet, gap: otherGap});
			}
		}
		parson.answers.push(answer);
		console.log(parson.answers, answer);
		this.updateParsonDefFile(document, parson);
	}

	private getDocumentAsSavedExerciseAnswer(document: vscode.TextDocument): SavedExerciseAnswer{
		return JSON.parse(document.getText()) as SavedExerciseAnswer;
	}

	private updateParsonDefFile(document: vscode.TextDocument, json: SavedExerciseAnswer){
		const edit = new vscode.WorkspaceEdit();
		//console.log(document.uri);
		//console.log(path.normalize(document.uri.fsPath), path.normalize(this.workspaceroot));
		const fileUri = document.uri.fsPath.substring(this.workspaceroot.length+1);
		//console.log(fileUri, this.currentFileMap);
		const parsonUri = vscode.Uri.parse(`parson:${path.join(fileUri, this.currentFileMap[fileUri] || "")}`);
		//console.log(parsonUri);
		this.decorator.fileChangeEmitter.fire(parsonUri);
		edit.replace(document.uri, new vscode.Range(0,0,document.lineCount, 0), JSON.stringify(json, null, 4));
		vscode.workspace.applyEdit(edit);
	}

    private getHtmlForWebview(webview: vscode.Webview): string {
		// Local path to script and css for the webview
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