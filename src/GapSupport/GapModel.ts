import { Answer, Snippet } from "../model";

export type Gap = UncompiledGap | CompiledGap;

interface AbstractGap{
    width: number
    options?: Array<string>
    startIndex?: number
}

interface GapWithId extends AbstractGap{
    id: string
}

interface GapWithText extends AbstractGap{
    text: string
}

export interface DragDropGap{
    type: "dragdrop"
}


export interface DropdownGap{
    type: "dropdown"
}

export interface DropdownDefGap{
    type: "dropdownDef"
}

interface WriteGap{
    type: "write"
}


export interface UncompiledDropdownGap extends DropdownGap{
    dropdown: string
}

export interface UncompiledDropdownDefGap extends DropdownDefGap{
    dropdown: string
}

export type UncompiledGap = GapWithText & (DragDropGap | WriteGap | UncompiledDropdownDefGap | UncompiledDropdownGap);

export type CompiledGap = GapWithId & (DragDropGap | WriteGap | DropdownGap);


export interface GapType{
    /**
     * 
     * @param gap 
     * @param gapList 
     * @returns 
     */
    compile(gap: UncompiledGap, gapList?: Array<UncompiledGap>): {gap: CompiledGap, snippets?: Array<Snippet>}
    createHtmlGapObject(gap: CompiledGap): string
    applyHtmlElementBehaviour(gap: CompiledGap, el: HTMLElement, message: (data: string | object, type?: string) => void): void
    loadAnswerToHtmlElement(answer: Answer, el: HTMLElement): void
}