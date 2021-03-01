import {Exercise, Gap, Fetcher} from "../model";
import {getNonce, parseExercise} from "../util";
import "./ParsonViewer.less";
import "./highlight.less";
import * as highlight from 'highlight.js';

export default class ParsonViewer{
    private fetcher: Fetcher;
    constructor(fetcher: Fetcher){
        this.fetcher = fetcher;
    }
    
    code: HTMLElement = document.getElementById("code")!!;
    snippets: HTMLElement = document.getElementById("snippets")!!;
    errorContainer: HTMLElement = document.getElementById("error")!!;
    

    message(message: {type: string, text: string}): void{
        this.fetcher.log("message received: "+JSON.stringify(message));
        switch (message.type) {
			case 'update':
				const text = message.text;
				this.updateContent(text);
				return;
		}
    }

    updateContent(text: string) {
		let exercise: Exercise;
		try {
			exercise = parseExercise(text);
		} catch(error: any) {
			this.code.style.display = 'none';
			this.errorContainer.innerText = 'Error: '+error.message;
			//this.errorContainer.style.display = '';
			return;
		}
		//this.code.style.display = '';
		//this.errorContainer.style.display = 'none';

		// Render the code
		this.code.innerHTML = '';
		for (const file of exercise.files || []) {
            const highlightedCode = highlight.highlight("java", file.text, true);
            const element = document.createElement('div');
            element.className = 'file';
			this.code.appendChild(element);
            let innerHTML = highlightedCode.value;
            file.gaps.forEach(gap => {
                this.fetcher.log(gap.id);
                innerHTML = innerHTML.replace(`$parson{${gap.id}}`, this.createGapObject(gap));
            });
            this.fetcher.log(innerHTML);
            element.innerHTML = innerHTML;
		}

        this.snippets.innerHTML = "";
        for(const snip of exercise.snippets){
            let el = document.createElement("div");
            el.className = "snippet";
            el.textContent = snip.text;
            this.snippets.appendChild(el);
        }
	}

    createGapObject(gap: Gap){
        let a =  `<span class="gap width-${gap.width}"></span>`;
        this.fetcher.log(a);
        return a;
    }

    createCodeLineSegment(line: string){
        const textContent = document.createElement('span');
        textContent.innerText = line;
        textContent.className = "codeline";
        return textContent;
    }
    
}



