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
    text: string
}

export interface Gap{
    id: string
    width: number
}

export interface Answer{
    gap: Gap
    snippet: Snippet
}

export interface SavedExerciseAnswer{
    //customSnippets: Array<Snippet>
    exercise: Exercise | string
    answers: Array<Answer>
}

export interface ExerciseAnswer{
    //customSnippets: Array<Snippet>
    exercise: Exercise
    answers: Array<Answer>
}

export interface Fetcher{
    log: (data: string | object) => void
    message: (data: string | object) => void
}

export interface Highlighter{
    addHighlighting: (lang: string, text: string) => string
}