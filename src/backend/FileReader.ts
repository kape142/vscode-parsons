import * as path from 'path';
import {accessSync, constants, readFileSync} from 'fs';
import {SavedExerciseAnswer, ExerciseAnswer, Exercise} from '../model';
import { ExtensionContext } from 'vscode';
/* TODO:
 * Check for full path
 * (check for url)
 */

export function validateFile(text: string, extensionPath: string): string{
    const parsed: SavedExerciseAnswer = JSON.parse(text);
    if(typeof parsed.parsonDef === "string"){
        const filename = path.join(extensionPath, '.parson', `${parsed.parsonDef}.parsondef`);
        if(fileExists(filename)){
            const fileRead = readFileSync(filename, 'utf-8');
            console.log("read:", fileRead);
            const exerciseAnswer: ExerciseAnswer = {
                exercise: JSON.parse(fileRead),
                answers: parsed.answers       
            };
            return JSON.stringify(exerciseAnswer);
        }
    }
    return JSON.stringify(parsed);
}

export function getFilesFromText(text: string): string[]{
    const parsed: ExerciseAnswer = JSON.parse(text);
    return parsed.exercise.files.map(file => file.name);
}


function fileExists(path: string): boolean{
    let found: boolean = false;
    try{
        accessSync(path, constants.R_OK);
        found = true;
    }catch(err){
        found = false;
        console.log(err.message);
    }
    return found;
}