import * as vscode from 'vscode';
import { CompiledGap } from './GapSupport/GapModel';

export interface Exercise{
    name: string
    snippets: Array<Snippet>
    files: Array<ExerciseFile>
    runnable?: boolean,
    output?: string,
    entryPoint?: string
}

export interface ExerciseFile{
    text: string
    name: string
    gaps: Array<CompiledGap>
}

export interface Snippet{
    text: string,
    id: string
}

export interface Answer{
    gap: CompiledGap
    snippet: Snippet
}

export interface SavedExerciseAnswer{
    parsonDef: Exercise | string
    answers: Array<Answer>
}

export interface ExerciseAnswer{
    exercise: Exercise
    answers: Array<Answer>
}

export interface SnippetDirectory{
    dragdrop: Array<string>
    dropdown: {
        [key:string]: Array<string>
    }
}

export interface ParsonConfig{
    output: {
        parson: string
        parsondef: string,
        code?: string
    }
    name: string
    filename?: string
    includesSolution?: boolean,
    runnable?: boolean,
    entryPoint?: string
}

export interface GapDirectory{
    [key:string]: Array<CompiledGap>
}

export interface DisposableWrapper<T>{
    it : T
    disposable: vscode.Disposable
}

export interface CodeLine{
    text: string,
    lineNumber: number
}

export interface Fetcher{
    log: (data: string | object) => void
    message: (data: string | object, type?: string) => void
}

export interface Highlighter{
    addHighlighting: (lang: string, text: string) => string
}