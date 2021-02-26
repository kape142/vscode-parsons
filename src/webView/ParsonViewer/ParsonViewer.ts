import Fetcher from "../Fetcher";
import {Exercise} from "../model";
import "./ParsonViewer.less";

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
			exercise = JSON.parse(text);
		} catch {
			this.code.style.display = 'none';
			this.errorContainer.innerText = 'Error: Document is not valid json for an exercise';
			this.errorContainer.style.display = '';
			return;
		}
		this.code.style.display = '';
		this.errorContainer.style.display = 'none';

		// Render the code
		this.code.innerHTML = '';
        this.fetcher.log(exercise);
		for (const file of exercise.files || []) {
            const element = document.createElement('div');
            element.className = 'file';
			this.code.appendChild(element);

            const text = document.createElement('div');
			text.className = 'java';
            const lines = file.text.split("\n");
            for(const i in lines){
                const line = lines[i]+"\n";
                const mangler = file.gaps.filter(m => Number(m.line) === Number(i)+1);
                if(mangler.length > 0){
                    let prev = 0;
                    for(const m of mangler){
                        text.appendChild(this.createCodeLineSegment(line.slice(prev, m.position)));
                        prev = m.position;
                        let mangel = document.createElement("span");
                        mangel.className = "mangel";
                        mangel.style.width = `${m.width*5}px`;
                        text.appendChild(mangel);
                    }
                    text.appendChild(this.createCodeLineSegment(line.slice(prev)));
                }else{
                    text.appendChild(this.createCodeLineSegment(line));
                }
            }
            element.appendChild(text);

		}

        this.snippets.innerHTML = "";
        for(const snip of exercise.snippets){
            this.fetcher.log(snip);
            let el = document.createElement("div");
            el.className = "snippet";
            el.textContent = snip.text;
            this.snippets.appendChild(el);
        }
	}

    createCodeLineSegment(line: string){
        const textContent = document.createElement('span');
        textContent.innerText = line;
        textContent.className = "codeline";
        return textContent;
    }
    
}



