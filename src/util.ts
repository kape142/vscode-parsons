import { CompiledGap, Gap, UncompiledGap } from "./GapSupport/GapModel";
import { Exercise, ExerciseFile, Snippet, ExerciseAnswer } from "./model";

export let nonce = generateNonce(32);


export function generateNonce(length: number = 12){
    let n = "";
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < length; i++) {
        n += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return n;
}

/* TODO:
 * Validate answers
 */
export function parseExerciseAnswer(text: string): ExerciseAnswer{
    const parsed: ExerciseAnswer = JSON.parse(text);
    verifyExercise(parsed.exercise);
    return parsed;
}


/* TODO:
 * Validate that all gap ids are unique
 * Validate that all gap ids are present in the code and vice versa
 * Update with model changes
 * Use more often
 */
export function parseExercise(text: string): Exercise{
    const parsed: Exercise = JSON.parse(text);
    verifyExercise(parsed);
    return parsed;
}

export function verifyExercise(exercise: Exercise){
    try{
        if(exercise === undefined){
            throw new Error("Exercise object is not defined");
        }
        verifyString(exercise.name, `name: "${exercise.name}`);
        if(exercise.snippets === undefined){
            throw new Error("snippets of Exercise object is not defined");
        }
        exercise.snippets.forEach(snippet=>verifySnippet(snippet));
        if(exercise.files === undefined){
            throw new Error("files of Exercise object is not defined");
        }
        exercise.files.forEach(file=>verifyExerciseFile(file));
    }catch(error: any){
        throw new Error("Exercise object is not valid:\n"+error.message);
    }
    
}

export function verifyExerciseFile(exerciseFile: ExerciseFile){
    try{
        if(exerciseFile === undefined){
            throw new Error("ExerciseFile object is not defined");
        }
        verifyString(exerciseFile.text, `text: "${exerciseFile.text}`);
        verifyString(exerciseFile.name, `name: "${exerciseFile.name}`);
        exerciseFile.gaps.forEach(gap=>verifyGap(gap));
    }catch(error: any){
        throw new Error("ExerciseFile object is not valid:\n"+error.message);
    }
}

export function verifySnippet(snippet: Snippet){
    try{
        if(snippet === undefined){
            throw new Error("Snippet object is not defined");
        }
        verifyString(snippet.text, `text: "${snippet.text}`);
    }catch(error: any){
        throw new Error("Snippet object is not valid:\n"+error.message);
    }
}

export function verifyGap(gap: CompiledGap){
    try{
        if(gap === undefined){
            throw new Error("Gap object is not defined");
        }
        verifyString(gap.id, `id: "${gap.id}"`, {notOnlyNumbers: true, noSpaces: true});
        if(gap.width === undefined ||  gap.width <= 0){
            throw new Error("width of Gap is not a positive number");
        }
        if(gap.width > 100){
            throw new Error("width of Gap is too large (>100)");
        }
    }catch(error: any){
        throw new Error("Gap object is not valid:\n"+error.message);
    }
}

export function verifyString(string: string, details: string, options: StringOptions = {}){
    if(string === undefined){
        throw new Error(`string ${details} is not defined`);
    }
    if(string.trim().length <= 0){
        throw new Error(`string ${details} is empty`);
    }
    if(options.noSpaces && /\s/.test(string)){
        throw new Error(`string ${details} contains whitespace`);
    }
    if(options.notOnlyNumbers && !/[A-z]/.test(string)){
        throw new Error(`string ${details} consists of only numbers`);
    }
}

interface StringOptions{
    notOnlyNumbers?: boolean
    noSpaces?: boolean
}

export function textToNewSnippet(text: string): Snippet{
    return {
        text,
        id: generateNonce()
    };
}

export function extractSnippetsFromGap(gap: UncompiledGap): Array<Snippet>{
    const snippets = [{
        text: gap.text,
        id: generateNonce()
    }];
    if(gap.options){
        snippets.push(...gap.options.map(textToNewSnippet));
    }
    return snippets.sort((a,b)=> a.id.localeCompare(b.id));
}
