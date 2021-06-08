import * as path from 'path';
import {accessSync, constants, readFileSync, readdirSync, mkdirSync, lstatSync} from 'fs';
import {SavedExerciseAnswer, ExerciseAnswer } from '../model';

export function readParsonFileToString(filename: string, workspaceroot: string): string{
    const filepath = path.join(workspaceroot, filename);
    if(fileExists(filepath)){
        const text = readFileSync(filepath, 'utf-8');
        return loadExercisesToString(text, workspaceroot);
    }
    return "";
}

export function readParsonFile(filename: string, workspaceroot: string): ExerciseAnswer{
    const filepath = path.join(workspaceroot, filename);
    if(fileExists(filepath)){
        const text = readFileSync(filepath, 'utf-8');
        return loadExercises(JSON.parse(text) as SavedExerciseAnswer, workspaceroot);
    }
    throw Error("file not found: "+filename);
}

export function loadExercises(parson: SavedExerciseAnswer, workspaceroot: string): ExerciseAnswer{
    if(typeof parson.parsonDef === "string"){
        const filename = path.join(workspaceroot, `${parson.parsonDef}.parsondef`);
        if(fileExists(filename)){
            const fileRead = readFileSync(filename, 'utf-8');
            const exerciseAnswer: ExerciseAnswer = {
                exercise: JSON.parse(fileRead),
                answers: parson.answers
            };
            return exerciseAnswer;
        }
    }else{
        return {exercise: parson.parsonDef, answers: parson.answers};
    }
    throw Error("invalid type for parsonDef property");
}

export function loadExercisesToString(text: string, workspaceroot: string): string{
    const parsed: SavedExerciseAnswer = JSON.parse(text);
    if(typeof parsed.parsonDef === "string"){
        const filename = path.join(workspaceroot, `${parsed.parsonDef}.parsondef`);
        if(fileExists(filename)){
            const fileRead = readFileSync(filename, 'utf-8');
            const exerciseAnswer: ExerciseAnswer = {
                exercise: JSON.parse(fileRead),
                answers: parsed.answers       
            };
            return JSON.stringify(exerciseAnswer);
        }
    }
    return JSON.stringify(parsed);
}

export function getParsonFilesInFolder(filePath: string, previousPath?: string): string[]{
    if(fileExists(filePath)){
        const files = readdirSync(filePath);
        const subFolderFiles = files
            .filter(file => folderFilter(file, filePath))
            .map(folder => getParsonFilesInFolder(path.join(filePath, folder), folder))
            .reduce((acc, cur) => {cur.forEach(el => acc.push(el)); return acc;}, []);
        let a = files
            .filter(file => file.includes(".parson") && file !== ".parson")
            .concat(subFolderFiles)
            .map(filename => previousPath? path.join(previousPath, filename) : filename);
        return a;
    }
    return [];
}

export function getCodeFilesInFolder(filePath: string): string[]{
    if(fileExists(filePath)){
        const files = readdirSync(filePath);
        return files.filter(file => !lstatSync(path.join(filePath, file)).isDirectory() && !file.endsWith(".parson") && file !== "parsonconfig.json");
    }
    return [];
}

function folderFilter(file: string, folderPath: string): boolean{
    return lstatSync(path.join(folderPath, file)).isDirectory()  && file !== "node_modules" && file !== "dist" && file !== "out" && !file.startsWith(".");
}


export function fileExists(path: string): boolean{
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

export function verifyFolder(folderPath: string){
    try{
        accessSync(folderPath);
    }catch(error){
        mkdirSync(folderPath);
    }
}

export function readFile<T>(filePath: string): T{
    const text = readFileSync(filePath, 'utf-8');
    const result: T = JSON.parse(text);
    return result;
}