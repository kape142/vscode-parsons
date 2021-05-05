import * as path from 'path';
import {accessSync, constants, readFileSync, readdirSync} from 'fs';
import {SavedExerciseAnswer, ExerciseAnswer, Exercise} from '../model';
import { workspace } from 'vscode';
/* TODO:
 * Check for full path
 * (check for url)
 */

export function readParsonFile(filename: string, workspaceroot: string): string{
    const filepath = path.join(workspaceroot, filename);
    console.log("readParsonFile", filepath);
    if(fileExists(filepath)){
        const text = readFileSync(filepath, 'utf-8');
        return loadExercises(text, workspaceroot);
    }
    return "";
}

export function loadExercises(text: string, workspaceroot: string): string{
    const parsed: SavedExerciseAnswer = JSON.parse(text);
    if(typeof parsed.parsonDef === "string"){
        const filename = path.join(workspaceroot, '.parson', `${parsed.parsonDef}.parsondef`);
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

export function getParsonFilesInFolder(filePath: string, previousPath?: string): string[]{
    if(fileExists(filePath)){
        const files = readdirSync(filePath);
        const subFolderFiles = files
            .filter(folderFilter)
            .map(folder => getParsonFilesInFolder(path.join(filePath, folder), previousPath ? path.join(previousPath, folder) : folder))
            .reduce((acc, cur) => {cur.forEach(el => acc.push(el)); return acc;}, []);
        let a = files
            .filter(file => file.includes(".parson") && file !== ".parson")
            .concat(subFolderFiles)
            .map(filename => previousPath? path.join(previousPath, filename) : filename);
        console.log(filePath, previousPath, files, subFolderFiles, a);
        return a;
    }
    return [];
}

function folderFilter(file: string): boolean{
    return !file.includes(".") && file !== "node_modules" && file !== "dist" && file !== "out" && file !== ".parson";
}


function fileExists(path: string): boolean{
    let found: boolean = false;
    try{
        accessSync(path, constants.R_OK);
        found = true;
    }catch(err){
        found = false;
        console.log("error: ", err.message);
    }
    return found;
}