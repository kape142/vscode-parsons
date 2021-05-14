import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {ExerciseAnswer} from '../model';
import { getParsonFilesInFolder, readParsonFileToString } from './FileReader';

export class ParsonExplorer implements vscode.TreeDataProvider<ExerciseFile>{

    public static register(workspaceroot: string): vscode.Disposable {
        const parsonExplorer = new ParsonExplorer(workspaceroot);
        return vscode.window.registerTreeDataProvider('parsonExplorer', parsonExplorer);
    }
    constructor( private workspaceroot: string){}

    onDidChangeTreeData?: vscode.Event<void | ExerciseFile | null | undefined> | undefined;

    getTreeItem(element: ExerciseFile): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: ExerciseFile): ExerciseFile[] {
        console.log("get children", element);
        if(element && element.files){
            return element.files.map(filename => new ExerciseFile(filename, element.uri));
        }
        console.log("no children");
        let a =  getParsonFilesInFolder(this.workspaceroot).map(filename => {
            const read = readParsonFileToString(filename, this.workspaceroot);
            //console.log(filename, read);
            const parsed = JSON.parse(read) as ExerciseAnswer;
            return new ExerciseFile(parsed.exercise.name, filename, parsed.exercise.files.map(file => file.name));
        });
        console.log("files in folder: ", a);
        return a;
    }

    
}

export class ExerciseFile extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public readonly uri: string,
        public readonly files?: string[]
    ){
        super(label, files?vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        if(!files){
            this.command = {
                command: "parsonExplorer.displayFile",
                title: '',
                arguments: [label, uri]
            };
            this.resourceUri = vscode.Uri.parse(`parson:${path.join(uri, label)}`, true);
        }
        console.log("TreeItem constructor: ", uri, this.label, this.resourceUri);
    }    
}