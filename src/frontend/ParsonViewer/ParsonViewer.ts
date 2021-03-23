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

    selectedSnippet?: Snippet;

    snippetMap: ElementMap = {};
    

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
		let exerciseAnswer: ExerciseAnswer;
		try {
			exerciseAnswer = parseExerciseAnswer(text);
		} catch(error: any) {
			this.code.style.display = 'none';
			this.errorContainer.innerText = 'Error: '+error.message;
			//this.errorContainer.style.display = '';
			return;
		}
        const exercise = exerciseAnswer.exercise;
		//this.code.style.display = '';
		//this.errorContainer.style.display = 'none';

		// Render the code
		this.code.innerHTML = '';
		for (const file of exercise.files) {
            const highlightedCode = this.highlighter.addHighlighting("java", file.text);
            const element = document.createElement('div');
            element.className = 'file';
			this.code.appendChild(element);
            let innerHTML = highlightedCode;
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
            el.onclick = (event)=>{
                if(this.selectedSnippet){
                    this.snippetMap[this.selectedSnippet.text].classList.remove("snippet-selected");
                    if(this.selectedSnippet.text === snip.text){
                        this.selectedSnippet = undefined;
                        return;
                    }
                }
                this.selectedSnippet = snip;
                el.classList.add("snippet-selected");
            };
            this.snippets.appendChild(el);
            this.snippetMap[snip.text] = el;
        }
        
        this.fetcher.log(exerciseAnswer);
        for(const answer of exerciseAnswer.answers){
            let el = document.getElementById(`gap-${answer.gap.id}`);
            if(el){
                this.snippetMap[answer.snippet.text].style.display = "none";
                el.classList.add("filled");
                el.innerText = answer.snippet.text;
            }
        }

        exerciseAnswer.exercise.files.forEach(file => {
            file.gaps.forEach(gap => {
                let el = document.getElementById(`gap-${gap.id}`);
                if(el){
                    el.onclick = (event) => {
                        if(el?.innerText.trim() !== ""){
                            this.fetcher.message(gap.id, "remove answer");
                        }
                        if(this.selectedSnippet){
                            let answer: Answer = {gap: gap, snippet: this.selectedSnippet};
                            this.fetcher.message(answer, "add answer");
                            this.selectedSnippet = undefined;
                        }
                    };
                }
            });
        });
	}

    createGapObject(gap: Gap){
        let a =  `<span id="gap-${gap.id}" class="gap width-${gap.width}"> </span>`;
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



