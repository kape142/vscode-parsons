import * as vscode from 'vscode';
import { DisposableWrapper, ExerciseAnswer, ExerciseFile, SavedExerciseAnswer } from '../model';
import { loadExercises, readParsonFile } from './FileReader';

export class ParsonDecorationProvider implements vscode.FileDecorationProvider {

    //onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> | undefined

    fileChangeEmitter = new vscode.EventEmitter<vscode.Uri>();

    onDidChangeFileDecorations = this.fileChangeEmitter.event;
    
    //(listener: (e: vscode.Uri) => any, thisArgs?: any, disposables?: vscode.Disposable[]): vscode.Disposable;
    
    provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.FileDecoration {
        console.log("provideFileDecoration", uri, uri.scheme, uri.path);
        if(uri.scheme === "parson"){
            const filepath = uri.path.substring(0, uri.path.indexOf(".parson")+".parson".length);
            const parson = this.findOpenFile(filepath) || this.findSavedFile(filepath);
            console.log("parson found: ", parson);
            if(parson){
                const codeFile: string = uri.path.substring(uri.path.indexOf(".parson")+".parson".length).trim();
                console.log("codefile: ", codeFile);
                console.log(codeFile.length);
                console.log(parson.exercise.files[0]);
                const file =  (codeFile.length > 0) ? parson.exercise.files.find(f => f.name === codeFile.substr(1)) : parson.exercise.files[0];
                console.log("files:", file?.name, filepath);
                if(file){
                    const maxGaps = file.gaps.length;
                    let gaps = maxGaps - parson.answers.filter(answer => file.gaps.map(gap => gap.id).includes(answer.gap.id)).length;
                    console.log("gapcheck: ", file.name, maxGaps, gaps);
                    return new vscode.FileDecoration(`${gaps > 0 ? gaps : ""}`);
                    }
                }
                
        }
        return new vscode.FileDecoration("");
    }

    private findOpenFile(filepath: string): ExerciseAnswer | undefined {
        let d: string[] = [];
        vscode.workspace.textDocuments.map(a => a.uri.fsPath).map(a=>d.push(a));
        console.log(d, filepath);
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