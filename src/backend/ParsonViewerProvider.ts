import * as path from 'path';
import * as vscode from 'vscode';
import { nonce } from '../util';
import { loadExercises, getFilesFromText } from './FileReader';
import { SavedExerciseAnswer, Answer} from '../model';


export class ParsonViewerProvider implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): {providerRegistration: vscode.Disposable, provider: ParsonViewerProvider} {
		const provider = new ParsonViewerProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(ParsonViewerProvider.viewType, provider);
		return {providerRegistration, provider};
	}

    private static readonly viewType = 'testExtension.parsonViewer';
	private currentFile?: string;
	private postMessage: Map<string, (message?: {type: string, text: string}) => void> = new Map();

    constructor(
		private readonly context: vscode.ExtensionContext
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
		
		const identifier = document.fileName.substr(vscode.workspace.workspaceFolders![0].uri.fsPath.length+1);
		this.postMessage.set(identifier, a=> webviewPanel.webview.postMessage(a));
        
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
		function updateWebview() {
			const text = loadExercises(document.getText(), vscode.workspace.workspaceFolders!![0].uri.fsPath);
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
					console.log(e.text);
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

	public showFile(fileName: string, uri: string){
		console.log("show file click", fileName, uri, this.currentFile);
		if(this.currentFile !== uri){
			vscode.commands.executeCommand("vscode.openWith", vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, uri), ParsonViewerProvider.viewType);
			this.currentFile = uri;
		}
		let sendMessage = this.postMessage.get(uri);
		if(sendMessage){
			sendMessage({type: "show file", text: fileName});
		}
	}

	private removeAnswer(gapId: string, document: vscode.TextDocument){
		const parsonDef: SavedExerciseAnswer = this.getDocumentAsSavedExerciseAnswer(document);
		parsonDef.answers = parsonDef.answers.filter(answer => answer.gap.id !== gapId);
		this.updateParsonDefFile(document, parsonDef);
	}

	private addAnswer(answer: Answer, document: vscode.TextDocument){
		const parsonDef: SavedExerciseAnswer = this.getDocumentAsSavedExerciseAnswer(document);
		parsonDef.answers.push(answer);
		this.updateParsonDefFile(document, parsonDef);
	}

	private getDocumentAsSavedExerciseAnswer(document: vscode.TextDocument): SavedExerciseAnswer{
		return JSON.parse(document.getText()) as SavedExerciseAnswer;
	}

	private updateParsonDefFile(document: vscode.TextDocument, json: SavedExerciseAnswer){
		const edit = new vscode.WorkspaceEdit();

		edit.replace(document.uri, new vscode.Range(0,0,document.lineCount, 0), JSON.stringify(json));

		return vscode.workspace.applyEdit(edit);
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
                <div id="snippets">a</div>
				<div id="error"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}