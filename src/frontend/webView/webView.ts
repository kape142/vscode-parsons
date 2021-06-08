import {Fetcher, Highlighter} from "../../model";
import ParsonViewer from '../ParsonViewer/ParsonViewer';
import Highlight from "../Highlight/Highlight";
import Fetch from '../Fetch/Fetch';

import "./vscode.less";
import "./reset.less";

// @ts-ignore
const vscode = acquireVsCodeApi();

const fetcher: Fetcher = new Fetch((type: string, text: string | object) => {
    vscode.postMessage({type: type, text: text});
});

const highlighter: Highlighter = new Highlight(fetcher);

const parsonViewer = new ParsonViewer(fetcher, highlighter);

window.addEventListener('message', event => {
    const message = event.data;
    parsonViewer.message(message);
    const state = vscode.getState() || {};
    switch (message.type) {
        case 'update':
            vscode.setState(Object.assign(state, {text: message.text}));
            return;
        case 'show file':
            vscode.setState(Object.assign(state, {showFile: message.text}));
    }
    
});


const state = vscode.getState();
	if (state) {
		parsonViewer.message({type: "update", text: state.text});
		parsonViewer.message({type: "show file", text: state.showFile});
	}