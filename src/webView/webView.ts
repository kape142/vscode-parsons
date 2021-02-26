import { ThemeIcon } from 'vscode';
import ParsonViewer from './ParsonViewer/ParsonViewer';

// @ts-ignore
const vscode = acquireVsCodeApi();

function log(data: string | object){
    vscode.postMessage({type: "debug", text: data});
}

let parsonViewer : ParsonViewer;

parsonViewer = new ParsonViewer({
    log,
    post: (data) => vscode.postMessage({type: "message", text: data})
});

window.addEventListener('message', event => {
    const message = event.data; // The json data that the extension sent
    log("message event: " +JSON.stringify(message));
    parsonViewer.message(message);

    switch (message.type) {
        case 'update':
            vscode.setState({ text: message.text });
            return;
    }
    
});


log({message: "abi"});

const state = vscode.getState();
	if (state) {
        log("state: "+ JSON.stringify(state));
		parsonViewer.message({type: "update", text: state.text});
	}