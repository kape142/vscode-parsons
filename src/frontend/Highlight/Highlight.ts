import "./highlight.less";
import {Fetcher, Highlighter} from '../../model';
import * as highlight from 'highlight.js';

export default class Highlight implements Highlighter{
    private fetcher: Fetcher;
    constructor(fetcher: Fetcher){
        this.fetcher = fetcher;
    }

    addHighlighting(lang: string, text: string){
        try{
            const highlightResult = highlight.highlight(lang, text, true);
            return highlightResult.value;
        }catch(error){
            this.fetcher.log(error);
            return `Error: ${error}`;
        }
        
    }
}