import { CompiledGap } from "../../GapSupport/GapModel";
import { applyHtmlElementBehaviour, createHtmlGapObject, loadAnswerToHtmlElement } from "../../GapSupport/GapTypeHelper";
import { fileNameToLanguage } from "../../LanguageSupport/LanguageHelper";
import {ExerciseAnswer, Fetcher, Highlighter, Snippet} from "../../model";
import { parseExerciseAnswer} from "../../util";
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

		this.code.innerHTML = '';
        for (const file of exercise.files) {
            if(!this.shownFile){
                this.showFile(file.name);
            }
            let highlightedCode = this.highlighter.addHighlighting(fileNameToLanguage(file.name), file.text);

            const element = document.createElement('div');
            element.className = 'file';
            element.id = `exercise-file-${file.name}`;
			this.code.appendChild(element);
            let innerHTML = highlightedCode;
            
            file.gaps.forEach(gap => {
                innerHTML = innerHTML.replace(gap.id, this.createGapObject(gap));
            });
            element.innerHTML = innerHTML;
		}

        this.snippets.innerHTML = "";
        for(const snip of exercise.snippets){
            let el = document.createElement("div");
            el.id = `snippet-${snip.id}`;
            el.className = "snippet";
            el.textContent = snip.text;
            el.draggable = true;
            el.ondragstart = (ev: DragEvent) => {
                ev.dataTransfer?.setData("text/plain", JSON.stringify(snip));
            };
            this.snippets.appendChild(el);
            this.snippetMap[snip.id] = snip;
        }
        
        for(const answer of exerciseAnswer.answers){
            let el = document.getElementById(`gap-${answer.gap.id}`);
            if(el){
                loadAnswerToHtmlElement(answer, el);
                el.classList.add("gap-filled");
                let snip = document.getElementById(`snippet-${answer.snippet.id}`);
                if(snip){
                    snip.style.display = "none";
                    el.dataset.snippet = JSON.stringify(answer.snippet);
                }
            }
        }

        exercise.files.forEach(file => {
            file.gaps.forEach(gap => {
                let el = document.getElementById(`gap-${gap.id}`)!;
                applyHtmlElementBehaviour(gap, el, (data: string | object, type?: string)=>{this.fetcher.message(data, type);});
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
            const snippetJson = ev.dataTransfer?.getData("text/plain");
            if(snippetJson){
                const snip = JSON.parse(snippetJson) as Snippet;
                this.fetcher.message(`${snip.id}`, "remove answer");
            }
        };

        document.getElementById(`exercise-file-${this.shownFile}`)?.classList.add("file-show");
	}

    createGapObject(gap: CompiledGap){
        return createHtmlGapObject(gap);
    }

    private log(...it: Array<string | object>){
        it.forEach(it => this.fetcher.log(it));
    }
    
}



