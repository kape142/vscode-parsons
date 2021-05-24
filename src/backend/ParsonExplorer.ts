import * as vscode from 'vscode';
import * as path from 'path';
import {DisposableWrapper, ExerciseAnswer} from '../model';
import { getParsonFilesInFolder, readParsonFileToString } from './FileReader';

export class ParsonExplorer implements vscode.TreeDataProvider<ExerciseFile>{

    public static register(workspaceroot: string): DisposableWrapper<ParsonExplorer> {
        const parsonExplorer = new ParsonExplorer(workspaceroot);
        return {it: parsonExplorer, disposable: vscode.window.registerTreeDataProvider('parsonExplorer', parsonExplorer)};
    }
    constructor( private workspaceroot: string){}

    onDidChangeTreeDataEmitter = new vscode.EventEmitter<void>();

    onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    getTreeItem(element: ExerciseFile): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: ExerciseFile): ExerciseFile[] {
        if(element && element.files){
            return element.files.map(filename => new ExerciseFile(filename, element.uri));
        }
        let a =  getParsonFilesInFolder(this.workspaceroot).map(filename => {
            const read = readParsonFileToString(filename, this.workspaceroot);
            const parsed = JSON.parse(read) as ExerciseAnswer;
            return new ExerciseFile(parsed.exercise.name, filename, parsed.exercise.files.map(file => file.name), parsed.exercise.runnable);
        });
        return a;
    }

    
}

export class ExerciseFile extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public readonly uri: string,
        public readonly files?: string[],
        runnable?: boolean
    ){
        super(label, files?vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        if(!files){
            this.command = {
                command: "parsonExplorer.displayFile",
                title: '',
                arguments: [label, uri]
            };
            this.resourceUri = vscode.Uri.parse(`parson:${path.join(uri, label)}`, true);
            this.contextValue = "file";
        }else{
            this.contextValue = runnable? "runnableExercise" : "exercise";
        }
    }    
}