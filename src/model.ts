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

export interface Fetcher{
    log: (data: string | object) => void
    post: (data: string | object) => void
}