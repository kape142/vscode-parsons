import { Answer, Snippet } from "../model";
import { CompiledGap, Gap, GapType, UncompiledGap } from "./GapModel";
import { dragDrop } from "./GapTypes/DragAndDrop";
import { dropdown } from "./GapTypes/Dropdown";
import { write } from "./GapTypes/Write";

export function compileGaps(gaps: Array<UncompiledGap>): Array<{gap: CompiledGap, snippets?: Array<Snippet>, oldGap: UncompiledGap}>{
    return gaps.map(gap => compileGap(gap, gaps));
}

export function compileGap(gap: UncompiledGap, gapList: Array<UncompiledGap>): {gap: CompiledGap, snippets?: Array<Snippet>, oldGap: UncompiledGap}{
    const compileResult = getGapType(gap).compile(gap, gapList);
    return {
        gap: compileResult.gap,
        snippets: compileResult.snippets,
        oldGap: gap
    };
}

export function createHtmlGapObject(gap: CompiledGap): string{
    return getGapType(gap).createHtmlGapObject(gap);
}

export function applyHtmlElementBehaviour(gap: CompiledGap, el: HTMLElement, message: (data: string | object, type?: string) => void): void{
    getGapType(gap).applyHtmlElementBehaviour(gap, el, message);
}

export function loadAnswerToHtmlElement(answer: Answer, el: HTMLElement): void{
    getGapType(answer.gap).loadAnswerToHtmlElement(answer, el);
}

function getGapType(gap: Gap): GapType{
    switch(gap.type){
        case "dragdrop": return dragDrop;
        case "dropdown":
        case "dropdownDef": return dropdown;
        case "write": return write;
        default: throw new Error("Unsupported Gap : "+gap);
    }
}