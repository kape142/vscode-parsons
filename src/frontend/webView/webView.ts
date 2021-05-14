import { ThemeIcon } from 'vscode';
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
    const message = event.data; // The json data that the extension sent
    //fetcher.log("message event: " +JSON.stringify(message));
    parsonViewer.message(message);

    switch (message.type) {
        case 'update':
            vscode.setState({ text: message.text });
            return;
    }
    
});


const state = vscode.getState();
	if (state) {
        //fetcher.log("state: "+ JSON.stringify(state));
		parsonViewer.message({type: "update", text: state.text});
	}