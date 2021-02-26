import { Exercise, ExerciseFile, Gap, Snippet } from "./model";

export function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

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
        verifyString(exercise.name);
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
        verifyString(exerciseFile.text);
        verifyString(exerciseFile.name);
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
        verifyString(snippet.text);
    }catch(error: any){
        throw new Error("Snippet object is not valid:\n"+error.message);
    }
}

export function verifyGap(gap: Gap){
    try{
        if(gap === undefined){
            throw new Error("Gap object is not defined");
        }
        if(gap.line < 0){
            throw new Error("line of Gap is below zero");
        }
        if(gap.position < 0){
            throw new Error("position of Gap is below zero");
        }
        if(gap.width <= 0){
            throw new Error("width of Gap is below or equal to zero");
        }
    }catch(error: any){
        throw new Error("Gap object is not valid:\n"+error.message);
    }
}

export function verifyString(string: string){
    if(string === undefined){
        throw new Error("string object is not defined");
    }
    if(string.trim().length <= 0){
        throw new Error("string is empty");
    }
}


