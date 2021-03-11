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
    if(typeof parsed.exercise === "string"){
        const filename = path.join(extensionPath, '.parson', `${parsed.exercise}.parsondef`);
        if(fileExists(filename)){
            const fileRead = readFileSync(filename, 'utf-8');
            console.log("read:", fileRead);
            parsed.exercise = JSON.parse(fileRead);
        }
    }
    return JSON.stringify(parsed);
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