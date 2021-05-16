import {Exercise, ExerciseAnswer, Gap, Fetcher, Highlighter, Snippet, Answer, GapWithText} from "../../model";
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
        const gapFinder = new RegExp("\\s*\\/\\*\\s*\\$parson\\s*\\{.+?\\}\\s*\\*\\/", "gs",);
		for (const file of exercise.files) {
            if(!this.shownFile){
                this.showFile(file.name);
            }
            const extraction = file.text.match(gapFinder);
            //this.fetcher.log(file.text);
            if(extraction){
                extraction
                    .reverse()
                    .map(comment => {
                        return {
                            jsonString: comment.substring(comment.indexOf("{"), comment.lastIndexOf("}")+1),
                            index: file.text.indexOf(comment)
                        };})
                    .map(data => {
                        return {
                            gap: JSON.parse(data.jsonString) as GapWithText,
                            index: data.index
                        };})
                    .forEach(data => {
                        file.text = this.replaceMostRecent(file.text, data.gap.text, `/*${data.gap.id}*/`, data.index); //should search upwards
                    });
                extraction.forEach(comment => {
                    const index = file.text.indexOf(comment);
                    file.text = file.text.slice(0, index)+file.text.slice(index+comment.length);
                });
            }
            let highlightedCode = this.highlighter.addHighlighting("java", file.text);
            //this.fetcher.log(highlightedCode);
            
            const element = document.createElement('div');
            element.className = 'file';
            element.id = `exercise-file-${file.name}`;
			this.code.appendChild(element);
            let innerHTML = highlightedCode;
            //this.fetcher.log(highlightedCode);
            //this.fetcher.log(innerHTML);
            file.gaps.forEach(gap => {
                //this.fetcher.log(gap.id);
                innerHTML = innerHTML.replace(new RegExp(`(<span class="hljs-comment">)?\\/\\*(<span class="hljs-title">)?${gap.id}(</span>)?\\*\\/(</span>)?`), this.createGapObject(gap));
            });
            element.innerHTML = innerHTML;
            file.gaps
                .filter(gap => gap.type === "write")
                .forEach(gap => {
                    const el: HTMLInputElement= document.getElementById(`gap-${gap.id}`) as HTMLInputElement;
                    const submit = (ev: FocusEvent|KeyboardEvent) => {
                        if(el.value){
                            this.fetcher.message({gap, snippet: {text: el.value, id: -1}}, "add answer");
                        }else if(el.dataset.snippetId){
                            this.fetcher.message(el.dataset.snippetId, "remove answer");
                        }
                    };
                    el.onblur = submit;
                    el.onkeydown = (ev: KeyboardEvent) => {
                        if (ev.key === "Enter"){
                            submit(ev);
                        }
                    };
                    el.onclick = (ev: MouseEvent) => {
                        el.classList.remove("gap-filled");
                    };
                });
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
                el.classList.add("gap-filled");
                el.innerText = answer.snippet.text;
                let snip = document.getElementById(`snippet-${answer.snippet.id}`);
                if(snip){
                    snip.style.display = "none";
                    el.dataset.snippetId = `${answer.snippet.id}`;
                }
                if(el.classList.contains("gap-write")){
                    const input: HTMLInputElement = el as HTMLInputElement;
                    input.value = answer.snippet.text;
                    input.dataset.snippetId = `${answer.snippet.id}`;
                }
            }
        }

        exercise.files.forEach(file => {
            file.gaps.forEach(gap => {
                let el = document.getElementById(`gap-${gap.id}`);
                if(el){
                    if(el?.dataset.snippetId && gap.type === "dragdrop"){
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

    private replaceMostRecent(text: string, searchValue: string, replaceValue: string, startIndex: number): string{
        //this.log(text, searchValue, replaceValue, ""+startIndex);
        let lastIndex = text.indexOf(searchValue);
        //this.log(""+lastIndex);
        while(lastIndex >= 0 && lastIndex < startIndex){
            //this.log(""+lastIndex);
            const index = text.indexOf(searchValue, lastIndex+1);
            if(index < startIndex && index >= 0){
                lastIndex = index;
            }else{
                break;
            }
        }
        const newText = text.substring(0, lastIndex) + replaceValue + text.substring(lastIndex+searchValue.length);
        //this.log(""+lastIndex, newText);
        return newText;
    }

    createGapObject(gap: Gap){
        switch(gap.type){
            case "dragdrop": return `<span id="gap-${gap.id}" class="gap gap-dragdrop width-${gap.width}"> </span>`;
            case "dropdown": return this.createDropDownGap(gap);
            case "write": return `<input id="gap-${gap.id}" class="gap gap-write width-${gap.width}"> </input>`;
        }
    }
    createDropDownGap(gap: Gap){
        return `<select id=${gap.id}>`;
    }

    createCodeLineSegment(line: string){
        const textContent = document.createElement('span');
        textContent.innerText = line;
        textContent.className = "codeline";
        return textContent;
    }

    private log(...it: Array<string | object>){
        it.forEach(it => this.fetcher.log(it));
    }
    
}



