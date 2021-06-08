import { Answer, Snippet } from "../../model";
import { generateNonce } from "../../util";
import { CompiledGap, GapType, UncompiledGap } from "../GapModel";
import "./Write.less";

export const write: GapType = {
    compile(gap: UncompiledGap){
        if(gap.type !== "write"){
            throw new Error(`Gap of type "${gap.type}" sent to WriteCompiler`);
        }
        return {
            gap: {
                id: generateNonce(),
                width: gap.width,
                type: gap.type
            }
        };
    },
    createHtmlGapObject(gap: CompiledGap): string{
        return `<input type="text" id="gap-${gap.id}" class="gap gap-write width-${gap.width}"> </input>`;
    },
    applyHtmlElementBehaviour(gap: CompiledGap, el: HTMLElement, message: (data: string | object, type?: string) => void): void{
        const input: HTMLInputElement= el as HTMLInputElement;
        const submit = (ev: FocusEvent|KeyboardEvent) => {
            if(input.value){
                message({gap, snippet: {text: input.value, id: ""}}, "add answer");
            }else if(input.dataset.snippet){
                const snip = JSON.parse(input.dataset.snippet) as Snippet;
                message(snip.id, "remove answer");
            }
        };
        input.onblur = submit;
        input.onkeydown = (ev: KeyboardEvent) => {
            if (ev.key === "Enter"){
                submit(ev);
            }
        };
        input.onclick = (ev: MouseEvent) => {
            input.classList.remove("gap-filled");
        };
        input.ondrop = (ev: DragEvent) => {
            ev.preventDefault();
        };
        input.ondragover = (ev: DragEvent) => {
            ev.preventDefault();
            if(ev.dataTransfer){
                ev.dataTransfer.dropEffect = "none";
            }
        };
    },
    loadAnswerToHtmlElement(answer: Answer, el: HTMLElement): void{
        const input: HTMLInputElement = el as HTMLInputElement;
        input.value = answer.snippet.text;
        input.dataset.snippet = JSON.stringify(answer.snippet);
    }
};