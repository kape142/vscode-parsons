import {Exercise, ExerciseAnswer, Gap, Fetcher, Highlighter, Snippet, Answer} from "../../model";
import {parseExerciseAnswer, ElementMap} from "../../util";
import "./ParsonViewer.less";

export default class ParsonViewer{
    private fetcher: Fetcher;
    private highlighter: Highlighter;
    constructor(fetcher: Fetcher, highlighter: Highlighter){
        this.fetcher = fetcher;
        this.highlighter = highlighter;
    }
    
    code: HTMLElement = document.getElementById("code")!!;
    snippets: HTMLElement = document.getElementById("snippets")!!;
    errorContainer: HTMLElement = document.getElementById("error")!!;

    shownFile?: string;

    

    snippetMap: {[key: string]: Snippet} = {};
    

    message(message: {type: string, text: string}): void{
        //this.fetcher.log("message received: "+JSON.stringify(message));
        switch (message.type) {
			case 'update':
				const text = message.text;
				this.updateContent(text);
				return;
            case 'show file':
                const filename = message.text;
                this.showFile(filename);
                return;
		}
    }
    
    showFile(filename: string){
        this.fetcher.log("show: "+filename);
        document.getElementById(`exercise-file-${this.shownFile}`)?.classList.remove("file-show");
        document.getElementById(`exercise-file-${filename}`)?.classList.add("file-show");
        this.shownFile = filename;
    }

    updateContent(text: string) {
		let exerciseAnswer: ExerciseAnswer;
		try {
			exerciseAnswer = parseExerciseAnswer(text);
		} catch(error: any) {
			this.code.style.display = 'none';
			this.errorContainer.innerText = 'Error: '+error.message;
			this.errorContainer.style.display = '';
			return;
		}
        const exercise = exerciseAnswer.exercise;
		this.code.style.display = '';
		this.errorContainer.style.display = 'none';

		// Render the code
		this.code.innerHTML = '';
		for (const file of exercise.files) {
            if(!this.shownFile){
                this.showFile(file.name);
            }
            file.gaps.forEach(gap => {
                //this.fetcher.log(gap.id);
                file.text = file.text.replace(new RegExp(`(<.*>)?\\$(<.*>)?parson(<.*>)?{(<.*>)?${gap.id}(<.*>)?}`), `/*${gap.id}*/`);
            });
            //this.fetcher.log(file.text);
            const highlightedCode = this.highlighter.addHighlighting("java", file.text);
            const element = document.createElement('div');
            element.className = 'file';
            element.id = `exercise-file-${file.name}`;
			this.code.appendChild(element);
            let innerHTML = highlightedCode;
            //this.fetcher.log(highlightedCode);
            file.gaps.forEach(gap => {
                //this.fetcher.log(gap.id);
                innerHTML = innerHTML.replace(new RegExp(`(<span class="hljs-comment">)?\\/\\*(<span class="hljs-title">)?${gap.id}(</span>)?\\*\\/(</span>)?`), this.createGapObject(gap));
            });
            //this.fetcher.log(innerHTML);
            element.innerHTML = innerHTML;
		}

        this.snippets.innerHTML = "";
        for(const snip of exercise.snippets){
            let el = document.createElement("div");
            el.id = `snippet-${snip.id}`;
            el.className = "snippet";
            el.textContent = snip.text;
            /*el.onclick = (event)=>{
                if(this.selectedSnippet){
                    this.snippetMap[this.selectedSnippet.id].classList.remove("snippet-selected");
                    if(this.selectedSnippet.text === snip.text){
                        this.selectedSnippet = undefined;
                        return;
                    }
                }
                this.selectedSnippet = snip;
                el.classList.add("snippet-selected");
            };*/
            el.draggable = true;
            el.ondragstart = (ev: DragEvent) => {
                ev.dataTransfer?.setData("text/plain", `${snip.id}`);
            };
            this.snippets.appendChild(el);
            this.snippetMap[snip.id] = snip;
        }
        
        //this.fetcher.log(exerciseAnswer);
        for(const answer of exerciseAnswer.answers){
            let el = document.getElementById(`gap-${answer.gap.id}`);
            if(el){
                let snip = document.getElementById(`snippet-${answer.snippet.id}`);
                if(snip){
                    snip.style.display = "none";
                    el.classList.add("filled");
                    el.innerText = answer.snippet.text;
                    el.dataset.snippetId = `${answer.snippet.id}`;
                }
            }
        }

        exerciseAnswer.exercise.files.forEach(file => {
            file.gaps.forEach(gap => {
                let el = document.getElementById(`gap-${gap.id}`);
                if(el){
                    if(el?.dataset.snippetId){
                        el.draggable = true;
                    }
                    el.ondragover = (ev: DragEvent) => {
                        ev.preventDefault();
                        if(ev.dataTransfer){
                            ev.dataTransfer.dropEffect = "move";
                        }
                    };
                    el.ondrop = (ev: DragEvent) => {
                        ev.preventDefault();
                        const snippetId = ev.dataTransfer?.getData("text/plain");
                        if(snippetId){
                            let answer: Answer = {gap: gap, snippet: this.snippetMap[snippetId]};
                            this.fetcher.message(answer, "add answer");
                        }
                    };
                    el.ondragstart = (ev: DragEvent) => {
                        if(el?.dataset.snippetId){
                            ev.dataTransfer?.setData("text/plain", el.dataset.snippetId);
                        }
                    };
                    /*el.onclick = (event) => {
                        if(el?.innerText.trim() !== ""){
                            this.fetcher.message(gap.id, "remove answer");
                        }
                        if(this.selectedSnippet){
                            let answer: Answer = {gap: gap, snippet: this.selectedSnippet};
                            this.fetcher.message(answer, "add answer");
                            this.selectedSnippet = undefined;
                        }
                    };*/
                }
            });
        });

        this.snippets.ondragover = (ev: DragEvent) => {
            ev.preventDefault();
            if(ev.dataTransfer){
                ev.dataTransfer.dropEffect = "move";
            }
        };
        this.snippets.ondrop = (ev: DragEvent) => {
            ev.preventDefault();
            const snippetId = ev.dataTransfer?.getData("text/plain");
            if(snippetId){
                this.fetcher.message(snippetId, "remove answer");
            }
        };

        document.getElementById(`exercise-file-${this.shownFile}`)?.classList.add("file-show");
	}

    createGapObject(gap: Gap){
        let a =  `<span id="gap-${gap.id}" class="gap width-${gap.width}"> </span>`;
        //this.fetcher.log(a);
        return a;
    }

    createCodeLineSegment(line: string){
        const textContent = document.createElement('span');
        textContent.innerText = line;
        textContent.className = "codeline";
        return textContent;
    }
    
}



