import * as path from 'path';
import * as vscode from 'vscode';
import { getNonce } from './util';

export class ParsonViewerProvider implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new ParsonViewerProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(ParsonViewerProvider.viewType, provider);
		return providerRegistration;
	}

    private static readonly viewType = 'testExtension.parsonViewer';

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
        
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
		function updateWebview() {
			webviewPanel.webview.postMessage({
				type: 'update',
				text: document.getText(),
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
				case 'debug':
					console.log(e.text);
                    return;
			}
		});

		updateWebview();
        
	}
    private getHtmlForWebview(webview: vscode.Webview): string {
		// Local path to script and css for the webview
		const scriptUri = webview.asWebviewUri(vscode.Uri.file(
			path.join(this.context.extensionPath, 'dist', 'webView.js')
		));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.file(
			path.join(this.context.extensionPath, 'dist', 'webView.css')
		));

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

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