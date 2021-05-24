import { Answer, Snippet } from "../../model";
import { extractSnippetsFromGap, generateNonce, textToNewSnippet } from "../../util";
import { CompiledGap, GapType, UncompiledGap } from "../GapModel";

export const dropdown: GapType = {
    compile(gap: UncompiledGap, gapList: Array<UncompiledGap>){
        if(gap.type !== "dropdown" && gap.type !== "dropdownDef"){
            throw new Error(`Gap of type "${gap.type}" sent to DropdownCompiler`);
        }
        const options = extractSnippetsFromGap(gap).map(s => s.text);
        if(gap.type === "dropdown"){
            gapList
            .filter(g => g.type === "dropdownDef" && gap.dropdown.includes(g.dropdown))
            .forEach(g => {
                options.push(...extractSnippetsFromGap(g).map(s=>s.text).filter(t => !options.includes(t)));
            });
        }
        return {
            gap: {
                id: generateNonce(),
                width: gap.width,
                type: "dropdown",
                options: options.sort()
            }
        };
    },
    createHtmlGapObject(gap: CompiledGap): string{
        const options = [""].concat(gap.options!).map(option => `<option value=${option}>${option}</option>`).join("");
        return `<select id=gap-${gap.id} class="gap gap-dropdown width-${gap.width}">${options}</select>`;
    },
    applyHtmlElementBehaviour(gap: CompiledGap, el: HTMLElement, message: (data: string | object, type?: string) => void): void{
        const select: HTMLSelectElement = el as HTMLSelectElement;
        select.onchange = (ev: Event) => {
            if(select.value === ""){
                if(select.dataset.snippet){
                    const snip = JSON.parse(select.dataset.snippet) as Snippet;
                    message(snip.id, "remove answer");
                    select.classList.remove("gap-filled");
                }
            }else{
                message({gap, snippet: {text: select.value, id: ""}}, "add answer");
            }
        };
    },
    loadAnswerToHtmlElement(answer: Answer, el: HTMLElement): void{
        const input: HTMLSelectElement = el as HTMLSelectElement;
        input.value = answer.snippet.text;
        input.dataset.snippet = JSON.stringify(answer.snippet);
    }
};