export interface Exercise{
    name: string
    snippets: Array<Snippet>
    files: Array<ExerciseFile>
}

export interface ExerciseFile{
    text: string
    name: string
    gaps: Array<Gap>
}

export interface Snippet{
    text: string,
    id: number
}

export interface Gap{
    id: string
    width: number
    type: "dragdrop" | "dropdown" | "write"
}

export interface Answer{
    gap: Gap
    snippet: Snippet
}

export interface SavedExerciseAnswer{
    //customSnippets: Array<Snippet>
    parsonDef: Exercise | string
    answers: Array<Answer>
}

export interface ExerciseAnswer{
    //customSnippets: Array<Snippet>
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
        parsondef: string
    }
    name: string
    filename?: string
    includesSolution?: boolean
}

export interface GapDirectory{
    [key:string]: Array<Gap>
}

export interface Fetcher{
    log: (data: string | object) => void
    message: (data: string | object, type?: string) => void
}

export interface Highlighter{
    addHighlighting: (lang: string, text: string) => string
}
