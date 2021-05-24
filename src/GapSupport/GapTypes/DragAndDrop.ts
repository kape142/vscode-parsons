import { Answer, Snippet } from "../../model";
import { extractSnippetsFromGap, generateNonce, textToNewSnippet } from "../../util";
import { CompiledGap, GapType, UncompiledGap } from "../GapModel";

export const dragDrop: GapType = {
    compile(gap: UncompiledGap){
        if(gap.type !== "dragdrop"){
            throw new Error(`Gap of type "${gap.type}" sent to DragDropCompiler`);
        }
        const snippets = extractSnippetsFromGap(gap);
        console.log(snippets);
        return {
            gap: {
                id: generateNonce(),
                width: gap.width,
                type: gap.type
            },
            snippets
        };
    },
    createHtmlGapObject(gap: CompiledGap): string{
        return `<span id="gap-${gap.id}" class="gap gap-dragdrop width-${gap.width}"> </span>`;
    },
    applyHtmlElementBehaviour(gap: CompiledGap, el: HTMLElement, message: (data: string | object, type?: string) => void): void{
        if(el.dataset.snippet){
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
            const snippetJson = ev.dataTransfer?.getData("text/plain");
            if(snippetJson){
                const snip = JSON.parse(snippetJson) as Snippet;
                let answer: Answer = {gap: gap, snippet: snip};
                console.log(answer);
                message(answer, "log");
                message(answer, "add answer");
            }
        };
        el.ondragstart = (ev: DragEvent) => {
            if(el?.dataset.snippet){
                ev.dataTransfer?.setData("text/plain", el.dataset.snippet);
            }
        };
    },
    loadAnswerToHtmlElement(answer: Answer, el: HTMLElement): void{
        el.innerText = answer.snippet.text;
    }
};