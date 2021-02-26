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
    line: number
    position: number
    width: number
}