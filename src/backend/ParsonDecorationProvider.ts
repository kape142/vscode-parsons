import * as vscode from 'vscode';
import { DisposableWrapper, ExerciseAnswer, SavedExerciseAnswer } from '../model';
import { loadExercises, readParsonFile } from './FileReader';

export class ParsonDecorationProvider implements vscode.FileDecorationProvider {

    fileChangeEmitter = new vscode.EventEmitter<vscode.Uri>();

    onDidChangeFileDecorations = this.fileChangeEmitter.event;
    
    provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.FileDecoration {
        if(uri.scheme === "parson"){
            const filepath = uri.path.substring(0, uri.path.indexOf(".parson")+".parson".length);
            const parson = this.findOpenFile(filepath) || this.findSavedFile(filepath);
            if(parson){
                const codeFile: string = uri.path.substring(uri.path.indexOf(".parson")+".parson".length).trim();
                const file =  (codeFile.length > 0) ? parson.exercise.files.find(f => f.name === codeFile.substr(1)) : parson.exercise.files[0];
                if(file){
                    const maxGaps = file.gaps.length;
                    let gaps = maxGaps - parson.answers.filter(answer => file.gaps.map(gap => gap.id).includes(answer.gap.id)).length;
                    return new vscode.FileDecoration(`${gaps > 0 ? gaps : ""}`);
                    }
                }
                
        }
        return new vscode.FileDecoration("");
    }

    private findOpenFile(filepath: string): ExerciseAnswer | undefined {
        let d: string[] = [];
        vscode.workspace.textDocuments.map(a => a.uri.fsPath).map(a=>d.push(a));
        const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath.endsWith(filepath));
        if(document){
            const savedExerciseAnswer = JSON.parse(document.getText()) as SavedExerciseAnswer;
            return loadExercises(savedExerciseAnswer, this.workspaceroot);
        };
        return;
    }

    private findSavedFile(filepath: string): ExerciseAnswer | undefined{
        try{
            return readParsonFile(filepath, this.workspaceroot);
        }catch(error){
            console.error("Error: No such file "+filepath);
            return;
        }
    }

    public static register(workspaceroot: string): DisposableWrapper<ParsonDecorationProvider>{
        const parsonDecorationProvider = new ParsonDecorationProvider(workspaceroot);
        return {it: parsonDecorationProvider, disposable: vscode.window.registerFileDecorationProvider(parsonDecorationProvider)};
    }

    constructor(private workspaceroot: string){

    }

}